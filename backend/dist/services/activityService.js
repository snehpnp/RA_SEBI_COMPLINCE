"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientDeviceInfo = parseClientDeviceInfo;
exports.logActivity = logActivity;
const db_1 = require("../config/db");
const tenantContext_1 = require("../config/tenantContext");
/**
 * Parses user-agent and IP from an Express request
 */
function parseClientDeviceInfo(req) {
    if (!req) {
        return {
            ipAddress: null,
            device: 'Desktop',
            browser: 'Web Browser',
            os: 'Unknown OS'
        };
    }
    // Extract IP
    const forwarded = req.headers['x-forwarded-for'];
    let ipAddress = '';
    if (typeof forwarded === 'string') {
        ipAddress = forwarded.split(',')[0].trim();
    }
    else if (Array.isArray(forwarded)) {
        ipAddress = forwarded[0].trim();
    }
    else {
        ipAddress = req.socket?.remoteAddress || req.ip || '';
    }
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.includes('::ffff:127.0.0.1')) {
        ipAddress = '127.0.0.1 (Localhost)';
    }
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    // Detect OS
    let os = 'Unknown OS';
    if (ua.includes('windows nt 10.0') || ua.includes('windows nt 11.0') || ua.includes('windows')) {
        os = 'Windows';
    }
    else if (ua.includes('macintosh') || ua.includes('mac os x')) {
        os = 'macOS';
    }
    else if (ua.includes('iphone') || ua.includes('ipad')) {
        os = 'iOS';
    }
    else if (ua.includes('android')) {
        os = 'Android';
    }
    else if (ua.includes('linux')) {
        os = 'Linux';
    }
    // Detect Device Type
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        device = 'Mobile Device';
    }
    else if (ua.includes('ipad') || ua.includes('tablet')) {
        device = 'Tablet';
    }
    // Detect Browser
    let browser = 'Web Browser';
    if (ua.includes('edg/')) {
        browser = 'Microsoft Edge';
    }
    else if (ua.includes('chrome') && !ua.includes('edg/')) {
        browser = 'Google Chrome';
    }
    else if (ua.includes('safari') && !ua.includes('chrome')) {
        browser = 'Apple Safari';
    }
    else if (ua.includes('firefox')) {
        browser = 'Mozilla Firefox';
    }
    else if (ua.includes('opera') || ua.includes('opr/')) {
        browser = 'Opera';
    }
    return { ipAddress, device, browser, os };
}
/**
 * Asynchronously logs a client or staff activity without blocking the request pipeline
 */
async function logActivity(params) {
    try {
        const context = (0, tenantContext_1.getTenantContext)();
        const resolvedTenantId = params.tenantId || context?.tenantId;
        if (!resolvedTenantId) {
            // Cannot log without tenant context
            return;
        }
        const { ipAddress, device, browser, os } = parseClientDeviceInfo(params.req);
        const doc = {
            tenantId: resolvedTenantId,
            actorType: params.actorType || 'CLIENT',
            actorId: params.actorId || params.req?.user?.id || null,
            actorName: params.actorName || params.req?.user?.name || null,
            actorEmail: params.actorEmail || params.req?.user?.email || null,
            targetClientId: params.targetClientId || null,
            category: params.category,
            action: params.action,
            title: params.title,
            description: params.description || null,
            status: params.status || 'SUCCESS',
            metadata: params.metadata || {},
            ipAddress: params.ipAddress || ipAddress,
            device: params.device || device,
            browser: params.browser || browser,
            os: params.os || os,
            timestamp: params.timestamp || new Date()
        };
        // Save using dynamicDb for multi-tenant awareness
        await db_1.dynamicDb.ActivityLog.create(doc);
    }
    catch (error) {
        // Non-blocking catch to ensure core operational flows are never broken by logging
        console.warn('[ActivityLogger] Failed to record event:', error.message);
    }
}
