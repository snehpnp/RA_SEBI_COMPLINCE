"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKycAgreementStatus = exports.initiateAgreementEsign = exports.initiateKyc = void 0;
const db_1 = __importDefault(require("../config/db"));
const digioService_1 = require("../services/digioService");
const pdfService_1 = require("../services/pdfService");
const initiateKyc = async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await db_1.default.Client.findOne({ userId }).populate('userId').lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await db_1.default.Tenant.findById(req.user.tenantId).lean();
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        const identifier = client.email || req.user.email;
        const userObj = client.userId || {};
        const customerName = client.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || 'Client';
        const digioResponse = await (0, digioService_1.createKycRequest)(tenant.digioClientId, tenant.digioClientSecret, tenant.digioKycTemplateName || 'DIGILOCKER_KYC', identifier, customerName);
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
        const client = await db_1.default.Client.findOne({ userId }).populate('userId').lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await db_1.default.Tenant.findById(req.user.tenantId).lean();
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        // 1. Generate PDF dynamically
        const clientIdStr = String(client._id || client.id);
        const pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientIdStr);
        // 2. Upload to Digio for eSign
        const identifier = req.user.email;
        const fileName = `Agreement_${clientIdStr}.pdf`;
        const digioResponse = await (0, digioService_1.createDocumentForEsign)(tenant.digioClientId, tenant.digioClientSecret, pdfBuffer, fileName, identifier);
        res.json({
            success: true,
            data: digioResponse
        });
    }
    catch (error) {
        console.error('Initiate Agreement Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.initiateAgreementEsign = initiateAgreementEsign;
const updateKycAgreementStatus = async (req, res) => {
    try {
        const { status, type } = req.body; // type = 'KYC' or 'AGREEMENT'
        const userId = req.user.id;
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const clientId = client._id || client.id;
        if (type === 'KYC' && status === 'COMPLETED') {
            await db_1.default.Client.findByIdAndUpdate(clientId, {
                $set: { status: 'AGREEMENT_PENDING' }
            });
        }
        else if (type === 'AGREEMENT' && status === 'COMPLETED') {
            await db_1.default.Client.findByIdAndUpdate(clientId, {
                $set: { status: 'PAYMENT_PENDING' }
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
