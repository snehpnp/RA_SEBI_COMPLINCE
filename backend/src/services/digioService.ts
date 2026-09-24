import axios from 'axios';
import FormData from 'form-data';

// Digio API base URL - resolves dynamically based on environment or clientId prefix (ACK/AIK => sandbox)
export const getDigioBaseUrl = (clientId?: string, environment?: string) => {
  if (process.env.DIGIO_API_URL) return process.env.DIGIO_API_URL;
  const envUpper = (environment || '').toUpperCase();
  if (envUpper === 'PRODUCTION' || envUpper === 'PROD' || envUpper === 'LIVE') {
    return 'https://api.digio.in';
  }
  if (envUpper === 'SANDBOX' || envUpper === 'UAT' || envUpper === 'TEST') {
    return 'https://ext.digio.in:444';
  }
  const isSandbox =
    (clientId || '').startsWith('ACK') ||
    (clientId || '').startsWith('AIK');
  return isSandbox ? 'https://ext.digio.in:444' : 'https://api.digio.in';
};

const getDigioAuthHeader = (clientId: string, clientSecret: string) => {
  const credentials = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
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

export const testDigioConnection = async (
  clientId: string,
  clientSecret: string,
  environment?: string
) => {
  const cleanClientId = (clientId || '').trim();
  const cleanClientSecret = (clientSecret || '').trim();
  const baseUrl = getDigioBaseUrl(cleanClientId, environment);
  const auth = getDigioAuthHeader(cleanClientId, cleanClientSecret);

  try {
    await axios.get(`${baseUrl}/v2/client/document/probe_auth_test_${Date.now()}`, {
      headers: { Authorization: auth },
      timeout: 10000
    });
    return {
      success: true,
      message: `Digio connection verified successfully! (${baseUrl.includes('ext.digio') ? 'Sandbox/UAT' : 'Production'} active)`
    };
  } catch (err: any) {
    if (err.response) {
      const status = err.response.status;
      // Status 404 (Document not found) or 400 (Invalid ID) confirms HTTP Basic Auth passed!
      if (status === 404 || status === 400) {
        return {
          success: true,
          message: `Digio connection verified successfully! (${baseUrl.includes('ext.digio') ? 'Sandbox/UAT' : 'Production'} active)`
        };
      }
      if (status === 401 || status === 403) {
        const digioMsg = err.response.data?.message || err.response.data?.error || 'Invalid API credentials';
        const isAckKey = cleanClientId.startsWith('ACK') || cleanClientId.startsWith('AIK');
        const isProdUrl = !baseUrl.includes('ext.digio');
        let hint = '';
        if (isAckKey && isProdUrl) {
          hint = ' (Tip: Your Client ID starts with ACK/AIK which is a Sandbox key. Please switch Digio Environment to Sandbox)';
        } else if (!isAckKey && !isProdUrl) {
          hint = ' (Tip: Your Client ID appears to be a Production key. Please switch Digio Environment to Production)';
        }
        return {
          success: false,
          status,
          message: `${digioMsg}.${hint} Please verify Client ID and Secret Key in your Digio dashboard.`
        };
      }
      return {
        success: false,
        status,
        message: err.response.data?.message || `Digio returned HTTP ${status}`
      };
    }
    return { success: false, message: err.message || 'Could not connect to Digio service.' };
  }
};

export const createKycRequest = async (
  clientId: string,
  clientSecret: string,
  kycTemplateName: string,
  customerIdentifier: string,
  customerName: string,
  environment?: string
) => {
  const baseUrl = getDigioBaseUrl(clientId, environment);
  try {
    const payload = {
      customer_identifier: customerIdentifier.trim(),
      customer_name: (customerName || 'Client').trim(),
      template_name: kycTemplateName.trim(),
      notify_customer: false,
      reference_id: `KYC_${Date.now()}`
    };
    console.log('[Digio KYC] Creating KYC Request payload:', payload, 'to URL:', baseUrl);
    const response = await axios.post(`${baseUrl}/client/kyc/v2/request/with_template`, payload, {
      headers: {
        'Authorization': getDigioAuthHeader(clientId, clientSecret),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    const errData = error.response?.data;
    console.error('[Digio KYC] Request Error:', errData || error.message);
    const rawMsg = errData?.message || errData?.error || error.message || 'Failed to create Digio KYC request';
    if (rawMsg.toLowerCase().includes('may not be empty') || errData?.code === 'REQUEST_VALIDATION_FAILED') {
      throw new Error(`Digio KYC Template "${kycTemplateName}" is not valid or has no active workflow actions in your Digio Studio dashboard. Please create/publish a KYC workflow template (e.g. DIGILOCKER_AADHAAR_PAN) in Digio and update the Template Name in Settings.`);
    }
    throw new Error(rawMsg);
  }
};

export const getKycStatus = async (
  clientId: string,
  clientSecret: string,
  kycRequestId: string,
  environment?: string
) => {
  if (!kycRequestId) return null;
  const baseUrl = getDigioBaseUrl(clientId, environment);
  try {
    const response = await axios.get(`${baseUrl}/client/kyc/v2/${kycRequestId}/response`, {
      headers: {
        Authorization: getDigioAuthHeader(clientId, clientSecret)
      }
    });
    return response.data;
  } catch (err: any) {
    try {
      const altResponse = await axios.get(`${baseUrl}/v2/client/kyc/${kycRequestId}`, {
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
  documentId: string,
  environment?: string
) => {
  if (!documentId) return null;
  const baseUrl = getDigioBaseUrl(clientId, environment);
  try {
    const response = await axios.get(`${baseUrl}/v2/client/document/${documentId}`, {
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
  documentId: string,
  environment?: string
): Promise<Buffer | null> => {
  if (!documentId) return null;
  const baseUrl = getDigioBaseUrl(clientId, environment);
  try {
    const response = await axios.get(`${baseUrl}/v2/client/document/download?document_id=${documentId}`, {
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

      let city: string | null = null;
      let state: string | null = null;
      let zipCode: string | null = null;

      if (aadhar.dob) dob = String(aadhar.dob);
      if (aadhar.split_address && typeof aadhar.split_address === 'object') {
        state = aadhar.split_address.state || null;
        city = aadhar.split_address.dist || aadhar.split_address.vtc || aadhar.split_address.subdist || null;
        zipCode = aadhar.split_address.pincode || null;
      }
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
    address: address || null,
    city: (data?.actions?.[0]?.details?.aadhar?.split_address?.dist || data?.actions?.[0]?.details?.aadhar?.split_address?.vtc) || null,
    state: data?.actions?.[0]?.details?.aadhar?.split_address?.state || null,
    zipCode: data?.actions?.[0]?.details?.aadhar?.split_address?.pincode || null
  };
};

export const createDocumentForEsign = async (
  clientId: string,
  clientSecret: string,
  pdfBuffer: Buffer,
  fileName: string,
  signerIdentifier: string,
  signerName?: string,
  environment?: string
) => {
  const baseUrl = getDigioBaseUrl(clientId, environment);
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

    console.log('[Digio eSign] Uploading document to URL:', baseUrl);
    const response = await axios.post(`${baseUrl}/v2/client/document/upload`, formData, {
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
