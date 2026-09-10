"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSmtpConnection = exports.updateGlobalBranding = exports.getGlobalBranding = void 0;
const db_1 = __importDefault(require("../config/db"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const emailService_1 = require("../services/emailService");
const BRANDING_KEY = 'GLOBAL_BRANDING';
const getGlobalBranding = async (req, res) => {
    try {
        const setting = await db_1.default.SystemSetting.findOne({
            key: BRANDING_KEY,
        }).lean();
        if (!setting) {
            // Return default branding if not set
            return res.status(200).json({
                success: true,
                data: {
                    appName: 'RAGCP',
                    logoUrl: '/logo-light.png',
                    faviconUrl: '/favicon.ico',
                    loginLogoUrl: '/logo-light.png'
                }
            });
        }
        const brandingData = JSON.parse(setting.value);
        res.status(200).json({
            success: true,
            data: brandingData
        });
    }
    catch (error) {
        console.error('Error fetching global branding:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getGlobalBranding = getGlobalBranding;
const updateGlobalBranding = async (req, res) => {
    try {
        const { appName } = req.body;
        // Auth middleware should guarantee this is a SUPER_ADMIN
        const user = req.user;
        if (!user || user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        // Read existing branding to preserve fields not being updated
        let existingData = { appName: 'RAGCP', logoUrl: '/logo-light.png', faviconUrl: '/favicon.ico', loginLogoUrl: '/logo-light.png' };
        const existing = await db_1.default.SystemSetting.findOne({ key: BRANDING_KEY }).lean();
        if (existing) {
            try {
                existingData = JSON.parse(existing.value);
            }
            catch { }
        }
        // Handle file uploads via multer (req.files is an object or array)
        const files = req.files;
        let logoUrl = existingData.logoUrl;
        let faviconUrl = existingData.faviconUrl;
        let loginLogoUrl = existingData.loginLogoUrl;
        if (files?.logo?.[0]) {
            // Build a URL path relative to server root (multer saves to /uploads/branding/)
            logoUrl = '/uploads/branding/' + files.logo[0].filename;
        }
        else if (req.body.logoUrl) {
            logoUrl = req.body.logoUrl;
        }
        if (files?.favicon?.[0]) {
            faviconUrl = '/uploads/branding/' + files.favicon[0].filename;
        }
        else if (req.body.faviconUrl) {
            faviconUrl = req.body.faviconUrl;
        }
        if (files?.loginLogo?.[0]) {
            loginLogoUrl = '/uploads/branding/' + files.loginLogo[0].filename;
        }
        else if (req.body.loginLogoUrl) {
            loginLogoUrl = req.body.loginLogoUrl;
        }
        const brandingData = {
            appName: appName || existingData.appName || 'RAGCP',
            logoUrl,
            faviconUrl,
            loginLogoUrl
        };
        const setting = await db_1.default.SystemSetting.findOneAndUpdate({ key: BRANDING_KEY }, {
            $set: {
                value: JSON.stringify(brandingData),
                updatedById: user.id
            },
            $setOnInsert: { key: BRANDING_KEY }
        }, { upsert: true, returnDocument: 'after', lean: true });
        // Auto-sync global branding updates across all company domains in background
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'BRANDING_UPDATE' }).catch((err) => {
            console.warn('Background sync for global branding update error:', err);
        });
        res.status(200).json({
            success: true,
            message: 'Global branding updated and propagated across companies successfully',
            data: setting ? JSON.parse(setting.value) : {}
        });
    }
    catch (error) {
        console.error('Error updating global branding:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateGlobalBranding = updateGlobalBranding;
const testSmtpConnection = async (req, res) => {
    try {
        const { host, port, user, password, testEmail } = req.body;
        let finalHost = (host || '').trim();
        let finalPort = (port ? parseInt(port) : 0);
        let finalUser = (user || '').trim();
        let finalPassword = (password || '').trim();
        const finalTestEmail = (testEmail || '').trim();
        if (!finalTestEmail) {
            return res.status(400).json({ success: false, message: 'Test email address is required.' });
        }
        if (!finalHost || !finalUser || !finalPassword) {
            const tenantId = req.user?.tenantId;
            const resolved = await (0, emailService_1.resolveSmtpCredentials)(tenantId);
            if (resolved) {
                if (!finalHost)
                    finalHost = resolved.host;
                if (!finalPort)
                    finalPort = resolved.port;
                if (!finalUser)
                    finalUser = resolved.user;
                if (!finalPassword)
                    finalPassword = resolved.pass;
            }
        }
        if (!finalHost || !finalUser || !finalPassword) {
            return res.status(400).json({ success: false, message: 'All SMTP details (Host, Port, User, Password) and Test Email are required.' });
        }
        if (!finalPort)
            finalPort = 587;
        const transporter = nodemailer_1.default.createTransport({
            host: finalHost,
            port: finalPort,
            secure: finalPort === 465,
            auth: {
                user: finalUser,
                pass: finalPassword
            },
            tls: { rejectUnauthorized: false }
        });
        const mailOptions = {
            from: finalUser,
            to: finalTestEmail,
            subject: 'Test Email from RAGCP',
            html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>SMTP Connection Successful!</h2>
        <p>If you are reading this, your SMTP credentials for RAGCP are perfectly configured.</p>
        <p style="color: #64748b; font-size: 12px;">Server: ${finalHost}:${finalPort} | User: ${finalUser}</p>
      </div>`
        };
        await transporter.verify();
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Test email sent successfully! Please check your inbox.' });
    }
    catch (error) {
        console.error('SMTP Test Failed:', error);
        return res.status(500).json({ success: false, message: 'SMTP Test Failed: ' + error.message });
    }
};
exports.testSmtpConnection = testSmtpConnection;
