import axios from 'axios';
import dynamicDb from '../config/db';

/**
 * Interface representing SMS Send Options
 */
export interface SmsSendOptions {
  tenantId?: string | null;
  mobile: string;
  templateType: 'LOGIN_2FA' | 'REGISTRATION_OTP' | 'CUSTOM' | string;
  variables?: Record<string, string>; // e.g. { otp: '123456', var: '123456' }
  customMessage?: string;
  dltTemplateId?: string;
}

/**
 * Interface representing SMS Send Result
 */
export interface SmsSendResult {
  success: boolean;
  message?: string;
  reason?: 'SMS_GATEWAY_DISABLED' | 'TEMPLATE_INACTIVE' | 'CREDENTIALS_MISSING' | 'HTTP_ERROR' | 'INVALID_MOBILE';
  rawResponse?: string;
}

/**
 * Default SMSJust Base URL
 */
const SMSJUST_BASE_URL = 'https://smsjust.com/sms/user/urlsms.php';

/**
 * Normalizes 10-digit Indian mobile number (stripping +91 or leading 0).
 */
export function normalizeIndianMobile(mobile: string): string {
  if (!mobile) return '';
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
export async function ensureDefaultSmsTemplates(tenantId?: string | null) {
  try {
    const query = tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
    const count = await dynamicDb.SmsTemplate.countDocuments(query);
    if (count === 0) {
      await dynamicDb.SmsTemplate.create([
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
  } catch (err) {
    console.error('[SMS Service] Error ensuring default SMS templates:', err);
  }
}

/**
 * Sends an SMS using the tenant's configured SMSJust gateway and active DLT template.
 */
export async function sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
  const { tenantId, mobile, templateType, variables = {}, customMessage, dltTemplateId } = options;

  try {
    const cleanMobile = normalizeIndianMobile(mobile);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return { success: false, reason: 'INVALID_MOBILE', message: 'Valid 10-digit mobile number required' };
    }

    // 1. Fetch Tenant SMS Gateway configuration
    let tenant: any = null;
    if (tenantId) {
      tenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenant) {
      tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }

    if (!tenant) {
      return { success: false, reason: 'CREDENTIALS_MISSING', message: 'Tenant configuration not found' };
    }

    // 2. Check if SMS Gateway is enabled
    if (!tenant.smsGatewayEnabled) {
      return {
        success: false,
        reason: 'SMS_GATEWAY_DISABLED',
        message: 'SMS Gateway is currently disabled by administrator'
      };
    }

    const { smsUsername, smsPassword, smsSenderId, smsEntityId } = tenant;
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
      await ensureDefaultSmsTemplates(tenant._id?.toString());
      const tenantFilter = [
        ...(tenant._id ? [{ tenantId: tenant._id }] : []),
        { tenantId: null },
        { tenantId: { $exists: false } }
      ];

      const template: any = await dynamicDb.SmsTemplate.findOne({
        $and: [
          { $or: tenantFilter },
          { $or: [{ type: templateType }, { category: templateType }] }
        ]
      }).lean();

      if (!template) {
        return {
          success: false,
          reason: 'TEMPLATE_INACTIVE',
          message: `SMS Template "${templateType}" not configured`
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
    // Supports {#var#}, {#alp#}, {OTP}, {otp}, etc.
    const otpValue = variables.otp || variables.var || variables.code || '';
    if (otpValue) {
      finalMessage = finalMessage
        .replace(/\{#var#\}/gi, otpValue)
        .replace(/\{#alp#\}/gi, otpValue)
        .replace(/\{OTP\}/gi, otpValue)
        .replace(/\{otp\}/gi, otpValue)
        .replace(/\{code\}/gi, otpValue);
    }

    for (const [key, val] of Object.entries(variables)) {
      finalMessage = finalMessage.replace(new RegExp(`\\{${key}\\}`, 'gi'), val);
    }

    // 5. Construct SMSJust API Query
    const params = new URLSearchParams({
      username: smsUsername.trim(),
      pass: smsPassword.trim(),
      senderid: smsSenderId.trim(),
      dest_mobileno: cleanMobile,
      msgtype: 'TXT',
      response: 'Y',
      entityid: (smsEntityId || '').trim(),
      dlttempid: finalDltTempId.trim(),
      message: finalMessage
    });

    const requestUrl = `${SMSJUST_BASE_URL}?${params.toString()}`;
    console.log(`[SMS Service] Sending SMS to ${cleanMobile} via SMSJust (DLT: ${finalDltTempId})...`);

    const response = await axios.get(requestUrl, { timeout: 10000 });
    const responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    console.log(`[SMS Service] Response: ${responseData}`);

    return {
      success: true,
      message: 'SMS dispatched successfully',
      rawResponse: responseData
    };
  } catch (error: any) {
    console.error('[SMS Service] Failed to send SMS:', error.message);
    return {
      success: false,
      reason: 'HTTP_ERROR',
      message: error.message || 'Failed to dispatch SMS'
    };
  }
}
