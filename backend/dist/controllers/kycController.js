"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKycAgreementStatus = exports.initiateAgreementEsign = exports.initiateKyc = void 0;
const client_1 = require("@prisma/client");
const digioService_1 = require("../services/digioService");
const pdfService_1 = require("../services/pdfService");
const prisma = new client_1.PrismaClient();
const initiateKyc = async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await prisma.client.findFirst({ where: { userId }, include: { user: true } });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        // Usually Digio uses the PAN or Phone/Email as identifier. 
        // For Digilocker KYC, customer_identifier is usually email or phone.
        const identifier = req.user.email;
        const digioResponse = await (0, digioService_1.createKycRequest)(tenant.digioClientId, tenant.digioClientSecret, tenant.digioKycTemplateName || 'DIGILOCKER_KYC', identifier, `${client.user.firstName} ${client.user.lastName}`);
        res.json({
            success: true,
            data: digioResponse
        });
    }
    catch (error) {
        console.error('Initiate KYC Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.initiateKyc = initiateKyc;
const initiateAgreementEsign = async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await prisma.client.findFirst({ where: { userId }, include: { user: true } });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        // 1. Generate PDF dynamically
        const pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(client.id);
        // 2. Upload to Digio for eSign
        const identifier = req.user.email; // Signer identifier
        const fileName = `Agreement_${client.id}.pdf`;
        const digioResponse = await (0, digioService_1.createDocumentForEsign)(tenant.digioClientId, tenant.digioClientSecret, pdfBuffer, fileName, identifier);
        res.json({
            success: true,
            data: digioResponse // Usually contains document id for the SDK to open
        });
    }
    catch (error) {
        console.error('Initiate Agreement Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.initiateAgreementEsign = initiateAgreementEsign;
// Simplified webhook / status update logic for now
const updateKycAgreementStatus = async (req, res) => {
    try {
        const { status, type } = req.body; // type = 'KYC' or 'AGREEMENT'
        const userId = req.user.id;
        const client = await prisma.client.findFirst({ where: { userId } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        if (type === 'KYC' && status === 'COMPLETED') {
            await prisma.client.update({
                where: { id: client.id },
                data: { status: 'AGREEMENT_PENDING' }
            });
        }
        else if (type === 'AGREEMENT' && status === 'COMPLETED') {
            await prisma.client.update({
                where: { id: client.id },
                data: { status: 'PAYMENT_PENDING' } // or ACTIVE based on flow
            });
        }
        res.json({ success: true, message: 'Status updated successfully' });
    }
    catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateKycAgreementStatus = updateKycAgreementStatus;
