import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { PrismaClient } from '@prisma/client';
import { createKycRequest, createDocumentForEsign } from '../services/digioService';
import { generateAgreementPdf } from '../services/pdfService';

const prisma = new PrismaClient();

export const initiateKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const client = await prisma.client.findFirst({ where: { userId }, include: { user: true } });
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId as string } });
    if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
    }

    // Usually Digio uses the PAN or Phone/Email as identifier. 
    // For Digilocker KYC, customer_identifier is usually email or phone.
    const identifier = client.email || req.user!.email;
    const customerName = client.name || `${client.user.firstName} ${client.user.lastName}`.trim() || 'Client';

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
    const client = await prisma.client.findFirst({ where: { userId }, include: { user: true } });
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId as string } });
    if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
    }

    // 1. Generate PDF dynamically
    const pdfBuffer = await generateAgreementPdf(client.id);

    // 2. Upload to Digio for eSign
    const identifier = req.user!.email; // Signer identifier
    const fileName = `Agreement_${client.id}.pdf`;

    const digioResponse = await createDocumentForEsign(
      tenant.digioClientId as string,
      tenant.digioClientSecret as string,
      pdfBuffer,
      fileName,
      identifier
    );

    res.json({
      success: true,
      data: digioResponse // Usually contains document id for the SDK to open
    });
  } catch (error: any) {
    console.error('Initiate Agreement Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Simplified webhook / status update logic for now
export const updateKycAgreementStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type } = req.body; // type = 'KYC' or 'AGREEMENT'
    const userId = req.user!.id;
    
    const client = await prisma.client.findFirst({ where: { userId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    if (type === 'KYC' && status === 'COMPLETED') {
      await prisma.client.update({
        where: { id: client.id },
        data: { status: 'AGREEMENT_PENDING' }
      });
    } else if (type === 'AGREEMENT' && status === 'COMPLETED') {
      await prisma.client.update({
        where: { id: client.id },
        data: { status: 'PAYMENT_PENDING' } // or ACTIVE based on flow
      });
    }

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
