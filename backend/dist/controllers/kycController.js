"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKycAgreementStatus = exports.initiateAgreementEsign = exports.initiateKyc = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
        const client = await db_1.default.Client.findOne({ userId })
            .populate('userId')
            .populate('profile')
            .lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await db_1.default.Tenant.findById(req.user.tenantId).lean();
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        const clientIdStr = String(client._id || client.id);
        const isGeneric = (n) => {
            if (!n || typeof n !== 'string')
                return true;
            const l = n.toLowerCase().trim();
            return (l === '' ||
                l === 'digo' ||
                l === 'digio' ||
                l === 'digo client' ||
                l === 'digio client' ||
                l === 'digio esign' ||
                l === 'aadhaar esign' ||
                l === 'client' ||
                l === 'test' ||
                l === 'test user' ||
                l === 'user' ||
                l.includes('@'));
        };
        let verifiedDigioName = '';
        let verifiedMaskedAadhaar = '';
        console.log("req.body?.digioResponse", req.body?.digioResponse);
        // Check if digioResponse or pki_signature_details passed
        if (req.body?.digioResponse) {
            const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(req.body.digioResponse);
            console.log("extracted", extracted);
            if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                verifiedDigioName = extracted.aadhaarName;
            }
            if (extracted?.maskedAadhaar) {
                verifiedMaskedAadhaar = extracted.maskedAadhaar;
            }
        }
        console.log("verifiedDigioName", verifiedDigioName);
        // Resolve signer full name
        let signerName = '';
        if (verifiedDigioName && !isGeneric(verifiedDigioName)) {
            signerName = verifiedDigioName;
        }
        // 1. Generate PDF dynamically
        const pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientIdStr, {
            ipAddress: req.ip,
            signingDate: new Date(),
            signerName: signerName,
            aadhaarSuffix: verifiedMaskedAadhaar || undefined
        });
        // 2. Upload to Digio for eSign
        const identifier = req.user.email || client.email;
        const fileName = `Agreement_${clientIdStr}.pdf`;
        const digioResponse = await (0, digioService_1.createDocumentForEsign)(tenant.digioClientId, tenant.digioClientSecret, pdfBuffer, fileName, identifier, signerName);
        res.json({
            success: true,
            data: digioResponse,
            signerName: signerName
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
        const { status, type, kycId, digioKycId, documentId, digioResponse, signatureText } = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenant = tenantId ? await db_1.default.Tenant.findById(tenantId).lean() : null;
        const clientId = client._id || client.id;
        const clientIdStr = String(clientId);
        const isGeneric = (n) => {
            if (!n || typeof n !== 'string')
                return true;
            const l = n.toLowerCase().trim();
            return (l === '' ||
                l === 'digo' ||
                l === 'digio' ||
                l === 'digo client' ||
                l === 'digio client' ||
                l === 'digio esign' ||
                l === 'aadhaar esign' ||
                l === 'client' ||
                l === 'test' ||
                l === 'test user' ||
                l === 'user' ||
                l.includes('@'));
        };
        let verifiedAadhaarName = '';
        let verifiedMaskedAadhaar = '';
        // Extract verified Aadhaar details / pki_signature_details from Digio response payload
        if (digioResponse) {
            const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(digioResponse);
            if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                verifiedAadhaarName = extracted.aadhaarName;
            }
            if (extracted?.maskedAadhaar) {
                verifiedMaskedAadhaar = extracted.maskedAadhaar;
            }
        }
        if (!verifiedAadhaarName && documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
            try {
                const docStatus = await (0, digioService_1.getDocumentStatus)(tenant.digioClientId, tenant.digioClientSecret, documentId);
                if (docStatus) {
                    const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(docStatus);
                    if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                        verifiedAadhaarName = extracted.aadhaarName;
                    }
                    if (extracted?.maskedAadhaar) {
                        verifiedMaskedAadhaar = extracted.maskedAadhaar;
                    }
                }
            }
            catch (dErr) {
                console.warn('[Digio eSign] Error fetching document status:', dErr.message);
            }
        }
        if (type === 'KYC' && (status === 'COMPLETED' || status === 'SUCCESS')) {
            const updateFields = {
                status: 'AGREEMENT_PENDING',
                kraVerified: true
            };
            if (verifiedAadhaarName) {
                updateFields.name = verifiedAadhaarName;
                updateFields.panName = verifiedAadhaarName;
            }
            if (verifiedMaskedAadhaar) {
                updateFields.aadhaar = verifiedMaskedAadhaar;
            }
            await db_1.default.Client.findByIdAndUpdate(clientId, { $set: updateFields });
            if (verifiedAadhaarName) {
                const nameParts = verifiedAadhaarName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                await db_1.default.User.findByIdAndUpdate(userId, { $set: { firstName, lastName } });
                await db_1.default.ClientProfile.findOneAndUpdate({ clientId }, { $set: { panName: verifiedAadhaarName } }, { upsert: true });
            }
        }
        else if (type === 'AGREEMENT' && (status === 'COMPLETED' || status === 'SIGNED' || status === 'SUCCESS')) {
            const signerName = verifiedAadhaarName || (signatureText && !isGeneric(signatureText) ? signatureText : (client.panName || client.name || 'Investor / Client'));
            const fileName = `${clientIdStr}_signed_agreement.pdf`;
            const agreementUrl = `/uploads/agreements/${fileName}`;
            // Update client name in DB with pki_signature_details.name
            if (verifiedAadhaarName) {
                const nameParts = verifiedAadhaarName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                await db_1.default.Client.findByIdAndUpdate(clientId, {
                    $set: {
                        name: verifiedAadhaarName,
                        panName: verifiedAadhaarName,
                        ...(verifiedMaskedAadhaar ? { aadhaar: verifiedMaskedAadhaar } : {})
                    }
                });
                await db_1.default.User.findByIdAndUpdate(userId, { $set: { firstName, lastName } });
                await db_1.default.ClientProfile.findOneAndUpdate({ clientId }, { $set: { panName: verifiedAadhaarName } }, { upsert: true });
            }
            // Generate signed PDF with Aadhaar signature block displaying pki_signature_details.name
            let pdfBuffer = null;
            try {
                pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientIdStr, {
                    ipAddress: req.ip,
                    signingDate: new Date(),
                    signerName: signerName,
                    aadhaarSuffix: verifiedMaskedAadhaar || undefined,
                    isSigned: true
                });
            }
            catch (pdfErr) {
                console.error('[Agreement] Error generating signed agreement PDF:', pdfErr.message);
            }
            if (pdfBuffer) {
                const targetDirs = [
                    path_1.default.resolve(process.cwd(), 'uploads/agreements'),
                    path_1.default.resolve(__dirname, '../../../uploads/agreements'),
                    path_1.default.resolve(__dirname, '../../public/uploads/agreements')
                ];
                for (const dir of targetDirs) {
                    try {
                        if (!fs_1.default.existsSync(dir)) {
                            fs_1.default.mkdirSync(dir, { recursive: true });
                        }
                        fs_1.default.writeFileSync(path_1.default.join(dir, fileName), pdfBuffer);
                    }
                    catch { }
                }
            }
            // Create Agreement Record
            try {
                await db_1.default.Agreement.create({
                    clientId,
                    agreementUrl,
                    esignMode: 'AADHAAR_ESIGN',
                    ipAddress: req.ip,
                    status: 'SIGNED',
                    signedAt: new Date()
                });
            }
            catch (agrErr) {
                console.warn('[Digio eSign] Error creating agreement DB record:', agrErr.message);
            }
            // Check active subscription
            const activeSub = await db_1.default.Subscription.findOne({
                clientId,
                status: 'ACTIVE'
            }).lean();
            const newStatus = activeSub ? 'ACTIVE' : 'PAYMENT_PENDING';
            await db_1.default.Client.findByIdAndUpdate(clientId, {
                $set: {
                    status: newStatus,
                    agreementSigned: true
                }
            });
        }
        res.json({
            success: true,
            message: 'Status updated successfully',
            verifiedName: verifiedAadhaarName || null
        });
    }
    catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.updateKycAgreementStatus = updateKycAgreementStatus;
