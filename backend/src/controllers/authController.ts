import mongoose from 'mongoose';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { User, Tenant, Client, NotificationLog, EmailVerification } from '../config/db';
import { centralModels } from '../services/tenantConnectionManager';
import tenantConnectionManager from '../services/tenantConnectionManager';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { logAudit } from '../services/auditService';
import { logActivity } from '../services/activityService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendForgotPasswordEmail, sendOtpEmail, sendTwoFactorLoginOtpEmail } from '../services/emailService';
import { sendSms } from '../services/smsService';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-key-54321';

const maskEmail = (email: string | null | undefined) => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name + '*';
  return `${maskedName}@${parts[1]}`;
};

const maskMobile = (mobile: string | null | undefined) => {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '');
  return digits.length > 4 ? digits.substring(0, 2) + '*'.repeat(digits.length - 4) + digits.substring(digits.length - 2) : '******';
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
      errors: ['Missing fields']
    });
  }

  try {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const emailQuery = { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } };

    let user: any = await User.findOne(emailQuery)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          populate: { path: 'permission' }
        }
      })
      .populate('tenant')
      .lean();

    // Fallback: If user wasn't found in current context (e.g. portal login without domain header), locate tenant
    if (!user) {
      const tenantMatch: any =
        (await centralModels.AllCompany.findOne(emailQuery).lean().catch(() => null)) ||
        (await centralModels.Tenant.findOne(emailQuery).lean().catch(() => null));

      if (tenantMatch) {
        const resolved = await tenantConnectionManager.getTenantConnection(tenantMatch.tenantId || tenantMatch._id || tenantMatch.id);
        if (resolved) {
          user = await resolved.models.User.findOne(emailQuery)
            .populate({
              path: 'role',
              populate: {
                path: 'permissions',
                populate: { path: 'permission' }
              }
            })
            .populate('tenant')
            .lean();
        }
      }
    }

    // if (!user || user.deletedAt || user.status === 'DELETED') {
    //   if (user && (user.deletedAt || user.status === 'DELETED')) {
    //     const adminMsg =
    //       user.role?.name === 'ADMIN'
    //         ? 'Your company has been removed. Please contact super admin.'
    //         : 'Your company has been removed. Please contact admin.';
    //     return res.status(403).json({
    //       success: false,
    //       message: adminMsg,
    //       errors: ['User deleted']
    //     });
    //   }
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Invalid credentials',
    //     errors: ['User not found']
    //   });
    // }

    if (user?.tenant) {
      if (user?.tenant?.status === 'DELETED' || user?.tenant?.deletedAt) {
        return res.status(403).json({
          success: false,
          message: 'Your company workspace has been removed. Please contact super admin.',
          errors: ['Tenant deleted', 'User inactive or suspended']
        });
      }
      if (user?.tenant?.status === 'SUSPENDED' && user.role?.name !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'This company portal has been suspended by Super Admin. Access is disabled.',
          errors: ['Tenant suspended', 'User inactive or suspended']
        });
      }
    }

    if (user?.status === 'SUSPENDED') {
      const suspendMsg =
        user?.role?.name === 'ADMIN'
          ? 'Your account is suspended. Please contact super admin.'
          : 'Your account is suspended. Please contact admin.';
      return res.status(403).json({
        success: false,
        message: suspendMsg,
        errors: ['User suspended', 'User inactive or suspended']
      });
    }

    if (user?.status === 'PENDING_APPROVAL') {
      await User.findByIdAndUpdate(user?._id || user?.id, {
        status: 'ACTIVE',
        tempPassword: null
      });
      await Client.updateMany({ userId: user?._id || user?.id }, { status: 'ACTIVE' });
      user.status = 'ACTIVE';
    }

    // if (user.status === 'INACTIVE') {
    //   const inactiveMsg =
    //     user.role?.name === 'ADMIN'
    //       ? 'Your account has been deactivated. Please contact super admin.'
    //       : 'Your account has been deactivated. Please contact admin.';
    //   return res.status(403).json({
    //     success: false,
    //     message: inactiveMsg,
    //     errors: ['User inactive']
    //   });
    // }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: ['Password incorrect']
      });
    }

    const permissions =
      user.role?.permissions?.map((rp: any) => rp.permission?.code || rp.permissionCode).filter(Boolean) || [];

    const sessionId = crypto.randomUUID();
    const userId = (user?._id || user?.id).toString();

    let activeTenantId = user?.tenantId ? user?.tenantId.toString() : null;
    let tenantInfo = user?.tenant;
    if (!activeTenantId && user?.role?.name !== 'SUPER_ADMIN') {
      try {
        const defaultTenant: any = await centralModels.Tenant.findOne({ status: { $ne: 'DELETED' } }).lean() || await centralModels.Tenant.findOne().lean();
        if (defaultTenant) {
          activeTenantId = (defaultTenant?._id || defaultTenant?.id).toString();
          tenantInfo = defaultTenant;
        }
      } catch {}
    }

    // ==============================================================
    // TWO-STEP VERIFICATION (2FA) CHECK FOR CLIENTS
    // ==============================================================
    const isClient = user?.role?.name === 'CLIENT';
    const is2FAEnabled = isClient && (tenantInfo?.client2FAEnabled === true);

    if (is2FAEnabled) {
      const channel = tenantInfo?.twoFactorChannel || 'EMAIL';
      const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const smsOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min validity

      let smsDispatched = false;
      let emailDispatched = false;

      // Dispatch SMS and Email in PARALLEL to reduce response latency
      const dispatchTasks: Promise<void>[] = [];

      if ((channel === 'SMS' || channel === 'BOTH') && user?.mobile) {
        dispatchTasks.push(
          sendSms({
            tenantId: activeTenantId,
            mobile: user.mobile,
            templateType: 'LOGIN_2FA',
            variables: { otp: smsOtp, var: smsOtp }
          })
            .then((smsRes) => {
              smsDispatched = smsRes.success;
              if (!smsRes.success) {
                console.warn('[2FA] SMS dispatch failed or inactive:', smsRes.message);
              }
            })
            .catch((smsErr) => {
              console.error('[2FA] SMS send exception:', smsErr);
            })
        );
      }

      if (channel === 'EMAIL' || channel === 'BOTH') {
        dispatchTasks.push(
          sendTwoFactorLoginOtpEmail({
            tenantId: activeTenantId,
            toEmail: user.email,
            otp: emailOtp,
            companyName: tenantInfo?.companyName
          })
            .then(() => {
              emailDispatched = true;
            })
            .catch((emailErr) => {
              console.error('[2FA] Email send exception:', emailErr);
            })
        );
      }

      if (dispatchTasks.length > 0) {
        await Promise.all(dispatchTasks);
      }

      // Fallback: If SMS was chosen but failed and email was not dispatched
      if (channel === 'SMS' && !smsDispatched && !emailDispatched) {
        try {
          await sendTwoFactorLoginOtpEmail({
            tenantId: activeTenantId,
            toEmail: user.email,
            otp: emailOtp,
            companyName: tenantInfo?.companyName
          });
          emailDispatched = true;
        } catch (emailErr) {
          console.error('[2FA] Fallback Email send exception:', emailErr);
        }
      }

      const effectiveChannel = smsDispatched && emailDispatched ? 'BOTH' : (smsDispatched ? 'SMS' : 'EMAIL');

      await EmailVerification.findOneAndUpdate(
        { email: cleanEmail },
        {
          otp: emailOtp,
          smsOtp: (effectiveChannel === 'BOTH' || effectiveChannel === 'SMS') ? smsOtp : null,
          emailVerified: false,
          smsVerified: false,
          expiresAt
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Generate temporary encrypted 2FA Token
      const twoFactorToken = jwt.sign(
        {
          id: userId,
          email: user.email,
          role: user.role?.name,
          tenantId: activeTenantId,
          purpose: '2FA_LOGIN',
          channel: effectiveChannel
        },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      return res.status(200).json({
        success: true,
        requires2FA: true,
        message: effectiveChannel === 'BOTH'
          ? 'Two-step verification required. Please verify your Email and SMS codes.'
          : (effectiveChannel === 'SMS' ? 'Mobile SMS verification code sent.' : 'Email verification code sent.'),
        data: {
          twoFactorToken,
          channel: effectiveChannel,
          currentStep: effectiveChannel === 'BOTH' ? 'EMAIL' : effectiveChannel,
          email: maskEmail(user.email),
          mobile: maskMobile(user.mobile)
        }
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: userId,
        email: user?.email,
        role: user?.role?.name,
        tenantId: activeTenantId,
        tokenVersion: user?.tokenVersion || 0,
        sessionId: sessionId
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = jwt.sign(
      {
        id: userId,
        tokenVersion: user?.tokenVersion || 0,
        sessionId: sessionId
      },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login and session tracking
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      currentSessionId: sessionId,
      sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    // Write audit log
    await logAudit({
      tenantId: activeTenantId,
      userId: userId,
      action: 'LOGIN',
      module: 'USERS',
      ipAddress: req.ip
    });

    if (user.role?.name === 'CLIENT') {
      try {
        const clientDoc = await Client.findOne({ userId }).lean();
        if (clientDoc) {
          logActivity({
            tenantId: activeTenantId,
            actorType: 'CLIENT',
            actorId: userId,
            actorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || clientDoc.name,
            actorEmail: user.email,
            targetClientId: clientDoc._id || clientDoc.id,
            category: 'AUTH',
            action: 'LOGIN',
            title: 'Client Logged In',
            description: 'Authenticated session started',
            status: 'SUCCESS',
            req
          });
        }
      } catch (logErr) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role?.name,
          allowMultiDeviceLogin: user.role?.allowMultiDeviceLogin || false,
          permissions,
          tenantId: activeTenantId,
          tenantStatus: tenantInfo?.status || null,
          tenantName: tenantInfo?.companyName || 'RAGCP',
          tenantLogo: tenantInfo?.logoUrl || null
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      errors: [error.message]
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required',
      errors: ['Missing token']
    });
  }

  try {
    const decoded: any = jwt.verify(token, REFRESH_SECRET);
    const user: any = await User.findById(decoded.id).populate('role').lean();

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Invalid or suspended user session',
        errors: ['User invalid']
      });
    }

    const userId = (user._id || user.id).toString();

    const newAccessToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role?.name,
        tenantId: user.tenantId ? user.tenantId.toString() : null
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: { accessToken: newAccessToken }
    });
  } catch (error: any) {
    return res.status(403).json({
      success: false,
      message: 'Invalid refresh token',
      errors: [error.message]
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const user: any = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).populate('role').lean();

    if (!user || user.deletedAt || user.status === 'DELETED') {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address. Please check your email or create a new account.'
      });
    }

    const newPassword = 'Temp@' + Math.floor(100000 + Math.random() * 900000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id || user.id, {
      passwordHash,
      $inc: { tokenVersion: 1 },
      currentSessionId: null,
      sessionExpiresAt: null
    });

    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const tenant: any = user.tenantId ? await Tenant.findById(user.tenantId).lean() : null;
    const userName = user.firstName + (user.lastName ? ' ' + user.lastName : '');

    await sendForgotPasswordEmail({
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      toEmail: cleanEmail,
      name: userName,
      newPassword,
      loginUrl,
      companyName: tenant?.companyName || 'RAGCP Platform'
    });

    await NotificationLog.create({
      tenantId: user.tenantId || null,
      recipient: cleanEmail,
      channel: 'EMAIL',
      title: 'Password Reset',
      message: `New temporary password sent to ${cleanEmail}`,
      status: 'SENT'
    });

    return res.status(200).json({
      success: true,
      message: 'A temporary password has been sent to your registered email address.'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      errors: [error.message]
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Token and new password are required'
    });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    const user: any = await User.findById(userId).populate('tenant').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let policy = 'NORMAL';
    if (user.tenant?.passwordPolicy) {
      policy = user.tenant.passwordPolicy;
    } else if (user.tenantId) {
      const tenant: any = await Tenant.findById(user.tenantId).lean();
      if (tenant?.passwordPolicy) policy = tenant.passwordPolicy;
    }

    if (!newPassword || newPassword.length < 8 || newPassword.length > 15) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 15 characters long.' });
    }

    if (policy === 'STRONG') {
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 uppercase letter.' });
      }
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 lowercase letter.' });
      }
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 number.' });
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 special character (!@#$%^&*...).' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, {
      passwordHash,
      $inc: { tokenVersion: 1 },
      currentSessionId: null,
      sessionExpiresAt: null
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token',
      errors: [error.message]
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    const user: any = await User.findById(req.user.id)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          populate: { path: 'permission' }
        }
      })
      .populate('tenant')
      .populate({
        path: 'staff',
        populate: { path: 'personAssociated' }
      })
      .populate({
        path: 'client',
        populate: { path: 'profile' }
      })
      .lean();

    if (!user || user.deletedAt) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.tenant && user.tenant.status === 'SUSPENDED' && user.role?.name !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Your organization account is suspended. Please contact super admin.',
        errors: ['User inactive or suspended', 'Tenant suspended']
      });
    }

    const permissions =
      user.role?.permissions?.map((rp: any) => rp.permission?.code || rp.permissionCode).filter(Boolean) || [];

    const userId = (user._id || user.id).toString();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role?.name,
          allowMultiDeviceLogin: user.role?.allowMultiDeviceLogin || false,
          permissions,
          tenantId: user.tenantId ? user.tenantId.toString() : null,
          tenantStatus: user.tenant?.status || null,
          staff: user.staff,
          client: user.client,
          tenant: user.tenant
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

export const getPublicTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find({ status: 'ACTIVE' })
      .select('id companyName logoUrl')
      .lean();

    return res.json({ success: true, data: tenants });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [err.message] });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).user?.id;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password' });
    }

    const user: any = await User.findById(userId).populate('tenant').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect current password' });

    // Determine tenant password policy
    let tenant: any = user.tenant;
    if (!tenant && user.tenantId) {
      tenant = await Tenant.findById(user.tenantId).lean();
    }
    if (!tenant) {
      tenant = await Tenant.findOne({ deletedAt: null }).lean();
    }
    const policy = tenant?.passwordPolicy || 'NORMAL';

    if (!newPassword || newPassword.length < 8 || newPassword.length > 15) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 15 characters long.' });
    }

    if (policy === 'STRONG') {
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 uppercase letter.' });
      }
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 lowercase letter.' });
      }
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 number.' });
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must contain at least 1 special character (!@#$%^&*...).' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, {
      passwordHash: newHash,
      $inc: { tokenVersion: 1 },
      currentSessionId: null,
      sessionExpiresAt: null
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [err.message] });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { allDevices } = req.body;

    if (allDevices) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { tokenVersion: 1 },
        currentSessionId: null,
        sessionExpiresAt: null
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        currentSessionId: null,
        sessionExpiresAt: null
      });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { email, mobile, type, tenantId: bodyTenantId } = req.body;
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const queryTenantId = req.query.tenantId as string;
    const tenantId = bodyTenantId || headerTenantId || queryTenantId || null;

    const reqType = (type || (mobile && !email ? 'MOBILE' : 'EMAIL')).toUpperCase();

    if (reqType === 'EMAIL') {
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const cleanEmail = String(email || '').toLowerCase().trim();
      const existingUser = await User.findOne({
        email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).lean();

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await EmailVerification.findOneAndUpdate(
        { email: cleanEmail },
        { email: cleanEmail, otp, emailVerified: false, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`[OTP] Generated Email OTP for ${cleanEmail}: ${otp}`);

      let companyName = 'RAGCP Platform';
      let resolvedTenantId = tenantId;
      if (resolvedTenantId) {
        try {
          const t: any = await centralModels.Tenant.findById(resolvedTenantId).lean() || await centralModels.AllCompany.findById(resolvedTenantId).lean();
          if (t?.companyName) companyName = t.companyName;
        } catch {}
      }

      await sendOtpEmail({
        tenantId: resolvedTenantId,
        toEmail: cleanEmail,
        otp,
        companyName
      }).catch((e: any) => console.warn('[OTP] sendOtpEmail warning:', e.message));

      return res.json({
        success: true,
        type: 'EMAIL',
        message: 'OTP sent successfully to your email.'
      });
    } else {
      // Mobile OTP
      if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });

      const digits = String(mobile).replace(/\D/g, '');
      const mobile10 = digits.slice(-10);

      const existingUser = await User.findOne({
        mobile: { $regex: new RegExp(`${mobile10}$`) }
      }).lean();

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Mobile number is already registered. Please login.' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const cleanEmail = email ? String(email).toLowerCase().trim() : null;

      await EmailVerification.findOneAndUpdate(
        { $or: [{ mobile: mobile10 }, ...(cleanEmail ? [{ email: cleanEmail }] : [])] },
        {
          ...(cleanEmail ? { email: cleanEmail } : {}),
          mobile: mobile10,
          smsOtp: otp,
          otp,
          smsVerified: false,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`[OTP] Generated Mobile OTP for ${mobile10}: ${otp}`);

      let resolvedTenantId = tenantId;
      await sendSms({
        tenantId: resolvedTenantId,
        mobile: mobile10,
        templateType: 'REGISTRATION_OTP',
        variables: { otp, var: otp }
      }).catch((e: any) => console.warn('[OTP] sendSms warning:', e.message));

      return res.json({
        success: true,
        type: 'MOBILE',
        message: 'OTP sent successfully to your mobile number.'
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, mobile, otp, type } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const reqType = (type || (mobile && !email ? 'MOBILE' : 'EMAIL')).toUpperCase();
    const cleanEmail = email ? String(email).toLowerCase().trim() : '';
    const mobileDigits = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : '';

    const query: any = {};
    if (reqType === 'EMAIL' && cleanEmail) {
      query.email = cleanEmail;
    } else if (reqType === 'MOBILE' && mobileDigits) {
      query.mobile = mobileDigits;
    } else {
      query.$or = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileDigits ? [{ mobile: mobileDigits }] : [])
      ];
    }

    const record: any = await EmailVerification.findOne(query);
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested or session expired' });

    const enteredOtp = String(otp).trim();
    const validOtp = enteredOtp === String(record.otp).trim() || enteredOtp === String(record.smsOtp).trim();

    if (!validOtp) return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
    if (new Date(record.expiresAt) < new Date()) return res.status(400).json({ success: false, message: 'OTP has expired' });

    if (reqType === 'EMAIL') {
      record.emailVerified = true;
      await record.save();
      return res.json({ success: true, type: 'EMAIL', message: 'Email verified successfully.' });
    } else {
      record.smsVerified = true;
      await record.save();
      return res.json({ success: true, type: 'MOBILE', message: 'Mobile number verified successfully.' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/auth/verify-2fa
 * Verifies the 6-digit 2FA code and issues the full JWT access & refresh tokens
 */
export const verify2FALogin = async (req: Request, res: Response) => {
  const { twoFactorToken, otp, type } = req.body;
  if (!twoFactorToken || !otp) {
    return res.status(400).json({ success: false, message: 'Verification token and code are required' });
  }

  try {
    const decoded: any = jwt.verify(twoFactorToken, JWT_SECRET);
    if (!decoded || decoded.purpose !== '2FA_LOGIN') {
      return res.status(400).json({ success: false, message: 'Invalid or expired 2FA session. Please request a new passcode.' });
    }

    const cleanEmail = String(decoded.email || '').toLowerCase().trim();
    const verificationRecord: any = await EmailVerification.findOne({ email: cleanEmail });

    if (!verificationRecord) {
      return res.status(400).json({ success: false, message: 'No verification code found or session expired. Please request a new code.' });
    }

    if (new Date(verificationRecord.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    const isBothChannel = decoded.channel === 'BOTH';
    const effectiveType = type || (isBothChannel ? (verificationRecord.emailVerified ? 'SMS' : 'EMAIL') : (decoded.channel || 'EMAIL'));

    if (effectiveType === 'EMAIL') {
      if (String(verificationRecord.otp).trim() !== String(otp).trim()) {
        return res.status(400).json({ success: false, message: 'Invalid Email verification code. Please check your email inbox.' });
      }
      verificationRecord.emailVerified = true;
      await verificationRecord.save();

      if (isBothChannel && !verificationRecord.smsVerified) {
        return res.status(200).json({
          success: true,
          requiresNextStep: true,
          nextStep: 'SMS',
          message: 'Email code verified! Now enter the Mobile SMS verification code.',
          data: {
            currentStep: 'SMS',
            emailVerified: true,
            smsVerified: false
          }
        });
      }
    } else if (effectiveType === 'SMS') {
      const expectedSmsOtp = verificationRecord.smsOtp || verificationRecord.otp;
      if (String(expectedSmsOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({ success: false, message: 'Invalid SMS verification code. Please check your mobile messages.' });
      }
      verificationRecord.smsVerified = true;
      await verificationRecord.save();

      if (isBothChannel && !verificationRecord.emailVerified) {
        return res.status(200).json({
          success: true,
          requiresNextStep: true,
          nextStep: 'EMAIL',
          message: 'SMS code verified! Now enter the Email verification code.',
          data: {
            currentStep: 'EMAIL',
            emailVerified: false,
            smsVerified: true
          }
        });
      }
    } else {
      // Single channel fallback
      if (String(verificationRecord.otp).trim() !== String(otp).trim() && String(verificationRecord.smsOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
      }
    }

    // Code(s) valid! Delete record to prevent re-use
    await EmailVerification.deleteOne({ _id: verificationRecord._id });

    // Fetch user and issue full session tokens
    const user: any = await User.findById(decoded.id)
      .populate({ path: 'role', populate: { path: 'permissions' } })
      .populate('tenant');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const sessionId = crypto.randomUUID();
    const userId = user._id.toString();
    const activeTenantId = decoded.tenantId;
    const permissions = user.role?.permissions?.map((rp: any) => rp.permission?.code || rp.permissionCode).filter(Boolean) || [];

    const accessToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role?.name,
        tenantId: activeTenantId,
        tokenVersion: user.tokenVersion || 0,
        sessionId: sessionId
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = jwt.sign(
      {
        id: userId,
        tokenVersion: user.tokenVersion || 0,
        sessionId: sessionId
      },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      currentSessionId: sessionId,
      sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    await logAudit({
      tenantId: activeTenantId,
      userId: userId,
      action: 'LOGIN',
      module: 'USERS',
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Login verified successfully',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role?.name,
          allowMultiDeviceLogin: user.role?.allowMultiDeviceLogin || false,
          permissions,
          tenantId: activeTenantId,
          tenantStatus: user.tenant?.status || null,
          tenantName: user.tenant?.companyName || 'RAGCP',
          tenantLogo: user.tenant?.logoUrl || null
        }
      }
    });
  } catch (error: any) {
    console.error('Verify 2FA error:', error);
    return res.status(400).json({ success: false, message: 'Invalid or expired 2FA session. Please request a new passcode.' });
  }
};

/**
 * POST /api/v1/auth/resend-2fa
 * Resends the 6-digit OTP code to email/SMS
 */
export const resend2FAOtp = async (req: Request, res: Response) => {
  const { twoFactorToken, type } = req.body;
  if (!twoFactorToken) {
    return res.status(400).json({ success: false, message: 'Session token is required' });
  }

  try {
    const decoded: any = jwt.verify(twoFactorToken, JWT_SECRET);
    if (!decoded || decoded.purpose !== '2FA_LOGIN') {
      return res.status(400).json({ success: false, message: 'Invalid 2FA session' });
    }

    const user: any = await User.findById(decoded.id).populate('tenant');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const cleanEmail = user.email.toLowerCase().trim();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const targetType = type || (decoded.channel === 'BOTH' ? 'EMAIL' : (decoded.channel || 'EMAIL'));

    if (targetType === 'SMS') {
      const newSmsOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await EmailVerification.findOneAndUpdate(
        { email: cleanEmail },
        { smsOtp: newSmsOtp, smsVerified: false, expiresAt },
        { upsert: true }
      );

      if (user.mobile) {
        await sendSms({
          tenantId: decoded.tenantId,
          mobile: user.mobile,
          templateType: 'LOGIN_2FA',
          variables: { otp: newSmsOtp, var: newSmsOtp }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'A fresh SMS verification passcode has been dispatched to your mobile.',
        data: {
          type: 'SMS',
          mobile: maskMobile(user.mobile)
        }
      });
    } else {
      // EMAIL
      const newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await EmailVerification.findOneAndUpdate(
        { email: cleanEmail },
        { otp: newEmailOtp, emailVerified: false, expiresAt },
        { upsert: true }
      );

      await sendTwoFactorLoginOtpEmail({
        tenantId: decoded.tenantId,
        toEmail: user.email,
        otp: newEmailOtp,
        companyName: user.tenant?.companyName
      });

      return res.status(200).json({
        success: true,
        message: 'A fresh Email verification passcode has been dispatched to your email.',
        data: {
          type: 'EMAIL',
          email: maskEmail(user.email)
        }
      });
    }
  } catch (error: any) {
    return res.status(400).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};

/**
 * GET /api/v1/auth/security-policy
 * Public endpoint returning current tenant's password policy and 2FA status
 */
export const getSecurityPolicy = async (req: Request, res: Response) => {
  try {
    const queryTenantId = req.query.tenantId as string;
    const headerTenantId = req.headers['x-tenant-id'] as string;
    let tenantId = headerTenantId || queryTenantId || null;

    let tenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenant = await Tenant.findById(tenantId).lean();
    }
    if (!tenant) {
      tenant = await Tenant.findOne({ deletedAt: null }).lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        passwordPolicy: tenant?.passwordPolicy || 'NORMAL',
        client2FAEnabled: !!tenant?.client2FAEnabled,
        twoFactorChannel: tenant?.twoFactorChannel || 'EMAIL',
        signupVerificationMode: tenant?.signupVerificationMode || 'EMAIL_ONLY',
        lockedTradesPreviewCount: tenant?.lockedTradesPreviewCount ?? 5
      }
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      data: {
        passwordPolicy: 'NORMAL',
        client2FAEnabled: false,
        twoFactorChannel: 'EMAIL',
        signupVerificationMode: 'EMAIL_ONLY',
        lockedTradesPreviewCount: 5
      }
    });
  }
};

/**
 * Request OTP for client login via registered Email or Mobile
 */
export const requestLoginOtp = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email or Mobile number is required.' });
    }

    const cleanInput = String(identifier).trim();
    const isEmail = cleanInput.includes('@');
    let user: any = null;

    if (isEmail) {
      const cleanEmail = cleanInput.toLowerCase();
      user = await User.findOne({
        email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).populate('role').populate('tenant').lean();
    } else {
      const digits = cleanInput.replace(/\D/g, '');
      const mobile10 = digits.slice(-10);
      user = await User.findOne({
        mobile: { $regex: new RegExp(`${mobile10}$`) }
      }).populate('role').populate('tenant').lean();
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this ' + (isEmail ? 'email address.' : 'mobile number.')
      });
    }

    if (user.status !== 'ACTIVE' && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated or suspended. Please contact administrator.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const cleanEmail = String(user.email || '').toLowerCase().trim();
    const cleanMobile = String(user.mobile || '').trim();

    await EmailVerification.findOneAndUpdate(
      { $or: [{ email: cleanEmail }, ...(cleanMobile ? [{ mobile: cleanMobile }] : [])] },
      {
        email: cleanEmail,
        mobile: cleanMobile,
        otp,
        smsOtp: otp,
        emailVerified: false,
        smsVerified: false,
        expiresAt
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[LOGIN-OTP] Generated OTP for user ${user.email} (${user.mobile}): ${otp}`);

    const activeTenantId = (user.tenantId || user.tenant?._id || user.tenant?.id)?.toString();
    const companyName = user.tenant?.companyName || 'RAGCP Platform';

    let emailDispatched = false;
    let smsDispatched = false;

    if (cleanEmail) {
      try {
        emailDispatched = await sendOtpEmail({
          tenantId: activeTenantId,
          toEmail: cleanEmail,
          otp,
          companyName
        });
      } catch (e: any) {
        console.warn('[LOGIN-OTP] Email dispatch error:', e.message);
      }
    }

    if (cleanMobile) {
      try {
        const smsRes = await sendSms({
          tenantId: activeTenantId,
          mobile: cleanMobile,
          templateType: 'LOGIN_2FA',
          variables: { otp, var: otp }
        });
        smsDispatched = smsRes.success;
      } catch (e: any) {
        console.warn('[LOGIN-OTP] SMS dispatch error:', e.message);
      }
    }

    if (user.role?.name === 'CLIENT' || !user.role || user.role?.name !== 'ADMIN') {
      try {
        const clientDoc: any = await Client.findOne({ $or: [{ userId: user._id || user.id }, { email: cleanEmail }] }).lean();
        if (clientDoc) {
          logActivity({
            tenantId: activeTenantId,
            actorType: 'CLIENT',
            actorId: user._id || user.id,
            actorName: clientDoc.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client',
            actorEmail: user.email,
            targetClientId: clientDoc._id || clientDoc.id,
            category: 'AUTH',
            action: 'LOGIN_OTP_SENT',
            title: 'Login OTP Requested',
            description: `Login OTP requested via ${isEmail ? `Email (${maskEmail(user.email)})` : `Mobile (${maskMobile(user.mobile)})`}`,
            status: 'SUCCESS',
            metadata: {
              identifier: isEmail ? user.email : user.mobile,
              channel: isEmail ? 'Email' : 'SMS',
              ipAddress: req.ip
            },
            req
          });
        }
      } catch (logErr) {}
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to your registered ${isEmail ? 'email' : 'mobile'}.`,
      data: {
        maskedEmail: maskEmail(user.email),
        maskedMobile: maskMobile(user.mobile),
        identifier: isEmail ? user.email : user.mobile
      }
    });
  } catch (err: any) {
    console.error('[LOGIN-OTP] Error in requestLoginOtp:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

/**
 * Verify OTP and login client directly (2FA is completely BYPASSED)
 */
export const loginWithOtp = async (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP are required' });
    }

    const cleanInput = String(identifier).trim();
    const isEmail = cleanInput.includes('@');
    let user: any = null;

    if (isEmail) {
      const cleanEmail = cleanInput.toLowerCase();
      user = await User.findOne({
        email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).populate({
        path: 'role',
        populate: {
          path: 'permissions',
          populate: { path: 'permission' }
        }
      }).populate('tenant').lean();
    } else {
      const digits = cleanInput.replace(/\D/g, '');
      const mobile10 = digits.slice(-10);
      user = await User.findOne({
        mobile: { $regex: new RegExp(`${mobile10}$`) }
      }).populate({
        path: 'role',
        populate: {
          path: 'permissions',
          populate: { path: 'permission' }
        }
      }).populate('tenant').lean();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const cleanEmail = String(user.email || '').toLowerCase().trim();
    const cleanMobile = String(user.mobile || '').trim();

    const verificationRecord: any = await EmailVerification.findOne({
      $or: [
        { email: cleanEmail },
        ...(cleanMobile ? [{ mobile: cleanMobile }] : [])
      ]
    }).lean();

    if (!verificationRecord) {
      return res.status(400).json({ success: false, message: 'No OTP requested or session expired. Please request a new OTP.' });
    }

    if (new Date(verificationRecord.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    const enteredOtp = String(otp).trim();
    if (String(verificationRecord.otp).trim() !== enteredOtp && String(verificationRecord.smsOtp).trim() !== enteredOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
    }

    // Clean up used OTP
    await EmailVerification.deleteOne({ _id: verificationRecord._id });

    // Issue tokens directly - 2FA is BYPASSED because user already verified OTP
    const userId = (user._id || user.id).toString();
    const activeTenantId = (user.tenantId || user.tenant?._id || user.tenant?.id)?.toString();
    const sessionId = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role?.name,
        tenantId: activeTenantId,
        tokenVersion: user.tokenVersion || 0,
        sessionId
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = jwt.sign(
      {
        id: userId,
        tokenVersion: user.tokenVersion || 0,
        sessionId
      },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      currentSessionId: sessionId,
      sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    await logAudit({
      tenantId: activeTenantId,
      userId,
      action: 'LOGIN_OTP',
      module: 'AUTH',
      ipAddress: req.ip
    });

    try {
      const clientDoc: any = await Client.findOne({ $or: [{ userId }, { email: user.email }] }).lean();
      if (clientDoc) {
        logActivity({
          tenantId: activeTenantId,
          actorType: 'CLIENT',
          actorId: userId,
          actorName: clientDoc.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client',
          actorEmail: user.email,
          targetClientId: clientDoc._id || clientDoc.id,
          category: 'AUTH',
          action: 'LOGIN_OTP',
          title: 'Client Logged In via OTP',
          description: `Client entered OTP and logged in successfully`,
          status: 'SUCCESS',
          metadata: {
            loginMethod: 'OTP Verification (Email/SMS)',
            identifier: cleanInput,
            ipAddress: req.ip
          },
          req
        });
      }
    } catch (logErr) {}

    const permissions =
      user.role?.permissions?.map((rp: any) => rp.permission?.code || rp.permissionCode).filter(Boolean) || [];

    const tenantTheme = user.tenant?.themeColor || '#2563eb';
    const isProfilePending = user.tenant?.status === 'PENDING_PROFILE';

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully with OTP',
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role?.name,
          permissions,
          tenantId: activeTenantId,
          tenantName: user.tenant?.companyName || 'Default Tenant',
          tenantLogo: user.tenant?.logoUrl || null,
          themeColor: tenantTheme,
          status: user.status,
          isProfilePending,
          kycFirst: user.tenant?.kycFirst !== false
        }
      }
    });
  } catch (err: any) {
    console.error('[LOGIN-OTP] Error in loginWithOtp:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};


