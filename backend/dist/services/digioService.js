"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocumentForEsign = exports.extractAadhaarDetailsFromDigio = exports.getDocumentStatus = exports.getKycStatus = exports.createKycRequest = exports.isValidName = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// Digio API base URL - can be overridden by env for sandbox/production
const DIGIO_BASE_URL = process.env.DIGIO_API_URL || 'https://api.digio.in';
const getDigioAuthHeader = (clientId, clientSecret) => {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
};
const isValidName = (n) => {
    if (!n || typeof n !== 'string')
        return false;
    const trimmed = n.trim();
    if (!trimmed || trimmed.length < 2)
        return false;
    if (trimmed.includes('@'))
        return false; // Not an email
    const lower = trimmed.toLowerCase();
    const genericList = ['digo', 'digio', 'digo client', 'digio client', 'client', 'test', 'tests', 'user', 'test user', 'investor', 'investor / client', 'sss'];
    if (genericList.includes(lower))
        return false;
    return true;
};
exports.isValidName = isValidName;
const createKycRequest = async (clientId, clientSecret, kycTemplateName, customerIdentifier, customerName) => {
    try {
        const payload = {
            customer_identifier: customerIdentifier,
            customer_name: customerName,
            template_name: kycTemplateName,
            notify_customer: false
        };
        console.log('[Digio KYC] Creating KYC Request payload:', payload);
        const response = await axios_1.default.post(`${DIGIO_BASE_URL}/client/kyc/v2/request/with_template`, payload, {
            headers: {
                'Authorization': getDigioAuthHeader(clientId, clientSecret),
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('[Digio KYC] Request Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create Digio KYC request');
    }
};
exports.createKycRequest = createKycRequest;
const getKycStatus = async (clientId, clientSecret, kycRequestId) => {
    if (!kycRequestId)
        return null;
    try {
        const response = await axios_1.default.get(`${DIGIO_BASE_URL}/client/kyc/v2/${kycRequestId}/response`, {
            headers: {
                Authorization: getDigioAuthHeader(clientId, clientSecret)
            }
        });
        return response.data;
    }
    catch (err) {
        try {
            const altResponse = await axios_1.default.get(`${DIGIO_BASE_URL}/v2/client/kyc/${kycRequestId}`, {
                headers: {
                    Authorization: getDigioAuthHeader(clientId, clientSecret)
                }
            });
            return altResponse.data;
        }
        catch (altErr) {
            console.error('[Digio KYC] Error fetching KYC status:', err.response?.data || err.message);
            return null;
        }
    }
};
exports.getKycStatus = getKycStatus;
const getDocumentStatus = async (clientId, clientSecret, documentId) => {
    if (!documentId)
        return null;
    try {
        const response = await axios_1.default.get(`${DIGIO_BASE_URL}/v2/client/document/${documentId}`, {
            headers: {
                Authorization: getDigioAuthHeader(clientId, clientSecret)
            }
        });
        return response.data;
    }
    catch (err) {
        console.error('[Digio eSign] Error fetching document status:', err.response?.data || err.message);
        return null;
    }
};
exports.getDocumentStatus = getDocumentStatus;
const extractAadhaarDetailsFromDigio = (data) => {
    if (!data || typeof data !== 'object')
        return null;
    let aadhaarName = '';
    let panName = '';
    let panNumber = '';
    let maskedAadhaar = '';
    let dob = null;
    let address = null;
    // 1. Check direct PKI signature details (from Aadhaar OTP eSign)
    if (data.pki_signature_details) {
        const pki = data.pki_signature_details;
        if ((0, exports.isValidName)(pki.name))
            aadhaarName = pki.name.trim();
        if (pki.aadhaar_suffix)
            maskedAadhaar = `XXXX-XXXX-${pki.aadhaar_suffix}`;
    }
    // 2. Direct root fields
    if (!aadhaarName && (0, exports.isValidName)(data.aadhaar_name))
        aadhaarName = data.aadhaar_name.trim();
    if (!aadhaarName && (0, exports.isValidName)(data.certificate_name))
        aadhaarName = data.certificate_name.trim();
    if (!aadhaarName && (0, exports.isValidName)(data.signer_name))
        aadhaarName = data.signer_name.trim();
    if (!aadhaarName && (0, exports.isValidName)(data.customer_name))
        aadhaarName = data.customer_name.trim();
    if (!aadhaarName && (0, exports.isValidName)(data.name))
        aadhaarName = data.name.trim();
    // 3. Signing Parties / Signers array (from Digio Aadhaar eSign response & document status)
    const partyList = Array.isArray(data.signing_parties)
        ? data.signing_parties
        : (Array.isArray(data.signers) ? data.signers : []);
    for (const party of partyList) {
        const pki = party?.pki_signature_details || {};
        const sDetails = party?.details || {};
        if ((0, exports.isValidName)(pki.name)) {
            aadhaarName = pki.name.trim();
        }
        else if ((0, exports.isValidName)(pki.aadhaar_name)) {
            aadhaarName = pki.aadhaar_name.trim();
        }
        else if ((0, exports.isValidName)(pki.certificate_name)) {
            aadhaarName = pki.certificate_name.trim();
        }
        else if ((0, exports.isValidName)(party.aadhaar_name)) {
            aadhaarName = party.aadhaar_name.trim();
        }
        else if ((0, exports.isValidName)(party.certificate_name)) {
            aadhaarName = party.certificate_name.trim();
        }
        else if ((0, exports.isValidName)(sDetails.aadhaar_name)) {
            aadhaarName = sDetails.aadhaar_name.trim();
        }
        else if ((0, exports.isValidName)(sDetails.certificate_name)) {
            aadhaarName = sDetails.certificate_name.trim();
        }
        else if ((0, exports.isValidName)(sDetails.name)) {
            aadhaarName = sDetails.name.trim();
        }
        else if ((0, exports.isValidName)(party.name) && !aadhaarName) {
            aadhaarName = party.name.trim();
        }
        if (pki.aadhaar_suffix) {
            maskedAadhaar = `XXXX-XXXX-${pki.aadhaar_suffix}`;
        }
        if (!aadhaarName && party.reason && typeof party.reason === 'string') {
            const match = party.reason.match(/by\s+([A-Za-z\s]{3,})$/i);
            if (match && (0, exports.isValidName)(match[1])) {
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
                if ((0, exports.isValidName)(aadhar.name)) {
                    aadhaarName = aadhar.name.trim();
                }
                else if ((0, exports.isValidName)(aadhar.full_name)) {
                    aadhaarName = aadhar.full_name.trim();
                }
                else if ((0, exports.isValidName)(aadhar.signer_name)) {
                    aadhaarName = aadhar.signer_name.trim();
                }
            }
            if (!maskedAadhaar) {
                if (aadhar.masked_aadhaar_number) {
                    maskedAadhaar = String(aadhar.masked_aadhaar_number);
                }
                else if (aadhar.aadhaar_number) {
                    maskedAadhaar = String(aadhar.aadhaar_number);
                }
                else if (aadhar.uid) {
                    maskedAadhaar = String(aadhar.uid);
                }
            }
            if (aadhar.dob)
                dob = String(aadhar.dob);
            if (aadhar.address) {
                address = typeof aadhar.address === 'string' ? aadhar.address : Object.values(aadhar.split_address || {}).filter(Boolean).join(', ');
            }
            if ((0, exports.isValidName)(pan.name))
                panName = pan.name.trim();
            if (pan.pan_number && typeof pan.pan_number === 'string')
                panNumber = pan.pan_number.trim();
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
exports.extractAadhaarDetailsFromDigio = extractAadhaarDetailsFromDigio;
const createDocumentForEsign = async (clientId, clientSecret, pdfBuffer, fileName, signerIdentifier, signerName) => {
    try {
        const formData = new form_data_1.default();
        formData.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });
        const signerObj = {
            identifier: signerIdentifier,
            reason: 'SEBI Research Advisory Agreement eSign'
        };
        if (signerName && (0, exports.isValidName)(signerName)) {
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
        const response = await axios_1.default.post(`${DIGIO_BASE_URL}/v2/client/document/upload`, formData, {
            headers: {
                'Authorization': getDigioAuthHeader(clientId, clientSecret),
                ...formData.getHeaders()
            }
        });
        return response.data;
    }
    catch (error) {
        if (error.response) {
            console.error('[Digio eSign] Document Error:', JSON.stringify(error.response.data));
            throw new Error(`Digio API Error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
        }
        console.error('[Digio eSign] Document Error:', error.message);
        throw new Error(error.message || 'Failed to create Digio eSign document');
    }
};
exports.createDocumentForEsign = createDocumentForEsign;
