import axios from 'axios';
import FormData from 'form-data';

// Digio API base URL - can be overridden by env for sandbox/production
const DIGIO_BASE_URL = process.env.DIGIO_API_URL || 'https://api.digio.in';

const getDigioAuthHeader = (clientId: string, clientSecret: string) => {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
};

export const isValidName = (n?: string | null) => {
  if (!n || typeof n !== 'string') return false;
  const trimmed = n.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (trimmed.includes('@')) return false; // Not an email
  const lower = trimmed.toLowerCase();
  const genericList = ['digo', 'digio', 'digo client', 'digio client', 'client', 'test', 'tests', 'user', 'test user', 'investor', 'investor / client', 'sss'];
  if (genericList.includes(lower)) return false;
  return true;
};

export const createKycRequest = async (
  clientId: string,
  clientSecret: string,
  kycTemplateName: string,
  customerIdentifier: string,
  customerName: string
) => {
  try {
    const payload = {
      customer_identifier: customerIdentifier,
      customer_name: customerName,
      template_name: kycTemplateName,
      notify_customer: false
    };
    console.log('[Digio KYC] Creating KYC Request payload:', payload);
    const response = await axios.post(`${DIGIO_BASE_URL}/client/kyc/v2/request/with_template`, payload, {
      headers: {
        'Authorization': getDigioAuthHeader(clientId, clientSecret),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('[Digio KYC] Request Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create Digio KYC request');
  }
};

export const getKycStatus = async (
  clientId: string,
  clientSecret: string,
  kycRequestId: string
) => {
  if (!kycRequestId) return null;
  try {
    const response = await axios.get(`${DIGIO_BASE_URL}/client/kyc/v2/${kycRequestId}/response`, {
      headers: {
        Authorization: getDigioAuthHeader(clientId, clientSecret)
      }
    });
    return response.data;
  } catch (err: any) {
    try {
      const altResponse = await axios.get(`${DIGIO_BASE_URL}/v2/client/kyc/${kycRequestId}`, {
        headers: {
          Authorization: getDigioAuthHeader(clientId, clientSecret)
        }
      });
      return altResponse.data;
    } catch (altErr: any) {
      console.error('[Digio KYC] Error fetching KYC status:', err.response?.data || err.message);
      return null;
    }
  }
};

export const getDocumentStatus = async (
  clientId: string,
  clientSecret: string,
  documentId: string
) => {
  if (!documentId) return null;
  try {
    const response = await axios.get(`${DIGIO_BASE_URL}/v2/client/document/${documentId}`, {
      headers: {
        Authorization: getDigioAuthHeader(clientId, clientSecret)
      }
    });
    return response.data;
  } catch (err: any) {
    console.error('[Digio eSign] Error fetching document status:', err.response?.data || err.message);
    return null;
  }
};

export const downloadDocument = async (
  clientId: string,
  clientSecret: string,
  documentId: string
): Promise<Buffer | null> => {
  if (!documentId) return null;
  try {
    const response = await axios.get(`${DIGIO_BASE_URL}/v2/client/document/download?document_id=${documentId}`, {
      headers: {
        Authorization: getDigioAuthHeader(clientId, clientSecret)
      },
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (err: any) {
    console.error('[Digio eSign] Error downloading signed document:', err.response?.data || err.message);
    return null;
  }
};

export const extractAadhaarDetailsFromDigio = (data: any) => {
  if (!data || typeof data !== 'object') return null;

  let aadhaarName = '';
  let panName = '';
  let panNumber = '';
  let maskedAadhaar = '';
  let dob: string | null = null;
  let address: string | null = null;

  // 1. Check direct PKI signature details (from Aadhaar OTP eSign)
  if (data.pki_signature_details) {
    const pki = data.pki_signature_details;
    if (isValidName(pki.name)) aadhaarName = pki.name.trim();
    if (pki.aadhaar_suffix) maskedAadhaar = `XXXX-XXXX-${pki.aadhaar_suffix}`;
  }

  // 2. Direct root fields
  if (!aadhaarName && isValidName(data.aadhaar_name)) aadhaarName = data.aadhaar_name.trim();
  if (!aadhaarName && isValidName(data.certificate_name)) aadhaarName = data.certificate_name.trim();
  if (!aadhaarName && isValidName(data.signer_name)) aadhaarName = data.signer_name.trim();
  if (!aadhaarName && isValidName(data.customer_name)) aadhaarName = data.customer_name.trim();
  if (!aadhaarName && isValidName(data.name)) aadhaarName = data.name.trim();

  // 3. Signing Parties / Signers array (from Digio Aadhaar eSign response & document status)
  const partyList = Array.isArray(data.signing_parties)
    ? data.signing_parties
    : (Array.isArray(data.signers) ? data.signers : []);

  for (const party of partyList) {
    const pki = party?.pki_signature_details || {};
    const sDetails = party?.details || {};

    if (isValidName(pki.name)) {
      aadhaarName = pki.name.trim();
    } else if (isValidName(pki.aadhaar_name)) {
      aadhaarName = pki.aadhaar_name.trim();
    } else if (isValidName(pki.certificate_name)) {
      aadhaarName = pki.certificate_name.trim();
    } else if (isValidName(party.aadhaar_name)) {
      aadhaarName = party.aadhaar_name.trim();
    } else if (isValidName(party.certificate_name)) {
      aadhaarName = party.certificate_name.trim();
    } else if (isValidName(sDetails.aadhaar_name)) {
      aadhaarName = sDetails.aadhaar_name.trim();
    } else if (isValidName(sDetails.certificate_name)) {
      aadhaarName = sDetails.certificate_name.trim();
    } else if (isValidName(sDetails.name)) {
      aadhaarName = sDetails.name.trim();
    } else if (isValidName(party.name) && !aadhaarName) {
      aadhaarName = party.name.trim();
    }

    if (pki.aadhaar_suffix) {
      maskedAadhaar = `XXXX-XXXX-${pki.aadhaar_suffix}`;
    }

    if (!aadhaarName && party.reason && typeof party.reason === 'string') {
      const match = party.reason.match(/by\s+([A-Za-z\s]{3,})$/i);
      if (match && isValidName(match[1])) {
        aadhaarName = match[1].trim();
      }
    }
  }

  // 4. Actions array (from DigiLocker / Aadhaar OTP verification)
  if (Array.isArray(data.actions)) {
    for (const action of data.actions) {
      const details = action?.details || {};
      const aadhar = details.aadhar || details.aadhaar || details.uidai || details.digilocker || {};
      const pan = details.pan || {};

      if (!aadhaarName) {
        if (isValidName(aadhar.name)) {
          aadhaarName = aadhar.name.trim();
        } else if (isValidName(aadhar.full_name)) {
          aadhaarName = aadhar.full_name.trim();
        } else if (isValidName(aadhar.signer_name)) {
          aadhaarName = aadhar.signer_name.trim();
        }
      }

      if (!maskedAadhaar) {
        if (aadhar.masked_aadhaar_number) {
          maskedAadhaar = String(aadhar.masked_aadhaar_number);
        } else if (aadhar.aadhaar_number) {
          maskedAadhaar = String(aadhar.aadhaar_number);
        } else if (aadhar.uid) {
          maskedAadhaar = String(aadhar.uid);
        }
      }

      if (aadhar.dob) dob = String(aadhar.dob);
      if (aadhar.address) {
        address = typeof aadhar.address === 'string' ? aadhar.address : Object.values(aadhar.split_address || {}).filter(Boolean).join(', ');
      }

      if (isValidName(pan.name)) panName = pan.name.trim();
      if (pan.pan_number && typeof pan.pan_number === 'string') panNumber = pan.pan_number.trim();
    }
  }

  return {
    aadhaarName: aadhaarName || panName || null,
    panName: panName || null,
    panNumber: panNumber || null,
    maskedAadhaar: maskedAadhaar || null,
    dob: dob || null,
    address: address || null
  };
};

export const createDocumentForEsign = async (
  clientId: string,
  clientSecret: string,
  pdfBuffer: Buffer,
  fileName: string,
  signerIdentifier: string,
  signerName?: string
) => {
  try {
    const formData = new FormData();
    formData.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });

    const signerObj: Record<string, any> = {
      identifier: signerIdentifier,
      reason: 'SEBI Research Advisory Agreement eSign'
    };
    if (signerName && isValidName(signerName)) {
      signerObj.name = signerName.trim();
    }

    const requestBody = {
      signers: [signerObj],
      expire_in_days: 10,
      display_on_page: 'all'
    };

    formData.append('request', JSON.stringify(requestBody), {
      contentType: 'application/json'
    });

    const response = await axios.post(`${DIGIO_BASE_URL}/v2/client/document/upload`, formData, {
      headers: {
        'Authorization': getDigioAuthHeader(clientId, clientSecret),
        ...formData.getHeaders()
      }
    });

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('[Digio eSign] Document Error:', JSON.stringify(error.response.data));
      throw new Error(`Digio API Error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
    }
    console.error('[Digio eSign] Document Error:', error.message);
    throw new Error(error.message || 'Failed to create Digio eSign document');
  }
};

export const testDigioConnection = async (
  clientId: string,
  clientSecret: string,
  kycTemplateName?: string
): Promise<{
  success: boolean;
  message: string;
  authSuccess: boolean;
  mode?: string;
  templateValid?: boolean;
  details?: any;
}> => {
  if (!clientId || !clientId.trim()) {
    return {
      success: false,
      authSuccess: false,
      message: 'Digio Client ID is required.'
    };
  }
  if (!clientSecret || !clientSecret.trim()) {
    return {
      success: false,
      authSuccess: false,
      message: 'Digio Client Secret is required.'
    };
  }

  const cleanClientId = clientId.trim();
  const cleanClientSecret = clientSecret.trim();
  const authHeader = getDigioAuthHeader(cleanClientId, cleanClientSecret);

  // 1. Verify Digio Basic Auth credentials with probe request
  let authValid = false;
  try {
    await axios.get(`${DIGIO_BASE_URL}/v2/client/document/auth_ping_${Date.now()}`, {
      headers: {
        Authorization: authHeader
      },
      timeout: 10000
    });
    authValid = true;
  } catch (probeError: any) {
    if (probeError.response) {
      const status = probeError.response.status;
      // 401 Unauthorized or 403 Forbidden means invalid credentials
      if (status === 401 || status === 403) {
        const errData = probeError.response.data;
        const errorMsg = errData?.message || errData?.error || 'Invalid Digio Client ID or Client Secret.';
        return {
          success: false,
          authSuccess: false,
          message: `Digio Authentication Failed (HTTP ${status}): ${errorMsg}`
        };
      }
      // 404 (Document not found) or 400 (Invalid doc ID) confirms HTTP Basic Auth passed successfully
      if (status === 404 || status === 400) {
        authValid = true;
      }
    } else {
      return {
        success: false,
        authSuccess: false,
        message: `Failed to connect to Digio API: ${probeError.message}`
      };
    }
  }

  if (!authValid) {
    return {
      success: false,
      authSuccess: false,
      message: 'Could not verify Digio credentials. Please check your Client ID and Client Secret.'
    };
  }

  const isSandbox = DIGIO_BASE_URL.includes('ext.digio.in') || cleanClientId.toLowerCase().includes('test');
  const envMode = isSandbox ? 'SANDBOX / TEST' : 'PRODUCTION / LIVE';

  // 2. If KYC Template Name is provided, test template validity with Digio
  if (kycTemplateName && kycTemplateName.trim()) {
    const cleanTemplate = kycTemplateName.trim();
    try {
      const payload = {
        customer_identifier: 'verify.connection@ragcp-compliance.in',
        customer_name: 'Digio Connectivity Test',
        template_name: cleanTemplate,
        notify_customer: false
      };

      const kycResponse = await axios.post(
        `${DIGIO_BASE_URL}/client/kyc/v2/request/with_template`,
        payload,
        {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 12000
        }
      );

      const kycId = kycResponse.data?.id || kycResponse.data?.kyc_request_id || 'OK';
      return {
        success: true,
        authSuccess: true,
        templateValid: true,
        mode: envMode,
        message: `Digio connected successfully! Credentials are valid and KYC Template "${cleanTemplate}" is active & ready. (Test Request ID: ${kycId})`,
        details: kycResponse.data
      };
    } catch (templateError: any) {
      if (templateError.response) {
        const status = templateError.response.status;
        const errData = templateError.response.data;
        const errMsg = errData?.message || errData?.error || JSON.stringify(errData);

        if (status === 401 || status === 403) {
          return {
            success: false,
            authSuccess: false,
            templateValid: false,
            message: `Digio Authentication Failed: ${errMsg}`
          };
        }

        return {
          success: false,
          authSuccess: true,
          templateValid: false,
          mode: envMode,
          message: `Digio credentials are VALID, but KYC Template "${cleanTemplate}" could not be verified: ${errMsg}`
        };
      }

      return {
        success: false,
        authSuccess: true,
        templateValid: false,
        mode: envMode,
        message: `Digio credentials valid, but template check failed: ${templateError.message}`
      };
    }
  }

  // If no template provided, credentials alone verified
  return {
    success: true,
    authSuccess: true,
    templateValid: undefined,
    mode: envMode,
    message: `Digio API credentials verified successfully! (${envMode} active - Ready for eSign & KYC)`
  };
};

