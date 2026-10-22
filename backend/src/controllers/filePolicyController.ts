import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { dynamicDb, Tenant, User } from '../config/db';
import { sendEmail } from '../services/emailService';
import fs from 'fs';

/**
 * Dispatches exported file directly to Admin's registered email (+ secondary notification email).
 * Staff personal emails are STRICTLY prohibited from receiving exported corporate records.
 */
export const dispatchExportFileEmail = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const userRole = req.user?.role;
  const userId = req.user?.id;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Tenant context missing' });
  }

  const file = req.file;
  const { fileName, documentType } = req.body;

  if (!file) {
    return res.status(400).json({ success: false, message: 'Exported file attachment is required' });
  }

  try {
    const tenantModel = dynamicDb?.Tenant || Tenant;
    const tenant: any = await tenantModel.findById(tenantId).lean();
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant record not found' });
    }

    const userModel = dynamicDb?.User || User;
    const user: any = userId ? await userModel.findById(userId).lean() : null;
    const actorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : (req.user?.email || 'User');

    // Rule: Always send to Admin's registered email
    const adminEmail = tenant.email;
    const secondaryEmail = tenant.fileDownloadNotificationEmail;

    if (!adminEmail) {
      return res.status(400).json({ success: false, message: 'No registered Admin email found for this tenant.' });
    }

    const maxLimitMb = tenant.maxEmailFileSizeMb || 10;
    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2));

    // Check size limit
    if (fileSizeMb > maxLimitMb) {
      // Clean up uploaded temp file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return res.status(400).json({
        success: false,
        isOversized: true,
        fileSizeMb,
        maxLimitMb,
        isAdmin: userRole === 'ADMIN' || userRole === 'SUPER_ADMIN',
        message: `File size (${fileSizeMb} MB) exceeds maximum email attachment limit of ${maxLimitMb} MB.`
      });
    }

    const fileBuffer = fs.readFileSync(file.path);
    const resolvedFileName = fileName || file.originalname || 'exported_document.pdf';

    const subject = `[Corporate Record Export] ${resolvedFileName} - Initiated by ${actorName} (${userRole})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
        <h2 style="color: #38bdf8; margin-top: 0; font-size: 18px;">📄 Compliance File Export Dispatch</h2>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          An export request for corporate records was executed in your Compliance Portal.
        </p>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; line-height: 1.8;">
          <div><strong style="color: #94a3b8;">Document Name:</strong> <span style="color: #fff;">${resolvedFileName}</span></div>
          <div><strong style="color: #94a3b8;">Document Type:</strong> <span style="color: #fff;">${documentType || 'Corporate Data Export'}</span></div>
          <div><strong style="color: #94a3b8;">File Size:</strong> <span style="color: #34d399;">${fileSizeMb} MB</span></div>
          <div><strong style="color: #94a3b8;">Initiated By:</strong> <span style="color: #fff;">${actorName} (${userRole})</span></div>
          <div><strong style="color: #94a3b8;">Timestamp:</strong> <span style="color: #fff;">${new Date().toLocaleString('en-IN')}</span></div>
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          Per your organization security policy, exported files are strictly routed to the Principal Admin's email to prevent local data leakage. The file is attached below.
        </p>
      </div>
    `;

    // Dispatch email to Admin registered email
    const recipients = [adminEmail];
    if (secondaryEmail && secondaryEmail.trim()) {
      recipients.push(secondaryEmail.trim());
    }

    await sendEmail(
      String(tenantId),
      recipients.join(', '),
      subject,
      html,
      [
        {
          filename: resolvedFileName,
          content: fileBuffer
        }
      ]
    );

    // Clean up uploaded temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(200).json({
      success: true,
      message: `File (${fileSizeMb} MB) has been dispatched to Admin registered email (${adminEmail})${secondaryEmail ? ` and secondary email (${secondaryEmail})` : ''}.`,
      recipient: adminEmail,
      fileSizeMb
    });
  } catch (error: any) {
    // Clean up on error
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(500).json({ success: false, message: error?.message || 'Failed to dispatch export email' });
  }
};
