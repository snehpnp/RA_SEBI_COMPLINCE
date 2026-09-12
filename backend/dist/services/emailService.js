"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendComplaintNotificationEmail = exports.sendAccountDeactivatedEmail = exports.sendAccountActivatedEmail = void 0;
exports.resolveSmtpCredentials = resolveSmtpCredentials;
exports.sendEmail = sendEmail;
exports.sendOtpEmail = sendOtpEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendForgotPasswordEmail = sendForgotPasswordEmail;
exports.sendTestEmail = sendTestEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const db_1 = __importStar(require("../config/db"));
const pdfService_1 = require("./pdfService");
/**
 * Resolves SMTP credentials from the Database (Tenant, AllCompany, SystemSetting)
 * before falling back to .env.
 */
async function resolveSmtpCredentials(tenantId) {
    let tenantDoc = null;
    let source = '';
    const isValidCred = (doc) => {
        return Boolean(doc &&
            typeof doc.smtpHost === 'string' && doc.smtpHost.trim() !== '' &&
            typeof doc.smtpUser === 'string' && doc.smtpUser.trim() !== '' &&
            typeof doc.smtpPassword === 'string' && doc.smtpPassword.trim() !== '');
    };
    // 1. If tenantId is provided, query dynamicDb and centralModels Tenant / AllCompany
    if (tenantId) {
        try {
            const doc = await db_1.default.Tenant.findById(tenantId).lean();
            if (isValidCred(doc)) {
                tenantDoc = doc;
                source = 'dynamicDb.Tenant(findById)';
            }
        }
        catch { }
        if (!tenantDoc) {
            try {
                const doc = await db_1.centralModels.Tenant.findById(tenantId).lean();
                if (isValidCred(doc)) {
                    tenantDoc = doc;
                    source = 'centralModels.Tenant(findById)';
                }
            }
            catch { }
        }
        if (!tenantDoc) {
            try {
                const doc = await db_1.default.Tenant.findOne({
                    $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
                }).lean();
                if (isValidCred(doc)) {
                    tenantDoc = doc;
                    source = 'dynamicDb.Tenant(findOne)';
                }
            }
            catch { }
        }
        if (!tenantDoc) {
            try {
                const doc = await db_1.centralModels.Tenant.findOne({
                    $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
                }).lean();
                if (isValidCred(doc)) {
                    tenantDoc = doc;
                    source = 'centralModels.Tenant(findOne)';
                }
            }
            catch { }
        }
        if (!tenantDoc) {
            try {
                const doc = await db_1.centralModels.AllCompany.findOne({
                    $or: [{ _id: tenantId }, { id: tenantId }, { tenantId: tenantId }]
                }).lean();
                if (isValidCred(doc)) {
                    tenantDoc = doc;
                    source = 'centralModels.AllCompany(findOne)';
                }
            }
            catch { }
        }
    }
    // 2. Query any active Tenant in dynamicDb or centralModels that has SMTP credentials
    if (!tenantDoc) {
        try {
            const doc = await db_1.default.Tenant.findOne({
                smtpHost: { $nin: [null, ''] },
                smtpUser: { $nin: [null, ''] },
                smtpPassword: { $nin: [null, ''] }
            }).lean();
            if (isValidCred(doc)) {
                tenantDoc = doc;
                source = 'dynamicDb.Tenant(anyActive)';
            }
        }
        catch { }
    }
    if (!tenantDoc) {
        try {
            const doc = await db_1.centralModels.Tenant.findOne({
                smtpHost: { $nin: [null, ''] },
                smtpUser: { $nin: [null, ''] },
                smtpPassword: { $nin: [null, ''] }
            }).lean();
            if (isValidCred(doc)) {
                tenantDoc = doc;
                source = 'centralModels.Tenant(anyActive)';
            }
        }
        catch { }
    }
    // 3. Query AllCompany in centralModels
    if (!tenantDoc) {
        try {
            const doc = await db_1.centralModels.AllCompany.findOne({
                smtpHost: { $nin: [null, ''] },
                smtpUser: { $nin: [null, ''] },
                smtpPassword: { $nin: [null, ''] }
            }).lean();
            if (isValidCred(doc)) {
                tenantDoc = doc;
                source = 'centralModels.AllCompany(anyActive)';
            }
        }
        catch { }
    }
    // 4. Query SystemSetting (keys: GLOBAL_SMTP, SMTP_CONFIG, SMTP_SETTINGS, SMTP) in dynamicDb and centralModels
    const smtpSettingKeys = ['GLOBAL_SMTP', 'SMTP_CONFIG', 'SMTP_SETTINGS', 'SMTP', 'EMAIL_CONFIG'];
    if (!tenantDoc) {
        for (const key of smtpSettingKeys) {
            try {
                const setting = await db_1.default.SystemSetting.findOne({ key }).lean();
                if (setting?.value) {
                    const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
                    if (isValidCred(parsed)) {
                        tenantDoc = parsed;
                        source = `dynamicDb.SystemSetting(${key})`;
                        break;
                    }
                }
            }
            catch { }
        }
    }
    if (!tenantDoc) {
        for (const key of smtpSettingKeys) {
            try {
                const setting = await db_1.centralModels.SystemSetting.findOne({ key }).lean();
                if (setting?.value) {
                    const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
                    if (isValidCred(parsed)) {
                        tenantDoc = parsed;
                        source = `centralModels.SystemSetting(${key})`;
                        break;
                    }
                }
            }
            catch { }
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
async function sendEmail(tenantId, to, subject, html, attachments) {
    try {
        const smtp = await resolveSmtpCredentials(tenantId);
        if (!smtp) {
            console.warn('[EMAIL] No SMTP credentials found in Database or Environment. Skipping email to:', to);
            return false;
        }
        const transporter = nodemailer_1.default.createTransport({
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
            await db_1.NotificationLog.create({
                tenantId: tenantId || null,
                recipient: to,
                channel: 'EMAIL',
                title: subject,
                message: html.replace(/<[^>]*>/g, '').slice(0, 500),
                status: 'SENT'
            });
        }
        catch { }
        return true;
    }
    catch (err) {
        console.error('[EMAIL] Failed to send email to:', to, '| Error:', err.message);
        if (tenantId) {
            try {
                await db_1.NotificationLog.create({
                    tenantId,
                    recipient: to,
                    channel: 'EMAIL',
                    title: subject,
                    message: `Failed: ${err.message}`,
                    status: 'FAILED'
                });
            }
            catch { }
        }
        return false;
    }
}
/**
 * Send OTP Verification Email
 */
async function sendOtpEmail(opts) {
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
async function sendWelcomeEmail(opts) {
    const { tenantId, toEmail, name, password, role, loginUrl, companyName, customText } = opts;
    let attachments = opts.attachments || [];
    if ((!attachments || attachments.length === 0) && role === 'CLIENT' && tenantId) {
        try {
            attachments = await (0, pdfService_1.getTenantComplianceAttachments)(tenantId);
        }
        catch (attErr) {
            console.error('[EMAIL] Error loading default compliance attachments:', attErr);
        }
    }
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

      ${role === 'CLIENT' || (attachments && attachments.length > 0) ? `
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px; padding: 18px; margin: 20px 0;">
        <div style="font-weight: 700; color: #818cf8; font-size: 13px; margin-bottom: 8px;">
          📎 Mandatory Compliance Documents Attached (PDF):
        </div>
        <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          <div style="margin-bottom: 4px;">• 📄 <strong>Terms & Conditions (PDF)</strong> — Advisory terms, disclosures & risk warnings</div>
          <div>• 📄 <strong>Privacy Policy (PDF)</strong> — Client data protection & confidentiality policy</div>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
          Please review and keep these attached PDF documents for your compliance and regulatory records.
        </div>
      </div>
      ` : ''}

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
async function sendForgotPasswordEmail(opts) {
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
async function sendTestEmail(tenantId, toEmail) {
    const smtp = await resolveSmtpCredentials(tenantId);
    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
        return { success: false, message: 'SMTP is not fully configured. Please enter Host, Port, User, and Password first.' };
    }
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1e293b;padding:32px;border-radius:12px;border:1px solid #334155">
      <h2 style="color:#6366f1;margin:0 0 16px">✅ SMTP Test Successful!</h2>
      <p style="color:#cbd5e1">Your SMTP configuration is working correctly.</p>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0">Server: ${smtp.host}:${smtp.port} | Sender: ${smtp.user}</p>
    </div>`;
    const sent = await sendEmail(tenantId, toEmail, '✅ SMTP Test — RAGCP Platform', html);
    return sent
        ? { success: true, message: 'Test email sent successfully! Please check your inbox.' }
        : { success: false, message: 'Failed to send test email. Please check your SMTP credentials.' };
}
const sendAccountActivatedEmail = async ({ toEmail, name, companyName }) => {
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
exports.sendAccountActivatedEmail = sendAccountActivatedEmail;
const sendAccountDeactivatedEmail = async ({ toEmail, name, companyName }) => {
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
exports.sendAccountDeactivatedEmail = sendAccountDeactivatedEmail;
const sendComplaintNotificationEmail = async ({ tenantId, adminEmail, clientName, clientPan, subject, description }) => {
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
exports.sendComplaintNotificationEmail = sendComplaintNotificationEmail;
