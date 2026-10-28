import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middlewares/auth';
import { dynamicDb, centralModels, User, Tenant, Penalty } from '../config/db';
import { sendEmail } from '../services/emailService';
import { sendSms } from '../services/smsService';
import axios from 'axios';

import { getJwtSecret } from '../config/jwtSecret';
const JWT_SECRET = getJwtSecret();

// In-memory OTP storage: key -> { otp, expiresAt, attempts }
const vaultOtpStore: Map<string, { otp: string; expiresAt: number; attempts: number }> = new Map();

/**
 * Sends unified 6-digit OTP to both Admin's registered Mobile and Email.
 */
export const requestVaultOtp = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const userModel = dynamicDb?.User || User;
    const user: any = await userModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tenantModel = dynamicDb?.Tenant || Tenant;
    const tenant: any = tenantId ? await tenantModel.findById(tenantId).lean() : null;

    const email = user.email || tenant?.email;
    const mobile = user.mobile || tenant?.mobile;

    // Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    vaultOtpStore.set(userId, { otp, expiresAt, attempts: 0 });

    // 1. Send OTP to registered Email
    if (email) {
      const subject = `[Security Alert] Secret Compliance Vault Verification OTP: ${otp}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
          <h2 style="color: #f59e0b; margin-top: 0; font-size: 20px;">🛡️ Compliance Vault Security Access</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            A request was initiated to open the <strong>SEBI Compliance Penalty Override Vault</strong>.
          </p>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            This OTP is valid for 5 minutes. Enter this code in the portal to verify and unlock the vault. If this was not requested by you, contact security immediately.
          </p>
        </div>
      `;

      sendEmail(
        tenantId ? String(tenantId) : undefined,
        email,
        subject,
        html
      ).catch((mailErr: any) => {
        console.warn('Vault OTP email send warning:', mailErr?.message || mailErr);
      });
    }

    // 2. Send OTP to registered Mobile (SMS via DLT compliant sendSms)
    let smsDispatched = false;
    let smsFailureReason = '';

    if (mobile && tenant?.smsGatewayEnabled) {
      try {
        const smsRes = await sendSms({
          tenantId: tenantId ? String(tenantId) : null,
          mobile,
          templateType: 'LOGIN_2FA',
          variables: { otp, var: otp, code: otp }
        });
        if (smsRes.success) {
          smsDispatched = true;
          console.log(`✅ [VAULT-OTP] SMS successfully sent to ${mobile}: ${smsRes.rawResponse || 'OK'}`);
        } else {
          smsFailureReason = smsRes.message || smsRes.reason || 'SMS Gateway error';
          console.warn(`⚠️ [VAULT-OTP] SMS dispatch failed for ${mobile}: ${smsFailureReason}`);
        }
      } catch (smsErr: any) {
        smsFailureReason = smsErr?.message || 'Failed to dispatch SMS';
        console.warn(`⚠️ [VAULT-OTP] SMS dispatch exception:`, smsFailureReason);
      }
    } else if (mobile && !tenant?.smsGatewayEnabled) {
      smsFailureReason = 'SMS Gateway is not enabled in Tenant Settings';
      console.log(`ℹ️ [VAULT-OTP] SMS Gateway disabled for tenant ${tenantId}, skipping SMS`);
    }

    const maskedEmail = email ? email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*') : 'N/A';
    const maskedMobile = mobile ? mobile.slice(-4).padStart(mobile.length, '*') : 'N/A';

    let statusMessage = `Verification OTP has been dispatched to your registered Email (${maskedEmail})`;
    if (smsDispatched) {
      statusMessage += ` and Mobile (${maskedMobile}).`;
    } else if (mobile) {
      statusMessage += `. (Mobile SMS: ${smsFailureReason || 'Not delivered, please check Email'}).`;
    } else {
      statusMessage += `.`;
    }

    return res.status(200).json({
      success: true,
      smsDispatched,
      message: statusMessage,
      expiresInSeconds: 300
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to generate OTP' });
  }
};

/**
 * Verifies single 6-digit OTP and returns short-lived vault token.
 */
export const verifyVaultOtp = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { otp } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!otp || String(otp).trim().length !== 6) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit OTP' });
  }

  const record = vaultOtpStore.get(userId);
  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP request found. Please click the button to generate a new OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    vaultOtpStore.delete(userId);
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
  }

  if (record.attempts >= 5) {
    vaultOtpStore.delete(userId);
    return res.status(403).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
  }

  if (record.otp.trim() !== String(otp).trim()) {
    record.attempts += 1;
    return res.status(400).json({ success: false, message: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.` });
  }

  // Clear OTP on successful match
  vaultOtpStore.delete(userId);

  // Issue 15-minute signed vault token
  const vaultToken = jwt.sign(
    {
      userId,
      tenantId: req.user?.tenantId,
      scope: 'SECRET_COMPLIANCE_VAULT'
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return res.status(200).json({
    success: true,
    message: 'Identity verified successfully. Vault access granted.',
    vaultToken
  });
};

/**
 * Middleware to verify vault token from headers or body
 */
export const requireVaultToken = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const token = (req.headers['x-vault-token'] as string) || req.body?.vaultToken || req.query?.vaultToken;
  if (!token) {
    return res.status(403).json({ success: false, message: 'Vault session token required. Please verify OTP first.' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.scope !== 'SECRET_COMPLIANCE_VAULT') {
      return res.status(403).json({ success: false, message: 'Invalid vault token scope' });
    }
    (req as any).vaultUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Vault session has expired. Please re-verify OTP.' });
  }
};

/**
 * Fetches all penalties with occurrence frequency, month, and mask status
 */
export const getVaultPenalties = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Tenant context required' });
  }

  try {
    const penaltyModel = dynamicDb?.Penalty || Penalty;
    const penalties = await penaltyModel.find({ tenantId, status: { $ne: 'WAIVED' } })
      .populate({
        path: 'auditId',
        populate: { path: 'requirementId' }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Group to count occurrences of the same reason/regulation
    const reasonCounts: Record<string, number> = {};
    const formatted = penalties.map((p: any, idx: number) => {
      const audit = p.auditId || {};
      const reqDoc = audit.requirementId || {};
      const reasonKey = p.reason || reqDoc.title || 'General Compliance Penalty';

      reasonCounts[reasonKey] = (reasonCounts[reasonKey] || 0) + 1;
      const occurrenceNumber = reasonCounts[reasonKey];

      const createdDate = p.createdAt ? new Date(p.createdAt) : new Date();
      const monthLabel = createdDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      return {
        id: p._id?.toString() || p.id,
        amount: Number(p.amount || 0),
        reason: p.reason || reqDoc.title || 'Compliance Violation',
        regulation: reqDoc.regulationReference || reqDoc.category || 'SEBI (RA) Regulations',
        status: p.status || 'PENDING_PAYMENT',
        month: monthLabel,
        createdAt: createdDate,
        occurrenceNumber,
        isMasked: Boolean(p.isMasked),
        maskedAt: p.maskedAt || null
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
      totalCount: formatted.length,
      maskedCount: formatted.filter((p: any) => p.isMasked).length
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to fetch vault penalties' });
  }
};

/**
 * Toggles mask status on a penalty record
 */
export const togglePenaltyMask = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { penaltyId, isMasked } = req.body;

  if (!penaltyId) {
    return res.status(400).json({ success: false, message: 'Penalty ID is required' });
  }

  try {
    const penaltyModel = dynamicDb?.Penalty || Penalty;
    const updated = await penaltyModel.findOneAndUpdate(
      { _id: penaltyId, tenantId },
      {
        $set: {
          isMasked: Boolean(isMasked),
          maskedAt: isMasked ? new Date() : null,
          maskedBy: isMasked ? req.user?.id : null
        }
      },
      { returnDocument: 'after', lean: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Penalty record not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Penalty has been ${isMasked ? 'MASKED / HIDDEN from calculations' : 'UNMASKED / ACTIVE'}.`,
      data: {
        id: updated._id?.toString() || updated.id,
        isMasked: Boolean(updated.isMasked),
        maskedAt: updated.maskedAt
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to update mask state' });
  }
};
