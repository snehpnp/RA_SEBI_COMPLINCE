import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import dynamicDb, { Tenant, AllCompany, SystemSetting, NotificationLog, centralModels } from '../config/db';
import { getTenantComplianceAttachments } from './pdfService';
import { DEFAULT_EMAIL_TEMPLATES, renderEmailTemplateString } from '../utils/defaultEmailTemplates';

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
 * Helper to fetch tenant document from DB or central models
 */
export async function resolveTenantDoc(tenantId?: string | null): Promise<any> {
  let tenantDoc: any = null;
  if (tenantId) {
    try {
      if (mongoose.Types.ObjectId.isValid(tenantId)) {
        tenantDoc = await dynamicDb.Tenant.findById(tenantId).lean();
      }
    } catch { }

    if (!tenantDoc) {
      try {
        tenantDoc = await dynamicDb.Tenant.findOne({
          $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
        }).lean();
      } catch { }
    }

    if (!tenantDoc) {
      try {
        if (mongoose.Types.ObjectId.isValid(tenantId)) {
          tenantDoc = await centralModels.Tenant.findById(tenantId).lean();
        }
      } catch { }
    }

    if (!tenantDoc) {
      try {
        tenantDoc = await centralModels.Tenant.findOne({
          $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
        }).lean();
      } catch { }
    }

    if (!tenantDoc) {
      try {
        tenantDoc = await centralModels.AllCompany.findOne({
          $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
        }).lean();
      } catch { }
    }
  }

  if (!tenantDoc) {
    try {
      tenantDoc = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    } catch { }
  }

  if (!tenantDoc) {
    try {
      const setting: any = await dynamicDb.SystemSetting.findOne({ key: 'GLOBAL_SMTP' }).lean();
      if (setting?.value) {
        tenantDoc = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      }
    } catch { }
  }

  return tenantDoc;
}

/**
 * Generic email sender using resolved SMTP settings from Database.
 */
export async function sendEmail(
  tenantId: string | null | undefined,
  to: string,
  subject: string,
  html: string,
  attachments?: any[],
  cc?: string | string[]
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

    const mailOptions: any = {
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject,
      html,
      attachments
    };

    if (cc && (typeof cc === 'string' ? cc.trim() : (Array.isArray(cc) && cc.length > 0))) {
      mailOptions.cc = cc;
      console.log(`[EMAIL] 📋 CC attached: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }

    await transporter.sendMail(mailOptions);

    console.log(`[EMAIL] Email sent to ${to}${mailOptions.cc ? ` (CC: ${mailOptions.cc})` : ''} using DB SMTP (${smtp.user} @ ${smtp.host}:${smtp.port})`);

    // Log to NotificationLog
    try {
      await NotificationLog.create({
        tenantId: tenantId || null,
        recipient: mailOptions.cc ? `${to}, CC: ${mailOptions.cc}` : to,
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
          recipient: cc ? `${to}, CC: ${cc}` : to,
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
 * Resolves Email Template (Subject & Body) from the Database for a specific tenant and type,
 * falling back to DEFAULT_EMAIL_TEMPLATES.
 */
export async function resolveEmailTemplate(
  tenantId: string | null | undefined,
  type: string
): Promise<{ subject: string; body: string }> {
  const def = DEFAULT_EMAIL_TEMPLATES.find(d => d.type === type) || {
    subject: '',
    body: ''
  };

  if (!tenantId) {
    return { subject: def.subject, body: def.body };
  }

  try {
    let tpl: any = await dynamicDb.EmailTemplate.findOne({ tenantId, type }).lean();
    if (!tpl && type === 'WELCOME_CLIENT') {
      tpl = await dynamicDb.EmailTemplate.findOne({ tenantId, type: 'WELCOME' }).lean();
    }
    if (!tpl && type === 'WELCOME') {
      tpl = await dynamicDb.EmailTemplate.findOne({ tenantId, type: 'WELCOME_CLIENT' }).lean();
    }
    if (tpl && tpl.subject && tpl.body) {
      return { subject: tpl.subject, body: tpl.body };
    }
  } catch (err: any) {
    console.warn(`[EMAIL] Could not fetch template ${type} for tenant ${tenantId}:`, err?.message);
  }

  return { subject: def.subject, body: def.body };
}

/**
 * Wraps email body content into a responsive, SEBI-compliant HTML container.
 */
export function wrapInBrandedHtmlEmail(opts: {
  title: string;
  companyName: string;
  content: string;
  headerGradient?: string;
  headerIcon?: string;
}): string {
  const {
    title,
    companyName,
    content,
    headerGradient = 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
    headerIcon = '✉️'
  } = opts;

  // If content already contains complete HTML document, return as is
  if (content.trim().toLowerCase().startsWith('<!doctype') || content.trim().toLowerCase().startsWith('<html')) {
    return content;
  }

  let formattedContent = content;
  // If plain text with no HTML block tags, format paragraphs and linebreaks
  if (!/<(p|div|table|h1|h2|h3|h4|ul|ol)[^>]*>/i.test(content)) {
    formattedContent = content
      .split(/\n\n+/)
      .map(paragraph => `<p style="margin: 0 0 14px; font-size: 14.5px; line-height: 1.65; color: #334155;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <tr>
            <td style="background: ${headerGradient}; padding: 32px 24px; text-align: center;">
              ${headerIcon ? `<div style="font-size: 28px; margin-bottom: 6px;">${headerIcon}</div>` : ''}
              <h1 style="color: #ffffff !important; margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                ${title}
              </h1>
              <p style="color: #dbeafe !important; margin: 0; font-size: 13.5px; font-weight: 500;">
                ${companyName} • SEBI Research Analyst
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; background-color: #ffffff;">
              ${formattedContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 22px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b !important; font-size: 12px; line-height: 1.5; margin: 0 0 4px;">
                This regulatory communication was issued by <strong style="color: #334155 !important;">${companyName}</strong> in compliance with SEBI (Research Analysts) Regulations, 2014.
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
  const brand = companyName || 'RAGCP Platform';

  const tpl = await resolveEmailTemplate(tenantId, 'REGISTRATION_OTP');
  const vars = {
    otp,
    expiryMinutes: '10',
    companyName: brand
  };

  const subject = renderEmailTemplateString(tpl.subject || `Verify Your Email Address - ${brand}: ${otp}`, vars);
  const rawBody = renderEmailTemplateString(tpl.body, vars);
  const html = wrapInBrandedHtmlEmail({
    title: 'Verify Your Email Address',
    companyName: brand,
    content: rawBody,
    headerIcon: '✉️'
  });

  return sendEmail(tenantId, toEmail, subject, html);
}

/**
 * Send Two-Factor Login Verification OTP Email
 */
export async function sendTwoFactorLoginOtpEmail(opts: {
  tenantId?: string | null;
  toEmail: string;
  otp: string;
  companyName?: string;
}): Promise<boolean> {
  const { tenantId, toEmail, otp, companyName } = opts;
  const brand = companyName || 'RAGCP Platform';

  const tpl = await resolveEmailTemplate(tenantId, 'LOGIN_2FA');
  const clientName = toEmail.split('@')[0];
  const vars = {
    clientName,
    otp,
    expiryMinutes: '10',
    companyName: brand
  };

  const subject = renderEmailTemplateString(tpl.subject || `Your Login Verification Code for ${brand}: ${otp}`, vars);
  const rawBody = renderEmailTemplateString(tpl.body, vars);
  const html = wrapInBrandedHtmlEmail({
    title: 'Two-Step Login Verification',
    companyName: brand,
    content: rawBody,
    headerIcon: '🔐'
  });

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
  const displayCompany = companyName || 'Research Analyst Services';

  const tpl = await resolveEmailTemplate(tenantId, 'WELCOME_CLIENT');
  const vars = {
    clientName: name,
    name,
    email: toEmail,
    temporaryPassword: password,
    password,
    role: cleanRole,
    loginUrl,
    companyName: displayCompany,
    supportEmail: `support@${toEmail.split('@')[1] || 'domain.com'}`
  };

  const subject = renderEmailTemplateString(tpl.subject || `Welcome to ${displayCompany} — Your Account is Ready`, vars);
  const renderedCustomBody = renderEmailTemplateString(tpl.body, vars);

  // Dynamic body formatted into branded template
  const dynamicBodyWithCredentials = `
    ${renderedCustomBody ? `<div style="margin-bottom: 20px;">${renderedCustomBody.replace(/\n/g, '<br/>')}</div>` : ''}
    ${customText ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 16px 0 20px; border-radius: 0 10px 10px 0; color: #334155; font-size: 14px; line-height: 1.6;">
        ${customText}
      </div>` : ''}

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; width: 38%;">Account Role</td>
          <td style="padding: 9px 0; font-size: 13.5px; font-weight: 700; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${cleanRole}</td>
        </tr>
        <tr>
          <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Email / Login</td>
          <td style="padding: 9px 0; font-size: 13.5px; font-weight: 700; color: #0284c7; text-align: right; border-bottom: 1px solid #e2e8f0;">${toEmail}</td>
        </tr>
        <tr>
          <td style="padding: 9px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Temporary Password</td>
          <td style="padding: 9px 0; font-size: 14px; font-family: monospace; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">
            <span style="background-color: #e2e8f0; padding: 4px 10px; border-radius: 6px;">${password}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0 10px;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px;">
        Login to Your Account →
      </a>
    </div>
  `;

  const html = wrapInBrandedHtmlEmail({
    title: `🎉 Welcome, ${name}!`,
    companyName: displayCompany,
    content: dynamicBodyWithCredentials,
    headerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
    headerIcon: '🎉'
  });

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
  const displayCompany = companyName || 'Research Analyst Services';

  const tpl = await resolveEmailTemplate(tenantId, 'CHANGE_PASSWORD');
  const vars = {
    userName: name,
    clientName: name,
    temporaryPassword: newPassword,
    loginUrl,
    companyName: displayCompany
  };

  const subject = renderEmailTemplateString(tpl.subject || `Password Reset Request — ${displayCompany}`, vars);
  const renderedBody = renderEmailTemplateString(tpl.body, vars);

  const customContent = `
    ${renderedBody ? `<div style="margin-bottom: 18px;">${renderedBody.replace(/\n/g, '<br/>')}</div>` : ''}
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Email Account</td>
          <td style="padding: 8px 0; font-size: 13.5px; font-weight: 700; color: #0284c7; text-align: right;">${toEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">New Temporary Password</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: monospace; font-weight: 700; color: #d97706; text-align: right;">
            <span style="background-color: #fef3c7; padding: 4px 10px; border-radius: 6px; color: #b45309;">${newPassword}</span>
          </td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 24px 0 10px;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
        Login to Portal →
      </a>
    </div>
  `;

  const html = wrapInBrandedHtmlEmail({
    title: '🔐 Password Reset Request',
    companyName: displayCompany,
    content: customContent,
    headerGradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
    headerIcon: '🔐'
  });

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

export const sendAccountActivatedEmail = async ({
  toEmail,
  name,
  companyName,
  tenantId
}: {
  toEmail: string;
  name: string;
  companyName?: string;
  tenantId?: string | null;
}) => {
  const displayCompany = companyName || 'Research Analyst Services';
  const tpl = await resolveEmailTemplate(tenantId, 'ACCOUNT_ACTIVATED');
  const vars = {
    clientName: name,
    name,
    companyName: displayCompany
  };

  const subject = renderEmailTemplateString(tpl.subject || `Account Activated — ${displayCompany}`, vars);
  const renderedBody = renderEmailTemplateString(tpl.body, vars);
  const html = wrapInBrandedHtmlEmail({
    title: '✅ Account Activated',
    companyName: displayCompany,
    content: renderedBody,
    headerGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    headerIcon: '✅'
  });

  return await sendEmail(tenantId, toEmail, subject, html);
};

export const sendAccountDeactivatedEmail = async ({
  toEmail,
  name,
  companyName,
  tenantId
}: {
  toEmail: string;
  name: string;
  companyName?: string;
  tenantId?: string | null;
}) => {
  const displayCompany = companyName || 'Research Analyst Services';
  const tpl = await resolveEmailTemplate(tenantId, 'ACCOUNT_DEACTIVATED');
  const vars = {
    clientName: name,
    name,
    companyName: displayCompany
  };

  const subject = renderEmailTemplateString(tpl.subject || `Account Deactivated — ${displayCompany}`, vars);
  const renderedBody = renderEmailTemplateString(tpl.body, vars);
  const html = wrapInBrandedHtmlEmail({
    title: '⚠️ Account Deactivated',
    companyName: displayCompany,
    content: renderedBody,
    headerGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    headerIcon: '⚠️'
  });

  return await sendEmail(tenantId, toEmail, subject, html);
};

export const sendComplaintNotificationEmail = async ({
  tenantId,
  adminEmail,
  clientName,
  clientPan,
  subject,
  description
}: {
  tenantId: string;
  adminEmail: string;
  clientName: string;
  clientPan: string;
  subject: string;
  description: string;
}) => {
  const tpl = await resolveEmailTemplate(tenantId, 'COMPLAINT_NOTIFICATION');
  const vars = {
    clientName,
    clientPan: clientPan || 'N/A',
    complaintSubject: subject,
    description,
    companyName: 'Compliance Desk'
  };

  const emailSubject = renderEmailTemplateString(tpl.subject || `Action Required: New Complaint from ${clientName}`, vars);
  const renderedBody = renderEmailTemplateString(tpl.body, vars);
  const html = wrapInBrandedHtmlEmail({
    title: '⚠️ Client Grievance Registered',
    companyName: 'SEBI Compliance Grievance Desk',
    content: renderedBody,
    headerGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    headerIcon: '⚖️'
  });

  return await sendEmail(tenantId, adminEmail, emailSubject, html);
};

/**
 * Send Signed Service Agreement PDF copy to Client upon eSign completion
 */
export async function sendSignedAgreementEmail(opts: {
  tenantId?: string | null;
  toEmail: string;
  clientName: string;
  companyName?: string;
  agreementUrl?: string;
  pdfBuffer?: Buffer | null;
  maskedAadhaar?: string;
  signedAt?: Date;
  ccEmail?: string;
}): Promise<boolean> {
  const { tenantId, toEmail, clientName, companyName, agreementUrl, pdfBuffer, maskedAadhaar, signedAt } = opts;
  let cc = opts.ccEmail;
  if (!cc) {
    try {
      const doc = await resolveTenantDoc(tenantId);
      if (doc && (doc.ccAgreementEnabled === true || doc.ccAgreementEnabled === 'true') && doc.ccAgreementEmail && doc.ccAgreementEmail.trim()) {
        cc = doc.ccAgreementEmail.trim();
        console.log(`[EMAIL] 📄 Auto-resolved CC Agreement email: ${cc}`);
      }
    } catch (e: any) {
      console.warn('[EMAIL] Failed to resolve CC for signed agreement:', e?.message);
    }
  }
  const displayCompany = companyName || 'Research Analyst Services';
  const formattedDate = (signedAt || new Date()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const tpl = await resolveEmailTemplate(tenantId, 'KYC_AGREEMENT');
  const vars = {
    clientName,
    companyName: displayCompany,
    agreementDate: formattedDate,
    maskedAadhaar: maskedAadhaar || 'N/A'
  };

  const subject = renderEmailTemplateString(tpl.subject || `Your Signed Service Agreement — ${displayCompany}`, vars);
  const renderedBody = renderEmailTemplateString(tpl.body, vars);

  const attachments: any[] = [];
  if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
    attachments.push({
      filename: `Service_Agreement_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  const customContent = `
    ${renderedBody ? `<div style="margin-bottom: 20px;">${renderedBody.replace(/\n/g, '<br/>')}</div>` : ''}

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 0 0 22px;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; width: 40%;">Signer Name</td>
          <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${clientName}</td>
        </tr>
        ${maskedAadhaar ? `
        <tr>
          <td style="padding: 8px 0; font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Aadhaar (Verified)</td>
          <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${maskedAadhaar}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Signed Timestamp</td>
          <td style="padding: 8px 0; font-size: 12.5px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Legal Status</td>
          <td style="padding: 8px 0; font-size: 12.5px; font-weight: 700; color: #16a34a; text-align: right;">✅ Legally Binding & Executed</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 18px; margin: 0 0 24px;">
      <div style="font-weight: 800; color: #15803d; font-size: 13.5px; margin-bottom: 4px;">
        📎 Signed Agreement Copy Attached (PDF)
      </div>
      <div style="color: #166534; font-size: 12.5px; line-height: 1.5;">
        A full copy of your signed agreement has been attached to this email as a PDF. Please download and retain it for your legal and regulatory records.
      </div>
    </div>
  `;

  const html = wrapInBrandedHtmlEmail({
    title: 'Service Agreement Signed',
    companyName: displayCompany,
    content: customContent,
    headerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    headerIcon: '✍️'
  });

  return sendEmail(tenantId, toEmail, subject, html, attachments, cc);
}

/**
 * Send Official Tax Invoice PDF to Client
 */
export async function sendTaxInvoiceEmail(opts: {
  tenantId?: string | null;
  toEmail: string;
  clientName: string;
  companyName?: string;
  planName?: string;
  invoiceNumber?: string;
  amount?: number;
  pdfBuffer?: Buffer | null;
  ccEmail?: string;
}): Promise<boolean> {
  const { tenantId, toEmail, clientName, companyName, planName, invoiceNumber, amount, pdfBuffer } = opts;
  let cc = opts.ccEmail;
  if (!cc) {
    try {
      const doc = await resolveTenantDoc(tenantId);
      if (doc && (doc.ccInvoiceEnabled === true || doc.ccInvoiceEnabled === 'true') && doc.ccInvoiceEmail && doc.ccInvoiceEmail.trim()) {
        cc = doc.ccInvoiceEmail.trim();
        console.log(`[EMAIL] 🧾 Auto-resolved CC Invoice email: ${cc}`);
      }
    } catch (e: any) {
      console.warn('[EMAIL] Failed to resolve CC for tax invoice:', e?.message);
    }
  }
  const displayCompany = companyName || 'Research Analyst Services';
  const displayPlan = planName || 'Research Service Plan';
  const displayInv = invoiceNumber || `INV-${Date.now()}`;
  const displayAmt = amount !== undefined ? `₹${Number(amount).toLocaleString('en-IN')}` : '';

  const tpl = await resolveEmailTemplate(tenantId, 'INVOICE');
  const vars = {
    clientName,
    companyName: displayCompany,
    planName: displayPlan,
    invoiceNumber: displayInv,
    amount: displayAmt,
    invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  const subject = renderEmailTemplateString(tpl.subject || `Tax Invoice ${displayInv} for ${displayPlan} — ${displayCompany}`, vars);
  const renderedBody = renderEmailTemplateString(tpl.body, vars);

  const attachments: any[] = [];
  if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
    attachments.push({
      filename: `Tax_Invoice_${displayInv.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  const customContent = `
    ${renderedBody ? `<div style="margin-bottom: 20px;">${renderedBody.replace(/\n/g, '<br/>')}</div>` : ''}

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 0 24px; padding: 16px 20px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Invoice Number:</td>
        <td style="padding: 6px 0; font-size: 13.5px; font-weight: 700; color: #1e293b; text-align: right; font-family: monospace;">${displayInv}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Subscribed Plan:</td>
        <td style="padding: 6px 0; font-size: 13.5px; font-weight: 700; color: #1e293b; text-align: right;">${displayPlan}</td>
      </tr>
      ${displayAmt ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Total Amount:</td>
        <td style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; text-align: right;">${displayAmt}</td>
      </tr>` : ''}
    </table>

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 18px; margin: 0 0 24px;">
      <div style="font-weight: 800; color: #1d4ed8; font-size: 13.5px; margin-bottom: 4px;">
        📎 Tax Invoice Attached (PDF)
      </div>
      <div style="color: #1e40af; font-size: 12.5px; line-height: 1.5;">
        A detailed copy of your GST/Tax invoice is attached as a PDF. Please retain this for your financial records and tax filing.
      </div>
    </div>
  `;

  const html = wrapInBrandedHtmlEmail({
    title: 'Official Tax Invoice',
    companyName: displayCompany,
    content: customContent,
    headerGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
    headerIcon: '🧾'
  });

  return sendEmail(tenantId, toEmail, subject, html, attachments, cc);
}

/**
 * Sends Video KYC / IPV Invitation Email to client with direct join link & dynamic OTP.
 */
export async function sendVideoKycInviteEmail(
  tenantId: string | null | undefined,
  toEmail: string,
  clientName: string,
  companyName: string,
  videoKycUrl: string,
  otpCode: string,
  pan: string,
  scheduleInfo?: { scheduleType?: string; scheduledAt?: Date | string | null }
): Promise<boolean> {
  const displayCompany = companyName || 'Research Analyst Services';
  const isScheduled = scheduleInfo?.scheduleType === 'SCHEDULED' && scheduleInfo?.scheduledAt;
  const formattedScheduledTime = isScheduled
    ? new Date(scheduleInfo!.scheduledAt!).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      })
    : null;

  const tpl = await resolveEmailTemplate(tenantId, 'VIDEO_KYC_INVITE');
  const vars = {
    clientName,
    companyName: displayCompany,
    videoKycUrl,
    otpCode,
    pan: pan || 'N/A'
  };

  const subject = renderEmailTemplateString(
    tpl.subject || (isScheduled
      ? `Scheduled Video KYC Verification for ${formattedScheduledTime} — ${displayCompany}`
      : `Complete Your SEBI Video KYC Verification — ${displayCompany}`),
    vars
  );
  const renderedBody = renderEmailTemplateString(tpl.body, vars);

  const customContent = `
    ${renderedBody ? `<div style="margin-bottom: 22px;">${renderedBody.replace(/\n/g, '<br/>')}</div>` : ''}

    ${isScheduled ? `
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px 20px; margin: 0 0 20px; text-align: center;">
      <div style="font-size: 12px; color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
        📅 Scheduled Video KYC Appointment
      </div>
      <div style="font-size: 20px; font-weight: 800; color: #1d4ed8;">
        ${formattedScheduledTime}
      </div>
      <div style="font-size: 12px; color: #3b82f6; margin-top: 6px;">
        Please join the video room at your scheduled appointment time.
      </div>
    </div>
    ` : ''}

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 0 0 24px; text-align: center;">
      <div style="font-size: 13px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
        Your Video KYC One-Time Code
      </div>
      <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #15803d; font-family: monospace;">
        ${otpCode}
      </div>
      <div style="font-size: 12px; color: #15803d; margin-top: 6px;">
        Keep this code ready to confirm when prompted during the video call.
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${videoKycUrl}" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
        📹 ${isScheduled ? 'Open Scheduled Video KYC Room' : 'Start Video KYC Session Now'}
      </a>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px 16px; margin: 20px 0 0; font-size: 12px; color: #92400e; line-height: 1.5;">
      ⚠️ <strong>SEBI Compliance Requirement:</strong> Please ensure your camera and microphone are connected and allowed in browser permissions. Your session will be recorded and geotagged.
    </div>
  `;

  const html = wrapInBrandedHtmlEmail({
    title: 'Live Video KYC & IPV Verification',
    companyName: displayCompany,
    content: customContent,
    headerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)',
    headerIcon: '📹'
  });

  return sendEmail(tenantId, toEmail, subject, html);
}


