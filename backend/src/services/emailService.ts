import nodemailer from 'nodemailer';
import dynamicDb, { Tenant, AllCompany, SystemSetting, NotificationLog, centralModels } from '../config/db';
import { getTenantComplianceAttachments } from './pdfService';

export interface SmtpResolvedConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Resolves SMTP credentials from the Database (Tenant, AllCompany, SystemSetting)
 * before falling back to .env.
 */
export async function resolveSmtpCredentials(tenantId?: string | null): Promise<SmtpResolvedConfig | null> {
  let tenantDoc: any = null;
  let source = '';

  const isValidCred = (doc: any) => {
    return Boolean(
      doc &&
      typeof doc.smtpHost === 'string' && doc.smtpHost.trim() !== '' &&
      typeof doc.smtpUser === 'string' && doc.smtpUser.trim() !== '' &&
      typeof doc.smtpPassword === 'string' && doc.smtpPassword.trim() !== ''
    );
  };

  // 1. If tenantId is provided, query dynamicDb and centralModels Tenant / AllCompany
  if (tenantId) {
    try {
      const doc = await dynamicDb.Tenant.findById(tenantId).lean();
      if (isValidCred(doc)) { tenantDoc = doc; source = 'dynamicDb.Tenant(findById)'; }
    } catch { }

    if (!tenantDoc) {
      try {
        const doc = await centralModels.Tenant.findById(tenantId).lean();
        if (isValidCred(doc)) { tenantDoc = doc; source = 'centralModels.Tenant(findById)'; }
      } catch { }
    }

    if (!tenantDoc) {
      try {
        const doc = await dynamicDb.Tenant.findOne({
          $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
        }).lean();
        if (isValidCred(doc)) { tenantDoc = doc; source = 'dynamicDb.Tenant(findOne)'; }
      } catch { }
    }

    if (!tenantDoc) {
      try {
        const doc = await centralModels.Tenant.findOne({
          $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
        }).lean();
        if (isValidCred(doc)) { tenantDoc = doc; source = 'centralModels.Tenant(findOne)'; }
      } catch { }
    }

    if (!tenantDoc) {
      try {
        const doc = await centralModels.AllCompany.findOne({
          $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
        }).lean();
        if (isValidCred(doc)) { tenantDoc = doc; source = 'centralModels.AllCompany(findOne)'; }
      } catch { }
    }
  }

  // 2. Query any active Tenant in dynamicDb or centralModels that has SMTP credentials
  if (!tenantDoc) {
    try {
      const doc = await dynamicDb.Tenant.findOne({
        smtpHost: { $nin: [null, ''] },
        smtpUser: { $nin: [null, ''] },
        smtpPassword: { $nin: [null, ''] }
      }).lean();
      if (isValidCred(doc)) { tenantDoc = doc; source = 'dynamicDb.Tenant(anyActive)'; }
    } catch { }
  }

  if (!tenantDoc) {
    try {
      const doc = await centralModels.Tenant.findOne({
        smtpHost: { $nin: [null, ''] },
        smtpUser: { $nin: [null, ''] },
        smtpPassword: { $nin: [null, ''] }
      }).lean();
      if (isValidCred(doc)) { tenantDoc = doc; source = 'centralModels.Tenant(anyActive)'; }
    } catch { }
  }

  // 3. Query AllCompany in centralModels
  if (!tenantDoc) {
    try {
      const doc = await centralModels.AllCompany.findOne({
        smtpHost: { $nin: [null, ''] },
        smtpUser: { $nin: [null, ''] },
        smtpPassword: { $nin: [null, ''] }
      }).lean();
      if (isValidCred(doc)) { tenantDoc = doc; source = 'centralModels.AllCompany(anyActive)'; }
    } catch { }
  }

  // 4. Query SystemSetting (keys: GLOBAL_SMTP, SMTP_CONFIG, SMTP_SETTINGS, SMTP) in dynamicDb and centralModels
  const smtpSettingKeys = ['GLOBAL_SMTP', 'SMTP_CONFIG', 'SMTP_SETTINGS', 'SMTP', 'EMAIL_CONFIG'];

  if (!tenantDoc) {
    for (const key of smtpSettingKeys) {
      try {
        const setting: any = await dynamicDb.SystemSetting.findOne({ key }).lean();
        if (setting?.value) {
          const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
          if (isValidCred(parsed)) {
            tenantDoc = parsed;
            source = `dynamicDb.SystemSetting(${key})`;
            break;
          }
        }
      } catch { }
    }
  }

  if (!tenantDoc) {
    for (const key of smtpSettingKeys) {
      try {
        const setting: any = await centralModels.SystemSetting.findOne({ key }).lean();
        if (setting?.value) {
          const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
          if (isValidCred(parsed)) {
            tenantDoc = parsed;
            source = `centralModels.SystemSetting(${key})`;
            break;
          }
        }
      } catch { }
    }
  }

  // 5. If credentials found in DB, return them
  if (tenantDoc && tenantDoc.smtpHost && tenantDoc.smtpUser && tenantDoc.smtpPassword) {
    const port = parseInt(tenantDoc.smtpPort || '587');
    console.log(`[SMTP-RESOLVER] ✅ Using Database SMTP Credentials (${source}): Host=${tenantDoc.smtpHost}, Port=${port}, User=${tenantDoc.smtpUser}`);
    return {
      host: tenantDoc.smtpHost.trim(),
      port,
      secure: port === 465,
      user: tenantDoc.smtpUser.trim(),
      pass: tenantDoc.smtpPassword.trim(),
      fromName: tenantDoc.smtpFrom || tenantDoc.companyName || 'RAGCP Platform',
      fromEmail: tenantDoc.smtpUser.trim()
    };
  }

  console.warn('[SMTP-RESOLVER] ⚠️ No SMTP credentials configured in Database. Please configure Email & SMTP in Admin Settings.');
  return null;
}

/**
 * Generic email sender using resolved SMTP settings from Database.
 */
export async function sendEmail(
  tenantId: string | null | undefined,
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
): Promise<boolean> {
  try {
    const smtp = await resolveSmtpCredentials(tenantId);
    if (!smtp) {
      console.warn('[EMAIL] No SMTP credentials found in Database or Environment. Skipping email to:', to);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject,
      html,
      attachments
    });

    console.log(`[EMAIL] Email sent to ${to} using DB SMTP (${smtp.user} @ ${smtp.host}:${smtp.port})`);

    // Log to NotificationLog
    try {
      await NotificationLog.create({
        tenantId: tenantId || null,
        recipient: to,
        channel: 'EMAIL',
        title: subject,
        message: html.replace(/<[^>]*>/g, '').slice(0, 500),
        status: 'SENT'
      });
    } catch { }

    return true;
  } catch (err: any) {
    console.error('[EMAIL] Failed to send email to:', to, '| Error:', err.message);
    if (tenantId) {
      try {
        await NotificationLog.create({
          tenantId,
          recipient: to,
          channel: 'EMAIL',
          title: subject,
          message: `Failed: ${err.message}`,
          status: 'FAILED'
        });
      } catch { }
    }
    return false;
  }
}

/**
 * Send OTP Verification Email
 */
export async function sendOtpEmail(opts: {
  tenantId?: string | null;
  toEmail: string;
  otp: string;
  companyName?: string;
}): Promise<boolean> {
  const { tenantId, toEmail, otp, companyName } = opts;
  const subject = `Your OTP for ${companyName || 'RAGCP'} Registration: ${otp}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #1e293b; margin-top: 0;">Verify Your Email Address</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">You have requested to verify your email address on <strong>${companyName || 'RAGCP Platform'}</strong>. Please use the following One-Time Password (OTP) to complete your registration:</p>
      <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0; border: 1px dashed #cbd5e1;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; font-family: monospace;">${otp}</span>
      </div>
      <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">⏳ This OTP is valid for 10 minutes. If you did not request this verification, please ignore this email.</p>
    </div>
  `;
  return sendEmail(tenantId, toEmail, subject, html);
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
  const { tenantId, toEmail, name, password, role, loginUrl, companyName, customText } = opts;

  let attachments = opts.attachments || [];
  if ((!attachments || attachments.length === 0) && role === 'CLIENT' && tenantId) {
    try {
      attachments = await getTenantComplianceAttachments(tenantId);
    } catch (attErr) {
      console.error('[EMAIL] Error loading default compliance attachments:', attErr);
    }
  }

  const cleanRole = role.replace(/_/g, ' ');
  const displayCompany = companyName || 'Research Analyst Advisory';
  const subject = `Welcome to ${displayCompany} — Your Account is Ready`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Gradient Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%); padding: 36px 24px; text-align: center;">
              <h1 style="color: #ffffff !important; margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                🎉 Welcome, ${name}!
              </h1>
              <p style="color: #dbeafe !important; margin: 0; font-size: 14px; font-weight: 500;">
                Your account is ready on <strong style="color: #ffffff !important;">${displayCompany}</strong>
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px; background-color: #ffffff;">
              <p style="color: #0f172a !important; font-size: 16px; font-weight: 700; margin: 0 0 14px;">
                Hi ${name},
              </p>
              
              ${customText ? `
              <!-- Custom Welcome Message -->
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 16px 0 20px; border-radius: 0 10px 10px 0; color: #334155 !important; font-size: 14px; line-height: 1.6;">
                <div style="color: #334155 !important;">
                  ${customText}
                </div>
              </div>` : ''}

              <p style="color: #475569 !important; font-size: 14px; line-height: 1.6; margin: 0 0 18px;">
                Your account has been successfully created. You can use the verified credentials below to log into your portal:
              </p>

              <!-- Credentials Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; width: 38%;">
                      Account Role
                    </td>
                    <td style="padding: 9px 0; font-size: 13.5px; font-weight: 700; color: #1e293b !important; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      ${cleanRole}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
                      Email (Username)
                    </td>
                    <td style="padding: 9px 0; font-size: 13.5px; font-weight: 700; color: #0284c7 !important; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      ${toEmail}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
                      Temporary Password
                    </td>
                    <td style="padding: 9px 0; font-size: 14px; font-family: 'SFMono-Regular', Consolas, Menlo, Monaco, monospace; font-weight: 700; color: #0f172a !important; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      <span style="background-color: #e2e8f0; padding: 4px 10px; border-radius: 6px; color: #0f172a !important; display: inline-block;">${password}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.5px;">
                      Portal Access Link
                    </td>
                    <td style="padding: 9px 0; font-size: 13px; font-weight: 600; text-align: right;">
                      <a href="${loginUrl}" style="color: #2563eb !important; text-decoration: underline; word-break: break-all;">${loginUrl}</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Security Advice Callout -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0 24px;">
                <p style="color: #92400e !important; font-size: 12.5px; line-height: 1.5; margin: 0; font-weight: 500;">
                  🔒 <strong>Security Advice:</strong> Please change your password upon your first login for account safety.
                </p>
              </div>

              ${role === 'CLIENT' || (attachments && attachments.length > 0) ? `
              <!-- Compliance Documents Attached Box -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 22px 0;">
                <div style="font-weight: 800; color: #15803d !important; font-size: 13.5px; margin-bottom: 8px;">
                  📎 Mandatory Compliance Documents Attached (PDF):
                </div>
                <div style="color: #166534 !important; font-size: 13px; line-height: 1.6;">
                  <div style="margin-bottom: 6px; color: #166534 !important;">
                    • 📄 <strong style="color: #14532d !important;">Terms & Conditions (PDF)</strong> — Advisory terms, statutory disclosures & risk disclaimers
                  </div>
                  <div style="color: #166534 !important;">
                    • 📄 <strong style="color: #14532d !important;">Privacy Policy (PDF)</strong> — Client data protection & confidentiality policy
                  </div>
                </div>
                <div style="font-size: 11.5px; color: #4b5563 !important; margin-top: 10px; border-top: 1px dashed #86efac; padding-top: 8px;">
                  Please review and safely archive these attached PDF files for your compliance and regulatory records.
                </div>
              </div>` : ''}

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); text-align: center;">
                  Login to Your Account →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b !important; font-size: 12px; line-height: 1.5; margin: 0 0 6px;">
                This regulatory onboarding email was issued by <strong style="color: #334155 !important;">${displayCompany}</strong> in compliance with SEBI guidelines.
              </p>
              <p style="color: #94a3b8 !important; font-size: 11px; margin: 0;">
                Please do not reply directly to this automated email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
  const displayCompany = companyName || 'Research Analyst Advisory';
  const subject = `Password Reset — ${displayCompany}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <tr>
            <td style="background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff !important; margin: 0; font-size: 22px; font-weight: 800;">🔐 Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; background-color: #ffffff;">
              <p style="color: #0f172a !important; font-size: 16px; font-weight: 700; margin: 0 0 14px;">Hi ${name},</p>
              <p style="color: #475569 !important; font-size: 14px; line-height: 1.6; margin: 0 0 18px;">
                We received a password reset request for your account on <strong>${displayCompany}</strong>. Your new temporary password is:
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #64748b !important; text-transform: uppercase;">Email Account</td>
                    <td style="padding: 8px 0; font-size: 13.5px; font-weight: 700; color: #0284c7 !important; text-align: right;">${toEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #64748b !important; text-transform: uppercase;">New Password</td>
                    <td style="padding: 8px 0; font-size: 14px; font-family: monospace; font-weight: 700; color: #d97706 !important; text-align: right;">
                      <span style="background-color: #fef3c7; padding: 4px 10px; border-radius: 6px; color: #b45309 !important; display: inline-block;">${newPassword}</span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0 24px;">
                <p style="color: #92400e !important; font-size: 12px; margin: 0;">⚠️ Please log in and change this password immediately in your profile settings.</p>
              </div>
              <div style="text-align: center; margin: 24px 0 10px;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                  Login to Portal →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b !important; font-size: 11px;">
              This email was sent by ${displayCompany}. If you did not request this, please contact support.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return sendEmail(tenantId, toEmail, subject, html);
}

/**
 * Send a test email to verify SMTP configuration.
 */
export async function sendTestEmail(tenantId: string, toEmail: string): Promise<{ success: boolean; message: string }> {
  const smtp = await resolveSmtpCredentials(tenantId);
  if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
    return { success: false, message: 'SMTP is not fully configured. Please enter Host, Port, User, and Password first.' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; color: #1e293b;">
      <h2 style="color: #2563eb; margin: 0 0 16px;">✅ SMTP Test Successful!</h2>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your SMTP email configuration is working correctly and ready to send compliance emails.</p>
      <div style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12.5px; color: #475569; margin-top: 16px;">
        <strong>Server:</strong> ${smtp.host}:${smtp.port} &nbsp;|&nbsp; <strong>Sender:</strong> ${smtp.user}
      </div>
    </div>`;

  const sent = await sendEmail(tenantId, toEmail, '✅ SMTP Test — RAGCP Platform', html);
  return sent
    ? { success: true, message: 'Test email sent successfully! Please check your inbox.' }
    : { success: false, message: 'Failed to send test email. Please check your SMTP credentials.' };
}

export const sendAccountActivatedEmail = async ({ toEmail, name, companyName }: { toEmail: string, name: string, companyName?: string }) => {
  const displayCompany = companyName || 'Research Analyst Advisory';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; color: #1e293b;">
      <h2 style="color: #16a34a; margin: 0 0 16px;">✅ Account Activated</h2>
      <p style="color: #0f172a; font-weight: 600; font-size: 15px;">Hi ${name},</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your account on <strong>${displayCompany}</strong> has been successfully approved and activated. You can now log in and access your advisory services.</p>
    </div>
  `;
  return await sendEmail(null, toEmail, `Account Activated - ${displayCompany}`, html);
};

export const sendAccountDeactivatedEmail = async ({ toEmail, name, companyName }: { toEmail: string, name: string, companyName?: string }) => {
  const displayCompany = companyName || 'Research Analyst Advisory';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; color: #1e293b;">
      <h2 style="color: #e11d48; margin: 0 0 16px;">Account Deactivated</h2>
      <p style="color: #0f172a; font-weight: 600; font-size: 15px;">Hi ${name},</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your account on <strong>${displayCompany}</strong> has been deactivated by the administrator. If you believe this was in error, please contact compliance support.</p>
    </div>
  `;
  return await sendEmail(null, toEmail, `Account Deactivated - ${displayCompany}`, html);
};

export const sendComplaintNotificationEmail = async ({ tenantId, adminEmail, clientName, clientPan, subject, description }: { tenantId: string, adminEmail: string, clientName: string, clientPan: string, subject: string, description: string }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; color: #1e293b;">
      <h2 style="color: #ea580c; margin: 0 0 16px;">⚠️ New Client Complaint Raised</h2>
      <p style="color: #334155; font-size: 14px;">A new grievance/complaint has been registered on the compliance desk.</p>
      <div style="background: #f8fafc; border-radius: 10px; padding: 18px; margin: 18px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; color: #334155; font-size: 13px;"><strong>Client Name:</strong> ${clientName}</p>
        <p style="margin: 0 0 8px; color: #334155; font-size: 13px;"><strong>Client PAN:</strong> ${clientPan || 'N/A'}</p>
        <p style="margin: 0 0 8px; color: #334155; font-size: 13px;"><strong>Subject:</strong> ${subject}</p>
        <p style="margin: 0; color: #334155; font-size: 13px;"><strong>Description:</strong> ${description}</p>
      </div>
      <p style="color: #64748b; font-size: 12.5px;">Please log into the Compliance Desk to review, respond, and resolve this complaint within regulatory timelines.</p>
    </div>
  `;
  return await sendEmail(tenantId, adminEmail, `Action Required: New Complaint from ${clientName}`, html);
};

