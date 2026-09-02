import axios from 'axios';

// Digio API base URL - can be overridden by env for sandbox/production
const DIGIO_BASE_URL = process.env.DIGIO_API_URL || 'https://api.digio.in';

const getDigioAuthHeader = (clientId: string, clientSecret: string) => {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
};

export const createKycRequest = async (clientId: string, clientSecret: string, kycTemplateName: string, customerIdentifier: string, customerName: string) => {
  try {
    const payload = {
      customer_identifier: customerIdentifier,
      customer_name: customerName,
      template_name: kycTemplateName,
      notify_customer: false
    };
    console.log("Digio KYC Payload:", payload);
    const response = await axios.post(`${DIGIO_BASE_URL}/client/kyc/v2/request/with_template`, payload, {
      headers: {
        'Authorization': getDigioAuthHeader(clientId, clientSecret),
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error("Digio KYC Request Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create Digio KYC request');
  }
};

import FormData from 'form-data';

export const createDocumentForEsign = async (clientId: string, clientSecret: string, pdfBuffer: Buffer, fileName: string, signerIdentifier: string) => {
  try {
    const formData = new FormData();
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

    const response = await axios.post(`${DIGIO_BASE_URL}/v2/client/document/upload`, formData, {
      headers: {
        'Authorization': getDigioAuthHeader(clientId, clientSecret),
        ...formData.getHeaders()
      }
    });

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Digio eSign Document Error:", JSON.stringify(error.response.data));
      throw new Error(`Digio API Error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
    }
    console.error("Digio eSign Document Error:", error.message);
    throw new Error(error.message || 'Failed to create Digio eSign document');
  }
};
