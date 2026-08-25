import { Request, Response } from 'express';
import * as crypto from 'crypto';
import prisma from '../config/db';
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        tenant: true
      }
    });

    if (!user || user.deletedAt || user.status === 'DELETED') {
      if (user && (user.deletedAt || user.status === 'DELETED')) {
        const adminMsg = user.role.name === 'ADMIN' ? 'Your company has been removed. Please contact super admin.' : 'Your company has been removed. Please contact admin.';
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

    if (user.status === 'SUSPENDED') {
      const suspendMsg = user.role.name === 'ADMIN' ? 'Your account is suspended. Please contact super admin.' : 'Your account is suspended. Please contact admin.';
      return res.status(403).json({
        success: false,
        message: suspendMsg,
        errors: ['User suspended']
      });
    }

    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval by the admin.',
        errors: ['User pending approval']
      });
    }

    if (user.status === 'INACTIVE') {
      const inactiveMsg = user.role.name === 'ADMIN' ? 'Your account has been deactivated. Please contact super admin.' : 'Your account has been deactivated. Please contact admin.';
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

    const permissions = user.role.permissions.map(rp => rp.permission.code);

    const sessionId = crypto.randomUUID();

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role.name,
        tenantId: user.tenantId,
        tokenVersion: user.tokenVersion,
        sessionId: sessionId
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        tokenVersion: user.tokenVersion,
        sessionId: sessionId
      },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login and session tracking
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        currentSessionId: sessionId,
        sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    // Write audit log
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
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
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role.name,
          allowMultiDeviceLogin: user.role.allowMultiDeviceLogin,
          permissions,
          tenantId: user.tenantId,
          tenantStatus: user.tenant?.status || null,
          tenantName: user.tenant?.companyName || 'RAGCP',
          tenantLogo: user.tenant?.logoUrl || null
        }
      }
    });
  } catch (error: any) {
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
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Invalid or suspended user session',
        errors: ['User invalid']
      });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name, tenantId: user.tenantId },
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      // Security: don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a new password has been sent to it.'
      });
    }

    // Generate new temporary password
    const newPassword = 'Temp@' + Math.floor(100000 + Math.random() * 900000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    // Get login URL from request origin
    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;

    // Fetch company name
    const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId } }) : null;
    const userName = user.firstName + (user.lastName ? ' ' + user.lastName : '');

    // Send email with new password
    await sendForgotPasswordEmail({
      tenantId: user.tenantId,
      toEmail: email,
      name: userName,
      newPassword,
      loginUrl,
      companyName: tenant?.companyName || 'RAGCP Platform'
    });

    // Notification log
    await prisma.notificationLog.create({
      data: {
        tenantId: user.tenantId,
        recipient: email,
        channel: 'EMAIL',
        title: 'Password Reset',
        message: `New temporary password sent to ${email}`,
        status: 'SENT'
      }
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

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        tenant: true,
        staff: {
          include: {
            personAssociated: true
          }
        },
        client: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissions = user.role.permissions.map(rp => rp.permission.code);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role.name,
          allowMultiDeviceLogin: user.role.allowMultiDeviceLogin,
          permissions,
          tenantId: user.tenantId,
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
    const tenants = await prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        companyName: true
      }
    });

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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
        currentSessionId: null,
        sessionExpiresAt: null
      }
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
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          tokenVersion: { increment: 1 },
          currentSessionId: null,
          sessionExpiresAt: null
        }
      });
    } else {
      // Just clear the current session ID to allow single-device logins again
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          currentSessionId: null,
          sessionExpiresAt: null
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};
