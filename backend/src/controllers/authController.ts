import nodemailer from 'nodemailer';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { User, Tenant, Client, NotificationLog, EmailVerification } from '../config/db';
import { centralModels } from '../services/tenantConnectionManager';
import tenantConnectionManager from '../services/tenantConnectionManager';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { logAudit } from '../services/auditService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendForgotPasswordEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-key-54321';

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

    if (!user || user.deletedAt || user.status === 'DELETED') {
      if (user && (user.deletedAt || user.status === 'DELETED')) {
        const adminMsg =
          user.role?.name === 'ADMIN'
            ? 'Your company has been removed. Please contact super admin.'
            : 'Your company has been removed. Please contact admin.';
        return res.status(403).json({
          success: false,
          message: adminMsg,
          errors: ['User deleted']
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: ['User not found']
      });
    }

    if (user.tenant) {
      if (user.tenant.status === 'DELETED' || user.tenant.deletedAt) {
        return res.status(403).json({
          success: false,
          message: 'Your company workspace has been removed. Please contact super admin.',
          errors: ['Tenant deleted', 'User inactive or suspended']
        });
      }
      if (user.tenant.status === 'SUSPENDED' && user.role?.name !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'This company portal has been suspended by Super Admin. Access is disabled.',
          errors: ['Tenant suspended', 'User inactive or suspended']
        });
      }
    }

    if (user.status === 'SUSPENDED') {
      const suspendMsg =
        user.role?.name === 'ADMIN'
          ? 'Your account is suspended. Please contact super admin.'
          : 'Your account is suspended. Please contact admin.';
      return res.status(403).json({
        success: false,
        message: suspendMsg,
        errors: ['User suspended', 'User inactive or suspended']
      });
    }

    if (user.status === 'PENDING_APPROVAL') {
      await User.findByIdAndUpdate(user._id || user.id, {
        status: 'ACTIVE',
        tempPassword: null
      });
      await Client.updateMany({ userId: user._id || user.id }, { status: 'ACTIVE' });
      user.status = 'ACTIVE';
    }

    if (user.status === 'INACTIVE') {
      const inactiveMsg =
        user.role?.name === 'ADMIN'
          ? 'Your account has been deactivated. Please contact super admin.'
          : 'Your account has been deactivated. Please contact admin.';
      return res.status(403).json({
        success: false,
        message: inactiveMsg,
        errors: ['User inactive']
      });
    }

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
    const userId = (user._id || user.id).toString();

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role?.name,
        tenantId: user.tenantId ? user.tenantId.toString() : null,
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

    // Update last login and session tracking
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      currentSessionId: sessionId,
      sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    // Write audit log
    await logAudit({
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      userId: userId,
      action: 'LOGIN',
      module: 'USERS',
      ipAddress: req.ip
    });

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
          tenantId: user.tenantId ? user.tenantId.toString() : null,
          tenantStatus: user.tenant?.status || null,
          tenantName: user.tenant?.companyName || 'RAGCP',
          tenantLogo: user.tenant?.logoUrl || null
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
    const user: any = await User.findOne({ email }).populate('role').lean();

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a new password has been sent to it.'
      });
    }

    const newPassword = 'Temp@' + Math.floor(100000 + Math.random() * 900000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id || user.id, { passwordHash });

    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const tenant: any = user.tenantId ? await Tenant.findById(user.tenantId).lean() : null;
    const userName = user.firstName + (user.lastName ? ' ' + user.lastName : '');

    await sendForgotPasswordEmail({
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      toEmail: email,
      name: userName,
      newPassword,
      loginUrl,
      companyName: tenant?.companyName || 'RAGCP Platform'
    });

    await NotificationLog.create({
      tenantId: user.tenantId || null,
      recipient: email,
      channel: 'EMAIL',
      title: 'Password Reset',
      message: `New temporary password sent to ${email}`,
      status: 'SENT'
    });

    return res.status(200).json({
      success: true,
      message: 'If this email is registered, a new password has been sent to it.'
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

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, { passwordHash });

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
      .select('id companyName')
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

    const user: any = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect current password' });

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
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await EmailVerification.findOneAndUpdate(
      { email },
      { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`OTP for ${email} is: ${otp}`);

    try {
      let smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      let smtpPort = parseInt(process.env.SMTP_PORT || '587');
      let smtpSecure = process.env.SMTP_SECURE === 'true';
      let smtpUser = process.env.SMTP_USER;
      let smtpPassword = process.env.SMTP_PASSWORD;
      let smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ragcp.com';

      const { tenantId } = req.body;
      if (tenantId) {
        const tenant: any = await Tenant.findById(tenantId).lean();
        if (tenant && tenant.smtpHost && tenant.smtpUser && tenant.smtpPassword) {
          smtpHost = tenant.smtpHost;
          smtpPort = tenant.smtpPort || 587;
          smtpSecure = smtpPort === 465;
          smtpUser = tenant.smtpUser;
          smtpPassword = tenant.smtpPassword;
          smtpFrom = tenant.smtpFrom || tenant.companyName || smtpUser;
        }
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        }
      });

      const mailOptions = {
        from: smtpFrom,
        to: email,
        subject: 'Your OTP for RAGCP Client Registration',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #1e293b;">Verify Your Email Address</h2>
            <p style="color: #475569; font-size: 16px;">You have requested to create a client account. Please use the following One-Time Password (OTP) to complete your registration:</p>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otp}</span>
            </div>
            <p style="color: #475569; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('OTP Email sent successfully via SMTP!');
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr);
    }

    return res.json({ success: true, message: 'OTP sent successfully to your email.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const record: any = await EmailVerification.findOne({ email }).lean();
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested for this email' });

    if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date(record.expiresAt) < new Date()) return res.status(400).json({ success: false, message: 'OTP has expired' });

    await EmailVerification.deleteOne({ email });

    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
