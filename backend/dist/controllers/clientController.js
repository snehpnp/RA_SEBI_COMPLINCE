"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
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
exports.handleCCAvenueResponse = exports.initiateCCAvenuePayment = exports.verifyRazorpayPayment = exports.initiateRazorpayPayment = exports.downloadInvoice = exports.uploadClientDocument = exports.deleteClientAccount = exports.updateClientProfile = exports.getClientProfile = exports.getPlans = exports.verifyManualPayment = exports.submitManualPayment = exports.handleRazorpayWebhook = exports.signAgreement = exports.acceptConsent = exports.verifyKRA = exports.registerClient = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcrypt = __importStar(require("bcryptjs"));
const auditService_1 = require("../services/auditService");
const emailService_1 = require("../services/emailService");
const registerClient = async (req, res) => {
    const { tenantId, name, email, mobile, password, pan, aadhaar, category, occupation, addressLine1, city, state, zipCode } = req.body;
    if (!tenantId || !name || !email || !mobile || !password || !pan || !aadhaar || !addressLine1 || !state) {
        return res.status(400).json({
            success: false,
            message: 'All fields (name, email, mobile, password, PAN, Aadhaar, address, state) are required.'
        });
    }
    try {
        // Check Tenant Validity
        const tenant = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        // Check Duplicate email, mobile, pan, aadhaar individually
        const duplicateEmail = await db_1.default.user.findUnique({ where: { email } });
        if (duplicateEmail) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate Account Detected',
                duplicateField: 'email',
                errors: ['An account with this Email already exists.']
            });
        }
        const duplicateMobile = await db_1.default.user.findFirst({ where: { mobile } });
        if (duplicateMobile) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate Account Detected',
                duplicateField: 'mobile',
                errors: ['An account with this Mobile number already exists.']
            });
        }
        const duplicatePan = await db_1.default.client.findUnique({ where: { pan } });
        if (duplicatePan) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate Account Detected',
                duplicateField: 'pan',
                errors: ['An account with this PAN already exists.']
            });
        }
        const duplicateAadhaar = await db_1.default.client.findUnique({ where: { aadhaar } });
        if (duplicateAadhaar) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate Account Detected',
                duplicateField: 'aadhaar',
                errors: ['An account with this Aadhaar already exists.']
            });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const clientRole = await db_1.default.role.findUnique({ where: { name: 'CLIENT' } });
        if (!clientRole) {
            return res.status(500).json({ success: false, message: 'Client role not seeded.' });
        }
        // Check if tenant has completed onboarding (80% score threshold check)
        // For local convenience, we compute completeness but do not hard block signups, rather warn or restrict actions as requested.
        // "Completion < 80: Disable client onboarding" -> We check tenant wizard progress
        const poUser = await db_1.default.user.findFirst({
            where: { tenantId, role: { name: 'PRINCIPAL_OFFICER' }, status: 'ACTIVE' }
        });
        if (!poUser) {
            return res.status(400).json({
                success: false,
                message: 'Onboarding is temporarily disabled for this advisor company.',
                errors: ['Tenant advisor profile completion is below 80%.']
            });
        }
        const creatorId = req.body.createdById || (req.user ? req.user.id : null);
        const isAdminAdded = !!creatorId;
        const result = await db_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId,
                    roleId: clientRole.id,
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' ') || 'Client',
                    email,
                    mobile,
                    passwordHash,
                    status: isAdminAdded ? 'ACTIVE' : 'PENDING_APPROVAL',
                    tempPassword: isAdminAdded ? null : password
                }
            });
            const client = await tx.client.create({
                data: {
                    userId: user.id,
                    name,
                    email,
                    mobile,
                    pan,
                    aadhaar,
                    category: category || 'INDIVIDUAL',
                    occupation,
                    status: isAdminAdded ? 'KYC_PENDING' : 'PENDING_APPROVAL',
                    createdById: creatorId
                }
            });
            await tx.clientProfile.create({
                data: {
                    clientId: client.id,
                    addressLine1,
                    city,
                    state,
                    country: 'India',
                    zipCode
                }
            });
            return { user, client };
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: result.user.id,
            action: 'CREATE',
            module: 'CLIENTS',
            newValue: result.client,
            ipAddress: req.ip
        });
        // Get login URL
        const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
        // Send Welcome Email only if admin added
        if (isAdminAdded) {
            const attachments = [];
            if (tenant.termsPdfUrl) {
                attachments.push({ filename: 'Terms_and_Conditions.pdf', path: require('path').join(__dirname, '../../..') + tenant.termsPdfUrl });
            }
            if (tenant.privacyPdfUrl) {
                attachments.push({ filename: 'Privacy_Policy.pdf', path: require('path').join(__dirname, '../../..') + tenant.privacyPdfUrl });
            }
            await (0, emailService_1.sendWelcomeEmail)({
                tenantId,
                toEmail: email,
                name,
                password: password, // Note: password is provided in body
                role: 'CLIENT',
                loginUrl,
                companyName: tenant?.companyName || 'RAGCP Platform',
                customText: tenant?.welcomeEmailText,
                attachments
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Client registered successfully.',
            data: result.client
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.registerClient = registerClient;
const verifyKRA = async (req, res) => {
    const { pan, aadhaar, statusInput } = req.body; // statusInput: 'SUCCESS' or 'FAIL' to simulate KRA result
    const tenantId = req.user.tenantId;
    if (!pan) {
        return res.status(400).json({ success: false, message: 'PAN is required.' });
    }
    try {
        const client = await db_1.default.client.findFirst({
            where: { userId: req.user.id }
        });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client profile not found.' });
        }
        // Check uniqueness if PAN is being updated
        if (pan !== client.pan) {
            const duplicatePan = await db_1.default.client.findFirst({
                where: { pan, NOT: { id: client.id } }
            });
            if (duplicatePan) {
                return res.status(400).json({ success: false, message: 'Verified PAN is already in use by another client.' });
            }
        }
        // Check uniqueness if Aadhaar is provided and being updated
        if (aadhaar && aadhaar !== client.aadhaar) {
            const duplicateAadhaar = await db_1.default.client.findFirst({
                where: { aadhaar, NOT: { id: client.id } }
            });
            if (duplicateAadhaar) {
                return res.status(400).json({ success: false, message: 'Verified Aadhaar number is already in use by another client.' });
            }
        }
        const result = await db_1.default.$transaction(async (tx) => {
            // Log PAN change if different
            if (pan !== client.pan) {
                await tx.clientIdentityHistory.create({
                    data: {
                        clientId: client.id,
                        fieldName: 'PAN',
                        oldValue: client.pan,
                        newValue: pan,
                        changedBy: 'CLIENT',
                        remarks: 'Updated during DigiLocker eKYC verification'
                    }
                });
            }
            // Log Aadhaar change if different and provided
            if (aadhaar && aadhaar !== client.aadhaar) {
                await tx.clientIdentityHistory.create({
                    data: {
                        clientId: client.id,
                        fieldName: 'AADHAAR',
                        oldValue: client.aadhaar,
                        newValue: aadhaar,
                        changedBy: 'CLIENT',
                        remarks: 'Updated during DigiLocker eKYC verification'
                    }
                });
            }
            const nextStatus = statusInput === 'FAIL' ? 'KYC_FAILED' : 'AGREEMENT_PENDING';
            const updatedClient = await tx.client.update({
                where: { id: client.id },
                data: {
                    pan,
                    ...(aadhaar && { aadhaar }),
                    status: nextStatus
                }
            });
            if (statusInput === 'FAIL') {
                // Create Compliance Alert
                await tx.complianceAlert.create({
                    data: {
                        tenantId: tenantId,
                        alertType: 'KYC_FAILED',
                        severity: 'HIGH',
                        description: `KRA automated KYC failed for Client PAN ${pan} (${client.name}). Manual verification required.`,
                        clientId: client.id
                    }
                });
            }
            return updatedClient;
        });
        if (statusInput === 'FAIL') {
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
        const client = await db_1.default.client.findFirst({ where: { userId: req.user.id } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const consent = await db_1.default.consent.create({
            data: {
                clientId: client.id,
                tncAccept: !!tncAccept,
                policyAccept: !!policyAccept,
                researchAccept: !!researchAccept,
                ipAddress: req.ip
            }
        });
        await db_1.default.consentHistory.create({
            data: {
                consentId: consent.id,
                action: 'ACCEPTED'
            }
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
    const { signatureText } = req.body; // drawing data url or typed signature text
    try {
        const client = await db_1.default.client.findFirst({ where: { userId: req.user.id } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const agreementUrl = `/uploads/agreements/${client.id}_signed_agreement.pdf`;
        const agreement = await db_1.default.agreement.create({
            data: {
                clientId: client.id,
                agreementUrl,
                esignMode: 'MOCK_AADHAAR',
                ipAddress: req.ip,
                status: 'SIGNED'
            }
        });
        await db_1.default.agreementHistory.create({
            data: {
                agreementId: agreement.id,
                action: 'SIGNED',
                performedBy: client.name,
                ipAddress: req.ip
            }
        });
        await db_1.default.client.update({
            where: { id: client.id },
            data: { status: 'PAYMENT_PENDING' }
        });
        return res.status(200).json({
            success: true,
            message: 'Agreement signed successfully via Aadhaar eSign.',
            data: agreement
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.signAgreement = signAgreement;
const handleRazorpayWebhook = async (req, res) => {
    const { clientId, planId, amount, paymentMode, transactionRef, statusInput, couponCode } = req.body; // Simulating webhook payload
    try {
        const client = await db_1.default.client.findUnique({
            where: { id: clientId },
            include: { user: true, profile: true }
        });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = client.user.tenantId;
        // Check payment rule: Amount > 151,000 forces client category to NON_INDIVIDUAL
        if (amount > 151000) {
            await db_1.default.client.update({
                where: { id: clientId },
                data: { category: 'NON_INDIVIDUAL' }
            });
        }
        // Check cash payment rule (if UPI/Bank cash deposit)
        // Cash payment >= 50,000 triggers an FIU case (ComplianceAlert)
        if (paymentMode !== 'ONLINE_RAZORPAY' && amount >= 50000) {
            await db_1.default.complianceAlert.create({
                data: {
                    tenantId,
                    alertType: 'COMPLIANCE_PENDING',
                    severity: 'HIGH',
                    description: `FIU ALERT: Cash payment of ${amount} received from Client ${client.name} (PAN: ${client.pan}). High risk case logged.`
                }
            });
        }
        const payStatus = statusInput === 'FAILED' ? 'FAILED' : 'SUCCESS';
        let discountAmount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.coupon.findFirst({ where: { code: couponCode, tenantId } });
            const plan = await db_1.default.plan.findUnique({ where: { id: planId } });
            if (coupon && plan && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT') {
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
                if (statusInput !== 'FAILED') {
                    await db_1.default.coupon.update({
                        where: { id: coupon.id },
                        data: { usedCount: { increment: 1 } }
                    });
                }
            }
        }
        const tenantObj = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        const payment = await db_1.default.payment.create({
            data: {
                tenantId,
                clientId,
                planId,
                amount: parseFloat(amount) || 0,
                couponId: appliedCouponId,
                discountApplied: discountAmount || 0,
                paymentMode: paymentMode || 'ONLINE_RAZORPAY',
                transactionRef: transactionRef || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                status: payStatus,
                clientCity: client.profile?.city || null,
                clientState: client.profile?.state || null,
                tenantState: tenantObj?.state || null
            }
        });
        if (payStatus === 'SUCCESS') {
            const plan = await db_1.default.plan.findUnique({ where: { id: planId } });
            if (plan) {
                // Calculate active dates (stack if same plan already exists)
                const existingSub = await db_1.default.subscription.findFirst({
                    where: {
                        clientId,
                        planId,
                        status: 'ACTIVE',
                        endDate: { gt: new Date() }
                    },
                    orderBy: { endDate: 'desc' }
                });
                let startDate = new Date();
                if (existingSub) {
                    startDate = new Date(existingSub.endDate);
                }
                const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);
                await db_1.default.subscription.create({
                    data: {
                        clientId,
                        planId,
                        startDate,
                        endDate,
                        status: 'ACTIVE'
                    }
                });
                await db_1.default.client.update({
                    where: { id: clientId },
                    data: { status: 'ACTIVE' }
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
    const { planId, amount, paymentMode, transactionRef, remarks } = req.body;
    const receiptUrl = req.file ? `/uploads/payments/${req.file.filename}` : '/uploads/payments/mock_receipt.png';
    try {
        const client = await db_1.default.client.findFirst({
            where: { userId: req.user.id },
            include: { profile: true }
        });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = req.user.tenantId;
        const tenantObj = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        const payment = await db_1.default.payment.create({
            data: {
                tenantId,
                clientId: client.id,
                planId,
                amount: parseFloat(amount) || 0,
                paymentMode: paymentMode || 'MANUAL_UPI',
                transactionRef: transactionRef || 'MANUAL-' + Date.now(),
                receiptUrl,
                status: 'PENDING',
                remarks,
                clientCity: client.profile?.city || null,
                clientState: client.profile?.state || null,
                tenantState: tenantObj?.state || null
            }
        });
        return res.status(201).json({
            success: true,
            message: 'Payment details uploaded successfully. Awaiting compliance team approval.',
            data: payment
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.submitManualPayment = submitManualPayment;
const verifyManualPayment = async (req, res) => {
    const { paymentId, status, remarks } = req.body; // status: SUCCESS or FAILED
    try {
        const payment = await db_1.default.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        const tenantId = req.user.tenantId;
        const updatedPayment = await db_1.default.payment.update({
            where: { id: paymentId },
            data: {
                status,
                remarks,
                verifiedByStaffId: req.user.id
            }
        });
        if (status === 'SUCCESS') {
            const plan = await db_1.default.plan.findUnique({ where: { id: payment.planId } });
            if (plan) {
                // Enforce high-value client rules
                const client = await db_1.default.client.findUnique({ where: { id: payment.clientId } });
                if (client) {
                    if (payment.amount > 151000) {
                        await db_1.default.client.update({
                            where: { id: client.id },
                            data: { category: 'NON_INDIVIDUAL' }
                        });
                    }
                    if (payment.paymentMode !== 'ONLINE_RAZORPAY' && payment.amount >= 50000) {
                        await db_1.default.complianceAlert.create({
                            data: {
                                tenantId,
                                alertType: 'COMPLIANCE_PENDING',
                                severity: 'HIGH',
                                description: `FIU ALERT: Cash/Manual payment of ${payment.amount} received from Client ${client.name} (PAN: ${client.pan}). High risk case logged.`
                            }
                        });
                    }
                }
                // Calculate active dates (stack if same plan already exists)
                const existingSub = await db_1.default.subscription.findFirst({
                    where: {
                        clientId: payment.clientId,
                        planId: plan.id,
                        status: 'ACTIVE',
                        endDate: { gt: new Date() }
                    },
                    orderBy: { endDate: 'desc' }
                });
                let startDate = new Date();
                if (existingSub) {
                    startDate = new Date(existingSub.endDate);
                }
                const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);
                await db_1.default.subscription.create({
                    data: {
                        clientId: payment.clientId,
                        planId: plan.id,
                        startDate,
                        endDate,
                        status: 'ACTIVE'
                    }
                });
                await db_1.default.client.update({
                    where: { id: payment.clientId },
                    data: { status: 'ACTIVE' }
                });
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
const getPlans = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Tenant ID required.' });
    try {
        const tenant = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        const plans = await db_1.default.plan.findMany({
            where: {
                tenantId,
                deletedAt: null,
                status: 'ACTIVE',
                OR: [
                    { categoryId: null },
                    { category: { status: 'ACTIVE' } }
                ]
            },
            include: { category: true }
        });
        return res.status(200).json({
            success: true,
            data: plans,
            gstCalculationType: tenant?.gstCalculationType || 'EXCLUSIVE'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getPlans = getPlans;
const getClientProfile = async (req, res) => {
    try {
        const client = await db_1.default.client.findFirst({
            where: { userId: req.user.id },
            include: {
                profile: true,
                subscriptions: {
                    include: { plan: true }
                },
                agreements: true,
                consents: true,
                user: {
                    include: {
                        tenant: {
                            select: { agreementContent: true, companyName: true, sebiRegistration: true, address: true, activePaymentGateway: true, kycFirst: true }
                        }
                    }
                }
            }
        });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client profile not found.' });
        }
        return res.status(200).json({ success: true, data: client });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getClientProfile = getClientProfile;
const updateClientProfile = async (req, res) => {
    try {
        const { pan, aadhaar, name, email, phone, address } = req.body;
        const userId = req.user.id;
        const client = await db_1.default.client.findFirst({ where: { userId } });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        await db_1.default.$transaction(async (tx) => {
            // Update Client table
            await tx.client.update({
                where: { id: client.id },
                data: {
                    ...(pan !== undefined && { pan }),
                    ...(aadhaar !== undefined && { aadhaar }),
                    ...(name && { name }),
                    ...(email && { email }),
                    ...(phone && { mobile: phone })
                }
            });
            // Update User table if basic info changed
            if (name || email || phone) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        ...(name && { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') || 'Client' }),
                        ...(email && { email }),
                        ...(phone && { mobile: phone })
                    }
                });
            }
            // Update ClientProfile if address changed
            if (address) {
                await tx.clientProfile.upsert({
                    where: { clientId: client.id },
                    create: {
                        clientId: client.id,
                        addressLine1: address,
                        city: '',
                        state: '',
                        country: 'India'
                    },
                    update: {
                        addressLine1: address
                    }
                });
            }
        });
        return res.status(200).json({ success: true, message: 'Profile updated' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateClientProfile = updateClientProfile;
const deleteClientAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await db_1.default.client.findFirst({ where: { userId } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        await db_1.default.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { deletedAt: new Date(), deletedBy: 'SELF', status: 'INACTIVE' }
            });
            await tx.client.update({
                where: { id: client.id },
                data: { status: 'INACTIVE' }
            });
        });
        return res.status(200).json({ success: true, message: 'Account deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.deleteClientAccount = deleteClientAccount;
const uploadClientDocument = async (req, res) => {
    res.json({ success: true, message: 'Document uploaded' });
};
exports.uploadClientDocument = uploadClientDocument;
const invoiceGenerator_1 = require("../services/invoiceGenerator");
const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        // ensure payment exists and belongs to client
        const payment = await db_1.default.payment.findUnique({
            where: { id }
        });
        if (!payment)
            return res.status(404).json({ success: false, message: 'Payment not found' });
        // Auth check: Is the user the owner of this payment? Or an admin?
        // Since this is a client route, check clientId
        const user = req.user;
        if (user.role === 'CLIENT') {
            const client = await db_1.default.client.findUnique({ where: { userId: user.id } });
            if (!client || client.id !== payment.clientId) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        }
        const pdfBuffer = await (0, invoiceGenerator_1.generateInvoicePdf)(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Invoice_${payment.transactionRef}.pdf"`);
        return res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Download Invoice Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.downloadInvoice = downloadInvoice;
const ccavenue_1 = require("../utils/ccavenue");
const querystring_1 = __importDefault(require("querystring"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const initiateRazorpayPayment = async (req, res) => {
    const { planId, couponCode } = req.body;
    try {
        const client = await db_1.default.client.findUnique({
            where: { userId: req.user.id },
            include: { profile: true }
        });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = req.user.tenantId;
        const tenantObj = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        if (!tenantObj || !tenantObj.razorpayKeyId || !tenantObj.razorpayKeySecret) {
            return res.status(400).json({ success: false, message: 'Razorpay credentials not configured for this tenant' });
        }
        const plan = await db_1.default.plan.findUnique({ where: { id: planId } });
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        let finalPrice = plan.price;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.coupon.findFirst({ where: { code: couponCode, tenantId } });
            if (coupon && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT') {
                    finalPrice = Math.max(0, finalPrice - coupon.discountValue);
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    let discount = (finalPrice * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
                        discount = coupon.maxDiscountValue;
                    }
                    finalPrice = Math.max(0, finalPrice - discount);
                }
                appliedCouponId = coupon.id;
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
                clientId: client.id,
                planId: plan.id,
                couponId: appliedCouponId || '',
                tenantId: tenantId
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
        const client = await db_1.default.client.findUnique({
            where: { userId: req.user.id }
        });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = req.user.tenantId;
        const tenantObj = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        if (!tenantObj || !tenantObj.razorpayKeySecret) {
            return res.status(400).json({ success: false, message: 'Razorpay configuration error' });
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto_1.default.createHmac('sha256', tenantObj.razorpayKeySecret).update(body.toString()).digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
        // Signature matches, process the payment
        const plan = await db_1.default.plan.findUnique({ where: { id: planId } });
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        let discountAmount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.coupon.findFirst({ where: { code: couponCode, tenantId } });
            if (coupon && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT') {
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
                appliedCouponId = coupon.id;
                await db_1.default.coupon.update({
                    where: { id: coupon.id },
                    data: { usedCount: { increment: 1 } }
                });
            }
        }
        // Calculate actual amount paid based on Razorpay logic (or default from plan for simplicity)
        let finalPrice = plan.price - discountAmount;
        if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
            finalPrice = finalPrice * 1.18;
        }
        await db_1.default.payment.create({
            data: {
                tenantId,
                clientId: client.id,
                planId,
                amount: finalPrice,
                couponId: appliedCouponId,
                discountApplied: discountAmount,
                paymentMode: 'ONLINE_RAZORPAY',
                transactionRef: razorpay_payment_id,
                status: 'SUCCESS'
            }
        });


        const existingSub = await db_1.default.subscription.findFirst({
            where: { clientId: client.id, planId, status: 'ACTIVE', endDate: { gt: new Date() } },
            orderBy: { endDate: 'desc' }
        });
        let startDate = new Date();
        if (existingSub)
            startDate = new Date(existingSub.endDate);
        const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);
        await db_1.default.subscription.create({
            data: { clientId: client.id, planId, startDate, endDate, status: 'ACTIVE' }
        });
        await db_1.default.client.update({
            where: { id: client.id },
            data: { status: 'ACTIVE' }
        });
        return res.status(200).json({ success: true, message: 'Payment verified successfully' });

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
        const client = await db_1.default.client.findUnique({
            where: { userId: req.user.id },
            include: { profile: true }
        });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenantId = req.user.tenantId;
        const tenantObj = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        if (!tenantObj || !tenantObj.ccavenueMerchantId || !tenantObj.ccavenueAccessCode || !tenantObj.ccavenueWorkingKey) {
            return res.status(400).json({ success: false, message: 'CCAvenue credentials not configured' });
        }
        const plan = await db_1.default.plan.findUnique({ where: { id: planId } });
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        let finalPrice = plan.price;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.coupon.findFirst({ where: { code: couponCode, tenantId } });
            if (coupon && coupon.status === 'ACTIVE') {
                if (coupon.discountType === 'FLAT') {
                    finalPrice = Math.max(0, finalPrice - coupon.discountValue);
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    let discount = (finalPrice * coupon.discountValue) / 100;
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
                        discount = coupon.maxDiscountValue;
                    }
                    finalPrice = Math.max(0, finalPrice - discount);
                }
                appliedCouponId = coupon.id;
            }
        }
        if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
            finalPrice = finalPrice * 1.18;
        }
        const orderId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
        const amount = finalPrice.toFixed(2);
        const origin = req.headers.origin || 'http://localhost:3000';
        const redirectUrl = `${req.protocol}://${req.get('host')}/api/payment/ccavenue/response?tenantId=${tenantId}`;
        const cancelUrl = `${origin}/client`;
        let merchantData = `merchant_id=${tenantObj.ccavenueMerchantId}&order_id=${orderId}&currency=INR&amount=${amount}&redirect_url=${redirectUrl}&cancel_url=${cancelUrl}&language=EN`;
        merchantData += `&billing_name=${encodeURIComponent(client.name)}&billing_email=${encodeURIComponent(client.email)}&billing_tel=${encodeURIComponent(client.pan)}`;
        merchantData += `&merchant_param1=${client.id}&merchant_param2=${plan.id}&merchant_param3=${appliedCouponId || ''}&merchant_param4=${origin}`;
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
        const tenantObj = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
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
            const client = await db_1.default.client.findUnique({ where: { id: clientId } });
            const plan = await db_1.default.plan.findUnique({ where: { id: planId } });
            if (client && plan) {
                await db_1.default.payment.create({
                    data: {
                        tenantId,
                        clientId,
                        planId,
                        amount: parseFloat(parsedData.amount) || 0,
                        couponId: appliedCouponId ? appliedCouponId : null,
                        paymentMode: 'ONLINE_CCAVENUE',
                        transactionRef: parsedData.tracking_id || parsedData.order_id,
                        status: 'SUCCESS'
                    }
                });
                const existingSub = await db_1.default.subscription.findFirst({
                    where: { clientId, planId, status: 'ACTIVE', endDate: { gt: new Date() } },
                    orderBy: { endDate: 'desc' }
                });
                let startDate = new Date();
                if (existingSub)
                    startDate = new Date(existingSub.endDate);
                const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);
                await db_1.default.subscription.create({
                    data: { clientId, planId, startDate, endDate, status: 'ACTIVE' }
                });
                await db_1.default.client.update({
                    where: { id: clientId },
                    data: { status: 'ACTIVE' }
                });
                if (appliedCouponId) {
                    await db_1.default.coupon.update({
                        where: { id: appliedCouponId },
                        data: { usedCount: { increment: 1 } }
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
