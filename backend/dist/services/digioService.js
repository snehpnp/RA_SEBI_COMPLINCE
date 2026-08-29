"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocumentForEsign = exports.createKycRequest = void 0;
const axios_1 = __importDefault(require("axios"));
// Digio API base URL - can be overridden by env for sandbox/production
const DIGIO_BASE_URL = process.env.DIGIO_API_URL || 'https://api.digio.in';
const getDigioAuthHeader = (clientId, clientSecret) => {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
};
const createKycRequest = async (clientId, clientSecret, kycTemplateName, customerIdentifier, customerName) => {
    try {
        const response = await axios_1.default.post(`${DIGIO_BASE_URL}/client/kyc/v2/request`, {
            customer_identifier: customerIdentifier,
            customer_name: customerName,
            template_name: kycTemplateName,
            notify_customer: false
        }, {
            headers: {
                'Authorization': getDigioAuthHeader(clientId, clientSecret),
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error("Digio KYC Request Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create Digio KYC request');
    }
};
exports.createKycRequest = createKycRequest;
const form_data_1 = __importDefault(require("form-data"));
const createDocumentForEsign = async (clientId, clientSecret, pdfBuffer, fileName, signerIdentifier) => {
    try {
        const formData = new form_data_1.default();
        formData.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });
        const requestBody = {
            signers: [
                {
                    identifier: signerIdentifier,
                    name: signerIdentifier,
                    reason: 'Agreement Signing'
                }
            ],
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
            console.error("Digio eSign Document Error:", JSON.stringify(error.response.data));
            throw new Error(`Digio API Error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
        }
        console.error("Digio eSign Document Error:", error.message);
        throw new Error(error.message || 'Failed to create Digio eSign document');
    }
};
exports.createDocumentForEsign = createDocumentForEsign;
