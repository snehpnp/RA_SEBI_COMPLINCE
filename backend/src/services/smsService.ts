import axios from 'axios';
import dynamicDb from '../config/db';

/**
 * Interface representing SMS Send Options
 */
export interface SmsSendOptions {
  tenantId?: string | null;
  mobile: string;
  templateType?: 'LOGIN_2FA' | 'REGISTRATION_OTP' | 'TRADE_SIGNAL' | 'CUSTOM' | string;
  segment?: string; // 'CASH' | 'FUTURE' | 'OPTION'
  action?: string; // 'BUY' | 'SELL' | 'TARGET' | 'STOPLOSS'
  variables?: Record<string, any>; // e.g. { otp: '123456', stock: 'RELIANCE', price: '2500' }
  orderedVariables?: (string | number)[]; // Sequential values for sequential DLT placeholders
  customMessage?: string;
  dltTemplateId?: string;
  overrideCredentials?: {
    gatewayUrl?: string;
    username?: string;
    password?: string;
    senderId?: string;
    entityId?: string;
  };
}

/**
 * Interface representing SMS Send Result
 */
export interface SmsSendResult {
  success: boolean;
  message?: string;
  sentMessage?: string;
  reason?: 'SMS_GATEWAY_DISABLED' | 'TEMPLATE_INACTIVE' | 'CREDENTIALS_MISSING' | 'HTTP_ERROR' | 'INVALID_MOBILE';
  rawResponse?: string;
}

/**
 * Default SMS Gateway Base URL (bulksms.pnpuniverse.com)
 */
const SMSJUST_BASE_URL = 'https://bulksms.pnpuniverse.com/sms/user/urlsms.php';

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
  const {
    tenantId,
    mobile,
    templateType,
    segment,
    action,
    variables = {},
    orderedVariables = [],
    customMessage,
    dltTemplateId,
    overrideCredentials
  } = options;

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
    let template: any = null;

    if (!finalMessage || !finalDltTempId) {
      await ensureDefaultSmsTemplates(tenant?._id?.toString());
      const tenantFilter = [
        ...(tenant?._id ? [{ tenantId: tenant._id }] : []),
        { tenantId: null },
        { tenantId: { $exists: false } }
      ];

      // A. If segment and action are specified, look for matching active TRADE_SIGNAL template
      if (segment && action) {
        const seg = segment.trim().toUpperCase();
        const act = action.trim().toUpperCase();
        const triggerCombo = `${seg}_${act}`;

        template = await dynamicDb.SmsTemplate.findOne({
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
        template = await dynamicDb.SmsTemplate.findOne({
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
    let activeOrderedVars = Array.isArray(orderedVariables) && orderedVariables.length > 0 ? [...orderedVariables] : [];

    // Dynamically resolve from template variableMappings if present
    if (activeOrderedVars.length === 0 && Array.isArray((template as any)?.variableMappings) && (template as any).variableMappings.length > 0) {
      const sortedMappings = [...(template as any).variableMappings].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
      for (const mapping of sortedMappings) {
        const fieldsToUse: string[] = Array.isArray((mapping as any).selectedFields) && (mapping as any).selectedFields.length > 0
          ? (mapping as any).selectedFields
          : (mapping.fieldKey ? [mapping.fieldKey] : []);

        const fieldValues: string[] = [];
        for (const fKey of fieldsToUse) {
          let partVal = '';
          if (fKey === 'callType' || fKey === 'action') partVal = variables.callType || variables.action || '';
          else if (fKey === 'stock' || fKey === 'symbol') partVal = variables.stock || variables.symbol || '';
          else if (fKey === 'strikePrice') partVal = variables.strikePrice ? String(variables.strikePrice) : '';
          else if (fKey === 'optionType') partVal = variables.optionType || '';
          else if (fKey === 'expiryDate') partVal = variables.expiryDate || '';
          else if (fKey === 'entryType') partVal = variables.entryType || '';
          else if (fKey === 'entryPrice' || fKey === 'price') partVal = variables.entryPrice || variables.price || '';
          else if (fKey === 'targets') partVal = variables.targets || variables.target || '';
          else if (fKey === 'target1') partVal = variables.target1 || '';
          else if (fKey === 'target2') partVal = variables.target2 || '';
          else if (fKey === 'target3') partVal = variables.target3 || '';
          else if (fKey === 'stoploss' || fKey === 'sl') partVal = variables.stoploss || variables.sl || '';
          else if (fKey === 'duration' || fKey === 'tradeDuration') partVal = variables.duration || variables.tradeDuration || '';
          else if (fKey === 'fullInstrument') partVal = variables.fullInstrument || variables.stock || '';
          else if (fKey === 'instrumentWithPrice') partVal = variables.instrumentWithPrice || (variables.fullInstrument ? (variables.fullInstrument + ' @ ' + (variables.entryPrice || '')) : '');
          else if (fKey === 'custom') partVal = mapping.customLabel || '';
          else if (variables[fKey] !== undefined) partVal = String(variables[fKey]);

          if (partVal && String(partVal).trim()) {
            fieldValues.push(String(partVal).trim());
          }
        }
        const combinedVal = fieldValues.join(' ');
        activeOrderedVars.push(combinedVal);
      }
    }

    // A. Sequential replacement for ordered variables (e.g. {#var#}, {#alp#}, {#num#}, {#val#})
    if (activeOrderedVars.length > 0) {
      let vIdx = 0;
      finalMessage = finalMessage.replace(/\{#(var|alp|num|val|[a-z0-9_]+)#\}/gi, (match) => {
        if (vIdx < activeOrderedVars.length && activeOrderedVars[vIdx] !== undefined) {
          return String(activeOrderedVars[vIdx++]);
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

    const gatewayBaseUrl = (overrideCredentials?.gatewayUrl || tenant?.smsGatewayUrl || SMSJUST_BASE_URL).trim();
    const requestUrl = `${gatewayBaseUrl}?${params.toString()}`;
    console.log(`[SMS Service] Sending SMS to ${cleanMobile} via ${gatewayBaseUrl} (Sender: ${smsSenderId}, DLT: ${finalDltTempId})...`);

    const response = await axios.get(requestUrl, { timeout: 10000 });
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
      sentMessage: finalMessage,
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
