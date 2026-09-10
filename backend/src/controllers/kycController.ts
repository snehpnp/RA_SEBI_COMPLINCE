import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import dynamicDb from '../config/db';
import { createKycRequest, createDocumentForEsign } from '../services/digioService';
import { generateAgreementPdf } from '../services/pdfService';

export const initiateKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const client: any = await dynamicDb.Client.findOne({ userId }).populate('userId').lean();
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tenant: any = await dynamicDb.Tenant.findById(req.user!.tenantId as string).lean();
    if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
    }

    const identifier = client.email || req.user!.email;
    const userObj = client.userId || {};
    const customerName = client.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || 'Client';

    const digioResponse = await createKycRequest(
      tenant.digioClientId as string, 
      tenant.digioClientSecret as string, 
      tenant.digioKycTemplateName || 'DIGILOCKER_KYC',
      identifier,
      customerName
    );

    res.json({
      success: true,
      data: digioResponse
    });
  } catch (error: any) {
    console.error('Initiate KYC Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const initiateAgreementEsign = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const client: any = await dynamicDb.Client.findOne({ userId }).populate('userId').lean();
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tenant: any = await dynamicDb.Tenant.findById(req.user!.tenantId as string).lean();
    if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
    }

    // 1. Generate PDF dynamically
    const clientIdStr = String(client._id || client.id);
    const pdfBuffer = await generateAgreementPdf(clientIdStr);

    // 2. Upload to Digio for eSign
    const identifier = req.user!.email;
    const fileName = `Agreement_${clientIdStr}.pdf`;

    const digioResponse = await createDocumentForEsign(
      tenant.digioClientId as string,
      tenant.digioClientSecret as string,
      pdfBuffer,
      fileName,
      identifier
    );

    res.json({
      success: true,
      data: digioResponse
    });
  } catch (error: any) {
    console.error('Initiate Agreement Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateKycAgreementStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type } = req.body; // type = 'KYC' or 'AGREEMENT'
    const userId = req.user!.id;
    
    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const clientId = client._id || client.id;

    if (type === 'KYC' && status === 'COMPLETED') {
      await dynamicDb.Client.findByIdAndUpdate(clientId, {
        $set: { status: 'AGREEMENT_PENDING' }
      });
    } else if (type === 'AGREEMENT' && status === 'COMPLETED') {
      await dynamicDb.Client.findByIdAndUpdate(clientId, {
        $set: { status: 'PAYMENT_PENDING' }
      });
    }

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
