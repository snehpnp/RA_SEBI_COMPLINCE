import axios from 'axios';
import FormData from 'form-data';

// Digio API base URL - resolves dynamically based on environment or clientId prefix (ACK/AIK => sandbox)
export const getDigioBaseUrl = (clientId?: string, environment?: string) => {
  if (process.env.DIGIO_API_URL) return process.env.DIGIO_API_URL;
  const envUpper = (environment || '').toUpperCase();
  if (envUpper === 'SANDBOX' || envUpper === 'UAT' || envUpper === 'TEST') {
    return 'https://ext.digio.in:444';
  }
  return 'https://api.digio.in';
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
  const cleanTemplate = (kycTemplateName || '').trim();
  const authHeader = getDigioAuthHeader(clientId, clientSecret);
  const refId = `KYC_${Date.now()}`;
  const cName = (customerName || 'Client').trim();
  const cId = customerIdentifier.trim();

  // Helper for direct DigiLocker KYC request (Aadhaar & PAN verification)
  const createDirectKycRequest = async () => {
    const directPayload = {
      customer_identifier: cId,
      customer_name: cName,
      notify_customer: false,
      reference_id: refId,
      actions: [
        {
          type: 'DIGILOCKER',
          title: 'DigiLocker KYC Verification',
          description: 'Please complete your Aadhaar and PAN verification via DigiLocker',
          document_types: ['AADHAAR', 'PAN']
        }
      ]
    };
    console.log('[Digio KYC] Creating Direct DigiLocker KYC Request payload:', directPayload, 'to URL:', baseUrl);
    const response = await axios.post(`${baseUrl}/client/kyc/v2/request`, directPayload, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  };

  // If a specific custom template is configured, attempt with_template first
  const isGenericTemplate = !cleanTemplate ||
    cleanTemplate.toUpperCase() === 'KYC_AGREEMENT' ||
    cleanTemplate.toUpperCase() === 'DIGILOCKER_KYC' ||
    cleanTemplate.toUpperCase() === 'KYC_TEMPLATE_1' ||
    cleanTemplate.toUpperCase() === 'DEFAULT';

  if (!isGenericTemplate) {
    try {
      const payload = {
        customer_identifier: cId,
        customer_name: cName,
        template_name: cleanTemplate,
        notify_customer: false,
        reference_id: refId
      };
      console.log('[Digio KYC] Creating KYC Request with Template payload:', payload, 'to URL:', baseUrl);
      const response = await axios.post(`${baseUrl}/client/kyc/v2/request/with_template`, payload, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (templateError: any) {
      const errData = templateError.response?.data;
      console.warn('[Digio KYC] Template request failed, falling back to Direct DigiLocker KYC request:', errData || templateError.message);
      // Fallback to direct DigiLocker request below
    }
  }

  // Fallback / Default: Direct DigiLocker Aadhaar + PAN verification
  try {
    return await createDirectKycRequest();
  } catch (error: any) {
    const errData = error.response?.data;
    console.error('[Digio KYC] Direct KYC Request Error:', errData || error.message);
    const rawMsg = errData?.message || errData?.error || error.message || 'Failed to create Digio KYC request';
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
  const authHeader = getDigioAuthHeader(clientId, clientSecret);
  try {
    // Digio KYC v2 requires POST /client/kyc/v2/:id/response
    const response = await axios.post(`${baseUrl}/client/kyc/v2/${kycRequestId}/response`, {}, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (err: any) {
    try {
      const altResponse = await axios.get(`${baseUrl}/client/kyc/v2/${kycRequestId}/response`, {
        headers: {
          Authorization: authHeader
        }
      });
      return altResponse.data;
    } catch (altErr: any) {
      try {
        const altResponse2 = await axios.get(`${baseUrl}/v2/client/kyc/${kycRequestId}`, {
          headers: {
            Authorization: authHeader
          }
        });
        return altResponse2.data;
      } catch (altErr2: any) {
        console.error('[Digio KYC] Error fetching KYC status:', err.response?.data || err.message);
        return null;
      }
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

  let aadhaarName: string | null = null;
  let panName: string | null = null;
  let panNumber: string | null = null;
  let rawAadhaar: string | null = null;
  let dob: string | null = null;
  let gender: string | null = null;
  let fatherName: string | null = null;
  let address: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zipCode: string | null = null;
  let signatureText: string | null = null;

  // Helper to extract address & city & state & zip from an address container
  const extractAddressFields = (addrObj: any, rawAddrStr?: string) => {
    if (addrObj && typeof addrObj === 'object') {
      if (!city) {
        city = addrObj.district_or_city || addrObj.district || addrObj.dist || addrObj.city || addrObj.locality_or_post_office || addrObj.vtc || addrObj.subdist || null;
        if (city) city = String(city).trim();
      }
      if (!state && addrObj.state) {
        state = String(addrObj.state).trim();
      }
      if (!zipCode) {
        zipCode = addrObj.pincode || addrObj.pin_code || addrObj.zip_code || addrObj.zip || addrObj.postal_code || null;
        if (zipCode) zipCode = String(zipCode).trim();
      }
      if (!address && addrObj.address) {
        address = String(addrObj.address).trim();
      }
    }
    if (!address && rawAddrStr && typeof rawAddrStr === 'string' && rawAddrStr.trim().length > 3) {
      address = rawAddrStr.trim();
    }
  };

  // ── PASS 1: Targeted Inspection of Government ID objects in actions array ──
  const actionsList = Array.isArray(data.actions) ? data.actions : [];
  for (const action of actionsList) {
    const details = action?.details || {};

    // 1. Aadhaar Card Object (DigiLocker UIDAI)
    const aadhaarObj = details.aadhaar || details.aadhar || details.uidai || details.digilocker?.aadhaar || details.aadhaar_card;
    if (aadhaarObj && typeof aadhaarObj === 'object') {
      if (!aadhaarName && isValidName(aadhaarObj.name)) aadhaarName = aadhaarObj.name.trim();
      if (!aadhaarName && isValidName(aadhaarObj.full_name)) aadhaarName = aadhaarObj.full_name.trim();
      
      if (!rawAadhaar) {
        rawAadhaar = aadhaarObj.id_number || aadhaarObj.masked_aadhaar_number || aadhaarObj.aadhaar_number || aadhaarObj.uid || null;
      }
      if (!dob) {
        dob = aadhaarObj.dob || aadhaarObj.date_of_birth || aadhaarObj.birth_date || null;
      }
      if (!gender && (aadhaarObj.gender || aadhaarObj.sex)) {
        const g = String(aadhaarObj.gender || aadhaarObj.sex).toUpperCase().trim();
        gender = g.startsWith('M') ? 'MALE' : (g.startsWith('F') ? 'FEMALE' : g);
      }
      if (!fatherName) {
        const fn = aadhaarObj.father_name || aadhaarObj.fathers_name || aadhaarObj.care_of || aadhaarObj.co;
        if (fn && typeof fn === 'string') {
          fatherName = fn.replace(/^(S\/O|D\/O|W\/O|C\/O|s\/o|d\/o|w\/o|c\/o)[:\s]*/i, '').trim();
        }
      }

      // Current & Permanent address details
      extractAddressFields(aadhaarObj.current_address_details, aadhaarObj.current_address);
      extractAddressFields(aadhaarObj.permanent_address_details, aadhaarObj.permanent_address);
      extractAddressFields(aadhaarObj.split_address, aadhaarObj.address);
    }

    // 2. PAN Card Object (DigiLocker / NSDL Income Tax)
    const panObj = details.pan || details.pan_details || details.pan_verification_record || details.digilocker?.pan;
    if (panObj && typeof panObj === 'object') {
      if (!panName && isValidName(panObj.name)) panName = panObj.name.trim();
      if (!panName && isValidName(panObj.full_name)) panName = panObj.full_name.trim();
      if (!panName && isValidName(panObj.pan_name)) panName = panObj.pan_name.trim();

      if (!panNumber) {
        const pn = panObj.id_number || panObj.pan_number || panObj.pan;
        if (pn && typeof pn === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pn.trim())) {
          panNumber = pn.trim().toUpperCase();
        }
      }
      if (!dob) {
        dob = panObj.dob || panObj.date_of_birth || null;
      }
      if (!gender && (panObj.gender || panObj.sex)) {
        const g = String(panObj.gender || panObj.sex).toUpperCase().trim();
        gender = g.startsWith('M') ? 'MALE' : (g.startsWith('F') ? 'FEMALE' : g);
      }
    }
  }

  // ── PASS 2: PKI Signature Details from Aadhaar eSign responses ──
  if (data.pki_signature_details) {
    const pki = data.pki_signature_details;
    if (!aadhaarName && isValidName(pki.name)) aadhaarName = pki.name.trim();
    if (!rawAadhaar && pki.aadhaar_suffix) rawAadhaar = `XXXX-XXXX-${pki.aadhaar_suffix}`;
  }

  const partyList = Array.isArray(data.signing_parties)
    ? data.signing_parties
    : (Array.isArray(data.signers) ? data.signers : []);

  for (const party of partyList) {
    const pki = party?.pki_signature_details || {};
    const sDetails = party?.details || {};

    if (!aadhaarName && isValidName(pki.name)) aadhaarName = pki.name.trim();
    if (!aadhaarName && isValidName(pki.aadhaar_name)) aadhaarName = pki.aadhaar_name.trim();
    if (!aadhaarName && isValidName(party.aadhaar_name)) aadhaarName = party.aadhaar_name.trim();
    if (!aadhaarName && isValidName(sDetails.aadhaar_name)) aadhaarName = sDetails.aadhaar_name.trim();

    if (!rawAadhaar && pki.aadhaar_suffix) {
      rawAadhaar = `XXXX-XXXX-${pki.aadhaar_suffix}`;
    }
    if (party.signature) signatureText = String(party.signature);
  }

  // ── PASS 3: Top-level direct document fields (avoiding generic metadata) ──
  if (!aadhaarName && isValidName(data.aadhaar_name)) aadhaarName = data.aadhaar_name.trim();
  if (!aadhaarName && isValidName(data.certificate_name)) aadhaarName = data.certificate_name.trim();

  // Format masked Aadhaar e.g. XXXX-XXXX-5691
  let formattedMaskedAadhaar = '';
  if (rawAadhaar) {
    const str = String(rawAadhaar).trim();
    const cleanDigits = str.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 12) {
      formattedMaskedAadhaar = `XXXX-XXXX-${cleanDigits.slice(8)}`;
    } else if (cleanDigits.length === 4) {
      formattedMaskedAadhaar = `XXXX-XXXX-${cleanDigits}`;
    } else if (str.toLowerCase().includes('x')) {
      formattedMaskedAadhaar = str.toUpperCase();
    } else {
      formattedMaskedAadhaar = str;
    }
  }

  // Clean address from S/O or redundant prefix if city/state already split
  let cleanAddress: string | null = address ? String(address).trim() : null;

  const extractedResult = {
    aadhaarName: aadhaarName || null,
    panName: panName || null,
    panNumber: panNumber || null,
    maskedAadhaar: formattedMaskedAadhaar || null,
    dob: dob || null,
    gender: gender || null,
    fatherName: fatherName || null,
    address: cleanAddress || null,
    city: city || null,
    state: state || null,
    zipCode: zipCode || null,
    signatureText: signatureText || null,
    rawDigioData: data
  };

  console.log('\n🔍 [Digio Parser] Extracted Government Details:', JSON.stringify({
    aadhaarName: extractedResult.aadhaarName,
    panName: extractedResult.panName,
    panNumber: extractedResult.panNumber,
    maskedAadhaar: extractedResult.maskedAadhaar,
    dob: extractedResult.dob,
    gender: extractedResult.gender,
    fatherName: extractedResult.fatherName,
    address: extractedResult.address,
    city: extractedResult.city,
    state: extractedResult.state,
    zipCode: extractedResult.zipCode,
    signatureText: extractedResult.signatureText
  }, null, 2));

  return extractedResult;
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
