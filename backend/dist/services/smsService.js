"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIndianMobile = normalizeIndianMobile;
exports.ensureDefaultSmsTemplates = ensureDefaultSmsTemplates;
exports.sendSms = sendSms;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../config/db"));
/**
 * Default SMSJust Base URL
 */
const SMSJUST_BASE_URL = 'https://smsjust.com/sms/user/urlsms.php';
/**
 * Normalizes 10-digit Indian mobile number (stripping +91 or leading 0).
 */
function normalizeIndianMobile(mobile) {
    if (!mobile)
        return '';
    const digits = mobile.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.substring(2);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
        return digits.substring(1);
    }
    if (digits.length > 10) {
        return digits.slice(-10);
    }
    return digits;
}
/**
 * Ensures default SMS templates exist for a tenant context.
 */
async function ensureDefaultSmsTemplates(tenantId) {
    try {
        const query = tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
        const count = await db_1.default.SmsTemplate.countDocuments(query);
        if (count === 0) {
            await db_1.default.SmsTemplate.create([
                {
                    tenantId: tenantId || null,
                    name: 'Login Two-Step Verification (2FA)',
                    type: 'LOGIN_2FA',
                    dltTemplateId: '1207178402616971064',
                    message: 'Infoline Equity Research, {#var#} is your verification code for login. TRADE WITH PROPER STOPLOSS AND TARGET. https://infolineequity.com/ - info@infolineequity.com',
                    status: 'ACTIVE',
                    isDefault: true
                }
            ]);
        }
    }
    catch (err) {
        console.error('[SMS Service] Error ensuring default SMS templates:', err);
    }
}
/**
 * Sends an SMS using the tenant's configured SMSJust gateway and active DLT template.
 */
async function sendSms(options) {
    const { tenantId, mobile, templateType, segment, action, variables = {}, orderedVariables = [], customMessage, dltTemplateId, overrideCredentials } = options;
    try {
        const cleanMobile = normalizeIndianMobile(mobile);
        if (!cleanMobile || cleanMobile.length !== 10) {
            return { success: false, reason: 'INVALID_MOBILE', message: 'Valid 10-digit mobile number required' };
        }
        // 1. Fetch Tenant SMS Gateway configuration
        let tenant = null;
        if (tenantId) {
            tenant = await db_1.default.Tenant.findById(tenantId).lean();
        }
        if (!tenant) {
            tenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        }
        if (!tenant && !overrideCredentials) {
            return { success: false, reason: 'CREDENTIALS_MISSING', message: 'Tenant configuration not found' };
        }
        // 2. Check if SMS Gateway is enabled (bypassed if explicitly testing with override credentials)
        if (!overrideCredentials && tenant && !tenant.smsGatewayEnabled) {
            return {
                success: false,
                reason: 'SMS_GATEWAY_DISABLED',
                message: 'SMS Gateway is currently disabled by administrator'
            };
        }
        const smsUsername = (overrideCredentials?.username || tenant?.smsUsername || '').trim();
        const smsPassword = (overrideCredentials?.password || tenant?.smsPassword || '').trim();
        const smsSenderId = (overrideCredentials?.senderId || tenant?.smsSenderId || '').trim();
        const smsEntityId = (overrideCredentials?.entityId !== undefined ? overrideCredentials?.entityId : tenant?.smsEntityId || '').trim();
        if (!smsUsername || !smsPassword || !smsSenderId) {
            return {
                success: false,
                reason: 'CREDENTIALS_MISSING',
                message: 'SMS Gateway credentials (username, password, senderid) are incomplete'
            };
        }
        // 3. Resolve Template & DLT Template ID
        let finalMessage = customMessage || '';
        let finalDltTempId = dltTemplateId || '';
        if (!finalMessage || !finalDltTempId) {
            await ensureDefaultSmsTemplates(tenant?._id?.toString());
            const tenantFilter = [
                ...(tenant?._id ? [{ tenantId: tenant._id }] : []),
                { tenantId: null },
                { tenantId: { $exists: false } }
            ];
            let template = null;
            // A. If segment and action are specified, look for matching active TRADE_SIGNAL template
            if (segment && action) {
                const seg = segment.trim().toUpperCase();
                const act = action.trim().toUpperCase();
                const triggerCombo = `${seg}_${act}`;
                template = await db_1.default.SmsTemplate.findOne({
                    $and: [
                        { $or: tenantFilter },
                        { status: 'ACTIVE' },
                        {
                            $or: [
                                { applicableCombinations: triggerCombo },
                                { applicableSegments: seg, applicableActions: act }
                            ]
                        }
                    ]
                }).lean();
            }
            // B. Fallback to templateType / category lookup if not resolved
            if (!template && templateType) {
                template = await db_1.default.SmsTemplate.findOne({
                    $and: [
                        { $or: tenantFilter },
                        { $or: [{ type: templateType }, { category: templateType }] }
                    ]
                }).lean();
            }
            if (!template) {
                const identifier = segment && action ? `${segment} ${action}` : (templateType || 'UNKNOWN');
                return {
                    success: false,
                    reason: 'TEMPLATE_INACTIVE',
                    message: `SMS Template "${identifier}" not configured or inactive`
                };
            }
            // Check if specific template is active
            const isTemplateActive = template.status === 'ACTIVE' || template.isActive === true;
            if (!isTemplateActive) {
                return {
                    success: false,
                    reason: 'TEMPLATE_INACTIVE',
                    message: `SMS Template "${template.name}" is marked INACTIVE`
                };
            }
            finalDltTempId = template.dltTemplateId;
            finalMessage = template.message || template.content || '';
        }
        // 4. Replace placeholders with variable values
        // A. Sequential replacement for orderedVariables (e.g. {#var#}, {#alp#}, {#num#}, {#val#})
        if (Array.isArray(orderedVariables) && orderedVariables.length > 0) {
            let vIdx = 0;
            finalMessage = finalMessage.replace(/\{#(var|alp|num|val)#\}/gi, (match) => {
                if (vIdx < orderedVariables.length && orderedVariables[vIdx] !== undefined) {
                    return String(orderedVariables[vIdx++]);
                }
                return match;
            });
        }
        // B. Support common OTP/verification replacements
        const otpValue = variables.otp || variables.var || variables.code || variables.num || variables.alp || '';
        if (otpValue) {
            finalMessage = finalMessage
                .replace(/\{#var#\}/gi, String(otpValue))
                .replace(/\{#alp#\}/gi, String(otpValue))
                .replace(/\{#num#\}/gi, String(otpValue))
                .replace(/\{#val#\}/gi, String(otpValue))
                .replace(/\{#otp#\}/gi, String(otpValue))
                .replace(/\{OTP\}/gi, String(otpValue))
                .replace(/\{otp\}/gi, String(otpValue))
                .replace(/\{code\}/gi, String(otpValue))
                .replace(/\{num\}/gi, String(otpValue))
                .replace(/\{var\}/gi, String(otpValue))
                .replace(/\{alp\}/gi, String(otpValue));
        }
        // C. Named variables replacement (e.g. {#stock#}, {stock}, {#price#}, etc.)
        for (const [key, val] of Object.entries(variables)) {
            if (val !== undefined && val !== null) {
                finalMessage = finalMessage
                    .replace(new RegExp(`\\{#${key}#\\}`, 'gi'), String(val))
                    .replace(new RegExp(`\\{${key}\\}`, 'gi'), String(val));
            }
        }
        // 5. Construct SMSJust API Query
        const params = new URLSearchParams({
            username: smsUsername,
            pass: smsPassword,
            senderid: smsSenderId,
            dest_mobileno: cleanMobile,
            msgtype: 'TXT',
            response: 'Y',
            entityid: smsEntityId,
            dlttempid: finalDltTempId.trim(),
            message: finalMessage
        });
        const requestUrl = `${SMSJUST_BASE_URL}?${params.toString()}`;
        console.log(`[SMS Service] Sending SMS to ${cleanMobile} via SMSJust (Sender: ${smsSenderId}, DLT: ${finalDltTempId})...`);
        const response = await axios_1.default.get(requestUrl, { timeout: 10000 });
        const responseData = typeof response.data === 'string' ? response.data.trim() : JSON.stringify(response.data);
        console.log(`[SMS Service] Response: ${responseData}`);
        const isError = /^ES\d+/i.test(responseData) || /^ERR/i.test(responseData) || /failed|invalid/i.test(responseData);
        if (isError) {
            return {
                success: false,
                reason: 'HTTP_ERROR',
                message: `SMS Gateway Error: ${responseData}`,
                rawResponse: responseData
            };
        }
        return {
            success: true,
            message: 'SMS dispatched successfully',
            rawResponse: responseData
        };
    }
    catch (error) {
        console.error('[SMS Service] Failed to send SMS:', error.message);
        return {
            success: false,
            reason: 'HTTP_ERROR',
            message: error.message || 'Failed to dispatch SMS'
        };
    }
}
