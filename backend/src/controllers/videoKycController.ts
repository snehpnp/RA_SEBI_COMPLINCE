import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import dynamicDb, { Tenant, Client, VideoKycSession } from '../config/db';
import { sendVideoKycInviteEmail } from '../services/emailService';

export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'your registered email';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

// Ensure video storage directory exists matching api.ts upload roots
export const getVideoKycUploadDir = () => {
  const candidates = [
    path.resolve(process.cwd(), '../uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(__dirname, '../../uploads'),
    path.resolve(__dirname, '../../../uploads'),
    'A:/RA_SEBI_COMPLINCE/uploads',
    'A:/RA_SEBI_COMPLINCE/backend/uploads'
  ];
  let root = path.resolve(process.cwd(), 'uploads');
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      root = c;
      break; 
    }
  }
  const dir = path.join(root, 'video-kyc');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
  return dir;
};

/**
 * Helper to generate random 4-digit numeric OTP
 */
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Helper to dynamically resolve frontend base URL matching request host / domain
 */
export function resolveFrontendBaseUrl(req: Request): string {
  // 1. If explicit origin passed in request body
  if (req.body && req.body.origin && typeof req.body.origin === 'string') {
    return req.body.origin.replace(/\/$/, '');
  }

  // 2. If origin header present and not localhost
  const originHeader = req.headers.origin;
  if (originHeader && typeof originHeader === 'string' && !originHeader.includes('localhost') && !originHeader.includes('127.0.0.1')) {
    return originHeader.replace(/\/$/, '');
  }

  // 3. If x-forwarded-host present (from Nginx / Reverse Proxy)
  const fwdHost = (req.headers['x-forwarded-host'] as string);
  if (fwdHost && !fwdHost.includes('localhost') && !fwdHost.includes('127.0.0.1')) {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    const cleanHost = fwdHost.split(',')[0].trim();
    return `${proto}://${cleanHost}`.replace(/\/$/, '');
  }

  // 4. If referer header present and not localhost
  const refererHeader = req.headers.referer;
  if (refererHeader && typeof refererHeader === 'string') {
    try {
      const u = new URL(refererHeader);
      if (!u.origin.includes('localhost') && !u.origin.includes('127.0.0.1')) {
        return u.origin.replace(/\/$/, '');
      }
    } catch {}
  }

  // 4. If host header present and not localhost
  const host = req.headers.host;
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  // 5. Environment variable if set and not localhost
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }

  // 6. Safe Fallback
  return (originHeader as string) || process.env.FRONTEND_URL || 'https://client.pnpuniverse.com';
}

/**
 * 1. Create or Request Video KYC Session
 * Can be called by Admin (initiates session, optionally modifies consent text)
 * or by Client (if tenant allows clientVideoKycRequestEnabled).
 */
export async function createVideoKycSession(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const user = (req as any).user;
    const { clientId, customConsentText, scheduleType, scheduledAt } = req.body;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required.' });
    }

    // Load Tenant Settings
    const tenant = await dynamicDb.Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    if (tenant.videoKycEnabled === false) {
      return res.status(400).json({ success: false, message: 'Video KYC feature is currently disabled in system settings.' });
    }

    const isAdmin = user && ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE', 'STAFF'].includes(user.role);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Video KYC verification sessions can only be initiated by the Compliance Officer / Admin.'
      });
    }
    const initiatedBy = 'ADMIN';

    const targetClientId = clientId;
    if (!targetClientId) {
      return res.status(400).json({ success: false, message: 'Target client ID is required.' });
    }

    let client: any = null;
    if (mongoose.Types.ObjectId.isValid(targetClientId)) {
      client = await dynamicDb.Client.findById(targetClientId);
      if (!client) {
        client = await dynamicDb.Client.findOne({ userId: targetClientId });
      }
      if (!client) {
        // Check if targetClientId is a User ID
        const userDoc: any = await dynamicDb.User.findById(targetClientId).lean();
        if (userDoc) {
          client = await dynamicDb.Client.findOne({ userId: userDoc._id || userDoc.id });
          if (!client) {
            const fullName = `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || userDoc.name || userDoc.email || 'Client';
            client = await dynamicDb.Client.create({
              tenantId: tenantId,
              userId: userDoc._id || userDoc.id,
              name: fullName,
              email: userDoc.email,
              mobile: userDoc.mobile || '9999999999',
              pan: userDoc.pan && userDoc.pan !== 'N/A' ? userDoc.pan : undefined,
              aadhaar: userDoc.aadhaar && userDoc.aadhaar !== 'N/A' ? userDoc.aadhaar : undefined,
              category: userDoc.category || 'INDIVIDUAL',
              occupation: userDoc.occupation || 'other',
              status: userDoc.status || 'ACTIVE',
              kycStatus: userDoc.kycStatus || 'PENDING',
              videoKycStatus: 'PENDING',
              createdById: userDoc.createdById || user.id || null
            });
          }
        }
      }
    }

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // 1. Rule: Once approved, a client cannot undergo Video KYC again
    const approvedSession = await dynamicDb.VideoKycSession.findOne({
      tenantId,
      clientId: client._id,
      status: 'APPROVED'
    });
    if (approvedSession || (client as any).videoKycStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'This client has already completed Video KYC and is APPROVED. A new Video KYC session cannot be initiated for an approved client.'
      });
    }

    const clientIds = [client._id, ...(client.userId ? [client.userId] : [])];

    // 2. Rule: Agreement Eligibility based on Tenant Policy
    if (tenant.videoKycAgreementRule === 'SIGNED_ONLY') {
      const agreements = await dynamicDb.Agreement.find({
        clientId: { $in: clientIds }
      }).lean();
      const hasSigned = agreements.some((a: any) => a.status === 'SIGNED' || a.signedAt || a.status === 'COMPLETED');
      if (!hasSigned && (client as any).agreementStatus !== 'SIGNED' && (client as any).agreementStatus !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Video KYC policy requires a signed Service Agreement. Client has not completed agreement signing.'
        });
      }
    } else if (tenant.videoKycAgreementRule === 'PENDING_ONLY') {
      const agreements = await dynamicDb.Agreement.find({
        clientId: { $in: clientIds }
      }).lean();
      const hasSigned = agreements.some((a: any) => a.status === 'SIGNED' || a.signedAt || a.status === 'COMPLETED');
      if (hasSigned || (client as any).agreementStatus === 'SIGNED' || (client as any).agreementStatus === 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Video KYC policy is currently restricted to clients with pending agreements.'
        });
      }
    }

    // 3. Rule: Subscription Plan Eligibility based on Tenant Policy
    if (tenant.videoKycPlanRule === 'ACTIVE_ONLY') {
      const activeSubs = await dynamicDb.Subscription.find({
        clientId: { $in: clientIds },
        status: 'ACTIVE',
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: new Date() } }
        ]
      }).lean();
      if (!activeSubs || activeSubs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Video KYC policy requires an active subscription plan. Client does not have an active plan.'
        });
      }
    } else if (tenant.videoKycPlanRule === 'EXPIRED_ONLY') {
      const activeSubs = await dynamicDb.Subscription.find({
        clientId: { $in: clientIds },
        status: 'ACTIVE',
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: new Date() } }
        ]
      }).lean();
      if (activeSubs && activeSubs.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Video KYC policy is currently restricted to clients with expired plans or without a plan.'
        });
      }
    }

    // 4. Rule: If a recording is already created and submitted (COMPLETED), admin must approve or reject first
    const pendingReviewSession = await dynamicDb.VideoKycSession.findOne({
      tenantId,
      clientId: client._id,
      status: 'COMPLETED'
    });
    if (pendingReviewSession) {
      return res.status(400).json({
        success: false,
        message: 'A Video KYC recording has already been submitted for this client and is pending review. Please Approve or Reject the current recording before creating a new request.'
      });
    }

    // Check if an active requested/scheduled session already exists
    const existing = await dynamicDb.VideoKycSession.findOne({
      tenantId,
      clientId: client._id,
      status: { $in: ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'] }
    }).sort({ createdAt: -1 });




    // Prepare personalized consent statement
    const rawConsent = (customConsentText && customConsentText.trim()) ||
      tenant.globalVideoKycConsentText ||
      'I, {{clientName}}, confirm that I have voluntarily subscribed to the research services of {{companyName}}. I have reviewed and signed the SEBI Research Analyst Service Agreement and confirm that my PAN card is {{pan}}.';

    const clientName = client.name || (client as any).panName || 'Client';
    const companyName = tenant.companyName || 'Research Analyst Advisory';
    const pan = client.pan || 'N/A';
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const resolvedConsent = rawConsent
      .replace(/\{\{\s*clientName\s*\}\}/gi, clientName)
      .replace(/\{\{\s*companyName\s*\}\}/gi, companyName)
      .replace(/\{\{\s*pan\s*\}\}/gi, pan)
      .replace(/\{\{\s*date\s*\}\}/gi, today);

    // Resolve Instant vs Scheduled Mode & 24-Hour Expiration
    const now = new Date();
    const isSchedule = scheduleType === 'SCHEDULED' && scheduledAt;
    const targetStatus = isSchedule ? 'SCHEDULED' : 'REQUESTED';
    const resolvedScheduledAt = isSchedule ? new Date(scheduledAt) : null;
    const resolvedScheduleType = isSchedule ? 'SCHEDULED' : 'INSTANT';

    // 24-hour expiration timestamp
    const expiresAt = isSchedule && resolvedScheduledAt
      ? new Date(resolvedScheduledAt.getTime() + 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // If existing session is older than 24 hours, mark it expired and generate a fresh session
    const isExistingExpired = existing && (
      existing.expiresAt
        ? now > new Date(existing.expiresAt)
        : (now.getTime() - new Date(existing.createdAt).getTime() > 24 * 60 * 60 * 1000)
    );

    if (existing && isExistingExpired) {
      existing.status = 'EXPIRED';
      await existing.save();
    }

    const activeExisting = (existing && !isExistingExpired) ? existing : null;
    const finalSessionId = activeExisting?.sessionId || `VKYC-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const finalOtpCode = activeExisting?.otpCode || generateOtp();

    let sessionDoc;
    if (activeExisting) {
      activeExisting.consentText = resolvedConsent;
      activeExisting.status = targetStatus;
      activeExisting.scheduleType = resolvedScheduleType;
      activeExisting.scheduledAt = resolvedScheduledAt;
      activeExisting.expiresAt = expiresAt;
      await activeExisting.save();
      sessionDoc = activeExisting;
    } else {
      sessionDoc = await dynamicDb.VideoKycSession.create({
        tenantId,
        clientId: client._id,
        sessionId: finalSessionId,
        status: targetStatus,
        scheduleType: resolvedScheduleType,
        scheduledAt: resolvedScheduledAt,
        expiresAt,
        initiatedBy,
        consentText: resolvedConsent,
        otpCode: finalOtpCode
      });
    }

    const sessionId = sessionDoc.sessionId;
    const otpCode = sessionDoc.otpCode;

    // Determine Frontend Base URL for Invite Link
    const frontendUrl = resolveFrontendBaseUrl(req);
    const videoKycUrl = `${frontendUrl}/video-kyc/?sessionId=${sessionId}&role=client`;

    // Send Email to Client if they have a valid email
    if (client.email) {
      sendVideoKycInviteEmail(
        tenantId.toString(),
        client.email,
        clientName,
        companyName,
        videoKycUrl,
        otpCode,
        pan,
        { scheduleType: resolvedScheduleType, scheduledAt: resolvedScheduledAt }
      ).catch(err => {
        console.error('[VIDEO-KYC] Failed to send invite email:', err?.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: isSchedule
        ? 'Video KYC session scheduled successfully and invitation dispatched.'
        : 'Video KYC session created and live link generated successfully.',
      data: {
        session: sessionDoc,
        videoKycUrl,
        otpCode,
        consentText: resolvedConsent,
        scheduleType: resolvedScheduleType,
        scheduledAt: resolvedScheduledAt
      }
    });
  } catch (error: any) {
    console.error('Error creating Video KYC session:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to create Video KYC session.' });
  }
}

/**
 * 1.1 Start Early / Officer Override for Scheduled Video KYC Session
 */
export async function startEarlySession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await dynamicDb.VideoKycSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Video KYC session not found.' });
    }

    session.status = 'IN_PROGRESS';
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Video KYC session unlocked early by Compliance Officer.',
      data: session
    });
  } catch (error: any) {
    console.error('Error starting early session:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to start early.' });
  }
}

/**
 * 2. Get Video KYC Session Details by SessionId (Accessible with token or direct sessionId for participants)
 */
export async function getSessionDetails(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await dynamicDb.VideoKycSession.findOne({ sessionId })
      .populate('clientId', 'name firstName lastName email mobile pan kraStatus kycStatus')
      .populate('reviewedBy', 'name email');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Video KYC session not found.' });
    }

    // Check 24-hour expiration dynamically
    const now = new Date();
    const isExpired = ['REQUESTED', 'SCHEDULED'].includes(session.status) && (
      session.expiresAt
        ? now > new Date(session.expiresAt)
        : (now.getTime() - new Date(session.createdAt).getTime() > 24 * 60 * 60 * 1000)
    );
    if (isExpired && session.status !== 'EXPIRED') {
      session.status = 'EXPIRED';
      await session.save();
    }

    // Also get tenant info
    const tenant = await dynamicDb.Tenant.findById(session.tenantId).select(
      'companyName logoUrl videoKycEnabled clientVideoKycRequestEnabled'
    );

    const clientEmail = (session.clientId as any)?.email;
    const maskedEmail = maskEmail(clientEmail);

    // If client is fetching session, do not leak otpCode in JSON
    const sessionObj = session.toObject ? session.toObject() : JSON.parse(JSON.stringify(session));

    // Check if requester is authenticated admin
    const authHeader = req.headers.authorization;
    let isAdminUser = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE', 'STAFF'].includes(decoded.role)) {
          isAdminUser = true;
        }
      } catch {}
    }

    if (!isAdminUser) {
      delete sessionObj.otpCode;
    }

    return res.status(200).json({
      success: true,
      data: {
        session: sessionObj,
        tenant,
        maskedEmail
      }
    });
  } catch (error: any) {
    console.error('Error fetching Video KYC session:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to load session details.' });
  }
}

/**
 * 2b. Verify Video KYC 4-Digit Email OTP
 */
export async function verifyVideoKycOtp(req: Request, res: Response) {
  try {
    const { sessionId, otpCode } = req.body;
    if (!sessionId || !otpCode) {
      return res.status(400).json({ success: false, message: 'Session ID and 4-digit OTP are required.' });
    }

    const session = await dynamicDb.VideoKycSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Video KYC session not found.' });
    }

    // Check if session is expired (24h)
    const now = new Date();
    const isExpired = ['REQUESTED', 'SCHEDULED'].includes(session.status) && (
      session.expiresAt
        ? now > new Date(session.expiresAt)
        : (now.getTime() - new Date(session.createdAt).getTime() > 24 * 60 * 60 * 1000)
    );
    if (isExpired || session.status === 'EXPIRED') {
      if (session.status !== 'EXPIRED') {
        session.status = 'EXPIRED';
        await session.save();
      }
      return res.status(410).json({
        success: false,
        code: 'LINK_EXPIRED',
        message: 'This Video KYC verification link has expired (24 hours exceeded). Please contact your advisor or compliance team for a new link.'
      });
    }

    // Block re-joining if session is already approved, rejected, or completed
    if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(session.status)) {
      return res.status(403).json({
        success: false,
        code: 'SESSION_CONCLUDED',
        message: `This Video KYC session has been ${session.status.toLowerCase()} and cannot be rejoined. Please request a new verification session.`
      });
    }

    if (!session.otpCode || session.otpCode.trim() !== String(otpCode).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please enter the correct 4-digit code sent to your registered email.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now proceed to Video KYC verification.'
    });
  } catch (error: any) {
    console.error('Error verifying Video KYC OTP:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to verify OTP.' });
  }
}

/**
 * 2c. Resend Video KYC 4-Digit Email OTP
 */
export async function resendVideoKycOtp(req: Request, res: Response) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await dynamicDb.VideoKycSession.findOne({ sessionId })
      .populate('clientId', 'name firstName lastName email pan mobile');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Video KYC session not found.' });
    }

    const client: any = session.clientId;
    if (!client || !client.email) {
      return res.status(400).json({ success: false, message: 'No registered email found for this client.' });
    }

    // Generate fresh OTP
    const newOtp = generateOtp();
    session.otpCode = newOtp;
    await session.save();

    const tenant = await dynamicDb.Tenant.findById(session.tenantId);
    const companyName = tenant?.companyName || 'Research Analyst Services';
    const frontendUrl = resolveFrontendBaseUrl(req);
    const videoKycUrl = `${frontendUrl}/video-kyc/?sessionId=${sessionId}&role=client`;
    const clientName = client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';

    await sendVideoKycInviteEmail(
      session.tenantId?.toString(),
      client.email,
      clientName,
      companyName,
      videoKycUrl,
      newOtp,
      client.pan || 'N/A',
      { scheduleType: session.scheduleType, scheduledAt: session.scheduledAt }
    );

    return res.status(200).json({
      success: true,
      message: `A fresh 4-digit OTP has been dispatched to ${maskEmail(client.email)}.`
    });
  } catch (error: any) {
    console.error('Error resending Video KYC OTP:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to resend OTP.' });
  }
}

/**
 * 3. List Video KYC Sessions (Admin compliance desk filterable by status/client)
 */
export async function listVideoKycSessions(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { status, clientId, search, page = 1, limit = 20 } = req.query;

    // Auto-expire sessions older than 24 hours
    const now = new Date();
    await dynamicDb.VideoKycSession.updateMany(
      {
        tenantId,
        status: { $in: ['REQUESTED', 'SCHEDULED'] },
        $or: [
          { expiresAt: { $ne: null, $lt: now } },
          { expiresAt: null, createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
        ]
      },
      { $set: { status: 'EXPIRED' } }
    ).catch(() => {});

    const filter: any = { tenantId };
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (clientId) {
      filter.clientId = clientId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [sessions, total] = await Promise.all([
      dynamicDb.VideoKycSession.find(filter)
        .populate('clientId', 'name firstName lastName email mobile pan kycStatus')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      dynamicDb.VideoKycSession.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        sessions,
        total,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error: any) {
    console.error('Error listing Video KYC sessions:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to list Video KYC sessions.' });
  }
}

/**
 * 4. Upload Compressed Video Recording & Snapshots (Multer handler)
 */
export async function uploadRecording(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const file = req.file;
    const { durationSeconds, geoData, panSnapshot, clientFaceSnapshot } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await dynamicDb.VideoKycSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Video KYC session not found.' });
    }

    const uploadDir = getVideoKycUploadDir();

    if (file && file.size > 0) {
      session.videoUrl = `/uploads/video-kyc/${file.filename}`;
      session.fileName = file.filename;
      session.fileSize = file.size;
    }

    if (durationSeconds) {
      session.durationSeconds = Number(durationSeconds);
    }

    if (geoData) {
      try {
        session.geoData = typeof geoData === 'string' ? JSON.parse(geoData) : geoData;
      } catch { }
    }

    // Save base64 snapshots if provided
    const snapshotsList: Array<{ type: 'PAN' | 'FACE' | 'OTHER'; url: string; capturedAt: Date; label?: string }> = session.snapshots || [];

    if (panSnapshot && typeof panSnapshot === 'string' && panSnapshot.startsWith('data:image')) {
      const base64Data = panSnapshot.replace(/^data:image\/\w+;base64,/, '');
      const snapName = `${sessionId}_pan_${Date.now()}.jpg`;
      const snapPath = path.join(uploadDir, snapName);
      fs.writeFileSync(snapPath, Buffer.from(base64Data, 'base64'));
      const snapUrl = `/uploads/video-kyc/${snapName}`;
      session.panSnapshotUrl = snapUrl;
      snapshotsList.push({ type: 'PAN', url: snapUrl, capturedAt: new Date(), label: 'PAN Card Snapshot' });
    }

    if (clientFaceSnapshot && typeof clientFaceSnapshot === 'string' && clientFaceSnapshot.startsWith('data:image')) {
      const base64Data = clientFaceSnapshot.replace(/^data:image\/\w+;base64,/, '');
      const snapName = `${sessionId}_face_${Date.now()}.jpg`;
      const snapPath = path.join(uploadDir, snapName);
      fs.writeFileSync(snapPath, Buffer.from(base64Data, 'base64'));
      const snapUrl = `/uploads/video-kyc/${snapName}`;
      session.clientFaceSnapshotUrl = snapUrl;
      snapshotsList.push({ type: 'FACE', url: snapUrl, capturedAt: new Date(), label: 'Client Live Face' });
    }

    // Support additional multiple snapshots passed in req.body.snapshots
    if (req.body.snapshots) {
      try {
        const extraSnaps = typeof req.body.snapshots === 'string' ? JSON.parse(req.body.snapshots) : req.body.snapshots;
        if (Array.isArray(extraSnaps)) {
          extraSnaps.forEach((s: any, idx: number) => {
            if (s.base64 && typeof s.base64 === 'string' && s.base64.startsWith('data:image')) {
              const base64Data = s.base64.replace(/^data:image\/\w+;base64,/, '');
              const sType = s.type === 'PAN' ? 'PAN' : s.type === 'FACE' ? 'FACE' : 'OTHER';
              const snapName = `${sessionId}_${sType.toLowerCase()}_${idx + 1}_${Date.now()}.jpg`;
              const snapPath = path.join(uploadDir, snapName);
              fs.writeFileSync(snapPath, Buffer.from(base64Data, 'base64'));
              const snapUrl = `/uploads/video-kyc/${snapName}`;
              snapshotsList.push({ type: sType, url: snapUrl, capturedAt: new Date(), label: s.label || `${sType} Snapshot ${idx + 1}` });
            }
          });
        }
      } catch (e) {
        console.warn('Error parsing extra snapshots:', e);
      }
    }

    session.snapshots = snapshotsList;
    if (req.body.isInterrupted === 'true' || req.body.disconnectReason) {
      const reason = req.body.disconnectReason || 'Participant disconnected / tab closed';
      session.adminNotes = session.adminNotes ? `${session.adminNotes} (Auto-Saved: ${reason})` : `(Auto-Saved on Disconnect: ${reason})`;
    }
    session.status = 'COMPLETED';
    await session.save();

    // Sync client videoKycStatus to IN_PROGRESS (pending compliance approval)
    if (session.clientId) {
      await dynamicDb.Client.findByIdAndUpdate(session.clientId, {
        videoKycStatus: 'IN_PROGRESS',
        videoKycSessionId: session.sessionId
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Video recording and KYC artifacts uploaded and compressed successfully.',
      data: session
    });
  } catch (error: any) {
    console.error('Error uploading Video KYC recording:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to upload recording.' });
  }
}

/**
 * 5. Review Video KYC Session (Admin Approves or Rejects with Reason)
 */
export async function reviewSession(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const user = (req as any).user;
    const { sessionId } = req.params;
    const { status, rejectionReason, adminNotes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED or REJECTED.' });
    }

    if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    }

    const session = await dynamicDb.VideoKycSession.findOne({ sessionId, tenantId })
      .populate('clientId', 'name email mobile');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Video KYC session not found.' });
    }

    session.status = status;
    session.rejectionReason = status === 'REJECTED' ? rejectionReason.trim() : undefined;
    session.adminNotes = adminNotes ? adminNotes.trim() : session.adminNotes;
    session.reviewedBy = user?._id || user?.id;
    session.reviewedAt = new Date();
    await session.save();

    // Update Client record videoKycStatus
    if (session.clientId) {
      const clientId = (session.clientId as any)._id || session.clientId;
      await dynamicDb.Client.findByIdAndUpdate(clientId, {
        videoKycStatus: status,
        videoKycSessionId: session.sessionId
      });
    }

    return res.status(200).json({
      success: true,
      message: `Video KYC session has been ${status.toLowerCase()} successfully.`,
      data: session
    });
  } catch (error: any) {
    console.error('Error reviewing Video KYC session:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to review session.' });
  }
}

/**
 * 6. Get Video KYC Settings (Admin)
 */
export async function getVideoKycSettings(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const tenant = await dynamicDb.Tenant.findById(tenantId).select(
      'videoKycEnabled clientVideoKycRequestEnabled videoKycAgreementRule videoKycPlanRule globalVideoKycConsentText'
    );

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        videoKycEnabled: tenant.videoKycEnabled !== false,
        clientVideoKycRequestEnabled: tenant.clientVideoKycRequestEnabled !== false,
        videoKycAgreementRule: tenant.videoKycAgreementRule || 'ALL',
        videoKycPlanRule: tenant.videoKycPlanRule || 'ALL',
        globalVideoKycConsentText:
          tenant.globalVideoKycConsentText ||
          'I, {{clientName}}, confirm that I have voluntarily subscribed to the research services of {{companyName}}. I have reviewed and signed the SEBI Research Analyst Service Agreement and confirm that my PAN card is {{pan}}.'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to get settings.' });
  }
}

/**
 * 7. Update Video KYC Settings (Admin)
 */
export async function updateVideoKycSettings(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { 
      videoKycEnabled, 
      clientVideoKycRequestEnabled, 
      videoKycAgreementRule, 
      videoKycPlanRule, 
      globalVideoKycConsentText 
    } = req.body;

    const tenant = await dynamicDb.Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    if (videoKycEnabled !== undefined) {
      tenant.videoKycEnabled = Boolean(videoKycEnabled);
    }
    if (clientVideoKycRequestEnabled !== undefined) {
      tenant.clientVideoKycRequestEnabled = Boolean(clientVideoKycRequestEnabled);
    }
    if (videoKycAgreementRule !== undefined) {
      tenant.videoKycAgreementRule = videoKycAgreementRule;
    }
    if (videoKycPlanRule !== undefined) {
      tenant.videoKycPlanRule = videoKycPlanRule;
    }
    if (globalVideoKycConsentText !== undefined) {
      tenant.globalVideoKycConsentText = globalVideoKycConsentText;
    }

    await tenant.save();

    return res.status(200).json({
      success: true,
      message: 'Video KYC settings updated successfully.',
      data: {
        videoKycEnabled: tenant.videoKycEnabled,
        clientVideoKycRequestEnabled: tenant.clientVideoKycRequestEnabled,
        videoKycAgreementRule: tenant.videoKycAgreementRule,
        videoKycPlanRule: tenant.videoKycPlanRule,
        globalVideoKycConsentText: tenant.globalVideoKycConsentText
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to update settings.' });
  }
}
