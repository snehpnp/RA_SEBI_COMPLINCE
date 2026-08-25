import nodemailer from 'nodemailer';
import prisma from '../config/db';

/**
 * Generic email sender using tenant's configured SMTP settings.
 * If SMTP is not configured, logs a warning and skips silently.
 */
export async function sendEmail(
  tenantId: string | null | undefined,
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
): Promise<boolean> {
  try {
    if (!tenantId) {
      console.warn('[EMAIL] No tenantId provided. Skipping email to:', to);
      return false;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.smtpHost || !tenant.smtpUser || !tenant.smtpPassword) {
      console.warn('[EMAIL] SMTP not configured for tenant:', tenantId, '. Skipping email to:', to);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: tenant.smtpHost,
      port: tenant.smtpPort || 587,
      secure: (tenant.smtpPort || 587) === 465,
      auth: {
        user: tenant.smtpUser,
        pass: tenant.smtpPassword,
      },
      tls: { rejectUnauthorized: false },
    });

    const fromName = tenant.smtpFrom || tenant.companyName || 'RAGCP Platform';
    const fromEmail = tenant.smtpUser;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      attachments,
    });

    // Log to NotificationLog
    await prisma.notificationLog.create({
      data: {
        tenantId,
        recipient: to,
        channel: 'EMAIL',
        title: subject,
        message: html.replace(/<[^>]*>/g, '').slice(0, 500),
        status: 'SENT',
      },
    });

    console.log('[EMAIL] Sent successfully to:', to, '| Subject:', subject);
    return true;
  } catch (err: any) {
    console.error('[EMAIL] Failed to send email to:', to, '| Error:', err.message);
    // Log failure
    if (tenantId) {
      try {
        await prisma.notificationLog.create({
          data: {
            tenantId,
            recipient: to,
            channel: 'EMAIL',
            title: subject,
            message: `Failed: ${err.message}`,
            status: 'FAILED',
          },
        });
      } catch {}
    }
    return false;
  }
}

/**
 * Welcome email sent to newly onboarded Staff or Client.
 */
export async function sendWelcomeEmail(opts: {
  tenantId: string;
  toEmail: string;
  name: string;
  password: string;
  role: string;
  loginUrl: string;
  companyName?: string;
  customText?: string | null;
  attachments?: any[];
}): Promise<boolean> {
  const { tenantId, toEmail, name, password, role, loginUrl, companyName, customText, attachments } = opts;
  const subject = `Welcome to ${companyName || 'RAGCP'} — Your Account is Ready`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .body p { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .credentials { background: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #334155; }
    .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e293b; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .cred-value { color: #e2e8f0; font-size: 13px; font-family: monospace; font-weight: 600; }
    .btn { display: block; width: fit-content; margin: 24px auto 0; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; padding: 20px 32px; color: #475569; font-size: 11px; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome, ${name}!</h1>
      <p>Your account has been created on ${companyName || 'RAGCP Platform'}</p>
    </div>
    <div class="body">
      <p>Hi ${name},</p>
      ${customText ? `<p>${customText}</p>` : ''}
      <p>Your account has been successfully created. Below are your login credentials:</p>
      <div class="credentials">
        <div class="cred-row">
          <span class="cred-label">Role</span>
          <span class="cred-value">${role.replace(/_/g, ' ')}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Email (Username)</span>
          <span class="cred-value">${toEmail}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password</span>
          <span class="cred-value">${password}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Login URL</span>
          <span class="cred-value">${loginUrl}</span>
        </div>
      </div>
      <p style="color:#94a3b8; font-size:12px;">⚠️ Please change your password after first login for security.</p>
      <a href="${loginUrl}" class="btn">Login to Your Account →</a>
    </div>
    <div class="footer">
      This email was sent by ${companyName || 'RAGCP Platform'}. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;
  return sendEmail(tenantId, toEmail, subject, html, attachments);
}

/**
 * Forgot Password email — sends a new temporary password.
 */
export async function sendForgotPasswordEmail(opts: {
  tenantId: string | null;
  toEmail: string;
  name: string;
  newPassword: string;
  loginUrl: string;
  companyName?: string;
}): Promise<boolean> {
  const { tenantId, toEmail, name, newPassword, loginUrl, companyName } = opts;
  const subject = `Password Reset — ${companyName || 'RAGCP Platform'}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
    .body { padding: 32px; }
    .body p { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .credentials { background: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #334155; }
    .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e293b; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .cred-value { color: #fbbf24; font-size: 14px; font-family: monospace; font-weight: 700; letter-spacing: 1px; }
    .btn { display: block; width: fit-content; margin: 24px auto 0; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; padding: 20px 32px; color: #475569; font-size: 11px; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="body">
      <p>Hi ${name},</p>
      <p>We received a password reset request for your account. Your new temporary password is:</p>
      <div class="credentials">
        <div class="cred-row">
          <span class="cred-label">Email</span>
          <span class="cred-value" style="color:#e2e8f0">${toEmail}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">New Password</span>
          <span class="cred-value">${newPassword}</span>
        </div>
      </div>
      <p style="color:#94a3b8; font-size:12px;">⚠️ Please login and change this password immediately.</p>
      <p style="color:#94a3b8; font-size:12px;">If you did not request this, please contact your administrator immediately.</p>
      <a href="${loginUrl}" class="btn">Login Now →</a>
    </div>
    <div class="footer">
      This email was sent by ${companyName || 'RAGCP Platform'}. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;
  return sendEmail(tenantId, toEmail, subject, html);
}

/**
 * Send a test email to verify SMTP configuration.
 */
export async function sendTestEmail(tenantId: string, toEmail: string): Promise<{ success: boolean; message: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.smtpHost || !tenant?.smtpUser || !tenant?.smtpPassword) {
    return { success: false, message: 'SMTP is not fully configured. Please fill in all SMTP fields first.' };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1e293b;padding:32px;border-radius:12px;border:1px solid #334155">
      <h2 style="color:#6366f1;margin:0 0 16px">✅ SMTP Test Successful!</h2>
      <p style="color:#cbd5e1">Your SMTP configuration is working correctly.</p>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0">Server: ${tenant.smtpHost}:${tenant.smtpPort || 587}</p>
    </div>`;

  const sent = await sendEmail(tenantId, toEmail, '✅ SMTP Test — RAGCP Platform', html);
  return sent
    ? { success: true, message: 'Test email sent successfully! Please check your inbox.' }
    : { success: false, message: 'Failed to send test email. Please check your SMTP credentials.' };
}

export const sendAccountActivatedEmail = async ({ toEmail, name, companyName }: { toEmail: string, name: string, companyName?: string }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1e293b;padding:32px;border-radius:12px;border:1px solid #334155;color:#e2e8f0;">
      <h2 style="color:#10b981;margin:0 0 16px">Account Activated</h2>
      <p>Your account on ${companyName || 'RAGCP Platform'} is now active.</p>
      <p>Hi ${name},</p>
      <p>Your account has been successfully approved and activated. You can now log in and access your portal.</p>
    </div>
  `;
  return await sendEmail(null, toEmail, `Account Activated - ${companyName || 'RAGCP Platform'}`, html);
};

export const sendAccountDeactivatedEmail = async ({ toEmail, name, companyName }: { toEmail: string, name: string, companyName?: string }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1e293b;padding:32px;border-radius:12px;border:1px solid #334155;color:#e2e8f0;">
      <h2 style="color:#f43f5e;margin:0 0 16px">Account Deactivated</h2>
      <p>Your account on ${companyName || 'RAGCP Platform'} has been deactivated.</p>
      <p>Hi ${name},</p>
      <p>Your account has been deactivated by the administrator. If you believe this was a mistake, please contact support.</p>
    </div>
  `;
  return await sendEmail(null, toEmail, `Account Deactivated - ${companyName || 'RAGCP Platform'}`, html);
};

export const sendComplaintNotificationEmail = async ({ tenantId, adminEmail, clientName, clientPan, subject, description }: { tenantId: string, adminEmail: string, clientName: string, clientPan: string, subject: string, description: string }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1e293b;padding:32px;border-radius:12px;border:1px solid #334155;color:#e2e8f0;">
      <h2 style="color:#f59e0b;margin:0 0 16px">New Client Complaint Raised</h2>
      <p>A new grievance/complaint has been raised by a client.</p>
      <div style="background:#0f172a; border-radius:12px; padding:20px; margin:20px 0; border:1px solid #334155;">
        <p style="margin: 0 0 10px;"><strong>Client Name:</strong> ${clientName}</p>
        <p style="margin: 0 0 10px;"><strong>Client PAN:</strong> ${clientPan || 'N/A'}</p>
        <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${subject}</p>
        <p style="margin: 0;"><strong>Description:</strong> ${description}</p>
      </div>
      <p>Please log in to the Compliance Desk to review and resolve this complaint.</p>
    </div>
  `;
  return await sendEmail(tenantId, adminEmail, `Action Required: New Complaint from ${clientName}`, html);
};
