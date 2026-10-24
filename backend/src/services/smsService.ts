import axios from 'axios';
import dynamicDb from '../config/db';

/**
 * Interface representing SMS Send Options
 */
export interface SmsSendOptions {
  tenantId?: string | null;
  mobile: string;
  templateType?: 'LOGIN_2FA' | 'REGISTRATION_OTP' | 'TRADE_SIGNAL' | 'TRADE_ALERT' | 'CUSTOM' | string;
  segment?: string; // 'CASH' | 'FUTURE' | 'OPTION'
  action?: string; // 'BUY' | 'SELL' | 'TARGET' | 'STOPLOSS' | 'ALERT' | string
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
 * Splits text into two parts of at most maxChunkLen (30 chars) each,
 * respecting word boundaries if possible so DLT scrubbers don't drop the SMS.
 */
export function splitTextForDlt(text: string, maxChunkLen: number = 30): [string, string] {
  if (!text) return ['', ''];
  const clean = String(text).trim();
  if (clean.length <= maxChunkLen) {
    return [clean, ''];
  }

  // Attempt word boundary split within maxChunkLen
  let splitIdx = clean.lastIndexOf(' ', maxChunkLen);
  if (splitIdx <= 0) {
    // If no space, hard cut at maxChunkLen
    splitIdx = maxChunkLen;
  }

  const part1 = clean.substring(0, splitIdx).trim();
  const part2 = clean.substring(splitIdx).trim().slice(0, maxChunkLen);
  return [part1, part2];
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

      // A. If templateType is TRADE_ALERT, look for matching active TRADE_ALERT template first
      if (templateType === 'TRADE_ALERT') {
        template = await dynamicDb.SmsTemplate.findOne({
          $and: [
            { $or: tenantFilter },
            { status: 'ACTIVE' },
            { $or: [{ type: 'TRADE_ALERT' }, { category: 'TRADE_ALERT' }] }
          ]
        }).lean();
      }

      // B. If DLT template ID is specified, lookup by dltTemplateId directly
      if (!template && finalDltTempId) {
        template = await dynamicDb.SmsTemplate.findOne({
          $and: [
            { $or: tenantFilter },
            { dltTemplateId: finalDltTempId.trim() }
          ]
        }).lean();
      }

      // C. If segment and action are specified for TRADE_SIGNAL, look for matching active TRADE_SIGNAL template
      if (!template && (templateType === 'TRADE_SIGNAL' || !templateType) && segment && action) {
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

      // D. Fallback to templateType / category lookup (e.g. LOGIN_2FA, REGISTRATION_OTP, CUSTOM)
      if (!template && templateType) {
        template = await dynamicDb.SmsTemplate.findOne({
          $and: [
            { $or: tenantFilter },
            { status: 'ACTIVE' },
            { $or: [{ type: templateType }, { category: templateType }] }
          ]
        }).lean();
      }

      if (!template) {
        const identifier = templateType === 'TRADE_ALERT' ? 'TRADE_ALERT' : (segment && action ? `${segment} ${action}` : (templateType || 'UNKNOWN'));
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

    const isTradeAlert = templateType === 'TRADE_ALERT' || template?.type === 'TRADE_ALERT' || template?.category === 'TRADE_ALERT';
    const rawAlertVal = variables.alertMessage || variables.alert || variables.message || '';
    const alertVal = typeof rawAlertVal === 'string' ? rawAlertVal.trim() : String(rawAlertVal || '');
    const [alertPart1, alertPart2] = splitTextForDlt(alertVal, 30);
    let alertPartMappingIndex = 0;

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
          else if (fKey === 'alert' || fKey === 'alertMessage' || fKey === 'message') {
            if (isTradeAlert) {
              if (alertPartMappingIndex === 0) {
                partVal = alertPart1 || alertVal.slice(0, 30);
                alertPartMappingIndex++;
              } else {
                partVal = alertPart2;
                alertPartMappingIndex++;
              }
            } else {
              partVal = alertVal;
            }
          }
          else if (fKey === 'plan' || fKey === 'planName') partVal = variables.planName || variables.plan || '';
          else if (fKey === 'strikePrice') partVal = variables.strikePrice ? String(variables.strikePrice) : '';
          else if (fKey === 'optionType') partVal = variables.optionType || '';
          else if (fKey === 'expiryDate') partVal = variables.expiryDate || '';
          else if (fKey === 'entryType') partVal = variables.entryType || '';
          else if (fKey === 'entryPrice' || fKey === 'price') partVal = variables.entryPrice || variables.price || '';
          else if (fKey === 'exitPrice') partVal = variables.exitPrice || variables.price || '';
          else if (fKey === 'targets') partVal = variables.targets || variables.target || '';
          else if (fKey === 'target1') partVal = variables.target1 || '';
          else if (fKey === 'target2') partVal = variables.target2 || '';
          else if (fKey === 'target3') partVal = variables.target3 || '';
          else if (fKey === 'stoploss' || fKey === 'sl') partVal = variables.stoploss || variables.sl || '';
          else if (fKey === 'closeStatus') partVal = variables.closeStatus || variables.action || '';
          else if (fKey === 'closeRemark') partVal = variables.closeRemark || '';
          else if (fKey === 'targetLabel') partVal = variables.targetLabel || '';
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

    // If template has no placeholders or is just dummy text, and this is a TRADE_ALERT:
    // Directly use the user's alert message as finalMessage!
    if (isTradeAlert && (!finalMessage.includes('{') || finalMessage.trim().length <= 3)) {
      if (alertVal) {
        finalMessage = alertVal;
      }
    }

    // A. Common synonyms for Alert Message in templates
    if (alertVal) {
      if (isTradeAlert) {
        let aNamedIdx = 0;
        finalMessage = finalMessage.replace(/\{#(alert|alertMessage|message|msg|text|custom)#\}|\{(alert|alertMessage|message|msg|text)\}/gi, () => {
          if (aNamedIdx === 0) {
            aNamedIdx++;
            return alertPart1 || alertVal.slice(0, 30);
          } else {
            aNamedIdx++;
            return alertPart2;
          }
        });
      } else {
        finalMessage = finalMessage
          .replace(/\{#alert#\}/gi, String(alertVal))
          .replace(/\{#alertMessage#\}/gi, String(alertVal))
          .replace(/\{#message#\}/gi, String(alertVal))
          .replace(/\{#msg#\}/gi, String(alertVal))
          .replace(/\{#text#\}/gi, String(alertVal))
          .replace(/\{#custom#\}/gi, String(alertVal))
          .replace(/\{alert\}/gi, String(alertVal))
          .replace(/\{alertMessage\}/gi, String(alertVal))
          .replace(/\{message\}/gi, String(alertVal))
          .replace(/\{msg\}/gi, String(alertVal))
          .replace(/\{text\}/gi, String(alertVal));
      }
    }

    // B. Named variables replacement (e.g. {#stock#}, {stock}, {#price#}, etc.)
    for (const [key, val] of Object.entries(variables)) {
      if (val !== undefined && val !== null) {
        finalMessage = finalMessage
          .replace(new RegExp(`\\{#${key}#\\}`, 'gi'), String(val))
          .replace(new RegExp(`\\{${key}\\}`, 'gi'), String(val));
      }
    }

    // C. Support common OTP/verification replacements
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

    // Fallback ordered variables for TRADE_ALERT if no specific variableMappings were saved
    if (activeOrderedVars.length === 0 && isTradeAlert) {
      const sequentialMatches = finalMessage.match(/\{#(var|alp|num|val)\d*#\}/gi) || [];
      if (sequentialMatches.length === 1) {
        // 1 variable template = max 30 characters
        activeOrderedVars = [alertVal.slice(0, 30)];
      } else if (sequentialMatches.length >= 2) {
        // 2 variables template = up to 60 characters split across variables (max 30 chars each)
        activeOrderedVars = [alertPart1, alertPart2];
      }
    }

    // D. Sequential replacement for ordered variables (only {#var#}, {#alp#}, {#num#}, {#val#})
    if (activeOrderedVars.length > 0) {
      let vIdx = 0;
      finalMessage = finalMessage.replace(/\{#(var|alp|num|val)\d*#\}/gi, (match) => {
        if (vIdx < activeOrderedVars.length && activeOrderedVars[vIdx] !== undefined) {
          return String(activeOrderedVars[vIdx++]);
        }
        return match;
      });
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

export interface SmsDlrResult {
  success: boolean;
  scheduleId: string;
  mobile?: string;
  status: 'DELIVERED' | 'PENDING' | 'UNDELIVERED' | 'EXPIRED' | 'NCPR_DND' | 'REJECTED' | 'FAILED';
  dlrCode: 'DELIVRD' | 'PENDING' | 'UNDELIV' | 'EXPIRED' | 'NCPR' | 'REJECTD' | 'FAILED' | string;
  label: string;
  description: string;
  rawResponse: string;
}

/**
 * Checks the real-time Delivery Report (DLR) from Pinnacle / SMSJust gateway
 * API Endpoint according to documentation: /sms/user/response.php?Scheduleid=XXXXX
 */
export async function checkSmsDlrStatus(scheduleId: string, tenantId?: string | null): Promise<SmsDlrResult> {
  const cleanSchedId = (scheduleId || '').trim();
  if (!cleanSchedId) {
    return {
      success: false,
      scheduleId: '',
      status: 'FAILED',
      dlrCode: 'FAILED',
      label: 'Invalid ID',
      description: 'Schedule ID is missing or invalid',
      rawResponse: ''
    };
  }

  try {
    let gatewayUrl = 'https://bulksms.pnpuniverse.com/sms/user/response.php';
    if (tenantId) {
      const tenant = await dynamicDb.Tenant.findById(tenantId).lean();
      if (tenant?.smsGatewayUrl) {
        gatewayUrl = tenant.smsGatewayUrl.replace(/urlsms\.php/i, 'response.php');
      }
    }

    const response = await axios.get(`${gatewayUrl}?Scheduleid=${encodeURIComponent(cleanSchedId)}`, {
      timeout: 10000
    });

    const rawResponse = String(response.data || '').trim();
    const cleanText = rawResponse.replace(/<[^>]+>/g, '').trim();

    // Pattern in docs: "91XXXXXXXXXX STATUS"
    const match = cleanText.match(/(\d{10,12})\s+([A-Z0-9_]+)/i);

    if (match) {
      const mobile = match[1];
      const code = match[2].toUpperCase();

      if (code === 'DELIVRD') {
        return {
          success: true,
          scheduleId: cleanSchedId,
          mobile,
          status: 'DELIVERED',
          dlrCode: 'DELIVRD',
          label: 'Delivered',
          description: 'Message successfully delivered to handset',
          rawResponse: cleanText
        };
      }
      if (code === 'PENDING') {
        return {
          success: true,
          scheduleId: cleanSchedId,
          mobile,
          status: 'PENDING',
          dlrCode: 'PENDING',
          label: 'Pending',
          description: 'Delivery report pending / message in transit',
          rawResponse: cleanText
        };
      }
      if (code === 'UNDELIV') {
        return {
          success: true,
          scheduleId: cleanSchedId,
          mobile,
          status: 'UNDELIVERED',
          dlrCode: 'UNDELIV',
          label: 'Undelivered',
          description: 'Message could not be delivered to subscriber handset',
          rawResponse: cleanText
        };
      }
      if (code === 'EXPIRED') {
        return {
          success: true,
          scheduleId: cleanSchedId,
          mobile,
          status: 'EXPIRED',
          dlrCode: 'EXPIRED',
          label: 'Expired',
          description: 'Message validity expired before delivery',
          rawResponse: cleanText
        };
      }
      if (code === 'NCPR') {
        return {
          success: true,
          scheduleId: cleanSchedId,
          mobile,
          status: 'NCPR_DND',
          dlrCode: 'NCPR',
          label: 'DND (NCPR)',
          description: 'Mobile number registered in Do Not Disturb (DND / NCPR)',
          rawResponse: cleanText
        };
      }
      if (code === 'REJECTD' || code === 'REJECTED') {
        return {
          success: true,
          scheduleId: cleanSchedId,
          mobile,
          status: 'REJECTED',
          dlrCode: 'REJECTD',
          label: 'Rejected',
          description: 'Message rejected by telecom DLT scrubber / operator',
          rawResponse: cleanText
        };
      }

      return {
        success: true,
        scheduleId: cleanSchedId,
        mobile,
        status: 'FAILED',
        dlrCode: code,
        label: code,
        description: `Telecom DLR status: ${code}`,
        rawResponse: cleanText
      };
    }

    // Check specific error keywords from docs
    let errorDescription = cleanText;
    if (cleanText.toLowerCase().includes('account deactivated')) errorDescription = 'SMS account deactivated on gateway';
    else if (cleanText.toLowerCase().includes('no privilege')) errorDescription = 'No HTTP URL submission privilege';
    else if (cleanText.toLowerCase().includes('invalid sender')) errorDescription = 'Sender ID does not match account';
    else if (cleanText.toLowerCase().includes('insufficient balance')) errorDescription = 'Insufficient SMS credits / Account expired';
    else if (cleanText.toLowerCase().includes('sorry unable to process')) errorDescription = 'Gateway unable to process transaction';

    return {
      success: false,
      scheduleId: cleanSchedId,
      status: 'FAILED',
      dlrCode: 'FAILED',
      label: 'Gateway Error',
      description: errorDescription || 'Unknown gateway response',
      rawResponse: cleanText
    };
  } catch (err: any) {
    return {
      success: false,
      scheduleId: cleanSchedId,
      status: 'FAILED',
      dlrCode: 'ERROR',
      label: 'Network Error',
      description: err.message || 'Failed to connect to SMS delivery gateway',
      rawResponse: ''
    };
  }
}
