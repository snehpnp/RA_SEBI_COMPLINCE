"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentGatewayStatus = exports.handleCCAvenueResponse = exports.initiateCCAvenuePayment = exports.verifyRazorpayPayment = exports.initiateRazorpayPayment = exports.downloadInvoice = exports.uploadClientDocument = exports.deleteClientAccount = exports.updateClientProfile = exports.getClientProfile = exports.getPlans = exports.getRelatedTenantIds = exports.getResolvedTenant = exports.verifyManualPayment = exports.submitManualPayment = exports.handleRazorpayWebhook = exports.signAgreement = exports.acceptConsent = exports.verifyKRA = exports.initiateDigioKyc = exports.registerClient = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importStar(require("../config/db"));
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const auditService_1 = require("../services/auditService");
const emailService_1 = require("../services/emailService");
const pdfService_1 = require("../services/pdfService");
const digioService_1 = require("../services/digioService");
const invoiceGenerator_1 = require("../services/invoiceGenerator");
const ccavenue_1 = require("../utils/ccavenue");
const querystring_1 = __importDefault(require("querystring"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const registerClient = async (req, res) => {
    const { tenantId: passedTenantId, name, email, mobile, password, pan, aadhaar, category, occupation, addressLine1, city, state, zipCode, createdById } = req.body;
    const authHeader = req.headers.authorization;
    let decodedUser = req.user;
    if (!decodedUser && authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            decodedUser = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        }
        catch { }
    }
    const isAdminAdd = Boolean(createdById ||
        (decodedUser && ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCH_ANALYST', 'RESEARCHER'].includes(decodedUser.role)));
    if (!email || !mobile || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email, mobile number, and password are required.'
        });
    }
    let createdUser = null;
    try {
        let tenantId = passedTenantId;
        let tenant = null;
        if (tenantId) {
            tenant = await db_1.default.Tenant.findById(tenantId).lean();
        }
        if (!tenant) {
            tenant = await db_1.default.Tenant.findOne({ status: { $ne: 'DELETED' } }).lean() || await db_1.default.Tenant.findOne().lean();
            if (tenant) {
                tenantId = (tenant._id || tenant.id).toString();
            }
        }
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Company setup pending. Please contact admin.' });
        }
        // Dynamic Password Policy Enforcement
        if (!password || password.length < 8 || password.length > 15) {
            return res.status(400).json({
                success: false,
                message: 'Password must be between 8 and 15 characters long.',
                errors: ['Password length must be between 8 and 15 characters']
            });
        }
        const policy = tenant?.passwordPolicy || 'NORMAL';
        if (policy === 'STRONG') {
            const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^~_\-\(\).,?:{}|<>])[A-Za-z\d@$!%*?&#^~_\-\(\).,?:{}|<>]{8,15}$/;
            if (!strongRegex.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be between 8 and 15 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
                    errors: ['Password does not meet strong policy requirements']
                });
            }
        }
        // Check OTP verification for self-signup based on tenant.signupVerificationMode (Bypassed for Admin manual add)
        if (!isAdminAdd) {
            const mode = tenant?.signupVerificationMode || 'EMAIL_ONLY';
            const cleanEmail = email.toLowerCase().trim();
            const cleanMobile = mobile.trim();
            const verRecord = await db_1.EmailVerification.findOne({
                $or: [{ email: cleanEmail }, ...(cleanMobile ? [{ mobile: cleanMobile }] : [])]
            }).lean();
            if (mode === 'EMAIL_ONLY') {
                if (!verRecord?.emailVerified) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please verify your Email OTP before completing registration.'
                    });
                }
            }
            else if (mode === 'MOBILE_ONLY') {
                if (!verRecord?.smsVerified) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please verify your Mobile OTP before completing registration.'
                    });
                }
            }
            else if (mode === 'BOTH') {
                if (!verRecord?.emailVerified || !verRecord?.smsVerified) {
                    return res.status(400).json({
                        success: false,
                        message: 'Both Email and Mobile OTPs must be verified before completing registration.'
                    });
                }
            }
        }
        const duplicateEmail = await db_1.default.User.findOne({ email }).lean();
        if (duplicateEmail) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate Account Detected',
                duplicateField: 'email',
                errors: ['An account with this Email already exists.']
            });
        }
        const duplicateMobile = await db_1.default.User.findOne({ mobile }).lean();
        if (duplicateMobile) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate Account Detected',
                duplicateField: 'mobile',
                errors: ['An account with this Mobile number already exists.']
            });
        }
        if (pan && pan.trim()) {
            const duplicatePan = await db_1.default.Client.findOne({ pan: pan.trim() }).lean();
            if (duplicatePan) {
                return res.status(400).json({
                    success: false,
                    message: 'Duplicate Account Detected',
                    duplicateField: 'pan',
                    errors: ['An account with this PAN already exists.']
                });
            }
        }
        if (aadhaar && aadhaar.trim()) {
            const duplicateAadhaar = await db_1.default.Client.findOne({ aadhaar: aadhaar.trim() }).lean();
            if (duplicateAadhaar) {
                return res.status(400).json({
                    success: false,
                    message: 'Duplicate Account Detected',
                    duplicateField: 'aadhaar',
                    errors: ['An account with this Aadhaar already exists.']
                });
            }
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const clientRole = await db_1.default.Role.findOne({ name: 'CLIENT' }).lean();
        if (!clientRole) {
            return res.status(500).json({ success: false, message: 'Client role not seeded.' });
        }
        const creatorId = req.body.createdById || (req.user ? req.user.id : null);
        const effectiveName = (name && name.trim()) || email.split('@')[0] || 'Client';
        const nameParts = effectiveName.split(' ');
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        const user = await db_1.default.User.create({
            tenantId,
            roleId: clientRole._id || clientRole.id,
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            passwordHash,
            status: 'ACTIVE',
            tempPassword: null
        });
        createdUser = user;
        const clientPayload = {
            tenantId,
            userId: user._id || user.id,
            name: effectiveName,
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            category: category || 'INDIVIDUAL',
            occupation: occupation || null,
            status: 'ACTIVE',
            createdById: creatorId
        };
        if (pan && String(pan).trim())
            clientPayload.pan = String(pan).trim().toUpperCase();
        if (aadhaar && String(aadhaar).trim())
            clientPayload.aadhaar = String(aadhaar).trim();
        const client = await db_1.default.Client.create(clientPayload);
        await db_1.default.ClientProfile.create({
            clientId: client._id || client.id,
            addressLine1: addressLine1 || null,
            city: city || null,
            state: state || null,
            country: 'India',
            zipCode: zipCode || null
        });
        // Cleanup used verification records on self-registration
        if (!isAdminAdd) {
            const cleanEmail = email.toLowerCase().trim();
            const cleanMobile = mobile.trim();
            await db_1.EmailVerification.deleteMany({
                $or: [{ email: cleanEmail }, ...(cleanMobile ? [{ mobile: cleanMobile }] : [])]
            }).catch(() => { });
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: user._id || user.id,
            action: 'CREATE',
            module: 'CLIENTS',
            newValue: client,
            ipAddress: req.ip
        });
        const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
        try {
            const attachments = await (0, pdfService_1.getTenantComplianceAttachments)(tenant);
            await (0, emailService_1.sendWelcomeEmail)({
                tenantId,
                toEmail: email,
                name,
                password: password,
                role: 'CLIENT',
                loginUrl,
                companyName: tenant?.companyName || 'RAGCP Platform',
                customText: tenant?.welcomeEmailText,
                attachments
            });
        }
        catch (emailErr) {
            console.error('[EMAIL] Failed to send welcome email:', emailErr);
        }
        return res.status(201).json({
            success: true,
            message: 'Client registered and activated successfully.',
            data: client
        });
    }
    catch (error) {
        if (createdUser && createdUser._id) {
            await db_1.default.User.findByIdAndDelete(createdUser._id).catch(() => { });
        }
        let friendlyMessage = 'Registration failed. Please check your information and try again.';
        let duplicateField = null;
        if (error.code === 11000 || error.name === 'MongoServerError' || String(error.message).includes('E11000')) {
            const rawMsg = String(error.message || '');
            if (error.keyPattern?.email || rawMsg.includes('email')) {
                duplicateField = 'email';
                friendlyMessage = 'This email address is already registered. Please login or use a different email.';
            }
            else if (error.keyPattern?.mobile || rawMsg.includes('mobile')) {
                duplicateField = 'mobile';
                friendlyMessage = 'This mobile number is already registered. Please login or use a different number.';
            }
            else if (error.keyPattern?.pan || rawMsg.includes('pan')) {
                duplicateField = 'pan';
                friendlyMessage = 'This PAN card number is already registered with another account.';
            }
            else if (error.keyPattern?.aadhaar || rawMsg.includes('aadhaar')) {
                duplicateField = 'aadhaar';
                friendlyMessage = 'This Aadhaar number is already registered with another account.';
            }
            else {
                friendlyMessage = 'An account with these credentials already exists. Please verify your details or login.';
            }
            return res.status(400).json({
                success: false,
                message: friendlyMessage,
                errors: [friendlyMessage],
                duplicateField
            });
        }
        if (error.name === 'ValidationError') {
            friendlyMessage = Object.values(error.errors || {}).map((e) => e.message).join('. ') || 'Invalid details provided.';
            return res.status(400).json({
                success: false,
                message: friendlyMessage,
                errors: [friendlyMessage]
            });
        }
        return res.status(500).json({
            success: false,
            message: friendlyMessage,
            errors: [friendlyMessage]
        });
    }
};
exports.registerClient = registerClient;
const initiateDigioKyc = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        const tenant = await db_1.default.Tenant.findById(tenantId).lean();
        if (!tenant?.digioClientId || !tenant?.digioClientSecret || !tenant?.digioKycTemplateName) {
            return res.status(400).json({ success: false, message: 'Digio KYC is not configured for this tenant.' });
        }
        const customerIdentifier = client.email;
        const customerName = client.name || 'Client';
        const isSandbox = (tenant.digioEnvironment || '').toUpperCase() === 'SANDBOX' || (tenant.digioClientId || '').startsWith('ACK') || (tenant.digioClientId || '').startsWith('AIK');
        const digioResponse = await (0, digioService_1.createKycRequest)(tenant.digioClientId, tenant.digioClientSecret, tenant.digioKycTemplateName, customerIdentifier, customerName, tenant.digioEnvironment);
        return res.status(200).json({
            success: true,
            message: 'Digio KYC request initiated',
            data: digioResponse,
            environment: isSandbox ? 'sandbox' : 'production'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to initiate Digio KYC', errors: [error.message] });
    }
};
exports.initiateDigioKyc = initiateDigioKyc;
const verifyKRA = async (req, res) => {
    const { pan, aadhaar, statusInput } = req.body;
    const tenantId = req.user.tenantId;
    if (!pan) {
        return res.status(400).json({ success: false, message: 'PAN is required.' });
    }
    try {
        const client = await db_1.default.Client.findOne({
            userId: req.user.id
        }).lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client profile not found.' });
        }
        if (pan !== client.pan) {
            const duplicatePan = await db_1.default.Client.findOne({
                pan,
                _id: { $ne: client._id || client.id }
            }).lean();
            if (duplicatePan) {
                return res.status(400).json({ success: false, message: 'Verified PAN is already in use by another client.' });
            }
        }
        if (aadhaar && aadhaar !== client.aadhaar) {
            const duplicateAadhaar = await db_1.default.Client.findOne({
                aadhaar,
                _id: { $ne: client._id || client.id }
            }).lean();
            if (duplicateAadhaar) {
                return res.status(400).json({ success: false, message: 'Verified Aadhaar number is already in use by another client.' });
            }
        }
        if (pan !== client.pan) {
            await db_1.default.ClientIdentityHistory.create({
                clientId: client._id || client.id,
                fieldName: 'PAN',
                oldValue: client.pan,
                newValue: pan,
                changedBy: 'CLIENT',
                remarks: 'Updated during DigiLocker eKYC verification'
            });
        }
        if (aadhaar && aadhaar !== client.aadhaar) {
            await db_1.default.ClientIdentityHistory.create({
                clientId: client._id || client.id,
                fieldName: 'AADHAAR',
                oldValue: client.aadhaar,
                newValue: aadhaar,
                changedBy: 'CLIENT',
                remarks: 'Updated during DigiLocker eKYC verification'
            });
        }
        let verifiedAadhaarName = '';
        let verifiedMaskedAadhaar = '';
        let extractedDob = null;
        let extractedPan = null;
        if (req.body.digioResponse) {
            const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(req.body.digioResponse);
            if (extracted?.aadhaarName) {
                verifiedAadhaarName = extracted.aadhaarName;
            }
            if (extracted?.maskedAadhaar) {
                verifiedMaskedAadhaar = extracted.maskedAadhaar;
            }
            if (extracted?.dob) {
                extractedDob = extracted.dob;
            }
            if (extracted?.panNumber) {
                extractedPan = extracted.panNumber;
            }
            const profileUpdates = { isDigiLockerLocked: true };
            if (extracted?.address)
                profileUpdates.addressLine1 = extracted.address;
            if (extracted?.city)
                profileUpdates.city = extracted.city;
            if (extracted?.state)
                profileUpdates.state = extracted.state;
            if (extracted?.zipCode)
                profileUpdates.zipCode = extracted.zipCode;
            if (extracted?.dob)
                profileUpdates.dob = extracted.dob;
            if (verifiedAadhaarName)
                profileUpdates.panName = verifiedAadhaarName;
            await db_1.default.ClientProfile.findOneAndUpdate({ clientId: client._id || client.id }, { $set: profileUpdates }, { upsert: true });
        }
        const nextStatus = statusInput === 'FAIL' ? 'KYC_FAILED' : 'AGREEMENT_PENDING';
        const updateSet = {
            pan: pan || extractedPan,
            ...(aadhaar ? { aadhaar } : {}),
            ...(verifiedMaskedAadhaar ? { aadhaar: verifiedMaskedAadhaar } : {}),
            ...(extractedDob ? { dob: extractedDob } : {}),
            status: nextStatus,
            kraVerified: statusInput !== 'FAIL'
        };
        if (verifiedAadhaarName) {
            updateSet.name = verifiedAadhaarName;
            updateSet.panName = verifiedAadhaarName;
        }
        const updatedClient = await db_1.default.Client.findByIdAndUpdate(client._id || client.id, { $set: updateSet }, { returnDocument: 'after', lean: true });
        if (verifiedAadhaarName) {
            const nameParts = verifiedAadhaarName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            await db_1.default.User.findByIdAndUpdate(req.user.id, { $set: { firstName, lastName } });
            await db_1.default.ClientProfile.findOneAndUpdate({ clientId: client._id || client.id }, { $set: { panName: verifiedAadhaarName } }, { upsert: true });
        }
        if (statusInput === 'FAIL') {
            await db_1.default.ComplianceAlert.create({
                tenantId: tenantId,
                alertType: 'KYC_FAILED',
                severity: 'HIGH',
                description: `KRA automated KYC failed for Client PAN ${pan} (${client.name}). Manual verification required.`,
                clientId: client._id || client.id
            });
            return res.status(200).json({
                success: true,
                message: 'KRA lookup failed. System generated an alert for manual verification but onboarding remains unblocked.',
                data: { kycStatus: 'MANUAL_REVIEW_REQUIRED' }
            });
        }
        return res.status(200).json({
            success: true,
            message: 'KRA KYC verification successful.',
            data: { kycStatus: 'COMPLETED' }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.verifyKRA = verifyKRA;
const acceptConsent = async (req, res) => {
    const { tncAccept, policyAccept, researchAccept } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const consent = await db_1.default.Consent.create({
            clientId: client._id || client.id,
            tncAccept: !!tncAccept,
            policyAccept: !!policyAccept,
            researchAccept: !!researchAccept,
            ipAddress: req.ip
        });
        await db_1.default.ConsentHistory.create({
            consentId: consent._id || consent.id,
            action: 'ACCEPTED'
        });
        return res.status(200).json({
            success: true,
            message: 'Consents captured successfully.',
            data: consent
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.acceptConsent = acceptConsent;
const signAgreement = async (req, res) => {
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const clientIdStr = String(client._id || client.id);
        const fileName = `${clientIdStr}_signed_agreement.pdf`;
        const agreementUrl = `/uploads/agreements/${fileName}`;
        const tenantId = req.user.tenantId || client.tenantId;
        const tenant = tenantId ? await db_1.default.Tenant.findById(tenantId).lean() : null;
        let verifiedDigioName = '';
        let verifiedMaskedAadhaar = '';
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
        console.log('[Digio eSign] Callback received. req.body.documentId:', req.body.documentId, 'digioResponse:', JSON.stringify(req.body.digioResponse || {}));
        // 1. Extract directly from PKI signature details / Digio response payload
        if (req.body.digioResponse) {
            const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(req.body.digioResponse);
            if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                verifiedDigioName = extracted.aadhaarName;
            }
            if (extracted?.maskedAadhaar) {
                verifiedMaskedAadhaar = extracted.maskedAadhaar;
            }
        }
        // 2. If not found in response, query Digio Document Status API for PKI signature details
        if (!verifiedDigioName && req.body.documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
            try {
                const docStatus = await (0, digioService_1.getDocumentStatus)(tenant.digioClientId, tenant.digioClientSecret, req.body.documentId, tenant.digioEnvironment);
                console.log('[Digio eSign] Fetched docStatus:', JSON.stringify(docStatus || {}));
                if (docStatus) {
                    const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(docStatus);
                    if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                        verifiedDigioName = extracted.aadhaarName;
                    }
                    if (extracted?.maskedAadhaar) {
                        verifiedMaskedAadhaar = extracted.maskedAadhaar;
                    }
                }
            }
            catch (docErr) {
                console.error('[Digio eSign] Error fetching doc status:', docErr.message);
            }
        }
        const passedSig = typeof req.body.signatureText === 'string' ? req.body.signatureText.trim() : '';
        let signerName = '';
        if (verifiedDigioName) {
            signerName = verifiedDigioName;
        }
        else if (passedSig && !isGeneric(passedSig)) {
            signerName = passedSig;
        }
        else if (client.panName && !isGeneric(client.panName)) {
            signerName = client.panName.trim();
        }
        else if (client.name && !isGeneric(client.name)) {
            signerName = client.name.trim();
        }
        if (!signerName || isGeneric(signerName)) {
            signerName = 'Investor / Client';
        }
        // If verified Aadhaar PKI signature name obtained from Digio, sync across DB
        if (verifiedDigioName) {
            try {
                const nameParts = verifiedDigioName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                await db_1.default.Client.findByIdAndUpdate(client._id || client.id, {
                    $set: {
                        name: verifiedDigioName,
                        panName: verifiedDigioName,
                        ...(verifiedMaskedAadhaar ? { aadhaar: verifiedMaskedAadhaar } : {})
                    }
                });
                await db_1.default.User.findByIdAndUpdate(req.user.id, {
                    $set: { firstName, lastName }
                });
                await db_1.default.ClientProfile.findOneAndUpdate({ clientId: client._id || client.id }, { $set: { panName: verifiedDigioName } }, { upsert: true });
            }
            catch (syncErr) {
                console.warn('[Digio eSign] Error syncing profile in DB:', syncErr.message);
            }
        }
        // 1. Download signed PDF from Digio or fallback to generating it locally
        let pdfBuffer = null;
        if (req.body.documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
            pdfBuffer = await (0, digioService_1.downloadDocument)(tenant.digioClientId, tenant.digioClientSecret, req.body.documentId, tenant.digioEnvironment);
        }
        if (!pdfBuffer) {
            try {
                pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientIdStr, {
                    ipAddress: req.ip,
                    signingDate: new Date(),
                    signerName: verifiedDigioName || signerName,
                    aadhaarSuffix: verifiedMaskedAadhaar || undefined,
                    isSigned: true
                });
            }
            catch (pdfErr) {
                console.error('[Agreement] Error generating agreement PDF:', pdfErr.message);
            }
        }
        // 2. Save PDF file to disk for downloads and audit exports
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
        // 3. Create Agreement Record
        let agreement = null;
        try {
            agreement = await db_1.default.Agreement.create({
                clientId: client._id || client.id,
                agreementUrl,
                esignMode: 'AADHAAR_ESIGN',
                ipAddress: req.ip,
                status: 'SIGNED',
                signedAt: new Date()
            });
        }
        catch (agrErr) {
            console.warn('[Digio eSign] Error creating agreement document in DB:', agrErr.message);
        }
        if (agreement) {
            try {
                await db_1.default.AgreementHistory.create({
                    agreementId: agreement._id || agreement.id,
                    action: 'SIGNED',
                    performedBy: signerName,
                    ipAddress: req.ip
                });
            }
            catch (histErr) {
                console.warn('[Digio eSign] Error creating agreement history:', histErr.message);
            }
        }
        // Check if client already has an active subscription assigned by admin
        const activeSub = await db_1.default.Subscription.findOne({
            clientId: client._id || client.id,
            status: 'ACTIVE'
        }).lean();
        const newStatus = (activeSub && client.kraVerified) ? 'ACTIVE' : (activeSub ? 'ACTIVE' : 'PAYMENT_PENDING');
        await db_1.default.Client.findByIdAndUpdate(client._id || client.id, {
            $set: {
                status: newStatus,
                agreementSigned: true
            }
        });
        return res.status(200).json({
            success: true,
            message: 'Agreement signed successfully via Aadhaar eSign.',
            verifiedName: verifiedDigioName || signerName,
            data: agreement
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.signAgreement = signAgreement;
const handleRazorpayWebhook = async (req, res) => {
    const { clientId, planId, amount, paymentMode, transactionRef, statusInput, couponCode } = req.body;
    try {
        const client = await db_1.default.Client.findById(clientId).populate('userId').lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = client.userId?.tenantId;
        if (amount > 151000) {
            await db_1.default.Client.findByIdAndUpdate(clientId, {
                $set: { category: 'NON_INDIVIDUAL' }
            });
        }
        if (paymentMode !== 'ONLINE_RAZORPAY' && amount >= 50000) {
            await db_1.default.ComplianceAlert.create({
                tenantId,
                alertType: 'COMPLIANCE_PENDING',
                severity: 'HIGH',
                description: `FIU ALERT: Cash payment of ${amount} received from Client ${client.name} (PAN: ${client.pan}). High risk case logged.`
            });
        }
        const payStatus = statusInput === 'FAILED' ? 'FAILED' : 'SUCCESS';
        let discountAmount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.Coupon.findOne({ code: couponCode, tenantId }).lean();
            const plan = await db_1.default.Plan.findById(planId).lean();
            if (coupon && plan && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                    discountAmount = coupon.discountValue;
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    discountAmount = (plan.price * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
                        discountAmount = coupon.maxDiscountValue;
                    }
                }
                if (discountAmount > plan.price)
                    discountAmount = plan.price;
                appliedCouponId = coupon._id || coupon.id;
                if (statusInput !== 'FAILED') {
                    await db_1.default.Coupon.findByIdAndUpdate(coupon._id || coupon.id, {
                        $inc: { usedCount: 1 }
                    });
                }
            }
        }
        const tenantObj = await db_1.default.Tenant.findById(tenantId).lean();
        const profile = await db_1.default.ClientProfile.findOne({ clientId }).lean();
        const payment = await db_1.default.Payment.create({
            tenantId,
            clientId,
            planId,
            amount: parseFloat(amount) || 0,
            couponId: appliedCouponId,
            discountApplied: discountAmount || 0,
            paymentMode: paymentMode || 'ONLINE_RAZORPAY',
            transactionRef: transactionRef || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
            status: payStatus,
            clientCity: profile?.city || null,
            clientState: profile?.state || null,
            tenantState: tenantObj?.state || null
        });
        if (payStatus === 'SUCCESS') {
            const plan = await db_1.default.Plan.findById(planId).lean();
            if (plan) {
                const existingSub = await db_1.default.Subscription.findOne({
                    clientId,
                    planId,
                    status: 'ACTIVE',
                    endDate: { $gt: new Date() }
                }).sort({ endDate: -1 }).lean();
                let startDate = new Date();
                if (existingSub) {
                    startDate = new Date(existingSub.endDate);
                }
                const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);
                await db_1.default.Subscription.create({
                    clientId,
                    planId,
                    startDate,
                    endDate,
                    status: 'ACTIVE'
                });
                await db_1.default.Client.findByIdAndUpdate(clientId, {
                    $set: { status: 'ACTIVE' }
                });
            }
        }
        return res.status(200).json({
            success: true,
            message: payStatus === 'SUCCESS' ? 'Subscription activated.' : 'Payment failed.',
            data: payment
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.handleRazorpayWebhook = handleRazorpayWebhook;
const submitManualPayment = async (req, res) => {
    const { planId, amount, paymentMode, transactionRef, remarks, couponCode } = req.body;
    const files = req.files;
    let receiptUrl = req.body.receiptUrl || '/uploads/payments/mock_receipt.png';
    if (req.file) {
        receiptUrl = `/uploads/payments/${req.file.filename}`;
    }
    else if (files?.screenshot && files.screenshot.length > 0) {
        receiptUrl = `/uploads/payments/${files.screenshot[0].filename}`;
    }
    else if (files?.receipt && files.receipt.length > 0) {
        receiptUrl = `/uploads/payments/${files.receipt[0].filename}`;
    }
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = req.user.tenantId;
        const tenantObj = await db_1.default.Tenant.findById(tenantId).lean();
        const profile = await db_1.default.ClientProfile.findOne({ clientId: client._id || client.id }).lean();
        const kycRequired = tenantObj?.kycFirst !== false;
        const isClientKycDone = Boolean(client.kraVerified === true || client.status === 'VERIFIED' || client.status === 'APPROVED' || client.status === 'PAYMENT_PENDING');
        if (kycRequired && !isClientKycDone) {
            return res.status(403).json({
                success: false,
                requiresKyc: true,
                message: 'KYC Verification is required before purchasing a plan. Please complete your KYC verification first.'
            });
        }
        const agreementDoc = await db_1.default.Agreement.findOne({
            clientId: client._id || client.id,
            status: { $in: ['SIGNED', 'ACTIVE'] }
        }).lean();
        const isClientAgreementDone = Boolean(client.agreementSigned || agreementDoc);
        if (kycRequired && !isClientAgreementDone) {
            return res.status(403).json({
                success: false,
                requiresAgreement: true,
                message: 'Advisory Agreement must be signed before purchasing a plan. Please sign your agreement first.'
            });
        }
        let planDoc = null;
        if (planId && mongoose_1.default.Types.ObjectId.isValid(planId)) {
            planDoc = await db_1.default.Plan.findById(planId).lean();
        }
        else if (planId) {
            planDoc = await db_1.default.Plan.findOne({ id: planId }).lean();
        }
        const parsedAmount = parseFloat(amount) || (planDoc ? planDoc.price : 0);
        let discountApplied = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.Coupon.findOne({
                code: String(couponCode).trim().toUpperCase(),
                tenantId,
                status: 'ACTIVE'
            }).lean();
            if (coupon) {
                appliedCouponId = coupon._id || coupon.id;
                const basePrice = planDoc ? planDoc.price : parsedAmount;
                if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                    discountApplied = coupon.discountValue;
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    discountApplied = (basePrice * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountApplied > coupon.maxDiscountValue) {
                        discountApplied = coupon.maxDiscountValue;
                    }
                }
                if (discountApplied > basePrice)
                    discountApplied = basePrice;
            }
        }
        // If amount is less than standard total, infer discount difference
        if (planDoc && planDoc.price) {
            const isExclusive = tenantObj?.gstCalculationType === 'EXCLUSIVE';
            const expectedTotal = isExclusive ? (planDoc.price * 1.18) : planDoc.price;
            const diff = expectedTotal - parsedAmount;
            if (diff > 0 && discountApplied <= 0) {
                discountApplied = diff;
            }
        }
        const payment = await db_1.default.Payment.create({
            tenantId,
            clientId: client._id || client.id,
            planId: planDoc ? (planDoc._id || planDoc.id) : (planId || null),
            amount: parsedAmount,
            paymentMode: paymentMode || 'UPI_QR',
            transactionRef: transactionRef ? transactionRef.trim() : 'UPI-' + Date.now(),
            receiptUrl,
            status: 'PENDING',
            remarks: remarks || 'Client submitted QR / UPI payment screenshot for verification.',
            clientCity: profile?.city || null,
            clientState: profile?.state || null,
            tenantState: tenantObj?.state || null,
            planValidityDays: planDoc ? (planDoc.durationMonths * 30) : null,
            couponId: appliedCouponId,
            discountApplied: discountApplied > 0 ? parseFloat(discountApplied.toFixed(2)) : 0
        });
        return res.status(201).json({
            success: true,
            message: 'Payment screenshot uploaded successfully. Awaiting compliance team approval.',
            data: payment
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.submitManualPayment = submitManualPayment;
const verifyManualPayment = async (req, res) => {
    const { paymentId, status, remarks } = req.body;
    try {
        const payment = await db_1.default.Payment.findById(paymentId).lean();
        if (!payment)
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        const tenantId = req.user.tenantId;
        const updatedPayment = await db_1.default.Payment.findByIdAndUpdate(paymentId, {
            $set: {
                status,
                remarks,
                verifiedByStaffId: req.user.id
            }
        }, { returnDocument: 'after', lean: true });
        if (status === 'SUCCESS') {
            const plan = await db_1.default.Plan.findById(payment.planId).lean();
            if (plan) {
                const client = await db_1.default.Client.findById(payment.clientId).lean();
                if (client) {
                    if (payment.amount > 151000) {
                        await db_1.default.Client.findByIdAndUpdate(client._id || client.id, {
                            $set: { category: 'NON_INDIVIDUAL' }
                        });
                    }
                    if (payment.paymentMode !== 'ONLINE_RAZORPAY' && payment.amount >= 50000) {
                        await db_1.default.ComplianceAlert.create({
                            tenantId,
                            alertType: 'COMPLIANCE_PENDING',
                            severity: 'HIGH',
                            description: `FIU ALERT: Cash/Manual payment of ${payment.amount} received from Client ${client.name} (PAN: ${client.pan}). High risk case logged.`
                        });
                    }
                }
                // Check if there is an existing active subscription for this client and plan (sequential queueing)
                const existingSub = await db_1.default.Subscription.findOne({
                    clientId: payment.clientId,
                    planId: plan._id || plan.id,
                    status: 'ACTIVE',
                    endDate: { $gt: new Date() }
                }).sort({ endDate: -1 }).lean();
                let startDate = new Date();
                if (existingSub) {
                    // Starts sequentially right after the existing active plan expires
                    startDate = new Date(existingSub.endDate);
                }
                else if (payment.paymentDate) {
                    const parsed = new Date(payment.paymentDate);
                    if (!isNaN(parsed.getTime()))
                        startDate = parsed;
                }
                const validityDays = payment.planValidityDays || (plan.durationMonths * 30) || 30;
                const endDate = new Date(startDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
                const amountTotal = Number(payment.amount || 0);
                const amountBase = amountTotal / 1.18;
                const amountGst = amountTotal - amountBase;
                await db_1.default.Subscription.create({
                    clientId: payment.clientId,
                    planId: plan._id || plan.id,
                    startDate,
                    endDate,
                    status: 'ACTIVE',
                    amountTotal: parseFloat(amountTotal.toFixed(2)),
                    amountBase: parseFloat(amountBase.toFixed(2)),
                    amountGst: parseFloat(amountGst.toFixed(2))
                });
                await db_1.default.Client.findByIdAndUpdate(payment.clientId, {
                    $set: { status: 'ACTIVE' }
                });
                if (payment.couponId) {
                    await db_1.default.Coupon.findByIdAndUpdate(payment.couponId, {
                        $inc: { usedCount: 1 }
                    }).catch(() => { });
                }
            }
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'PAYMENTS',
            newValue: updatedPayment,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: `Manual payment verification processed as ${status}.`,
            data: updatedPayment
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.verifyManualPayment = verifyManualPayment;
const getResolvedTenant = async (tenantId, userId) => {
    let tid = tenantId;
    if (!tid && userId) {
        const clientDoc = await db_1.default.Client.findOne({ userId }).lean();
        if (clientDoc?.tenantId)
            tid = clientDoc.tenantId;
        if (!tid) {
            const userDoc = await db_1.default.User.findById(userId).lean();
            if (userDoc?.tenantId)
                tid = userDoc.tenantId;
        }
    }
    let tenantObj = null;
    if (tid && mongoose_1.default.Types.ObjectId.isValid(tid)) {
        tenantObj = await db_1.default.Tenant.findById(tid).lean();
        if (!tenantObj) {
            tenantObj = await db_1.centralModels.Tenant.findById(tid).lean();
        }
    }
    if (!tenantObj && tid) {
        tenantObj = await db_1.default.Tenant.findOne({ $or: [{ id: tid }, { tenantId: tid }] }).lean();
    }
    if (!tenantObj && tid) {
        tenantObj = await db_1.centralModels.Tenant.findOne({ $or: [{ _id: tid }, { id: tid }, { tenantId: tid }] }).lean();
    }
    if (!tenantObj && tid) {
        tenantObj = await db_1.centralModels.AllCompany.findOne({ $or: [{ _id: tid }, { tenantId: tid }] }).lean();
    }
    if (!tenantObj) {
        tenantObj = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenantObj) {
        tenantObj = await db_1.centralModels.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenantObj) {
        tenantObj = await db_1.centralModels.AllCompany.findOne({ deletedAt: null }).lean();
    }
    // If Razorpay credentials missing on matched tenantObj, look up central tenant/AllCompany
    if (tenantObj) {
        if (!tenantObj.razorpayKeyId || !tenantObj.razorpayKeySecret) {
            const altTenant = await db_1.centralModels.Tenant.findOne({
                razorpayKeyId: { $ne: null }
            }).lean() || await db_1.centralModels.AllCompany.findOne({
                razorpayKeyId: { $ne: null }
            }).lean();
            if (altTenant) {
                if (!tenantObj.razorpayKeyId && altTenant.razorpayKeyId)
                    tenantObj.razorpayKeyId = altTenant.razorpayKeyId;
                if (!tenantObj.razorpayKeySecret && altTenant.razorpayKeySecret)
                    tenantObj.razorpayKeySecret = altTenant.razorpayKeySecret;
            }
        }
    }
    return tenantObj;
};
exports.getResolvedTenant = getResolvedTenant;
const getRelatedTenantIds = async (tenantId, userId) => {
    const ids = new Set();
    if (tenantId)
        ids.add(String(tenantId));
    if (userId) {
        const clientDoc = await db_1.default.Client.findOne({ userId }).lean();
        if (clientDoc?.tenantId)
            ids.add(String(clientDoc.tenantId));
        const userDoc = await db_1.default.User.findById(userId).lean();
        if (userDoc?.tenantId)
            ids.add(String(userDoc.tenantId));
    }
    const allTenants = await db_1.centralModels.Tenant.find({ deletedAt: null }).lean().catch(() => []);
    const allCompanies = await db_1.centralModels.AllCompany.find({ deletedAt: null }).lean().catch(() => []);
    allTenants.forEach((t) => {
        if (t._id)
            ids.add(String(t._id));
        if (t.id)
            ids.add(String(t.id));
        if (t.tenantId)
            ids.add(String(t.tenantId));
    });
    allCompanies.forEach((c) => {
        if (c._id)
            ids.add(String(c._id));
        if (c.id)
            ids.add(String(c.id));
        if (c.tenantId)
            ids.add(String(c.tenantId));
    });
    return Array.from(ids)
        .filter(id => mongoose_1.default.Types.ObjectId.isValid(id))
        .map(id => new mongoose_1.default.Types.ObjectId(id));
};
exports.getRelatedTenantIds = getRelatedTenantIds;
const getPlans = async (req, res) => {
    try {
        const tenantObj = await (0, exports.getResolvedTenant)(req.user?.tenantId, req.user?.id);
        const relatedTenantIds = await (0, exports.getRelatedTenantIds)(req.user?.tenantId, req.user?.id);
        // Find active categories
        const activeCategories = await db_1.default.PlanCategory.find({
            $or: [
                { tenantId: { $in: relatedTenantIds } },
                { tenantId: null }
            ],
            status: 'ACTIVE'
        }).lean();
        const activeCatIds = activeCategories.map((c) => c._id || c.id);
        const plans = await db_1.default.Plan.find({
            $and: [
                {
                    $or: [
                        { tenantId: { $in: relatedTenantIds } },
                        { tenantId: null }
                    ]
                },
                { deletedAt: null },
                { status: 'ACTIVE' },
                {
                    $or: [
                        { categoryId: null },
                        { categoryId: { $in: activeCatIds } }
                    ]
                }
            ]
        })
            .populate('categoryId')
            .sort({ createdAt: -1 })
            .lean();
        const formatted = plans.map((p) => {
            const catObj = p.categoryId && typeof p.categoryId === 'object' ? p.categoryId : null;
            const catIdStr = catObj ? String(catObj._id || catObj.id) : (p.categoryId ? String(p.categoryId) : '');
            return {
                ...p,
                id: String(p._id || p.id),
                categoryId: catIdStr,
                category: catObj ? {
                    ...catObj,
                    id: String(catObj._id || catObj.id)
                } : (p.category ? p.category : null)
            };
        });
        return res.status(200).json({
            success: true,
            data: formatted,
            gstCalculationType: tenantObj?.gstCalculationType || 'EXCLUSIVE'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getPlans = getPlans;
const getClientProfile = async (req, res) => {
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean() || await db_1.default.Client.findById(req.user.id).lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client profile not found.' });
        }
        const clientId = client._id || client.id;
        const profile = await db_1.default.ClientProfile.findOne({ $or: [{ clientId }, { clientId: client.userId }] }).lean();
        const subscriptions = await db_1.default.Subscription.find({
            $or: [{ clientId }, { clientId: client.userId }, { clientId: req.user.id }]
        }).populate('planId').lean();
        const agreements = await db_1.default.Agreement.find({
            $or: [{ clientId }, { clientId: client.userId }, { clientId: req.user.id }]
        }).lean();
        const consents = await db_1.default.Consent.find({
            $or: [{ clientId }, { clientId: client.userId }, { clientId: req.user.id }]
        }).lean();
        const tenantObj = await (0, exports.getResolvedTenant)(req.user?.tenantId, req.user?.id);
        let isPaymentGatewayConfigured = false;
        let tenantFormatted = null;
        if (tenantObj) {
            const activeGateway = (tenantObj.activePaymentGateway || 'RAZORPAY').toUpperCase();
            if (activeGateway === 'RAZORPAY') {
                isPaymentGatewayConfigured = !!(tenantObj.razorpayKeyId && tenantObj.razorpayKeySecret && tenantObj.razorpayKeyId.trim() && tenantObj.razorpayKeySecret.trim());
            }
            else if (activeGateway === 'CCAVENUE') {
                isPaymentGatewayConfigured = !!(tenantObj.ccavenueMerchantId && tenantObj.ccavenueAccessCode && tenantObj.ccavenueWorkingKey && tenantObj.ccavenueMerchantId.trim() && tenantObj.ccavenueWorkingKey.trim());
            }
            else if (activeGateway === 'CASHFREE') {
                isPaymentGatewayConfigured = !!(tenantObj.cashfreeAppId && tenantObj.cashfreeSecretKey && tenantObj.cashfreeAppId.trim() && tenantObj.cashfreeSecretKey.trim());
            }
            else if (activeGateway === 'STRIPE') {
                isPaymentGatewayConfigured = !!(tenantObj.stripePublishableKey && tenantObj.stripeSecretKey && tenantObj.stripePublishableKey.trim() && tenantObj.stripeSecretKey.trim());
            }
            tenantFormatted = {
                _id: tenantObj._id || tenantObj.id,
                id: String(tenantObj._id || tenantObj.id),
                companyName: tenantObj.companyName,
                sebiRegistration: tenantObj.sebiRegistration,
                address: tenantObj.address,
                email: tenantObj.companyEmail || tenantObj.email,
                mobile: tenantObj.mobile,
                agreementContent: tenantObj.agreementContent,
                activePaymentGateway: tenantObj.activePaymentGateway || 'RAZORPAY',
                razorpayKeyId: tenantObj.razorpayKeyId || null,
                ccavenueMerchantId: tenantObj.ccavenueMerchantId || null,
                kycFirst: tenantObj.kycFirst !== false,
                gstCalculationType: tenantObj.gstCalculationType || 'EXCLUSIVE',
                isPaymentGatewayConfigured,
                hasDigioConfigured: Boolean(tenantObj.digioClientId && tenantObj.digioClientSecret),
                digioEnvironment: tenantObj.digioEnvironment || (tenantObj.digioClientId?.startsWith('ACK') ? 'SANDBOX' : 'PRODUCTION'),
                digioClientId: tenantObj.digioClientId || null
            };
        }
        const formatted = {
            ...client,
            id: String(clientId),
            profile,
            subscriptions: subscriptions.map((s) => ({
                ...s,
                id: String(s._id || s.id),
                plan: s.planId ? {
                    ...s.planId,
                    id: String(s.planId._id || s.planId.id)
                } : null
            })),
            agreements,
            consents,
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
                tenant: tenantFormatted
            }
        };
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getClientProfile = getClientProfile;
const updateClientProfile = async (req, res) => {
    const { addressLine1, address, city, state, zipCode, mobile, dob, name } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const finalAddress = addressLine1 || address;
        const clientId = client._id || client.id;
        const profileUpdate = {};
        if (finalAddress !== undefined)
            profileUpdate.addressLine1 = finalAddress;
        if (city !== undefined)
            profileUpdate.city = city;
        if (state !== undefined)
            profileUpdate.state = state;
        if (zipCode !== undefined)
            profileUpdate.zipCode = zipCode;
        const profile = await db_1.default.ClientProfile.findOneAndUpdate({ clientId }, { $set: profileUpdate }, { upsert: true, returnDocument: 'after', lean: true });
        const clientUpdate = {};
        if (finalAddress !== undefined)
            clientUpdate.address = finalAddress;
        if (mobile && mobile !== client.mobile)
            clientUpdate.mobile = mobile;
        if (dob && dob !== client.dob)
            clientUpdate.dob = dob;
        if (name && name !== client.name && !client.kraVerified)
            clientUpdate.name = name;
        if (Object.keys(clientUpdate).length > 0) {
            await db_1.default.Client.findByIdAndUpdate(clientId, { $set: clientUpdate });
            if (clientUpdate.mobile) {
                await db_1.default.User.findByIdAndUpdate(req.user.id, { $set: { mobile: clientUpdate.mobile } });
            }
        }
        return res.status(200).json({ success: true, data: profile });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateClientProfile = updateClientProfile;
const deleteClientAccount = async (req, res) => {
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        await db_1.default.Client.findByIdAndUpdate(client._id || client.id, { $set: { status: 'DELETED' } });
        await db_1.default.User.findByIdAndUpdate(req.user.id, { $set: { status: 'DELETED' } });
        return res.status(200).json({ success: true, message: 'Account scheduled for deletion.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.deleteClientAccount = deleteClientAccount;
const uploadClientDocument = async (req, res) => {
    const { documentType } = req.body;
    if (!req.file)
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const doc = await db_1.default.ClientDocument.create({
            clientId: client._id || client.id,
            docType: documentType || 'OTHER',
            fileUrl: `/uploads/documents/${req.file.filename}`,
            fileName: req.file.originalname,
            status: 'VERIFIED'
        });
        return res.status(201).json({ success: true, data: doc });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.uploadClientDocument = uploadClientDocument;
const downloadInvoice = async (req, res) => {
    const paymentId = req.params.id || req.params.paymentId;
    try {
        if (!paymentId) {
            return res.status(400).json({ success: false, message: 'Payment ID is required' });
        }
        const pdfBuffer = await (0, invoiceGenerator_1.generateInvoicePdf)(paymentId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Invoice_${paymentId}.pdf"`);
        return res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Download Invoice Error:", error);
        return res.status(404).json({ success: false, message: error.message || 'Invoice record not found' });
    }
};
exports.downloadInvoice = downloadInvoice;
const initiateRazorpayPayment = async (req, res) => {
    const { planId, couponCode } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean() || await db_1.default.Client.findById(req.user.id).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantObj = await (0, exports.getResolvedTenant)(req.user?.tenantId, req.user?.id);
        const tenantId = tenantObj?._id || tenantObj?.id || req.user?.tenantId;
        if (!tenantObj || !tenantObj.razorpayKeyId || !tenantObj.razorpayKeySecret || !tenantObj.razorpayKeyId.trim() || !tenantObj.razorpayKeySecret.trim()) {
            return res.status(400).json({
                success: false,
                isConfigured: false,
                message: 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.'
            });
        }
        const kycRequired = tenantObj?.kycFirst !== false;
        const isClientKycDone = Boolean(client.kraVerified === true || client.status === 'VERIFIED' || client.status === 'APPROVED' || client.status === 'PAYMENT_PENDING' || client.status === 'ACTIVE');
        if (kycRequired && !isClientKycDone) {
            return res.status(403).json({
                success: false,
                requiresKyc: true,
                message: 'KYC Verification is required before purchasing a plan. Please complete your KYC verification first.'
            });
        }
        const plan = await db_1.default.Plan.findById(planId).lean();
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        let finalPrice = plan.amount || plan.price;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.Coupon.findOne({ code: couponCode, tenantId }).lean();
            if (coupon && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                    finalPrice = Math.max(0, finalPrice - coupon.discountValue);
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    let discount = (finalPrice * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
                        discount = coupon.maxDiscountValue;
                    }
                    finalPrice = Math.max(0, finalPrice - discount);
                }
                appliedCouponId = coupon._id || coupon.id;
            }
        }
        if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
            finalPrice = finalPrice * 1.18;
        }
        const amountInPaise = Math.round(finalPrice * 100);
        const receiptId = 'RCPT_' + Math.floor(10000 + Math.random() * 90000);
        const razorpay = new razorpay_1.default({
            key_id: tenantObj.razorpayKeyId,
            key_secret: tenantObj.razorpayKeySecret
        });
        const orderOptions = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: receiptId,
            notes: {
                clientId: String(client._id || client.id),
                planId: String(plan._id || plan.id),
                couponId: appliedCouponId ? String(appliedCouponId) : '',
                tenantId: String(tenantId)
            }
        };
        const order = await razorpay.orders.create(orderOptions);
        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: tenantObj.razorpayKeyId
        });
    }
    catch (error) {
        console.error('Razorpay Initiate Error:', error);
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.initiateRazorpayPayment = initiateRazorpayPayment;
const verifyRazorpayPayment = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId, couponCode } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean() || await db_1.default.Client.findById(req.user.id).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantObj = await (0, exports.getResolvedTenant)(req.user?.tenantId, req.user?.id);
        if (!tenantObj || !tenantObj.razorpayKeySecret) {
            return res.status(400).json({ success: false, message: 'Razorpay configuration error' });
        }
        const tenantId = tenantObj._id || tenantObj.id || req.user?.tenantId;
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto_1.default.createHmac('sha256', tenantObj.razorpayKeySecret).update(body.toString()).digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
        const plan = await db_1.default.Plan.findById(planId).lean();
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        let discountAmount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.Coupon.findOne({ code: couponCode, tenantId }).lean();
            if (coupon && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                    discountAmount = coupon.discountValue;
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    discountAmount = ((plan.amount || plan.price) * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
                        discountAmount = coupon.maxDiscountValue;
                    }
                }
                if (discountAmount > (plan.amount || plan.price))
                    discountAmount = (plan.amount || plan.price);
                appliedCouponId = coupon._id || coupon.id;
                await db_1.default.Coupon.findByIdAndUpdate(coupon._id || coupon.id, {
                    $inc: { usedCount: 1 }
                });
            }
        }
        let finalPrice = (plan.amount || plan.price) - discountAmount;
        let amountBase = finalPrice;
        let amountGst = 0;
        const isExclusive = tenantObj.gstCalculationType === 'EXCLUSIVE';
        if (isExclusive) {
            amountGst = finalPrice * 0.18;
            finalPrice = finalPrice * 1.18;
        }
        else {
            amountBase = finalPrice / 1.18;
            amountGst = finalPrice - amountBase;
        }
        const clientProfile = await db_1.default.ClientProfile.findOne({ clientId: client._id || client.id }).lean();
        await db_1.default.Payment.create({
            tenantId,
            clientId: client._id || client.id,
            planId: plan._id || plan.id,
            amount: finalPrice,
            couponId: appliedCouponId,
            discountApplied: discountAmount,
            paymentMode: 'ONLINE_RAZORPAY',
            transactionRef: razorpay_payment_id,
            status: 'SUCCESS',
            clientCity: clientProfile?.city || client.city || null,
            clientState: clientProfile?.state || client.state || null,
            tenantState: tenantObj?.state || null,
            paymentDate: new Date()
        });
        const existingSub = await db_1.default.Subscription.findOne({
            clientId: client._id || client.id,
            planId: plan._id || plan.id,
            status: 'ACTIVE',
            endDate: { $gt: new Date() }
        }).sort({ endDate: -1 }).lean();
        let startDate = new Date();
        if (existingSub)
            startDate = new Date(existingSub.endDate);
        const duration = plan.durationMonths || plan.duration || 1;
        const endDate = new Date(startDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000);
        const subscription = await db_1.default.Subscription.create({
            clientId: client._id || client.id,
            planId: plan._id || plan.id,
            startDate,
            endDate,
            status: 'ACTIVE',
            amountBase,
            amountGst,
            amountTotal: finalPrice,
            isGstInclusive: !isExclusive
        });
        await db_1.default.Client.findByIdAndUpdate(client._id || client.id, {
            $set: { status: 'ACTIVE' }
        });
        return res.status(200).json({ success: true, message: 'Payment verified successfully', subscription });
    }
    catch (error) {
        console.error('Razorpay Verify Error:', error);
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
const initiateCCAvenuePayment = async (req, res) => {
    const { planId, couponCode } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean() || await db_1.default.Client.findById(req.user.id).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantObj = await (0, exports.getResolvedTenant)(req.user?.tenantId, req.user?.id);
        const tenantId = tenantObj?._id || tenantObj?.id || req.user?.tenantId;
        if (!tenantObj || !tenantObj.ccavenueMerchantId || !tenantObj.ccavenueAccessCode || !tenantObj.ccavenueWorkingKey || !tenantObj.ccavenueMerchantId.trim() || !tenantObj.ccavenueWorkingKey.trim()) {
            return res.status(400).json({
                success: false,
                isConfigured: false,
                message: 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.'
            });
        }
        const kycRequired = tenantObj?.kycFirst !== false;
        const isClientKycDone = Boolean(client.kraVerified === true || client.status === 'VERIFIED' || client.status === 'APPROVED' || client.status === 'PAYMENT_PENDING' || client.status === 'ACTIVE');
        if (kycRequired && !isClientKycDone) {
            return res.status(403).json({
                success: false,
                requiresKyc: true,
                message: 'KYC Verification is required before purchasing a plan. Please complete your KYC verification first.'
            });
        }
        const plan = await db_1.default.Plan.findById(planId).lean();
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        let finalPrice = plan.amount || plan.price;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.Coupon.findOne({ code: couponCode, tenantId }).lean();
            if (coupon && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                    finalPrice = Math.max(0, finalPrice - coupon.discountValue);
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    let discount = (finalPrice * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
                        discount = coupon.maxDiscountValue;
                    }
                    finalPrice = Math.max(0, finalPrice - discount);
                }
                appliedCouponId = coupon._id || coupon.id;
            }
        }
        if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
            finalPrice = finalPrice * 1.18;
        }
        const orderId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
        const amount = finalPrice.toFixed(2);
        const origin = req.headers.origin || 'http://localhost:3000';
        const redirectUrl = `${req.protocol}://${req.get('host')}/api/v1/payment/ccavenue/response?tenantId=${tenantObj._id || tenantObj.id || tenantId}`;
        const cancelUrl = `${origin}/client`;
        let merchantData = `merchant_id=${tenantObj.ccavenueMerchantId}&order_id=${orderId}&currency=INR&amount=${amount}&redirect_url=${redirectUrl}&cancel_url=${cancelUrl}&language=EN`;
        merchantData += `&billing_name=${encodeURIComponent(client.name)}&billing_email=${encodeURIComponent(client.email)}&billing_tel=${encodeURIComponent(client.pan)}`;
        merchantData += `&merchant_param1=${client._id || client.id}&merchant_param2=${plan._id || plan.id}&merchant_param3=${appliedCouponId || ''}&merchant_param4=${origin}`;
        const encRequest = (0, ccavenue_1.encryptCCAvenue)(merchantData, tenantObj.ccavenueWorkingKey);
        return res.status(200).json({
            success: true,
            encRequest,
            accessCode: tenantObj.ccavenueAccessCode,
            url: 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.initiateCCAvenuePayment = initiateCCAvenuePayment;
const handleCCAvenueResponse = async (req, res) => {
    const { encResp } = req.body;
    const tenantId = req.query.tenantId;
    if (!encResp || !tenantId)
        return res.status(400).send('Invalid response');
    try {
        const tenantObj = await (0, exports.getResolvedTenant)(tenantId);
        if (!tenantObj || !tenantObj.ccavenueWorkingKey)
            return res.status(400).send('Tenant configuration error');
        const decryptedStr = (0, ccavenue_1.decryptCCAvenue)(encResp, tenantObj.ccavenueWorkingKey);
        const parsedData = querystring_1.default.parse(decryptedStr);
        const status = parsedData.order_status;
        const clientId = parsedData.merchant_param1;
        const planId = parsedData.merchant_param2;
        const appliedCouponId = parsedData.merchant_param3;
        const origin = parsedData.merchant_param4 || 'http://localhost:3000';
        if (status === 'Success') {
            const client = await db_1.default.Client.findById(clientId).lean();
            const plan = await db_1.default.Plan.findById(planId).lean();
            if (client && plan) {
                const clientProfile = await db_1.default.ClientProfile.findOne({ clientId }).lean();
                await db_1.default.Payment.create({
                    tenantId: tenantObj._id || tenantObj.id || tenantId,
                    clientId,
                    planId,
                    amount: parseFloat(parsedData.amount) || 0,
                    couponId: appliedCouponId || null,
                    paymentMode: 'ONLINE_CCAVENUE',
                    transactionRef: parsedData.tracking_id || parsedData.order_id,
                    status: 'SUCCESS',
                    clientCity: clientProfile?.city || client.city || null,
                    clientState: clientProfile?.state || client.state || null,
                    tenantState: tenantObj?.state || null,
                    paymentDate: new Date()
                });
                const existingSub = await db_1.default.Subscription.findOne({
                    clientId,
                    planId,
                    status: 'ACTIVE',
                    endDate: { $gt: new Date() }
                }).sort({ endDate: -1 }).lean();
                let startDate = new Date();
                if (existingSub)
                    startDate = new Date(existingSub.endDate);
                const duration = plan.durationMonths || plan.duration || 1;
                const endDate = new Date(startDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000);
                await db_1.default.Subscription.create({
                    clientId,
                    planId,
                    startDate,
                    endDate,
                    status: 'ACTIVE',
                    amountTotal: parseFloat(parsedData.amount) || 0
                });
                await db_1.default.Client.findByIdAndUpdate(clientId, {
                    $set: { status: 'ACTIVE' }
                });
                if (appliedCouponId) {
                    await db_1.default.Coupon.findByIdAndUpdate(appliedCouponId, {
                        $inc: { usedCount: 1 }
                    });
                }
            }
            return res.redirect(`${origin}/client?payment=success`);
        }
        else {
            return res.redirect(`${origin}/client?payment=failed`);
        }
    }
    catch (error) {
        console.error('CCAvenue Response Error', error);
        return res.status(500).send('Internal Server Error');
    }
};
exports.handleCCAvenueResponse = handleCCAvenueResponse;
const getPaymentGatewayStatus = async (req, res) => {
    try {
        const tenantObj = await (0, exports.getResolvedTenant)(req.user?.tenantId, req.user?.id);
        if (!tenantObj) {
            return res.status(200).json({
                success: true,
                isConfigured: false,
                activeGateway: 'RAZORPAY',
                message: 'Administrator has not configured a payment gateway. Please contact admin to buy this plan.',
                adminContact: {
                    companyName: 'Advisory Administration',
                    email: null,
                    mobile: null,
                    sebiRegistration: null,
                    address: null,
                    website: null,
                    bankDetails: null
                }
            });
        }
        const activeGateway = (tenantObj.activePaymentGateway || 'RAZORPAY').toUpperCase();
        let isConfigured = false;
        if (activeGateway === 'RAZORPAY') {
            isConfigured = !!(tenantObj.razorpayKeyId && tenantObj.razorpayKeySecret && tenantObj.razorpayKeyId.trim() && tenantObj.razorpayKeySecret.trim());
        }
        else if (activeGateway === 'CCAVENUE') {
            isConfigured = !!(tenantObj.ccavenueMerchantId && tenantObj.ccavenueAccessCode && tenantObj.ccavenueWorkingKey && tenantObj.ccavenueMerchantId.trim() && tenantObj.ccavenueWorkingKey.trim());
        }
        else if (activeGateway === 'CASHFREE') {
            isConfigured = !!(tenantObj.cashfreeAppId && tenantObj.cashfreeSecretKey && tenantObj.cashfreeAppId.trim() && tenantObj.cashfreeSecretKey.trim());
        }
        else if (activeGateway === 'STRIPE') {
            isConfigured = !!(tenantObj.stripePublishableKey && tenantObj.stripeSecretKey && tenantObj.stripePublishableKey.trim() && tenantObj.stripeSecretKey.trim());
        }
        else {
            isConfigured = false;
        }
        const adminContact = {
            companyName: tenantObj.companyName || 'Advisory Team',
            email: tenantObj.companyEmail || tenantObj.email || null,
            mobile: tenantObj.mobile || null,
            sebiRegistration: tenantObj.sebiRegistration || null,
            address: tenantObj.address || null,
            website: tenantObj.website || null,
            bankDetails: (tenantObj.bankAccountNo && tenantObj.bankIfsc) ? {
                bankAccountName: tenantObj.bankAccountName || tenantObj.companyName,
                bankAccountNo: tenantObj.bankAccountNo,
                bankAccountType: tenantObj.bankAccountType || 'Current',
                bankIfsc: tenantObj.bankIfsc,
                bankName: tenantObj.bankName,
                bankBranch: tenantObj.bankBranch
            } : null
        };
        const isGatewayEnabled = Boolean(tenantObj.paymentGatewayEnabled !== false && isConfigured);
        const isUpiQrEnabled = Boolean(tenantObj.upiQrEnabled && (tenantObj.upiId || tenantObj.upiQrImageUrl));
        const upiQr = {
            enabled: isUpiQrEnabled,
            upiId: tenantObj.upiId || null,
            payeeName: tenantObj.upiPayeeName || tenantObj.companyName || null,
            qrImageUrl: tenantObj.upiQrImageUrl || null,
            instructions: tenantObj.upiInstructions || null
        };
        return res.status(200).json({
            success: true,
            isConfigured: isGatewayEnabled,
            activeGateway,
            paymentGatewayEnabled: tenantObj.paymentGatewayEnabled !== false,
            gateway: {
                enabled: isGatewayEnabled,
                activeGateway,
                isConfigured
            },
            upiQr,
            adminContact,
            message: isGatewayEnabled
                ? `Payment gateway (${activeGateway}) is ready.`
                : (isUpiQrEnabled
                    ? 'Payment gateway is disabled. Please pay using QR / UPI.'
                    : `Payment methods are currently offline. Please contact administrator to purchase this plan.`)
        });
    }
    catch (error) {
        console.error('Payment gateway status error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPaymentGatewayStatus = getPaymentGatewayStatus;
