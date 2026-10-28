import axios from 'axios';
import { dynamicDb } from '../config/db';

export interface CamsCredentials {
  camsClientCode: string;
  camsClientId: string;
  camsClientSecret: string;
  camsPoscode: string;
}

export interface ExtractedCamsDetails {
  pan?: string | null;
  name?: string | null;
  panStatus?: string | null;
  appStatus?: string | null;
  kraStatus?: string | null;
  dob?: string | null;
  gender?: string | null;
  fatherName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  email?: string | null;
  mobile?: string | null;
  kraStatusCode?: string | null;
  statusInfo?: KraStatusInfo;
  rawRecord?: any;
  returnCode?: string | number | null;
  returnMsg?: string | null;
}

export interface KraStatusInfo {
  code: string;
  label: string;
  isVerified: boolean;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
  description: string;
}

/**
 * Standard SEBI / CAMS KRA status codes mapping:
 * 07 -> KYC VALIDATED
 * 02 -> KYC REGISTERED
 * 01 -> UNDER PROCESS
 * 03 -> ON HOLD
 * 04 -> KYC REJECTED
 * 05 -> NOT AVAILABLE
 * 06 -> DEACTIVATED
 */
export const CAMS_KRA_STATUS_TABLE: Record<string, KraStatusInfo> = {
  '07': { code: '07', label: 'KYC VALIDATED', isVerified: true, badgeColor: 'emerald', description: 'SEBI KYC Validated' },
  '7': { code: '07', label: 'KYC VALIDATED', isVerified: true, badgeColor: 'emerald', description: 'SEBI KYC Validated' },
  '02': { code: '02', label: 'KYC REGISTERED', isVerified: true, badgeColor: 'emerald', description: 'KYC Registered in KRA' },
  '2': { code: '02', label: 'KYC REGISTERED', isVerified: true, badgeColor: 'emerald', description: 'KYC Registered in KRA' },
  '01': { code: '01', label: 'UNDER PROCESS', isVerified: false, badgeColor: 'blue', description: 'KYC Under Process' },
  '1': { code: '01', label: 'UNDER PROCESS', isVerified: false, badgeColor: 'blue', description: 'KYC Under Process' },
  '03': { code: '03', label: 'ON HOLD', isVerified: false, badgeColor: 'amber', description: 'KYC On Hold' },
  '3': { code: '03', label: 'ON HOLD', isVerified: false, badgeColor: 'amber', description: 'KYC On Hold' },
  '04': { code: '04', label: 'KYC REJECTED', isVerified: false, badgeColor: 'rose', description: 'KYC Rejected' },
  '4': { code: '04', label: 'KYC REJECTED', isVerified: false, badgeColor: 'rose', description: 'KYC Rejected' },
  '05': { code: '05', label: 'NOT AVAILABLE', isVerified: false, badgeColor: 'amber', description: 'KYC Not Available in KRA' },
  '5': { code: '05', label: 'NOT AVAILABLE', isVerified: false, badgeColor: 'amber', description: 'KYC Not Available in KRA' },
  '06': { code: '06', label: 'DEACTIVATED', isVerified: false, badgeColor: 'slate', description: 'KYC Deactivated' },
  '6': { code: '06', label: 'DEACTIVATED', isVerified: false, badgeColor: 'slate', description: 'KYC Deactivated' }
};

export function mapKraStatus(rawStatus?: string | null): KraStatusInfo {
  if (!rawStatus) {
    return { code: '', label: 'PENDING', isVerified: false, badgeColor: 'slate', description: 'KYC Pending' };
  }
  const clean = String(rawStatus).trim();
  if (CAMS_KRA_STATUS_TABLE[clean]) {
    return CAMS_KRA_STATUS_TABLE[clean];
  }
  const codeMatch = clean.match(/\b(0[1-7]|[1-7])\b/);
  if (codeMatch && CAMS_KRA_STATUS_TABLE[codeMatch[1]]) {
    return CAMS_KRA_STATUS_TABLE[codeMatch[1]];
  }
  const upper = clean.toUpperCase();
  if (upper.includes('VALIDATED')) return CAMS_KRA_STATUS_TABLE['07'];
  if (upper.includes('REGISTERED')) return CAMS_KRA_STATUS_TABLE['02'];
  if (upper.includes('UNDER PROCESS') || upper.includes('PROCESS')) return CAMS_KRA_STATUS_TABLE['01'];
  if (upper.includes('ON HOLD') || upper.includes('HOLD')) return CAMS_KRA_STATUS_TABLE['03'];
  if (upper.includes('REJECTED')) return CAMS_KRA_STATUS_TABLE['04'];
  if (upper.includes('NOT AVAILABLE') || upper.includes('NOT FOUND')) return CAMS_KRA_STATUS_TABLE['05'];
  if (upper.includes('DEACTIVATED')) return CAMS_KRA_STATUS_TABLE['06'];

  return { code: clean, label: clean, isVerified: false, badgeColor: 'slate', description: `KRA Status: ${clean}` };
}

/**
 * Normalizes Date of Birth to DD-MM-YYYY format expected by CAMS KRA
 */
export function formatCamsDob(dob?: string | Date | null): string {
  if (!dob) return '';
  if (dob instanceof Date) {
    if (isNaN(dob.getTime())) return '';
    const d = String(dob.getDate()).padStart(2, '0');
    const m = String(dob.getMonth() + 1).padStart(2, '0');
    const y = dob.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const str = String(dob).trim();
  if (!str) return '';

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  return str;
}

/**
 * Resolves CAMS credentials from Tenant DB record or fallbacks to environment variables
 */
export async function getCamsCredentials(
  tenantId?: string | any,
  overrides?: Partial<CamsCredentials>
): Promise<CamsCredentials> {
  let tenant: any = null;
  if (tenantId) {
    try {
      tenant = await dynamicDb.Tenant.findById(tenantId).lean();
      if (!tenant) {
        tenant = await dynamicDb.Tenant.findOne({
          $or: [{ id: tenantId }, { tenantId: tenantId }]
        }).lean();
      }
    } catch { }
  }
  if (!tenant) {
    try {
      tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    } catch { }
  }

  const camsClientCode = (overrides?.camsClientCode || tenant?.camsClientCode || process.env.CAMS_CLIENT_CODE || '').trim();
  const camsClientId = (overrides?.camsClientId || tenant?.camsClientId || process.env.CAMS_CLIENT_ID || '').trim();
  const camsClientSecret = (overrides?.camsClientSecret || tenant?.camsClientSecret || process.env.CAMS_CLIENT_SECRET || '').trim();
  const camsPoscode = (overrides?.camsPoscode || tenant?.camsPoscode || process.env.CAMS_POSCODE || '').trim();

  return {
    camsClientCode,
    camsClientId,
    camsClientSecret,
    camsPoscode
  };
}

/**
 * Generates Bearer/Auth Token from CAMS KRA Auth Endpoint
 */
export async function getCamsToken(creds: CamsCredentials): Promise<{
  success: boolean;
  token?: string;
  message?: string;
  data?: any;
}> {
  try {
    if (!creds.camsClientCode || !creds.camsClientId || !creds.camsClientSecret) {
      return {
        success: false,
        message: 'CAMS Client Code, Client ID, and Client Secret must be configured.'
      };
    }

    const payload = {
      clientCode: creds.camsClientCode,
      grantType: 'client_credentials',
      scope: 'KRA'
    };

    console.log('[CAMS KRA] Requesting Token for clientCode:', creds.camsClientCode, 'clientId:', creds.camsClientId);

    const response = await axios.post(
      'https://camskra.com/restAuth/api/v1/getToken',
      payload,
      {
        auth: {
          username: creds.camsClientId,
          password: creds.camsClientSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 300000
      }
    );

    console.log('[CAMS KRA] Token Response =>', response.data);

    if (
      response.data &&
      (String(response.data.returnCode) === '0' || response.data.returnCode === 0) &&
      response.data.accessToken
    ) {
      return {
        success: true,
        token: response.data.accessToken,
        data: response.data
      };
    }

    return {
      success: false,
      message: response?.data?.returnMsg || response?.data?.message || 'Token not received from CAMS KRA',
      data: response?.data
    };
  } catch (error: any) {
    console.error('[CAMS KRA] TOKEN ERROR =>', error?.response?.data || error.message);
    return {
      success: false,
      message:
        error?.response?.data?.returnMsg ||
        error?.response?.data?.message ||
        error?.message ||
        'Token API Error',
      data: error?.response?.data
    };
  }
}

/**
 * Downloads PAN Details from CAMS KRA API
 */
export async function getPanDownload(
  pan: string,
  dob: string | Date | null | undefined,
  creds: CamsCredentials
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: any;
}> {
  try {
    const cleanPan = (pan || '').trim().toUpperCase();
    if (!cleanPan) {
      return {
        success: false,
        message: 'PAN is required for CAMS KRA lookup'
      };
    }

    const tokenResponse = await getCamsToken(creds);
    if (!tokenResponse.success || !tokenResponse.token) {
      return {
        success: false,
        message: tokenResponse.message || 'CAMS KRA token could not be obtained'
      };
    }
    const token = tokenResponse.token;
    const formattedDob = formatCamsDob(dob);

    const payload = {
      PAN: [
        {
          pan: cleanPan,
          dob: formattedDob
        }
      ],
      sign_required: 'N'
    };

    console.log('[CAMS KRA] Sending PANdownload Request =>', {
      pan: cleanPan,
      dob: formattedDob,
      clientId: creds.camsClientId,
      poscode: creds.camsPoscode
    });

    const response = await axios.post(
      'https://camskra.com/CAMSWS_KRA/KRA_API/PANdownload',
      payload,
      {
        headers: {
          'Authorization': token,
          'ClientId': creds.camsClientId,
          'poscode': creds.camsPoscode,
          'Content-Type': 'application/json'
        },
        timeout: 300000
      }
    );

    console.log('[CAMS KRA] PAN Download Response =>', response.data);

    const resData = response.data;
    // Check if CAMS returned an error return code
    if (resData && (resData.returnCode === '-1' || resData.returnCode === '1') && !resData.PAN && !resData.kycData) {
      return {
        success: false,
        message: resData.returnMsg || 'CAMS KRA PAN download failed',
        data: resData
      };
    }

    return {
      success: true,
      data: resData
    };
  } catch (error: any) {
    console.error('[CAMS KRA] PAN Download API Error =>', error?.response?.data || error?.message);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        error?.response?.data?.returnMsg ||
        error?.message ||
        'PAN Download API Error',
      error: error?.response?.data || error?.message
    };
  }
}

/**
 * Extracts normalized client details from CAMS KRA response
 */
export function extractCamsPanDetails(camsResponse: any): ExtractedCamsDetails {
  if (!camsResponse) return {};

  let record: any = null;

  if (Array.isArray(camsResponse?.kycData) && camsResponse.kycData.length > 0) {
    record = camsResponse.kycData[0];
  } else if (Array.isArray(camsResponse?.PAN) && camsResponse.PAN.length > 0) {
    record = camsResponse.PAN[0];
  } else if (camsResponse?.PAN && typeof camsResponse.PAN === 'object') {
    record = camsResponse.PAN;
  } else if (Array.isArray(camsResponse?.panDetails) && camsResponse.panDetails.length > 0) {
    record = camsResponse.panDetails[0];
  } else if (camsResponse?.panDetails && typeof camsResponse.panDetails === 'object') {
    record = camsResponse.panDetails;
  } else if (camsResponse?.data && typeof camsResponse.data === 'object') {
    record = camsResponse.data;
  } else {
    record = camsResponse;
  }

  const pickFirst = (...keys: string[]) => {
    for (const k of keys) {
      if (record && record[k] !== undefined && record[k] !== null && String(record[k]).trim() !== '') {
        return String(record[k]).trim();
      }
      if (camsResponse && camsResponse[k] !== undefined && camsResponse[k] !== null && String(camsResponse[k]).trim() !== '') {
        return String(camsResponse[k]).trim();
      }
    }
    return null;
  };

  // Full name
  const name = pickFirst(
    'name', 'NAME', 'app_name', 'APP_NAME', 'appName',
    'pan_name', 'PAN_NAME', 'name_as_per_pan', 'app_full_name'
  );

  // PAN
  const pan = pickFirst('pan', 'PAN', 'pan_no', 'PAN_NO', 'pan_number');

  // Status Mapping according to SEBI / CAMS KRA specification
  const panStatus = pickFirst('pan_status', 'PAN_STATUS', 'panStatus');
  const appStatus = pickFirst('app_status', 'APP_STATUS', 'appStatus');
  const rawStatus = pickFirst('kra_status', 'KRA_STATUS', 'status_desc', 'STATUS_DESC', 'kraStatus', 'status', 'STATUS') || appStatus || panStatus;
  const statusInfo = mapKraStatus(rawStatus);
  const kraStatus = statusInfo.label;
  const kraStatusCode = statusInfo.code;

  // DOB
  const dob = pickFirst('dob', 'DOB', 'app_dob', 'APP_DOB', 'birth_date', 'date_of_birth');

  // Gender
  let gender = pickFirst('gender', 'GENDER', 'app_gen', 'APP_GEN', 'sex');
  if (gender) {
    const gUpper = gender.toUpperCase();
    if (gUpper.startsWith('M')) gender = 'MALE';
    else if (gUpper.startsWith('F')) gender = 'FEMALE';
    else if (gUpper.startsWith('T') || gUpper.startsWith('O')) gender = 'OTHER';
  }

  // Father's name
  const fatherName = pickFirst('firtName', 'father_name', 'FATHER_NAME', 'app_f_name', 'APP_F_NAME', 'fatherName', 'f_name');

  // Address
  const address1 = pickFirst('corAddress1', 'cor_address', 'COR_ADDRESS', 'cor_add1', 'COR_ADD1', 'app_cor_add1', 'perAddress1', 'per_address', 'PER_ADDRESS', 'address', 'ADDRESS') || '';
  const address2 = pickFirst('corAddress2', 'cor_add2', 'COR_ADD2', 'app_cor_add2', 'perAddress2', 'address_line2') || '';
  const address3 = pickFirst('corAddress3', 'cor_add3', 'COR_ADD3', 'app_cor_add3', 'perAddress3') || '';
  const fullAddress = [address1, address2, address3].filter(Boolean).join(', ').trim() || null;

  // City, State, ZIP
  const city = pickFirst('corCity', 'city', 'CITY', 'cor_city', 'COR_CITY', 'app_cor_city', 'perCity', 'per_city');
  const state = pickFirst('corState', 'state', 'STATE', 'cor_state', 'COR_STATE', 'app_cor_state', 'perState', 'per_state');
  const zipCode = pickFirst('corPincode', 'pincode', 'PINCODE', 'cor_pincd', 'COR_PINCD', 'app_cor_pincd', 'perPincode', 'pin_code', 'PIN_CODE', 'zipCode');

  // Email & Mobile
  const email = pickFirst('email', 'EMAIL', 'email_id', 'EMAIL_ID');
  const mobile = pickFirst('mobileNo', 'mobile', 'MOBILE', 'mobile_no', 'MOBILE_NO', 'contact_no', 'offNo', 'resNo');

  const returnCode = camsResponse?.returnCode ?? record?.returnCode ?? (record?.errorDescription ? '0' : null);
  const returnMsg = camsResponse?.returnMsg ?? record?.returnMsg ?? (record?.errorDescription === 'ERR-00000' ? 'Success' : null);

  return {
    pan,
    name,
    panStatus,
    appStatus,
    kraStatus,
    kraStatusCode,
    statusInfo,
    dob,
    gender,
    fatherName,
    address: fullAddress,
    city,
    state,
    zipCode,
    email,
    mobile,
    rawRecord: record,
    returnCode,
    returnMsg
  };
}
