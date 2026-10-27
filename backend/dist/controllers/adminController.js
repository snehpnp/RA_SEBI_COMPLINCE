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
exports.exportResearchReportsZip = exports.exportGstReadySheetCSV = exports.getClientFeeSummaryEndpoint = exports.exportPaymentsCSV = exports.exportDeletedClientsCSV = exports.exportClientsCSV = exports.exportKRAZip = exports.exportAgreementsZip = exports.exportInvoicesZip = exports.uploadSignature = exports.resetEmailTemplate = exports.updateEmailTemplate = exports.getEmailTemplates = exports.assignPlanByAdmin = exports.getTenantAuditLogs = exports.getAdminPayments = exports.verifyPaymentGateway = exports.testSmtp = exports.updateTenantSettings = exports.togglePlanStatus = exports.restorePlan = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getAdminPlans = exports.toggleCategoryStatus = exports.updateCategory = exports.createCategory = exports.getAdminCategories = exports.restoreClient = exports.deleteClient = exports.approveClient = exports.updateClient = exports.toggleClientStatus = exports.getAdminDeletedClients = exports.getAdminClients = exports.updateResearcherDscPermission = exports.getResearcherDscPermissions = exports.resendStaffCredentials = exports.getStaffPassword = exports.restoreStaff = exports.deleteStaff = exports.toggleStaffStatus = exports.updateStaff = exports.getStaff = exports.createStaff = exports.saveProfileStep = exports.getProfileCompleteness = exports.calculateCompleteness = exports.getDashboardStats = void 0;
exports.goLiveTenant = exports.permanentDeleteClient = exports.markAdminNotificationsAsRead = exports.getAdminNotifications = exports.sendPaymentInvoiceEmail = exports.testCamsKraConfig = exports.testDigioConfig = exports.testSmsGateway = exports.deleteSmsTemplate = exports.toggleSmsTemplateStatus = exports.updateSmsTemplate = exports.createSmsTemplate = exports.getSmsTemplates = exports.resetClientKyc = exports.previewPolicyPdf = exports.getClientCommunications = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importStar(require("../config/db"));
const bcrypt = __importStar(require("bcryptjs"));
const auditService_1 = require("../services/auditService");
const emailService_1 = require("../services/emailService");
const complianceController_1 = require("./complianceController");
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const archiver = require("archiver");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const invoiceGenerator_1 = require("../services/invoiceGenerator");
const pdfService_1 = require("../services/pdfService");
const axios_1 = __importDefault(require("axios"));
const smsService_1 = require("../services/smsService");
const digioService_1 = require("../services/digioService");
const camsKraService_1 = require("../services/camsKraService");
const activityService_1 = require("../services/activityService");
const defaultEmailTemplates_1 = require("../utils/defaultEmailTemplates");
const feeCapHelper_1 = require("../utils/feeCapHelper");
const maskEmail = (email) => {
    if (!email)
        return email;
    const parts = email.split('@');
    if (parts.length !== 2)
        return email;
    const name = parts[0];
    const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name + '*';
    return `${maskedName}@${parts[1]}`;
};
const maskMobile = (mobile) => {
    if (!mobile)
        return mobile;
    return mobile.length > 4 ? mobile.substring(0, 2) + '*'.repeat(mobile.length - 4) + mobile.substring(mobile.length - 2) : '**********';
};
const maskDocument = (doc) => {
    if (!doc)
        return doc;
    return 'XXXX-XXXX';
};
const getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'No tenant ID' });
        const isFullAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
        const userId = req.user?.id;
        const clientAndAdminRoles = await db_1.default.Role.find({ name: { $in: ['CLIENT', 'ADMIN'] } }).lean();
        const excludeRoleIds = clientAndAdminRoles.map((r) => r._id || r.id);
        const clientFilter = { tenantId };
        if (!isFullAdmin && userId)
            clientFilter.createdById = userId;
        const researchFilter = { tenantId };
        if (!isFullAdmin && userId)
            researchFilter.createdById = userId;
        const planFilter = { tenantId, deletedAt: null };
        if (!isFullAdmin && userId)
            planFilter.createdById = userId;
        const [staffCount, clientCount, researchCount, planCount] = await Promise.all([
            db_1.default.User.countDocuments({ tenantId, roleId: { $nin: excludeRoleIds }, deletedAt: null }),
            db_1.default.Client.countDocuments(clientFilter),
            db_1.default.ResearchReport.countDocuments(researchFilter),
            db_1.default.Plan.countDocuments(planFilter)
        ]);
        const tenantDoc = await db_1.default.Tenant.findById(tenantId).lean() || await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        res.json({
            success: true,
            data: {
                staffCount,
                clientCount,
                researchCount,
                planCount,
                isLive: Boolean(tenantDoc?.isLive),
                goLiveAt: tenantDoc?.goLiveAt || null,
                complianceCutoffDate: tenantDoc?.complianceCutoffDate || null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
// Helper to calculate profile completeness score
const calculateCompleteness = async (tenantId) => {
    let tenant = null;
    if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
        tenant = await db_1.default.Tenant.findById(tenantId).lean();
    }
    if (!tenant && tenantId) {
        tenant = await db_1.default.Tenant.findOne({
            $or: [{ id: tenantId }, { tenantId: tenantId }]
        }).lean();
    }
    if (!tenant) {
        tenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenant)
        return { score: 0, details: { organization: false, principalOfficer: false, complianceOfficer: false, grievance: false, internalPolicy: false }, data: null };
    // Fallback SMTP lookup in local dynamicDb.SystemSetting if dynamic tenant document lacks SMTP fields
    if (!tenant.smtpHost || !tenant.smtpUser) {
        try {
            const setting = await db_1.default.SystemSetting.findOne({ key: 'GLOBAL_SMTP' }).lean();
            if (setting?.value) {
                const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
                if (parsed.smtpHost && parsed.smtpUser) {
                    tenant.smtpHost = parsed.smtpHost;
                    tenant.smtpPort = parsed.smtpPort;
                    tenant.smtpUser = parsed.smtpUser;
                    tenant.smtpPassword = parsed.smtpPassword;
                    tenant.smtpFrom = parsed.smtpFrom;
                    if (parsed.ccInvoiceEnabled !== undefined)
                        tenant.ccInvoiceEnabled = parsed.ccInvoiceEnabled;
                    if (parsed.ccInvoiceEmail !== undefined)
                        tenant.ccInvoiceEmail = parsed.ccInvoiceEmail;
                    if (parsed.ccAgreementEnabled !== undefined)
                        tenant.ccAgreementEnabled = parsed.ccAgreementEnabled;
                    if (parsed.ccAgreementEmail !== undefined)
                        tenant.ccAgreementEmail = parsed.ccAgreementEmail;
                }
            }
        }
        catch { }
    }
    const resolvedTenantId = String(tenant._id || tenant.id || tenant.tenantId || tenantId);
    const users = await db_1.default.User.find({
        $or: [
            { tenantId: resolvedTenantId },
            { tenantId }
        ]
    })
        .populate('roleId')
        .lean();
    const userIds = users.map((u) => u._id || u.id);
    const staffList = await db_1.default.Staff.find({ userId: { $in: userIds } }).lean();
    const staffMap = new Map(staffList.map((s) => [String(s.userId), s]));
    let score = 0;
    const details = {
        organization: false,
        principalOfficer: false,
        complianceOfficer: false,
        grievance: false,
        internalPolicy: false
    };
    // 1. Organization details (Company Name, Address, Website, GST, Support Mobile)
    if (tenant.companyName && tenant.address && tenant.website && tenant.mobile) {
        score += 20;
        details.organization = true;
    }
    // 2. Principal Officer (User with role PRINCIPAL_OFFICER)
    const poUser = users.find(u => u.roleId?.name === 'PRINCIPAL_OFFICER' && u.status !== 'DELETED');
    const poStaff = poUser ? staffMap.get(String(poUser._id || poUser.id)) : null;
    if (poUser && poStaff && poStaff.nismNumber && poStaff.nismValidity) {
        score += 20;
        details.principalOfficer = true;
    }
    // 3. Compliance Officer (User with role COMPLIANCE_OFFICER)
    const coUser = users.find(u => u.roleId?.name === 'COMPLIANCE_OFFICER' && u.status !== 'DELETED');
    const coStaff = coUser ? staffMap.get(String(coUser._id || coUser.id)) : null;
    if (coUser && coStaff && coStaff.nismNumber) {
        score += 20;
        details.complianceOfficer = true;
    }
    // 4. Grievance Officer details
    if (tenant.email && tenant.mobile && tenant.website) {
        score += 20;
        details.grievance = true;
    }
    // 5. Internal Policies uploaded (Check if internalPolicyUrl is present)
    if (tenant.internalPolicyUrl) {
        score += 20;
        details.internalPolicy = true;
    }
    return { score, details, data: tenant };
};
exports.calculateCompleteness = calculateCompleteness;
const getProfileCompleteness = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        const data = await (0, exports.calculateCompleteness)(tenantId);
        return res.status(200).json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getProfileCompleteness = getProfileCompleteness;
const saveProfileStep = async (req, res) => {
    const tenantId = req.user.tenantId;
    let { step, data } = req.body; // step: ORG, PO, CO, GRIEVANCE, POLICY
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        }
        catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }
    }
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    // VALIDATIONS
    if (step === 'ORG') {
        if (!data.address || data.address.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Address must be at least 5 characters long.' });
        }
        const websiteRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/;
        if (!data.website || !websiteRegex.test(data.website)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid website URL.' });
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!data.mobile || !mobileRegex.test(data.mobile)) {
            return res.status(400).json({ success: false, message: 'Support mobile number must be a valid 10-digit number.' });
        }
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!data.gst || !gstRegex.test(data.gst)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid 15-character Indian GSTIN.' });
        }
    }
    else if (step === 'PO') {
        if (!data.name || data.name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
            return res.status(400).json({ success: false, message: 'Principal Officer name must contain only letters and spaces (min 2 chars).' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !emailRegex.test(data.email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!data.mobile || !mobileRegex.test(data.mobile)) {
            return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
        }
        if (!data.nismNumber || data.nismNumber.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'NISM Registration Number is required (min 5 chars).' });
        }
        if (!data.nismValidity || new Date(data.nismValidity) <= new Date()) {
            return res.status(400).json({ success: false, message: 'NISM validity expiry date must be in the future.' });
        }
    }
    else if (step === 'CO') {
        if (!data.name || data.name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
            return res.status(400).json({ success: false, message: 'Compliance Officer name must contain only letters and spaces (min 2 chars).' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !emailRegex.test(data.email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!data.mobile || !mobileRegex.test(data.mobile)) {
            return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
        }
        if (!data.nismNumber || data.nismNumber.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'NISM Registration Number is required (min 5 chars).' });
        }
    }
    try {
        let oldTenant = null;
        if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
            oldTenant = await db_1.default.Tenant.findById(tenantId).lean();
        }
        if (!oldTenant && tenantId) {
            oldTenant = await db_1.default.Tenant.findOne({
                $or: [{ id: tenantId }, { tenantId: tenantId }]
            }).lean();
        }
        if (!oldTenant) {
            oldTenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        }
        if (!oldTenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant company record not found. Please log out and log in again.',
                errors: ['Tenant record not found']
            });
        }
        if (step === 'ORG') {
            if (data.gst) {
                const duplicateGst = await db_1.default.Tenant.findOne({
                    gst: data.gst,
                    _id: { $ne: tenantId }
                }).lean();
                if (duplicateGst) {
                    return res.status(400).json({ success: false, message: 'This GST number is already registered. Please provide a unique GST number.' });
                }
            }
            const updatedTenant = await db_1.default.Tenant.findByIdAndUpdate(tenantId, {
                $set: {
                    address: data.address,
                    website: data.website,
                    mobile: data.mobile,
                    gst: data.gst
                }
            }, { returnDocument: 'after', lean: true });
            await (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'UPDATE',
                module: 'TENANTS',
                oldValue: oldTenant,
                newValue: updatedTenant,
                ipAddress: req.ip
            });
        }
        else if (step === 'PO') {
            const poRole = await db_1.default.Role.findOne({ name: 'PRINCIPAL_OFFICER' }).lean();
            if (!poRole)
                throw new Error('Principal Officer role not found');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('Po@12345', salt);
            const email = data.email;
            const poUsername = (data.username ? String(data.username).trim().toLowerCase() : (email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') : 'po_user'));
            const existingPO = await db_1.default.User.findOne({
                tenantId,
                roleId: poRole._id || poRole.id
            });
            if (existingPO) {
                await db_1.default.User.findByIdAndUpdate(existingPO._id || existingPO.id, {
                    $set: { firstName: data.name, mobile: data.mobile, email, username: poUsername }
                });
                await db_1.default.Staff.findOneAndUpdate({ userId: existingPO._id || existingPO.id }, {
                    $set: {
                        name: data.name,
                        email,
                        username: poUsername,
                        mobile: data.mobile,
                        nismNumber: data.nismNumber,
                        nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
                        ...(req.file ? { nismUpload: `/uploads/staff/${req.file.filename}` } : {})
                    },
                    $setOnInsert: {
                        userId: existingPO._id || existingPO.id,
                        employeeId: 'EMP-PO-' + Math.floor(100 + Math.random() * 900),
                        status: 'ACTIVE'
                    }
                }, { upsert: true, returnDocument: 'after' });
            }
            else {
                const newUser = await db_1.default.User.create({
                    tenantId,
                    roleId: poRole._id || poRole.id,
                    username: poUsername,
                    email,
                    firstName: data.name,
                    lastName: '(PO)',
                    mobile: data.mobile,
                    passwordHash,
                    status: 'ACTIVE'
                });
                await db_1.default.Staff.create({
                    userId: newUser._id || newUser.id,
                    employeeId: 'EMP-PO-' + Math.floor(100 + Math.random() * 900),
                    username: poUsername,
                    name: data.name,
                    email,
                    mobile: data.mobile,
                    nismNumber: data.nismNumber,
                    nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
                    nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
                    status: 'ACTIVE'
                });
            }
        }
        else if (step === 'CO') {
            const coRole = await db_1.default.Role.findOne({ name: 'COMPLIANCE_OFFICER' }).lean();
            if (!coRole)
                throw new Error('Compliance Officer role not found');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('Co@12345', salt);
            const email = data.email;
            const coUsername = (data.username ? String(data.username).trim().toLowerCase() : (email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') : 'co_user'));
            const existingCO = await db_1.default.User.findOne({
                tenantId,
                roleId: coRole._id || coRole.id
            });
            if (existingCO) {
                await db_1.default.User.findByIdAndUpdate(existingCO._id || existingCO.id, {
                    $set: { firstName: data.name, mobile: data.mobile, email, username: coUsername }
                });
                await db_1.default.Staff.findOneAndUpdate({ userId: existingCO._id || existingCO.id }, {
                    $set: {
                        name: data.name,
                        email,
                        username: coUsername,
                        mobile: data.mobile,
                        nismNumber: data.nismNumber,
                        nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
                        ...(req.file ? { nismUpload: `/uploads/staff/${req.file.filename}` } : {})
                    },
                    $setOnInsert: {
                        userId: existingCO._id || existingCO.id,
                        employeeId: 'EMP-CO-' + Math.floor(100 + Math.random() * 900),
                        status: 'ACTIVE'
                    }
                }, { upsert: true, returnDocument: 'after' });
            }
            else {
                const newUser = await db_1.default.User.create({
                    tenantId,
                    roleId: coRole._id || coRole.id,
                    username: coUsername,
                    email,
                    firstName: data.name,
                    lastName: '(CO)',
                    mobile: data.mobile,
                    passwordHash,
                    status: 'ACTIVE'
                });
                await db_1.default.Staff.create({
                    userId: newUser._id || newUser.id,
                    employeeId: 'EMP-CO-' + Math.floor(100 + Math.random() * 900),
                    username: coUsername,
                    name: data.name,
                    email,
                    mobile: data.mobile,
                    nismNumber: data.nismNumber,
                    nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
                    nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
                    status: 'ACTIVE'
                });
            }
        }
        else if (step === 'POLICY') {
            const updatedTenant = await db_1.default.Tenant.findByIdAndUpdate(tenantId, {
                $set: {
                    internalPolicyUrl: data.internalPolicyUrl || '/uploads/policies/default_policy.pdf'
                }
            }, { returnDocument: 'after', lean: true });
            await (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'UPDATE',
                module: 'TENANTS',
                oldValue: oldTenant,
                newValue: updatedTenant,
                ipAddress: req.ip
            });
        }
        const completeness = await (0, exports.calculateCompleteness)(tenantId);
        return res.status(200).json({
            success: true,
            message: 'Profile step saved successfully',
            data: completeness
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.saveProfileStep = saveProfileStep;
const createStaff = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { username, name, email, mobile, dob, joiningDate, nismNumber, nismValidity, roleName, personAssociatedType, customRole } = req.body;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        // VALIDATIONS
        const cleanUsername = String(username || '').trim().toLowerCase();
        if (!cleanUsername || cleanUsername.length < 2) {
            return res.status(400).json({ success: false, message: 'Staff username is required and must be at least 2 characters.' });
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
            return res.status(400).json({ success: false, message: 'Staff username can only contain letters, numbers, dots, hyphens, and underscores.' });
        }
        if (!name || name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(name)) {
            return res.status(400).json({ success: false, message: 'Staff name must contain only letters and spaces (min 2 chars).' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobile || !mobileRegex.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
        }
        const effectivePersonAssociatedType = roleName === 'OTHER' ? 'OTHER' : personAssociatedType;
        let effectiveRoleName = roleName === 'OTHER' ? 'PERSON_ASSOCIATED' : roleName;
        if (effectiveRoleName === 'PERSON_ASSOCIATED') {
            if (effectivePersonAssociatedType === 'SALES')
                effectiveRoleName = 'SALES';
            else if (effectivePersonAssociatedType === 'MARKETING')
                effectiveRoleName = 'MARKETING';
        }
        const targetRole = await db_1.default.Role.findOne({ name: effectiveRoleName }).lean();
        if (!targetRole) {
            return res.status(400).json({ success: false, message: `Role '${effectiveRoleName}' not found.` });
        }
        const roleRequiresNism = targetRole.requiresNism === true;
        if (roleRequiresNism) {
            if (!nismNumber || nismNumber.trim().length < 5) {
                return res.status(400).json({ success: false, message: `NISM Registration Number is mandatory for role '${effectiveRoleName}' (min 5 characters).` });
            }
            if (!nismValidity || new Date(nismValidity) <= new Date()) {
                return res.status(400).json({ success: false, message: 'Valid future NISM expiry date is mandatory for this role.' });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'NISM Certificate document upload is mandatory for this role.' });
            }
        }
        else {
            if (nismNumber && nismNumber.trim().length > 0) {
                if (nismNumber.trim().length < 5) {
                    return res.status(400).json({ success: false, message: 'NISM Registration Number must be at least 5 characters.' });
                }
                if (!nismValidity || new Date(nismValidity) <= new Date()) {
                    return res.status(400).json({ success: false, message: 'NISM validity expiry date must be in the future.' });
                }
            }
        }
        if (nismNumber && nismNumber.trim().length > 0) {
            const existingNism = await db_1.default.Staff.findOne({
                nismNumber: nismNumber.trim()
            }).lean();
            if (existingNism) {
                return res.status(400).json({ success: false, message: 'Duplicate NISM Certificate Number. This number is already in use.' });
            }
        }
        const existingUserWithUsername = await db_1.default.User.findOne({
            username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
        if (existingUserWithUsername) {
            return res.status(400).json({ success: false, message: `Username '${cleanUsername}' is already taken. Please choose a different username.` });
        }
        const centralExisting = await db_1.centralModels.User.findOne({
            username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean().catch(() => null);
        if (centralExisting) {
            return res.status(400).json({ success: false, message: `Username '${cleanUsername}' is already taken. Please choose a different username.` });
        }
        const randomPassword = 'Staff@' + Math.floor(1000 + Math.random() * 9000);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPassword, salt);
        const user = await db_1.default.User.create({
            tenantId,
            roleId: targetRole._id || targetRole.id,
            username: cleanUsername,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || 'Staff',
            email,
            mobile,
            passwordHash,
            tempPassword: randomPassword,
            status: 'ACTIVE'
        });
        const staff = await db_1.default.Staff.create({
            userId: user._id || user.id,
            employeeId: 'EMP' + Math.floor(1000 + Math.random() * 900),
            username: cleanUsername,
            name,
            email,
            mobile,
            dob: dob ? new Date(dob) : null,
            joiningDate: joiningDate ? new Date(joiningDate) : null,
            nismNumber: roleRequiresNism || nismNumber ? nismNumber : null,
            nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
            nismValidity: nismValidity ? new Date(nismValidity) : null,
            status: 'ACTIVE'
        });
        if (['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(effectiveRoleName)) {
            await db_1.default.PersonAssociated.create({
                staffId: staff._id || staff.id,
                roleType: effectivePersonAssociatedType || 'SALES',
                customRole: effectivePersonAssociatedType === 'OTHER' ? customRole : null
            });
        }
        // Log Notification log for SMTP
        await db_1.default.NotificationLog.create({
            tenantId,
            recipient: email,
            channel: 'EMAIL',
            title: 'Staff Account Created',
            message: `Welcome ${name}! Your account has been created on RAGCP. Role: ${roleName}. Credentials: Username: ${cleanUsername}, Password: ${randomPassword}`,
            status: 'SENT'
        }).catch(() => { });
        // Write audit log
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'CREATE',
            module: 'STAFF',
            newValue: staff,
            ipAddress: req.ip
        });
        // Run compliance verification sweep for staff NISM validity
        await (0, complianceController_1.checkComplianceForTenant)(tenantId);
        // Get login URL
        const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
        const tenant = await db_1.default.Tenant.findById(tenantId).lean();
        // Send Welcome Email
        try {
            await (0, emailService_1.sendWelcomeEmail)({
                tenantId,
                toEmail: email,
                name,
                username: cleanUsername,
                password: randomPassword,
                role: roleName,
                loginUrl,
                companyName: tenant?.companyName || 'RAGCP Platform'
            });
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError.message);
        }
        return res.status(201).json({
            success: true,
            message: 'Staff created successfully',
            data: {
                staff,
                username: cleanUsername,
                generatedPassword: randomPassword
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.createStaff = createStaff;
const getStaff = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        const users = await db_1.default.User.find({ tenantId })
            .populate('roleId')
            .sort({ createdAt: -1 })
            .lean();
        const userIds = users.map((u) => u._id || u.id);
        const staffList = await db_1.default.Staff.find({ userId: { $in: userIds } }).lean();
        const staffIds = staffList.map((s) => s._id || s.id);
        const personAssocs = await db_1.default.PersonAssociated.find({ staffId: { $in: staffIds } }).lean();
        const paMap = new Map(personAssocs.map((p) => [String(p.staffId), p]));
        const userMap = new Map(users.map((u) => [String(u._id || u.id), u]));
        const staffMembers = staffList.map((s) => {
            const user = userMap.get(String(s.userId));
            const pa = paMap.get(String(s._id || s.id));
            const staffUsername = s.username || user?.username || (s.email ? s.email.split('@')[0] : null);
            return {
                ...s,
                id: String(s._id || s.id),
                username: staffUsername,
                user: user ? {
                    ...user,
                    id: String(user._id || user.id),
                    username: user.username || staffUsername,
                    role: user.roleId
                } : null,
                personAssociated: pa || null
            };
        });
        return res.status(200).json({ success: true, data: staffMembers });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getStaff = getStaff;
const updateStaff = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { username, name, email, mobile, dob, joiningDate, nismNumber, nismValidity, roleName, personAssociatedType, customRole, dscSigningScope } = req.body;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        // VALIDATIONS
        if (!name || name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(name)) {
            return res.status(400).json({ success: false, message: 'Staff name must contain only letters and spaces (min 2 chars).' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobile || !mobileRegex.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
        }
        const effectivePersonAssociatedType = roleName === 'OTHER' ? 'OTHER' : personAssociatedType;
        let effectiveRoleName = roleName === 'OTHER' ? 'PERSON_ASSOCIATED' : roleName;
        if (effectiveRoleName === 'PERSON_ASSOCIATED') {
            if (effectivePersonAssociatedType === 'SALES')
                effectiveRoleName = 'SALES';
            else if (effectivePersonAssociatedType === 'MARKETING')
                effectiveRoleName = 'MARKETING';
        }
        let staff = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
        }
        if (!staff) {
            staff = await db_1.default.Staff.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ userId: id }] : []),
                    { employeeId: id },
                    { email: email }
                ]
            }).lean();
        }
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        const targetRole = await db_1.default.Role.findOne({ name: effectiveRoleName }).lean();
        const roleRequiresNism = targetRole?.requiresNism === true;
        if (roleRequiresNism) {
            if (!nismNumber || nismNumber.trim().length < 5) {
                return res.status(400).json({ success: false, message: `NISM Registration Number is mandatory for role '${effectiveRoleName}' (min 5 characters).` });
            }
            if (!nismValidity || new Date(nismValidity) <= new Date()) {
                return res.status(400).json({ success: false, message: 'Valid future NISM expiry date is mandatory for this role.' });
            }
            if (!staff.nismUpload && !req.file) {
                return res.status(400).json({ success: false, message: 'NISM Certificate document upload is mandatory for this role.' });
            }
        }
        else {
            if (nismNumber && nismNumber.trim().length > 0) {
                if (nismNumber.trim().length < 5) {
                    return res.status(400).json({ success: false, message: 'NISM Registration Number must be at least 5 characters.' });
                }
                if (!nismValidity || new Date(nismValidity) <= new Date()) {
                    return res.status(400).json({ success: false, message: 'NISM validity expiry date must be in the future.' });
                }
            }
        }
        const staffId = staff._id;
        let staffUser = null;
        if (staff.userId) {
            staffUser = await db_1.default.User.findById(staff.userId).lean();
        }
        if (!staffUser && staff.email) {
            staffUser = await db_1.default.User.findOne({ email: staff.email }).lean();
        }
        if (staffUser && staffUser.tenantId && String(staffUser.tenantId) !== String(tenantId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Staff belongs to another tenant.' });
        }
        if (nismNumber && nismNumber.trim().length > 0) {
            const existingNism = await db_1.default.Staff.findOne({
                nismNumber: nismNumber.trim(),
                _id: { $ne: staffId }
            }).lean();
            if (existingNism) {
                return res.status(400).json({ success: false, message: 'Duplicate NISM Certificate Number. This number is already in use.' });
            }
        }
        const updateUserData = {
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || 'Staff',
            email,
            mobile
        };
        if (targetRole) {
            updateUserData.roleId = targetRole._id || targetRole.id;
        }
        if (dscSigningScope && ['DISABLED', 'SELF', 'ALL'].includes(dscSigningScope)) {
            updateUserData.dscSigningScope = dscSigningScope;
        }
        const targetUserId = staff.userId || staffUser?._id;
        if (targetUserId) {
            await db_1.default.User.findByIdAndUpdate(targetUserId, { $set: updateUserData });
        }
        const updateStaffData = {
            name,
            email: updateUserData.email || staff.email,
            mobile,
            dob: dob ? new Date(dob) : null,
            joiningDate: joiningDate ? new Date(joiningDate) : null,
            nismNumber: roleRequiresNism || nismNumber ? nismNumber : null,
            nismValidity: nismValidity ? new Date(nismValidity) : null,
            ...(dscSigningScope && ['DISABLED', 'SELF', 'ALL'].includes(dscSigningScope) ? { dscSigningScope } : {}),
            ...(targetUserId ? { userId: targetUserId } : {})
        };
        if (req.file) {
            updateStaffData.nismUpload = `/uploads/staff/${req.file.filename}`;
        }
        const updatedStaff = await db_1.default.Staff.findByIdAndUpdate(staffId, { $set: updateStaffData }, { returnDocument: 'after', lean: true });
        await db_1.default.PersonAssociated.deleteMany({ staffId });
        if (['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(effectiveRoleName)) {
            await db_1.default.PersonAssociated.create({
                staffId,
                roleType: effectivePersonAssociatedType || 'SALES',
                customRole: effectivePersonAssociatedType === 'OTHER' ? customRole : null
            });
        }
        const newStaffVal = await db_1.default.Staff.findById(staffId).lean();
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'STAFF',
            oldValue: staff,
            newValue: newStaffVal,
            ipAddress: req.ip
        });
        await (0, complianceController_1.checkComplianceForTenant)(tenantId);
        return res.status(200).json({
            success: true,
            message: 'Staff member updated successfully',
            data: newStaffVal
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message, errors: [error.message] });
    }
};
exports.updateStaff = updateStaff;
const toggleStaffStatus = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        let staff = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
        }
        if (!staff) {
            staff = await db_1.default.Staff.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ userId: id }] : []),
                    { employeeId: id }
                ]
            }).lean();
        }
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        const staffId = staff._id;
        let staffUser = null;
        if (staff.userId) {
            staffUser = await db_1.default.User.findById(staff.userId).lean();
        }
        const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const updatedStaff = await db_1.default.Staff.findByIdAndUpdate(staffId, { $set: { status: newStatus } }, { returnDocument: 'after', lean: true });
        if (staff.userId) {
            await db_1.default.User.findByIdAndUpdate(staff.userId, {
                $set: { status: newStatus }
            });
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'STAFF',
            oldValue: staff,
            newValue: updatedStaff,
            ipAddress: req.ip
        });
        await (0, complianceController_1.checkComplianceForTenant)(tenantId);
        return res.status(200).json({
            success: true,
            message: `Staff status updated to ${newStatus}`,
            data: updatedStaff
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleStaffStatus = toggleStaffStatus;
const deleteStaff = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        let staff = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
        }
        if (!staff) {
            staff = await db_1.default.Staff.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ userId: id }] : []),
                    { employeeId: id }
                ]
            }).lean();
        }
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        const staffId = staff._id;
        let staffUser = null;
        if (staff.userId) {
            staffUser = await db_1.default.User.findById(staff.userId).lean();
        }
        const now = new Date();
        if (staff.userId) {
            await db_1.default.User.findByIdAndUpdate(staff.userId, { $set: { deletedAt: now, status: 'INACTIVE' } });
        }
        await db_1.default.Staff.findByIdAndUpdate(staffId, { $set: { status: 'INACTIVE', deletedAt: now } });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'DELETE',
            module: 'STAFF',
            oldValue: staff,
            newValue: { ...staff, deletedAt: now },
            ipAddress: req.ip
        });
        await (0, complianceController_1.checkComplianceForTenant)(tenantId);
        return res.status(200).json({
            success: true,
            message: 'Staff member soft-deleted successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.deleteStaff = deleteStaff;
const restoreStaff = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        let staff = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
        }
        if (!staff) {
            staff = await db_1.default.Staff.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ userId: id }] : []),
                    { employeeId: id }
                ]
            }).lean();
        }
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Deleted staff member not found.' });
        }
        const staffId = staff._id;
        if (staff.userId) {
            await db_1.default.User.findByIdAndUpdate(staff.userId, {
                $set: { deletedAt: null, status: 'ACTIVE' }
            });
        }
        await db_1.default.Staff.findByIdAndUpdate(staffId, {
            $set: { status: 'ACTIVE', deletedAt: null }
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'STAFF',
            oldValue: staff,
            newValue: { ...staff, deletedAt: null },
            ipAddress: req.ip
        });
        await (0, complianceController_1.checkComplianceForTenant)(tenantId);
        return res.status(200).json({
            success: true,
            message: 'Staff member restored successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.restoreStaff = restoreStaff;
const getStaffPassword = async (req, res) => {
    const { id } = req.params;
    const callerRole = req.user?.role;
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can view staff passwords.' });
    }
    try {
        let staff = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
        }
        if (!staff) {
            staff = await db_1.default.Staff.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ userId: id }] : []),
                    { employeeId: id }
                ]
            }).lean();
        }
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        let user = null;
        if (staff.userId) {
            user = await db_1.default.User.findById(staff.userId).lean();
        }
        if (!user && staff.email) {
            user = await db_1.default.User.findOne({ email: staff.email }).lean();
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'Associated login account not found.' });
        }
        return res.status(200).json({
            success: true,
            data: {
                username: user.username || staff.username || (user.email ? user.email.split('@')[0] : null),
                email: user.email,
                password: user.tempPassword || null
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getStaffPassword = getStaffPassword;
const resendStaffCredentials = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const callerRole = req.user?.role;
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can resend staff credentials.' });
    }
    try {
        let staff = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
        }
        if (!staff) {
            staff = await db_1.default.Staff.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ userId: id }] : []),
                    { employeeId: id }
                ]
            }).lean();
        }
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        let user = null;
        if (staff.userId) {
            user = await db_1.default.User.findById(staff.userId);
        }
        if (!user && staff.email) {
            user = await db_1.default.User.findOne({ email: staff.email });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'Associated login account not found.' });
        }
        let passwordToSend = user.tempPassword;
        if (!passwordToSend) {
            passwordToSend = 'Staff@' + Math.floor(1000 + Math.random() * 9000);
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(passwordToSend, salt);
            user.passwordHash = passwordHash;
            user.tempPassword = passwordToSend;
            await user.save();
        }
        const roleDoc = await db_1.default.Role.findById(user.roleId).lean();
        const roleName = roleDoc?.name || 'STAFF';
        const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
        const tenant = tenantId ? await db_1.default.Tenant.findById(tenantId).lean() : null;
        const emailSent = await (0, emailService_1.sendWelcomeEmail)({
            tenantId: tenantId ? String(tenantId) : '',
            toEmail: user.email,
            name: staff.name || `${user.firstName} ${user.lastName}`,
            username: user.username || staff.username,
            password: passwordToSend,
            role: roleName,
            loginUrl,
            companyName: tenant?.companyName || 'RAGCP Platform'
        });
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to send credentials email. Please verify SMTP settings.' });
        }
        return res.status(200).json({
            success: true,
            message: `Login credentials successfully sent to staff registered email (${user.email}).`
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.resendStaffCredentials = resendStaffCredentials;
// =====================================================
// RESEARCHER HARDWARE DSC PERMISSIONS (Admin Controlled)
// =====================================================
const getResearcherDscPermissions = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        const researcherRole = await db_1.default.Role.findOne({ name: 'RESEARCHER' }).lean();
        if (!researcherRole) {
            return res.status(200).json({ success: true, data: [] });
        }
        const researcherRoleId = researcherRole._id || researcherRole.id;
        // Find all users with role RESEARCHER in this tenant
        const users = await db_1.default.User.find({
            tenantId,
            roleId: researcherRoleId
        })
            .populate('roleId')
            .sort({ createdAt: -1 })
            .lean();
        const userIds = users.map((u) => u._id || u.id);
        const staffList = await db_1.default.Staff.find({ userId: { $in: userIds } }).lean();
        const staffMap = new Map(staffList.map((s) => [String(s.userId), s]));
        const result = users.map((u) => {
            const s = staffMap.get(String(u._id || u.id));
            const staffName = s?.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
            const username = s?.username || u.username;
            const dscScope = s?.dscSigningScope || u.dscSigningScope || 'DISABLED';
            const isInactiveOrDeleted = !!(u.deletedAt || s?.deletedAt || u.status !== 'ACTIVE' || (s && s.status !== 'ACTIVE'));
            return {
                id: String(s?._id || u._id || u.id),
                staffId: s ? String(s._id || s.id) : null,
                userId: String(u._id || u.id),
                name: staffName,
                username,
                email: u.email,
                mobile: u.mobile || s?.mobile,
                status: isInactiveOrDeleted ? 'INACTIVE' : 'ACTIVE',
                deletedAt: u.deletedAt || s?.deletedAt || null,
                dscSigningScope: dscScope,
                roleName: 'RESEARCHER'
            };
        });
        return res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getResearcherDscPermissions = getResearcherDscPermissions;
const updateResearcherDscPermission = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { dscSigningScope } = req.body;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    if (!['DISABLED', 'SELF', 'ALL'].includes(dscSigningScope)) {
        return res.status(400).json({ success: false, message: 'Invalid dscSigningScope. Allowed values: DISABLED, SELF, ALL' });
    }
    try {
        let staff = null;
        let user = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            staff = await db_1.default.Staff.findById(id).lean();
            if (!staff) {
                user = await db_1.default.User.findById(id).lean();
                if (user) {
                    staff = await db_1.default.Staff.findOne({ userId: user._id }).lean();
                }
            }
            else if (staff.userId) {
                user = await db_1.default.User.findById(staff.userId).lean();
            }
        }
        if (!staff && !user) {
            staff = await db_1.default.Staff.findOne({
                $or: [{ employeeId: id }, { email: id }]
            }).lean();
            if (staff && staff.userId) {
                user = await db_1.default.User.findById(staff.userId).lean();
            }
        }
        if (!staff && !user) {
            return res.status(404).json({ success: false, message: 'Researcher not found.' });
        }
        if (user && user.tenantId && String(user.tenantId) !== String(tenantId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Researcher belongs to another tenant.' });
        }
        if (staff) {
            await db_1.default.Staff.findByIdAndUpdate(staff._id, { $set: { dscSigningScope } });
        }
        if (user) {
            await db_1.default.User.findByIdAndUpdate(user._id, { $set: { dscSigningScope } });
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'STAFF',
            oldValue: { dscSigningScope: staff?.dscSigningScope || user?.dscSigningScope },
            newValue: { dscSigningScope },
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: `DSC Signing scope updated to ${dscSigningScope} successfully`,
            data: { id, dscSigningScope }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateResearcherDscPermission = updateResearcherDscPermission;
// =====================================================
// CLIENT MANAGEMENT (Admin View)
// =====================================================
const getAdminClients = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';
        let hasViewAll = isFullAdmin;
        let hasViewOwn = isFullAdmin;
        if (!isFullAdmin) {
            const userRole = await db_1.default.Role.findOne({ name: req.user.role }).lean();
            const roleId = userRole?._id || userRole?.id;
            const viewAllPerm = await db_1.default.Permission.findOne({ code: 'VIEW_ALL_CLIENTS' }).lean();
            const viewOwnPerm = await db_1.default.Permission.findOne({ code: 'VIEW_OWN_CLIENTS' }).lean();
            if (viewAllPerm) {
                const rpAll = await db_1.default.RolePermission.findOne({
                    roleId,
                    permissionId: viewAllPerm._id || viewAllPerm.id
                }).lean();
                if (rpAll)
                    hasViewAll = true;
            }
            if (viewOwnPerm) {
                const rpOwn = await db_1.default.RolePermission.findOne({
                    roleId,
                    permissionId: viewOwnPerm._id || viewOwnPerm.id
                }).lean();
                if (rpOwn)
                    hasViewOwn = true;
            }
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to view clients.' });
            }
        }
        // 1. Find all roles representing CLIENT / USER / CUSTOMER / INVESTOR
        const clientRoles = await db_1.default.Role.find({
            name: { $regex: /^(client|user|customer|investor)$/i }
        }).lean();
        const clientRoleIds = clientRoles.map((r) => r._id || r.id);
        // 2. Build tenant filter for active users
        const tenantUserFilter = {
            $or: [
                { tenantId: tenantId },
                ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose_1.default.Types.ObjectId(tenantId) }] : [])
            ],
            deletedAt: null
        };
        if (!isFullAdmin && !hasViewAll && hasViewOwn) {
            tenantUserFilter.createdById = req.user.id;
        }
        // Query all matching users in tenant
        const users = await db_1.default.User.find({
            ...tenantUserFilter,
            $or: [
                { roleId: { $in: clientRoleIds } },
                { role: { $regex: /^(client|user|customer|investor)$/i } }
            ]
        }).populate('roleId').sort({ createdAt: -1 }).lean();
        const userIds = users.map((u) => u._id || u.id);
        const userMap = new Map(users.map((u) => [String(u._id || u.id), u]));
        // 3. Find Client documents linked to these users or this tenant
        const clientQuery = {
            $or: [
                { userId: { $in: userIds } },
                { tenantId: tenantId },
                ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose_1.default.Types.ObjectId(tenantId) }] : [])
            ]
        };
        if (!isFullAdmin && !hasViewAll && hasViewOwn) {
            clientQuery.createdById = req.user.id;
        }
        const rawClients = await db_1.default.Client.find(clientQuery)
            .populate('userId')
            .sort({ createdAt: -1 })
            .lean();
        // Map existing Client records by userId
        const clientByUserId = new Map();
        for (const c of rawClients) {
            const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || '');
            if (uIdStr) {
                clientByUserId.set(uIdStr, c);
            }
        }
        // 4. Ensure every User with CLIENT/USER role is included in client list
        const combinedClients = [...rawClients];
        for (const u of users) {
            const uIdStr = String(u._id || u.id);
            if (!clientByUserId.has(uIdStr)) {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'Client';
                const synthClient = {
                    _id: u._id,
                    id: uIdStr,
                    userId: u,
                    name: fullName,
                    email: u.email,
                    mobile: u.mobile || '',
                    dob: u.dob || null,
                    pan: u.pan || 'N/A',
                    aadhaar: u.aadhaar || 'N/A',
                    category: u.category || 'INDIVIDUAL',
                    occupation: u.occupation || 'other',
                    status: u.status || 'ACTIVE',
                    kycStatus: u.kycStatus || 'PENDING',
                    kraVerified: false,
                    createdById: u.createdById || null,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                };
                combinedClients.push(synthClient);
                clientByUserId.set(uIdStr, synthClient);
            }
        }
        const allClientIds = combinedClients.map((c) => c._id || c.id);
        const allUserIds = combinedClients.map((c) => String(c.userId?._id || c.userId?.id || c.userId || c._id || c.id));
        const allLookupIds = [...new Set([...allClientIds, ...allUserIds])];
        // Profiles
        const profiles = await db_1.default.ClientProfile.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const profileMap = new Map();
        for (const p of profiles) {
            if (p.clientId)
                profileMap.set(String(p.clientId), p);
        }
        // Subscriptions
        const subscriptions = await db_1.default.Subscription.find({
            clientId: { $in: allLookupIds }
        })
            .populate('planId')
            .sort({ createdAt: -1 })
            .lean();
        const subMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            if (!subMap.has(cId))
                subMap.set(cId, []);
            subMap.get(cId).push(sub);
        }
        // Agreements
        const agreements = await db_1.default.Agreement.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const agMap = new Map();
        for (const ag of agreements) {
            const cId = String(ag.clientId);
            if (!agMap.has(cId))
                agMap.set(cId, []);
            agMap.get(cId).push(ag);
        }
        // Documents
        const documents = await db_1.default.ClientDocument.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const docMap = new Map();
        for (const doc of documents) {
            const cId = String(doc.clientId);
            if (!docMap.has(cId))
                docMap.set(cId, []);
            docMap.get(cId).push(doc);
        }
        // Compliance Alerts
        const alerts = await db_1.default.ComplianceAlert.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const alertMap = new Map();
        for (const al of alerts) {
            const cId = String(al.clientId);
            if (!alertMap.has(cId))
                alertMap.set(cId, []);
            alertMap.get(cId).push(al);
        }
        // Approved Video KYC Sessions
        const approvedKycSessions = await db_1.default.VideoKycSession.find({
            tenantId,
            status: 'APPROVED'
        }).select('clientId').lean();
        const approvedKycClientIds = new Set(approvedKycSessions.map((s) => String(s.clientId)));
        // Creators
        const creatorIds = [...new Set(combinedClients.map((c) => c.createdById).filter(Boolean))];
        const creatorUsers = creatorIds.length > 0 ? await db_1.default.User.find({
            _id: { $in: creatorIds }
        }).populate('roleId').lean() : [];
        const creatorMap = new Map(creatorUsers.map((u) => [
            String(u._id || u.id),
            {
                name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                roleName: u.roleId?.name || 'STAFF'
            }
        ]));
        let clients = combinedClients.map((c) => {
            const cIdStr = String(c._id || c.id);
            const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || cIdStr);
            const uObj = (c.userId && typeof c.userId === 'object' && c.userId.email) ? c.userId : userMap.get(uIdStr);
            let createdByInfo = { type: 'SELF', label: 'Self Signup', name: 'Self Signup', role: 'CLIENT' };
            const creatorId = c.createdById || uObj?.createdById;
            if (creatorId) {
                const creator = creatorMap.get(String(creatorId));
                if (creator) {
                    const rName = (creator.roleName || '').toUpperCase();
                    const isRoleAdmin = rName === 'ADMIN' || rName === 'SUPER_ADMIN' || rName === 'SUPER ADMIN';
                    createdByInfo = {
                        type: isRoleAdmin ? 'ADMIN' : 'STAFF',
                        label: isRoleAdmin ? `Admin (${creator.name})` : `Staff (${creator.name})`,
                        name: creator.name,
                        role: creator.roleName
                    };
                }
                else {
                    createdByInfo = { type: 'STAFF', label: 'Admin/Staff', name: 'Admin/Staff', role: 'STAFF' };
                }
            }
            const clientSubs = (subMap.get(cIdStr) || subMap.get(uIdStr) || []).map((s) => ({
                ...s,
                id: String(s._id || s.id),
                plan: s.planId ? {
                    ...s.planId,
                    id: String(s.planId._id || s.planId.id)
                } : null
            }));
            const userDisplayName = uObj ? `${uObj.firstName || ''} ${uObj.lastName || ''}`.trim() || uObj.email : c.name;
            const isVideoKycApproved = approvedKycClientIds.has(cIdStr) ||
                approvedKycClientIds.has(uIdStr) ||
                c.videoKycStatus === 'APPROVED' ||
                uObj?.videoKycStatus === 'APPROVED';
            const effectiveVideoKycStatus = isVideoKycApproved
                ? 'APPROVED'
                : (c.videoKycStatus || uObj?.videoKycStatus || 'PENDING');
            return {
                ...c,
                id: cIdStr,
                name: c.name || userDisplayName,
                email: c.email || uObj?.email,
                mobile: c.mobile || uObj?.mobile,
                status: c.status || uObj?.status || 'ACTIVE',
                kycStatus: c.kycStatus || uObj?.kycStatus || 'PENDING',
                videoKycStatus: effectiveVideoKycStatus,
                user: uObj ? {
                    ...uObj,
                    id: String(uObj._id || uObj.id),
                    role: uObj.roleId
                } : null,
                profile: (() => {
                    const rawP = profileMap.get(cIdStr) || profileMap.get(uIdStr) || {};
                    return {
                        ...rawP,
                        addressLine1: rawP.addressLine1 || c.addressLine1 || c.address || null,
                        city: rawP.city || c.city || null,
                        state: rawP.state || c.state || null,
                        zipCode: rawP.zipCode || c.zipCode || null
                    };
                })(),
                subscriptions: clientSubs,
                agreements: agMap.get(cIdStr) || agMap.get(uIdStr) || [],
                documents: docMap.get(cIdStr) || docMap.get(uIdStr) || [],
                complianceAlerts: alertMap.get(cIdStr) || alertMap.get(uIdStr) || [],
                createdByInfo
            };
        });
        const hasViewSensitive = isFullAdmin || await (async () => {
            const userRole = await db_1.default.Role.findOne({ name: req.user.role }).lean();
            if (!userRole)
                return false;
            const perm = await db_1.default.Permission.findOne({ code: 'VIEW_SENSITIVE_DATA' }).lean();
            if (!perm)
                return false;
            const rp = await db_1.default.RolePermission.findOne({ roleId: userRole._id || userRole.id, permissionId: perm._id || perm.id }).lean();
            return !!rp;
        })();
        if (!hasViewSensitive) {
            clients = clients.map((c) => ({
                ...c,
                email: maskEmail(c.email),
                mobile: maskMobile(c.mobile),
                pan: maskDocument(c.pan),
                aadhaar: maskDocument(c.aadhaar),
                user: c.user ? { ...c.user, email: maskEmail(c.user.email) } : c.user,
                profile: c.profile ? {
                    ...c.profile,
                    panNumber: maskDocument(c.profile.panNumber),
                    aadharNumber: maskDocument(c.profile.aadharNumber)
                } : c.profile
            }));
        }
        return res.status(200).json({ success: true, data: clients });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAdminClients = getAdminClients;
const getAdminDeletedClients = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const clientRoles = await db_1.default.Role.find({
            name: { $regex: /^(client|user|customer|investor)$/i }
        }).lean();
        const clientRoleIds = clientRoles.map((r) => r._id || r.id);
        const deletedUsers = await db_1.default.User.find({
            $and: [
                {
                    $or: [
                        { tenantId: tenantId },
                        ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose_1.default.Types.ObjectId(tenantId) }] : [])
                    ]
                },
                { deletedAt: { $ne: null } },
                {
                    $or: [
                        { roleId: { $in: clientRoleIds } },
                        { role: { $regex: /^(client|user|customer|investor)$/i } }
                    ]
                }
            ]
        }).populate('roleId').lean();
        const userIds = deletedUsers.map((u) => u._id || u.id);
        const rawClients = await db_1.default.Client.find({
            userId: { $in: userIds }
        }).sort({ updatedAt: -1 }).lean();
        const clientByUserId = new Map(rawClients.map((c) => [String(c.userId), c]));
        const userMap = new Map(deletedUsers.map((u) => [String(u._id || u.id), u]));
        const combinedClients = [...rawClients];
        for (const u of deletedUsers) {
            const uIdStr = String(u._id || u.id);
            if (!clientByUserId.has(uIdStr)) {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Client';
                const synthClient = {
                    _id: u._id,
                    id: uIdStr,
                    userId: u._id,
                    name: fullName,
                    email: u.email,
                    mobile: u.mobile || '',
                    pan: u.pan || 'N/A',
                    aadhaar: u.aadhaar || 'N/A',
                    status: 'INACTIVE',
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                };
                combinedClients.push(synthClient);
            }
        }
        const allClientIds = combinedClients.map((c) => c._id || c.id);
        const allLookupIds = [...new Set([...allClientIds, ...userIds])];
        const profiles = await db_1.default.ClientProfile.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const profileMap = new Map(profiles.map((p) => [String(p.clientId), p]));
        const subscriptions = await db_1.default.Subscription.find({
            clientId: { $in: allLookupIds }
        })
            .populate('planId')
            .sort({ createdAt: -1 })
            .lean();
        const subMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            if (!subMap.has(cId))
                subMap.set(cId, []);
            subMap.get(cId).push(sub);
        }
        const agreements = await db_1.default.Agreement.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const agMap = new Map();
        for (const ag of agreements) {
            const cId = String(ag.clientId);
            if (!agMap.has(cId))
                agMap.set(cId, []);
            agMap.get(cId).push(ag);
        }
        const documents = await db_1.default.ClientDocument.find({
            clientId: { $in: allLookupIds }
        }).lean();
        const docMap = new Map();
        for (const doc of documents) {
            const cId = String(doc.clientId);
            if (!docMap.has(cId))
                docMap.set(cId, []);
            docMap.get(cId).push(doc);
        }
        const isFullAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        const hasViewSensitive = isFullAdmin;
        let result = combinedClients.map((c) => {
            const cIdStr = String(c._id || c.id);
            const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || cIdStr);
            const user = userMap.get(uIdStr);
            return {
                ...c,
                id: cIdStr,
                user: user ? {
                    ...user,
                    status: user.status,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                    deletedAt: user.deletedAt,
                    deletedBy: user.deletedBy
                } : null,
                profile: (() => {
                    const rawP = profileMap.get(cIdStr) || profileMap.get(uIdStr) || {};
                    return {
                        ...rawP,
                        addressLine1: rawP.addressLine1 || c.addressLine1 || c.address || null,
                        city: rawP.city || c.city || null,
                        state: rawP.state || c.state || null,
                        zipCode: rawP.zipCode || c.zipCode || null
                    };
                })(),
                subscriptions: subMap.get(cIdStr) || subMap.get(uIdStr) || [],
                agreements: agMap.get(cIdStr) || agMap.get(uIdStr) || [],
                documents: docMap.get(cIdStr) || docMap.get(uIdStr) || []
            };
        });
        if (!hasViewSensitive) {
            result = result.map((c) => ({
                ...c,
                email: maskEmail(c.email),
                mobile: maskMobile(c.mobile),
                pan: maskDocument(c.pan),
                aadhaar: maskDocument(c.aadhaar),
                profile: c.profile ? {
                    ...c.profile,
                    panNumber: maskDocument(c.profile.panNumber),
                    aadharNumber: maskDocument(c.profile.aadharNumber)
                } : c.profile
            }));
        }
        return res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAdminDeletedClients = getAdminDeletedClients;
const toggleClientStatus = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        let client = await db_1.default.Client.findById(id).lean();
        let clientUser = null;
        if (client) {
            clientUser = await db_1.default.User.findById(client.userId).lean();
        }
        else {
            client = await db_1.default.Client.findOne({ userId: id }).lean();
            if (client) {
                clientUser = await db_1.default.User.findById(client.userId).lean();
            }
            else {
                clientUser = await db_1.default.User.findById(id).lean();
            }
        }
        if (!clientUser && !client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        const currentStatus = clientUser.status || client?.status || 'ACTIVE';
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        if (client?._id) {
            await db_1.default.Client.findByIdAndUpdate(client._id, { $set: { status: newStatus } });
        }
        await db_1.default.User.findByIdAndUpdate(clientUser._id || clientUser.id, { $set: { status: newStatus } });
        const tenantObj = await db_1.default.Tenant.findById(tenantId).lean();
        if (newStatus === 'ACTIVE') {
            await Promise.resolve().then(() => __importStar(require('../services/emailService'))).then(m => m.sendAccountActivatedEmail({
                toEmail: client?.email || clientUser.email,
                name: client?.name || `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim(),
                companyName: tenantObj?.companyName || 'RAGCP Platform'
            })).catch(e => console.error('[EMAIL] Failed:', e));
        }
        else {
            await Promise.resolve().then(() => __importStar(require('../services/emailService'))).then(m => m.sendAccountDeactivatedEmail({
                toEmail: client?.email || clientUser.email,
                name: client?.name || `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim(),
                companyName: tenantObj?.companyName || 'RAGCP Platform'
            })).catch(e => console.error('[EMAIL] Failed:', e));
        }
        // Log Activity for Client Timeline
        (0, activityService_1.logActivity)({
            tenantId,
            actorType: 'ADMIN',
            actorId: req.user.id,
            actorName: req.user.email || 'Admin',
            targetClientId: client?._id || clientUser?._id || id,
            category: 'STAFF_ACTION',
            action: 'STATUS_CHANGED',
            title: `Account Status Changed to ${newStatus}`,
            description: `Account status updated to ${newStatus} by Admin`,
            status: 'SUCCESS',
            metadata: { previousStatus: currentStatus, newStatus },
            req
        });
        return res.status(200).json({ success: true, message: `Client status updated to ${newStatus}` });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleClientStatus = toggleClientStatus;
const updateClient = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, email, mobile, pan, aadhaar, category, occupation, addressLine1, city, state, zipCode, isTelegramTradeEnabled, isSmsTradeEnabled, telegramChatId, telegramUsername } = req.body;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            const role = await db_1.default.Role.findOne({ name: req.user.role }).lean();
            if (role) {
                const editPerm = await db_1.default.Permission.findOne({ code: 'EDIT_CLIENTS' }).lean();
                if (editPerm) {
                    const hasEdit = await db_1.default.RolePermission.findOne({
                        roleId: role._id,
                        permissionId: editPerm._id
                    }).lean();
                    if (!hasEdit) {
                        return res.status(403).json({
                            success: false,
                            message: 'Access Forbidden: You do not have permission to edit clients.'
                        });
                    }
                }
            }
        }
        let client = await db_1.default.Client.findById(id).lean();
        let clientUser = null;
        let actualClientId = id;
        if (client) {
            clientUser = await db_1.default.User.findById(client.userId).lean();
        }
        else {
            client = await db_1.default.Client.findOne({ userId: id }).lean();
            if (client) {
                clientUser = await db_1.default.User.findById(client.userId).lean();
                actualClientId = client._id || client.id;
            }
            else {
                clientUser = await db_1.default.User.findById(id).lean();
                if (clientUser) {
                    const newC = await db_1.default.Client.create({
                        tenantId,
                        userId: clientUser._id || clientUser.id,
                        name: `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() || clientUser.name || clientUser.email,
                        email: clientUser.email,
                        mobile: clientUser.mobile,
                        pan: pan || 'N/A',
                        aadhaar: aadhaar || 'N/A',
                        category: category || 'INDIVIDUAL',
                        status: clientUser.status || 'ACTIVE'
                    });
                    client = newC.toObject ? newC.toObject() : newC;
                    actualClientId = client._id || client.id;
                }
            }
        }
        if (!clientUser && !client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        let finalEmail = email;
        let finalMobile = mobile;
        let finalPan = pan;
        let finalAadhaar = aadhaar;
        if (finalEmail && finalEmail.includes('*'))
            finalEmail = clientUser?.email || client?.email;
        if (finalMobile && finalMobile.includes('*'))
            finalMobile = clientUser?.mobile || client?.mobile;
        if (finalPan && finalPan.includes('XXXX'))
            finalPan = client?.pan || '';
        if (finalAadhaar && finalAadhaar.includes('XXXX'))
            finalAadhaar = client?.aadhaar || '';
        // Validate name if provided
        if (name !== undefined) {
            if (!name || name.trim().length < 2 || !/^[a-zA-Z\s\.]+$/.test(name.trim())) {
                return res.status(400).json({ success: false, message: 'Client name must contain only letters, dots, and spaces (min 2 chars).' });
            }
        }
        // Validate email if provided
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!finalEmail || !emailRegex.test(finalEmail)) {
                return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
            }
            if (clientUser?._id && finalEmail !== clientUser.email) {
                const existingEmail = await db_1.default.User.findOne({ email: finalEmail, _id: { $ne: clientUser._id } }).lean();
                if (existingEmail) {
                    return res.status(400).json({ success: false, message: 'Email already in use by another user.' });
                }
            }
        }
        // Validate mobile if provided
        if (mobile !== undefined) {
            const mobileRegex = /^[0-9]{10}$/;
            if (!finalMobile || !mobileRegex.test(finalMobile)) {
                return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
            }
            if (clientUser?._id && finalMobile !== clientUser.mobile) {
                const existingMobile = await db_1.default.User.findOne({ mobile: finalMobile, _id: { $ne: clientUser._id } }).lean();
                if (existingMobile) {
                    return res.status(400).json({ success: false, message: 'Mobile number already in use by another user.' });
                }
            }
        }
        // Validate PAN if provided
        if (pan !== undefined && finalPan && finalPan !== 'N/A') {
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(finalPan)) {
                return res.status(400).json({ success: false, message: 'Please enter a valid 10-character PAN.' });
            }
            const existingPan = await db_1.default.Client.findOne({ pan: finalPan, _id: { $ne: actualClientId } }).lean();
            if (existingPan) {
                return res.status(400).json({ success: false, message: 'PAN already in use by another client.' });
            }
        }
        // Validate Aadhaar if provided (skip check if masked with X or dashes)
        const isMaskedAadhaar = finalAadhaar ? /x/i.test(String(finalAadhaar).replace(/[\s-]/g, '')) : false;
        if (aadhaar !== undefined && finalAadhaar && finalAadhaar !== 'N/A' && !isMaskedAadhaar) {
            const cleanAadhaar = String(finalAadhaar).replace(/[\s-]/g, '');
            if (!/^[0-9]{12}$/.test(cleanAadhaar)) {
                return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit Aadhaar number.' });
            }
            const existingAadhaar = await db_1.default.Client.findOne({ aadhaar: cleanAadhaar, _id: { $ne: actualClientId } }).lean();
            if (existingAadhaar) {
                return res.status(400).json({ success: false, message: 'Aadhaar number already in use by another client.' });
            }
        }
        // Update User if user fields were supplied
        if (clientUser?._id) {
            const userUpdate = {};
            if (name !== undefined) {
                const trimmed = name.trim();
                userUpdate.firstName = trimmed.split(' ')[0];
                userUpdate.lastName = trimmed.split(' ').slice(1).join(' ') || 'Client';
            }
            if (email !== undefined && finalEmail) {
                userUpdate.email = finalEmail;
            }
            if (mobile !== undefined && finalMobile) {
                userUpdate.mobile = finalMobile;
            }
            if (Object.keys(userUpdate).length > 0) {
                await db_1.default.User.findByIdAndUpdate(clientUser._id, { $set: userUpdate });
            }
        }
        if (client && pan !== undefined && finalPan && finalPan !== client.pan) {
            await db_1.default.ClientIdentityHistory.create({
                clientId: actualClientId,
                fieldName: 'PAN',
                oldValue: client.pan || 'N/A',
                newValue: finalPan || 'N/A',
                changedBy: 'ADMIN',
                remarks: 'Updated by Admin / Compliance Officer'
            });
        }
        if (client && aadhaar !== undefined && finalAadhaar && finalAadhaar !== client.aadhaar) {
            await db_1.default.ClientIdentityHistory.create({
                clientId: actualClientId,
                fieldName: 'AADHAAR',
                oldValue: client.aadhaar || 'N/A',
                newValue: finalAadhaar || 'N/A',
                changedBy: 'ADMIN',
                remarks: 'Updated by Admin / Compliance Officer'
            });
        }
        let finalState = state;
        if (finalState) {
            const trimmedState = String(finalState).trim();
            const numCode = trimmedState.replace(/^0+/, '');
            const stateDoc = await db_1.default.State.findOne({
                $or: [
                    { name: { $regex: new RegExp(`^${trimmedState}$`, 'i') } },
                    { gstCode: numCode },
                    { gstCode: trimmedState }
                ]
            }).lean();
            if (stateDoc) {
                finalState = stateDoc.name;
            }
        }
        const clientUpdate = {};
        if (name !== undefined)
            clientUpdate.name = name.trim();
        if (email !== undefined && finalEmail)
            clientUpdate.email = finalEmail;
        if (mobile !== undefined && finalMobile)
            clientUpdate.mobile = finalMobile;
        if (pan !== undefined)
            clientUpdate.pan = finalPan;
        if (aadhaar !== undefined)
            clientUpdate.aadhaar = isMaskedAadhaar ? (client?.aadhaar || aadhaar) : finalAadhaar;
        if (addressLine1 !== undefined)
            clientUpdate.address = addressLine1;
        if (city !== undefined)
            clientUpdate.city = city;
        if (finalState !== undefined)
            clientUpdate.state = finalState;
        if (zipCode !== undefined)
            clientUpdate.zipCode = zipCode;
        if (category !== undefined)
            clientUpdate.category = category || 'INDIVIDUAL';
        if (occupation !== undefined)
            clientUpdate.occupation = occupation;
        if (isTelegramTradeEnabled !== undefined) {
            clientUpdate.isTelegramTradeEnabled = isTelegramTradeEnabled === true || isTelegramTradeEnabled === 'true';
        }
        if (isSmsTradeEnabled !== undefined) {
            clientUpdate.isSmsTradeEnabled = isSmsTradeEnabled === true || isSmsTradeEnabled === 'true';
        }
        if (telegramChatId !== undefined) {
            clientUpdate.telegramChatId = telegramChatId ? String(telegramChatId).trim() : null;
        }
        if (telegramUsername !== undefined) {
            clientUpdate.telegramUsername = telegramUsername ? String(telegramUsername).trim().replace(/^@/, '') : null;
        }
        if (Object.keys(clientUpdate).length > 0) {
            await db_1.default.Client.findByIdAndUpdate(actualClientId, { $set: clientUpdate }, { returnDocument: 'after', lean: true });
        }
        if (addressLine1 !== undefined || city !== undefined || state !== undefined || zipCode !== undefined) {
            const profileUpdate = {};
            if (addressLine1 !== undefined)
                profileUpdate.addressLine1 = addressLine1;
            if (city !== undefined)
                profileUpdate.city = city;
            if (finalState !== undefined)
                profileUpdate.state = finalState;
            if (zipCode !== undefined)
                profileUpdate.zipCode = zipCode;
            await db_1.default.ClientProfile.findOneAndUpdate({ clientId: actualClientId }, {
                $set: profileUpdate,
                $setOnInsert: { clientId: actualClientId, country: 'India' }
            }, { upsert: true, returnDocument: 'after' });
        }
        const newClientVal = await db_1.default.Client.findById(actualClientId).lean();
        const newClientProfile = await db_1.default.ClientProfile.findOne({ clientId: actualClientId }).lean();
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'CLIENTS',
            oldValue: client,
            newValue: { ...newClientVal, profile: newClientProfile },
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Client updated successfully',
            data: { ...newClientVal, profile: newClientProfile },
            client: { ...newClientVal, profile: newClientProfile }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateClient = updateClient;
const approveClient = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        let client = null;
        let clientUser = null;
        let actualClientId = id;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            client = await db_1.default.Client.findById(id).lean();
        }
        if (client) {
            const uId = client.userId?._id || client.userId?.id || client.userId;
            if (uId && mongoose_1.default.Types.ObjectId.isValid(uId)) {
                clientUser = await db_1.default.User.findById(uId).lean();
            }
        }
        else {
            if (mongoose_1.default.Types.ObjectId.isValid(id)) {
                client = await db_1.default.Client.findOne({ userId: id }).lean();
                if (client) {
                    actualClientId = client._id || client.id;
                    const uId = client.userId?._id || client.userId?.id || client.userId;
                    clientUser = await db_1.default.User.findById(uId || id).lean();
                }
                else {
                    clientUser = await db_1.default.User.findById(id).lean();
                }
            }
        }
        if (!client && clientUser) {
            client = await db_1.default.Client.findOne({ userId: clientUser._id || clientUser.id }).lean();
            if (client) {
                actualClientId = client._id || client.id;
            }
        }
        if (!clientUser && !client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        const currentStatus = clientUser?.status || client?.status;
        if (currentStatus !== 'PENDING_APPROVAL') {
            return res.status(400).json({ success: false, message: 'Client is not pending approval.' });
        }
        if (clientUser) {
            await db_1.default.User.findByIdAndUpdate(clientUser._id || clientUser.id, {
                $set: { status: 'ACTIVE', tempPassword: null }
            });
        }
        if (client?._id) {
            await db_1.default.Client.findByIdAndUpdate(client._id, {
                $set: { status: 'KYC_PENDING' }
            });
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'APPROVE',
            module: 'CLIENTS',
            oldValue: { status: 'PENDING_APPROVAL' },
            newValue: { status: 'ACTIVE' },
            ipAddress: req.ip
        });
        const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
        const tenant = await db_1.default.Tenant.findById(tenantId).lean();
        if (clientUser?.email) {
            await Promise.resolve().then(() => __importStar(require('../services/emailService'))).then(m => m.sendWelcomeEmail({
                tenantId,
                toEmail: clientUser.email,
                name: client?.name || `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim(),
                password: clientUser.tempPassword || 'Reset using Forgot Password',
                role: 'CLIENT',
                loginUrl,
                companyName: tenant?.companyName || 'RAGCP Platform'
            })).catch(e => console.error('[EMAIL] Failed to send welcome email:', e));
        }
        return res.status(200).json({
            success: true,
            message: 'Client approved successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.approveClient = approveClient;
const deleteClient = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        let client = null;
        let clientUser = null;
        let actualClientId = id;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            client = await db_1.default.Client.findById(id).lean();
        }
        if (client) {
            const uId = client.userId?._id || client.userId?.id || client.userId;
            if (uId && mongoose_1.default.Types.ObjectId.isValid(uId)) {
                clientUser = await db_1.default.User.findById(uId).lean();
            }
        }
        else {
            if (mongoose_1.default.Types.ObjectId.isValid(id)) {
                client = await db_1.default.Client.findOne({ userId: id }).lean();
                if (client) {
                    actualClientId = client._id || client.id;
                    const uId = client.userId?._id || client.userId?.id || client.userId;
                    clientUser = await db_1.default.User.findById(uId || id).lean();
                }
                else {
                    clientUser = await db_1.default.User.findById(id).lean();
                }
            }
        }
        if (!client && clientUser) {
            client = await db_1.default.Client.findOne({ userId: clientUser._id || clientUser.id }).lean();
            if (client) {
                actualClientId = client._id || client.id;
            }
        }
        if (!client && !clientUser) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        if (Boolean(clientUser?.deletedAt) || Boolean(client?.deletedAt)) {
            return res.status(400).json({ success: false, message: 'Client is already deleted.' });
        }
        const now = new Date();
        const deleteSuffix = `_deleted_${actualClientId}`;
        if (clientUser) {
            const newEmail = clientUser.email?.includes('_deleted_') ? clientUser.email : `${clientUser.email}${deleteSuffix}`;
            const newMobile = clientUser.mobile ? (clientUser.mobile.includes('_deleted_') ? clientUser.mobile : `${clientUser.mobile}${deleteSuffix}`) : clientUser.mobile;
            await db_1.default.User.findByIdAndUpdate(clientUser._id || clientUser.id, {
                $set: {
                    deletedAt: now,
                    deletedBy: req.user.id || 'ADMIN',
                    status: 'INACTIVE',
                    email: newEmail,
                    mobile: newMobile
                }
            });
        }
        if (client?._id) {
            const cEmail = client.email ? (client.email.includes('_deleted_') ? client.email : `${client.email}${deleteSuffix}`) : client.email;
            const cMobile = client.mobile ? (client.mobile.includes('_deleted_') ? client.mobile : `${client.mobile}${deleteSuffix}`) : client.mobile;
            const cPan = client.pan ? (client.pan.includes('_deleted_') ? client.pan : `${client.pan}${deleteSuffix}`) : client.pan;
            const cAadhaar = client.aadhaar ? (client.aadhaar.includes('_deleted_') ? client.aadhaar : `${client.aadhaar}${deleteSuffix}`) : client.aadhaar;
            await db_1.default.Client.findByIdAndUpdate(client._id, {
                $set: {
                    deletedAt: now,
                    status: 'INACTIVE',
                    email: cEmail,
                    mobile: cMobile,
                    pan: cPan,
                    aadhaar: cAadhaar
                }
            });
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'DELETE',
            module: 'CLIENTS',
            oldValue: client || clientUser,
            newValue: { ...(client || clientUser), deletedAt: now, status: 'INACTIVE' },
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Client soft-deleted successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.deleteClient = deleteClient;
const restoreClient = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    try {
        let client = null;
        let clientUser = null;
        let actualClientId = id;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            client = await db_1.default.Client.findById(id).lean();
        }
        if (client) {
            const uId = client.userId?._id || client.userId?.id || client.userId;
            if (uId && mongoose_1.default.Types.ObjectId.isValid(uId)) {
                clientUser = await db_1.default.User.findById(uId).lean();
            }
        }
        else {
            if (mongoose_1.default.Types.ObjectId.isValid(id)) {
                client = await db_1.default.Client.findOne({ userId: id }).lean();
                if (client) {
                    actualClientId = client._id || client.id;
                    const uId = client.userId?._id || client.userId?.id || client.userId;
                    clientUser = await db_1.default.User.findById(uId || id).lean();
                }
                else {
                    clientUser = await db_1.default.User.findById(id).lean();
                }
            }
        }
        if (!client && clientUser) {
            client = await db_1.default.Client.findOne({ userId: clientUser._id || clientUser.id }).lean();
            if (client) {
                actualClientId = client._id || client.id;
            }
        }
        if (!client && !clientUser) {
            return res.status(404).json({ success: false, message: 'Deleted client not found.' });
        }
        if (!Boolean(clientUser?.deletedAt) && !Boolean(client?.deletedAt)) {
            return res.status(400).json({ success: false, message: 'Client is not deleted.' });
        }
        const deleteSuffixRegex = /_deleted_[a-zA-Z0-9_-]+$/;
        const origEmail = clientUser?.email ? clientUser.email.replace(deleteSuffixRegex, '') : (client?.email ? client.email.replace(deleteSuffixRegex, '') : '');
        const origMobile = clientUser?.mobile ? clientUser.mobile.replace(deleteSuffixRegex, '') : (client?.mobile ? client.mobile.replace(deleteSuffixRegex, '') : '');
        const origPan = client?.pan ? client.pan.replace(deleteSuffixRegex, '') : '';
        const origAadhaar = client?.aadhaar ? client.aadhaar.replace(deleteSuffixRegex, '') : '';
        if (origEmail) {
            const dupEmail = await db_1.default.User.findOne({
                email: origEmail,
                deletedAt: null,
                _id: { $ne: clientUser?._id || clientUser?.id }
            }).lean();
            if (dupEmail)
                return res.status(400).json({ success: false, message: 'Cannot restore: Email is already in use by another active account.' });
        }
        if (origMobile) {
            const dupMobile = await db_1.default.User.findOne({
                mobile: origMobile,
                deletedAt: null,
                _id: { $ne: clientUser?._id || clientUser?.id }
            }).lean();
            if (dupMobile)
                return res.status(400).json({ success: false, message: 'Cannot restore: Mobile is already in use by another active account.' });
        }
        if (origPan && origPan !== 'N/A') {
            const dupPan = await db_1.default.Client.findOne({
                pan: origPan,
                _id: { $ne: client?._id }
            }).populate('userId').lean();
            if (dupPan && !dupPan.userId?.deletedAt) {
                return res.status(400).json({ success: false, message: 'Cannot restore: PAN is already in use by another active account.' });
            }
        }
        if (clientUser) {
            await db_1.default.User.findByIdAndUpdate(clientUser._id || clientUser.id, {
                $set: {
                    deletedAt: null,
                    deletedBy: null,
                    status: 'ACTIVE',
                    email: origEmail,
                    mobile: origMobile
                }
            });
        }
        if (client?._id) {
            await db_1.default.Client.findByIdAndUpdate(client._id, {
                $set: {
                    deletedAt: null,
                    status: 'ACTIVE',
                    email: origEmail,
                    mobile: origMobile,
                    pan: origPan,
                    aadhaar: origAadhaar
                }
            });
        }
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'RESTORE',
            module: 'CLIENTS',
            oldValue: { deletedAt: clientUser?.deletedAt || client?.deletedAt },
            newValue: { deletedAt: null, status: 'ACTIVE' },
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Client restored successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.restoreClient = restoreClient;
// =====================================================
// PLAN CATEGORY MANAGEMENT
// =====================================================
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
const getAdminCategories = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const relatedTenantIds = await getRelatedTenantIds(tenantId, req.user?.id);
        const rawCategories = await db_1.default.PlanCategory.find({
            $or: [
                { tenantId: { $in: relatedTenantIds } },
                { tenantId: null }
            ]
        })
            .sort({ createdAt: -1 })
            .lean();
        const isFullAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
        let includeCounts = isFullAdmin;
        if (!isFullAdmin) {
            let tenantObj = null;
            if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                tenantObj = await db_1.default.Tenant.findById(tenantId).select('showCategoryClientCountToResearcher').lean();
            }
            if (!tenantObj && tenantId) {
                tenantObj = await db_1.default.Tenant.findOne({
                    $or: [{ id: tenantId }, { tenantId: tenantId }]
                }).select('showCategoryClientCountToResearcher').lean();
            }
            includeCounts = tenantObj?.showCategoryClientCountToResearcher === true;
        }
        let plans = [];
        let validSubs = [];
        let allSubs = [];
        if (includeCounts && rawCategories.length > 0) {
            const categoryIds = rawCategories.map((c) => c._id);
            plans = await db_1.default.Plan.find({
                tenantId: { $in: relatedTenantIds },
                categoryId: { $in: categoryIds },
                deletedAt: null
            }).select('_id name categoryId').lean();
            if (plans.length > 0) {
                const now = new Date();
                allSubs = await db_1.default.Subscription.find({
                    $or: [
                        { tenantId: { $in: relatedTenantIds } },
                        { tenantId: null },
                        { tenantId: { $exists: false } }
                    ],
                    planId: { $in: plans.map((p) => p._id) }
                }).select('_id clientId planId startDate endDate status').lean();
                validSubs = allSubs.filter((sub) => {
                    if (!['ACTIVE', 'active'].includes(sub.status))
                        return false;
                    if (!sub.endDate)
                        return false;
                    const end = new Date(sub.endDate);
                    const endOfDayUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
                    const endOfDayLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
                    return Math.max(end.getTime(), endOfDayUtc.getTime(), endOfDayLocal.getTime()) >= now.getTime();
                });
            }
        }
        const formatted = rawCategories.map(c => {
            const catPlans = plans.filter((p) => String(p.categoryId) === String(c._id));
            const plansCount = catPlans.length;
            if (!includeCounts) {
                return {
                    ...c,
                    id: String(c._id || c.id),
                    _id: c._id,
                    plansCount,
                    activeClientCount: null,
                    expiredClientCount: null,
                    plansBreakdown: []
                };
            }
            const catPlanIds = catPlans.map((p) => String(p._id));
            const catActiveSubs = validSubs.filter((sub) => catPlanIds.includes(String(sub.planId)));
            const distinctActiveClients = new Set(catActiveSubs.map((sub) => String(sub.clientId)));
            // Expired clients for this category (Only for full admin)
            let expiredCount = null;
            if (isFullAdmin) {
                const now = new Date();
                const catAllSubs = allSubs.filter((sub) => catPlanIds.includes(String(sub.planId)));
                const catExpiredSubs = catAllSubs.filter((sub) => {
                    if (['EXPIRED', 'expired'].includes(sub.status))
                        return true;
                    if (!sub.endDate)
                        return true;
                    return new Date(sub.endDate).getTime() < now.getTime();
                });
                const distinctExpired = new Set(catExpiredSubs.map((sub) => String(sub.clientId)).filter(cid => !distinctActiveClients.has(cid)));
                expiredCount = distinctExpired.size;
            }
            const plansBreakdown = catPlans.map((p) => {
                const pSubs = catActiveSubs.filter((sub) => String(sub.planId) === String(p._id));
                const pDistinctClients = new Set(pSubs.map((sub) => String(sub.clientId)));
                let pExpiredCount = undefined;
                if (isFullAdmin) {
                    const now = new Date();
                    const pAllSubs = allSubs.filter((sub) => String(sub.planId) === String(p._id));
                    const pExpSubs = pAllSubs.filter((sub) => {
                        if (['EXPIRED', 'expired'].includes(sub.status))
                            return true;
                        if (!sub.endDate)
                            return true;
                        return new Date(sub.endDate).getTime() < now.getTime();
                    });
                    const pDistinctExp = new Set(pExpSubs.map((sub) => String(sub.clientId)).filter(cid => !pDistinctClients.has(cid)));
                    pExpiredCount = pDistinctExp.size;
                }
                return {
                    planId: String(p._id),
                    planName: p.name,
                    activeClientCount: pDistinctClients.size,
                    expiredClientCount: isFullAdmin ? pExpiredCount : undefined
                };
            });
            const totalActivePlanSubscribers = plansBreakdown.reduce((sum, p) => sum + (p.activeClientCount || 0), 0);
            const totalExpiredPlanSubscribers = isFullAdmin
                ? plansBreakdown.reduce((sum, p) => sum + (p.expiredClientCount || 0), 0)
                : null;
            return {
                ...c,
                id: String(c._id || c.id),
                _id: c._id,
                plansCount,
                activeClientCount: totalActivePlanSubscribers,
                expiredClientCount: totalExpiredPlanSubscribers,
                distinctActiveClientsCount: distinctActiveClients.size,
                plansBreakdown
            };
        });
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAdminCategories = getAdminCategories;
const createCategory = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { name, segments } = req.body;
    if (!name || !name.trim())
        return res.status(400).json({ success: false, message: 'Category name is required.' });
    if (!segments || !segments.trim())
        return res.status(400).json({ success: false, message: 'Segments are required.' });
    try {
        const existing = await db_1.default.PlanCategory.findOne({
            tenantId,
            name: name.trim().toUpperCase()
        }).lean();
        if (existing)
            return res.status(400).json({ success: false, message: 'Category already exists.' });
        const category = await db_1.default.PlanCategory.create({
            tenantId,
            name: name.trim().toUpperCase(),
            segments: segments.trim()
        });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'CATEGORY_UPDATE' }).catch(() => { });
        return res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { name } = req.body;
    if (!name || !name.trim())
        return res.status(400).json({ success: false, message: 'Category name is required.' });
    try {
        const category = await db_1.default.PlanCategory.findOne({ _id: id, tenantId });
        if (!category)
            return res.status(404).json({ success: false, message: 'Category not found.' });
        const updated = await db_1.default.PlanCategory.findByIdAndUpdate(id, { $set: { name: name.trim().toUpperCase() } }, { returnDocument: 'after', lean: true });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'CATEGORY_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, message: 'Category updated successfully', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateCategory = updateCategory;
const toggleCategoryStatus = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const category = await db_1.default.PlanCategory.findOne({ _id: id, tenantId }).lean();
        if (!category)
            return res.status(404).json({ success: false, message: 'Category not found.' });
        const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const updated = await db_1.default.PlanCategory.findByIdAndUpdate(id, { $set: { status: newStatus } }, { returnDocument: 'after', lean: true });
        await db_1.default.Plan.updateMany({ categoryId: id }, { $set: { status: newStatus } });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'CATEGORY_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, message: `Category status updated to ${newStatus}`, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleCategoryStatus = toggleCategoryStatus;
// =====================================================
// PLAN MANAGEMENT (Admin View)
// =====================================================
const getAdminPlans = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN' || req.user.role === 'RESEARCHER';
        const relatedTenantIds = await getRelatedTenantIds(tenantId, req.user?.id);
        let filterQuery = {
            $or: [
                { tenantId: { $in: relatedTenantIds } },
                { tenantId: null }
            ],
            deletedAt: null
        };
        if (!isFullAdmin) {
            const userRole = await db_1.default.Role.findOne({ name: req.user.role }).lean();
            const roleId = userRole?._id || userRole?.id;
            const hasViewAll = await db_1.default.RolePermission.findOne({
                roleId,
                permissionId: { $in: (await db_1.default.Permission.find({ code: 'VIEW_ALL_PLANS' }).lean()).map((p) => p._id || p.id) }
            }).lean();
            const hasResearchAccess = await db_1.default.RolePermission.findOne({
                roleId,
                permissionId: { $in: (await db_1.default.Permission.find({ code: { $in: ['ADD_RESEARCH', 'OWN_RESEARCH'] } }).lean()).map((p) => p._id || p.id) }
            }).lean();
            if (!hasViewAll && !hasResearchAccess) {
                filterQuery.createdById = req.user.id;
            }
        }
        const plans = await db_1.default.Plan.find(filterQuery)
            .populate('categoryId')
            .sort({ createdAt: -1 })
            .lean();
        const formattedPlans = plans.map((p) => {
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
        return res.status(200).json({ success: true, data: formattedPlans });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAdminPlans = getAdminPlans;
const createPlan = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { categoryId, name, description, price, durationMonths, researchSegments, notificationsAllowed, clientLimit } = req.body;
    if (!categoryId)
        return res.status(400).json({ success: false, message: 'Category is required.' });
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        return res.status(400).json({ success: false, message: 'Plan price must be a positive number.' });
    }
    if (!durationMonths || isNaN(parseInt(durationMonths)) || parseInt(durationMonths) < 1) {
        return res.status(400).json({ success: false, message: 'Duration must be at least 1 month.' });
    }
    try {
        let category = null;
        const catIdStr = String(categoryId).trim();
        const isCatObjectId = mongoose_1.default.Types.ObjectId.isValid(catIdStr);
        if (isCatObjectId) {
            category = await db_1.default.PlanCategory.findOne({
                _id: catIdStr,
                $or: [{ tenantId }, { tenantId: null }]
            }).lean();
        }
        if (!category) {
            const cleanCatName = catIdStr.replace(/\s*\([^)]*\)\s*$/, '').trim();
            category = await db_1.default.PlanCategory.findOne({
                tenantId,
                $or: [
                    { name: { $regex: new RegExp(`^${cleanCatName}$`, 'i') } },
                    { name: catIdStr },
                    { segments: { $regex: new RegExp(cleanCatName, 'i') } }
                ]
            }).lean();
        }
        if (!category) {
            category = await db_1.default.PlanCategory.findOne({ tenantId }).lean();
            if (!category) {
                const cleanName = catIdStr.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Standard Service Category';
                category = await db_1.default.PlanCategory.create({
                    tenantId,
                    name: cleanName,
                    segments: 'EQUITY,DERIVATIVE',
                    status: 'ACTIVE'
                });
            }
        }
        const months = parseInt(durationMonths) || 1;
        const getDurationLabel = (m) => {
            switch (m) {
                case 1: return 'Monthly';
                case 2: return '2 Months';
                case 3: return 'Quarterly';
                case 6: return 'Half-Yearly';
                case 12: return 'Yearly';
                default: return `${m} Months`;
            }
        };
        const finalPlanName = (name && name.trim())
            ? name.trim().toUpperCase()
            : `${category.name || 'PLAN'} - ${getDurationLabel(months)}`.toUpperCase();
        const plan = await db_1.default.Plan.create({
            tenantId,
            categoryId: category._id || category.id,
            name: finalPlanName,
            description: description || '',
            price: parseFloat(price),
            durationMonths: months,
            researchSegments: researchSegments || category.segments || 'EQUITY',
            notificationsAllowed: notificationsAllowed || 'EMAIL,INAPP',
            clientLimit: parseInt(clientLimit) || 100,
            createdById: req.user.id,
            deletedAt: null
        });
        await (0, auditService_1.logAudit)({ tenantId, userId: req.user.id, action: 'CREATE', module: 'TENANTS', newValue: plan, ipAddress: req.ip });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => { });
        return res.status(201).json({ success: true, message: 'Plan created successfully', data: plan });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.createPlan = createPlan;
const updatePlan = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { categoryId, name, description, price, durationMonths, notificationsAllowed, clientLimit } = req.body;
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        return res.status(400).json({ success: false, message: 'Plan price must be a positive number.' });
    }
    try {
        const existing = await db_1.default.Plan.findOne({ _id: id, tenantId }).lean();
        if (!existing || Boolean(existing.deletedAt))
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        let newCategoryId = existing.categoryId;
        let newSegments = existing.researchSegments;
        let category = null;
        if (categoryId) {
            const catIdStr = String(categoryId).trim();
            const isCatObjectId = mongoose_1.default.Types.ObjectId.isValid(catIdStr);
            if (isCatObjectId) {
                category = await db_1.default.PlanCategory.findOne({
                    _id: catIdStr,
                    $or: [{ tenantId }, { tenantId: null }]
                }).lean();
            }
            if (!category) {
                const cleanCatName = catIdStr.replace(/\s*\([^)]*\)\s*$/, '').trim();
                category = await db_1.default.PlanCategory.findOne({
                    tenantId,
                    $or: [
                        { name: { $regex: new RegExp(`^${cleanCatName}$`, 'i') } },
                        { name: catIdStr }
                    ]
                }).lean();
            }
            if (category) {
                newCategoryId = category._id || category.id;
                newSegments = category.segments;
            }
        }
        if (!category && newCategoryId) {
            category = await db_1.default.PlanCategory.findById(newCategoryId).lean();
        }
        const months = parseInt(durationMonths) || existing.durationMonths || 1;
        const getDurationLabel = (m) => {
            switch (m) {
                case 1: return 'Monthly';
                case 2: return '2 Months';
                case 3: return 'Quarterly';
                case 6: return 'Half-Yearly';
                case 12: return 'Yearly';
                default: return `${m} Months`;
            }
        };
        const finalPlanName = (name && name.trim())
            ? name.trim().toUpperCase()
            : (category ? `${category.name} - ${getDurationLabel(months)}`.toUpperCase() : existing.name);
        const updated = await db_1.default.Plan.findByIdAndUpdate(id, {
            $set: {
                categoryId: newCategoryId,
                name: finalPlanName,
                description: description || '',
                price: parseFloat(price),
                durationMonths: months,
                researchSegments: newSegments,
                notificationsAllowed: notificationsAllowed || existing.notificationsAllowed,
                clientLimit: parseInt(clientLimit) || existing.clientLimit
            }
        }, { returnDocument: 'after', lean: true });
        await (0, auditService_1.logAudit)({ tenantId, userId: req.user.id, action: 'UPDATE', module: 'TENANTS', oldValue: existing, newValue: updated, ipAddress: req.ip });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, message: 'Plan updated successfully', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updatePlan = updatePlan;
const deletePlan = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const existing = await db_1.default.Plan.findOne({ _id: id, tenantId }).lean();
        if (!existing || Boolean(existing.deletedAt))
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        await db_1.default.Plan.findByIdAndUpdate(id, {
            $set: { deletedAt: new Date(), status: 'INACTIVE' }
        });
        await (0, auditService_1.logAudit)({ tenantId, userId: req.user.id, action: 'DELETE', module: 'TENANTS', oldValue: existing, ipAddress: req.ip });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.deletePlan = deletePlan;
const restorePlan = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const existing = await db_1.default.Plan.findOne({ _id: id, tenantId }).lean();
        if (!existing || !Boolean(existing.deletedAt))
            return res.status(404).json({ success: false, message: 'Deleted plan not found.' });
        const updated = await db_1.default.Plan.findByIdAndUpdate(id, { $set: { deletedAt: null, status: 'ACTIVE' } }, { returnDocument: 'after', lean: true });
        await (0, auditService_1.logAudit)({ tenantId, userId: req.user.id, action: 'UPDATE', module: 'TENANTS', oldValue: existing, newValue: updated, ipAddress: req.ip });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, message: 'Plan restored successfully.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.restorePlan = restorePlan;
const togglePlanStatus = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const existing = await db_1.default.Plan.findOne({ _id: id, tenantId }).lean();
        if (!existing || Boolean(existing.deletedAt))
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await db_1.default.Plan.findByIdAndUpdate(id, { $set: { status: newStatus } });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, message: `Plan status updated to ${newStatus}` });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.togglePlanStatus = togglePlanStatus;
const updateTenantSettings = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { themeColor, companyName, companyEmail, gstEnabled, gstCalculationType, invoiceDispatchPolicy, state, gst, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, ccInvoiceEnabled, ccInvoiceEmail, ccAgreementEnabled, ccAgreementEmail, bankAccountName, bankAccountNo, bankAccountType, bankIfsc, bankName, bankBranch, socialMediaLinks, digioClientId, digioClientSecret, digioKycTemplateName, digioEnvironment, camsClientCode, camsClientId, camsClientSecret, camsPoscode, agreementContent, kycFirst, welcomeEmailText, reportDisclaimer, kraProvider, kraApiKey, kraApiSecret, activePaymentGateway, paymentGatewayEnabled, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey, ccavenueMerchantId, ccavenueAccessCode, ccavenueWorkingKey, stripePublishableKey, stripeSecretKey, upiQrEnabled, upiId, upiPayeeName, upiQrImageUrl, upiInstructions, address, website, mobile, passwordPolicy, client2FAEnabled, twoFactorChannel, signupVerificationMode, lockedTradesPreviewCount, showOpenTradePotential, showLockedTradePotential, smsGatewayEnabled, smsGatewayUrl, smsUsername, smsPassword, smsSenderId, smsEntityId, telegramTradeEnabled, smsTradeEnabled, telegramBotToken, telegramBotUsername, telegramJoinRule } = req.body;
    const files = req.files;
    try {
        let oldTenant = null;
        if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
            oldTenant = await db_1.default.Tenant.findById(tenantId).lean();
        }
        if (!oldTenant && tenantId) {
            oldTenant = await db_1.default.Tenant.findOne({
                $or: [{ id: tenantId }, { tenantId: tenantId }]
            }).lean();
        }
        if (!oldTenant) {
            oldTenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        }
        if (!oldTenant)
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        // Validate GSTIN when GST is enabled
        if (gstEnabled !== undefined) {
            const isGst = gstEnabled === 'true' || gstEnabled === true;
            if (isGst) {
                const gstinToCheck = gst !== undefined ? gst : oldTenant?.gst;
                if (!gstinToCheck || typeof gstinToCheck !== 'string' || gstinToCheck.trim().length < 15) {
                    return res.status(400).json({
                        success: false,
                        message: 'GST is enabled. A valid 15-digit Company GSTIN is mandatory.'
                    });
                }
            }
        }
        else if (oldTenant?.gstEnabled !== false && gst !== undefined && gst.trim() !== '') {
            if (gst.trim().length < 15) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 15-digit Company GSTIN number.'
                });
            }
        }
        const dataToUpdate = {};
        if (gstEnabled !== undefined) {
            dataToUpdate.gstEnabled = gstEnabled === 'true' || gstEnabled === true;
        }
        if (invoiceDispatchPolicy !== undefined) {
            dataToUpdate.invoiceDispatchPolicy = invoiceDispatchPolicy === 'IMMEDIATE_ON_PAYMENT'
                ? 'IMMEDIATE_ON_PAYMENT'
                : 'AFTER_KYC_AGREEMENT';
        }
        if (passwordPolicy !== undefined)
            dataToUpdate.passwordPolicy = passwordPolicy === 'STRONG' ? 'STRONG' : 'NORMAL';
        if (client2FAEnabled !== undefined)
            dataToUpdate.client2FAEnabled = client2FAEnabled === 'true' || client2FAEnabled === true;
        if (twoFactorChannel !== undefined)
            dataToUpdate.twoFactorChannel = twoFactorChannel;
        if (signupVerificationMode !== undefined) {
            dataToUpdate.signupVerificationMode = ['EMAIL_ONLY', 'MOBILE_ONLY', 'BOTH'].includes(signupVerificationMode) ? signupVerificationMode : 'EMAIL_ONLY';
        }
        if (lockedTradesPreviewCount !== undefined) {
            const parsedCount = parseInt(lockedTradesPreviewCount, 10);
            dataToUpdate.lockedTradesPreviewCount = isNaN(parsedCount) ? 5 : Math.max(0, Math.min(parsedCount, 50));
        }
        if (showOpenTradePotential !== undefined) {
            dataToUpdate.showOpenTradePotential = showOpenTradePotential === 'true' || showOpenTradePotential === true;
        }
        if (showLockedTradePotential !== undefined) {
            dataToUpdate.showLockedTradePotential = showLockedTradePotential === 'true' || showLockedTradePotential === true;
        }
        if (smsGatewayEnabled !== undefined)
            dataToUpdate.smsGatewayEnabled = smsGatewayEnabled === 'true' || smsGatewayEnabled === true;
        if (smsGatewayUrl !== undefined)
            dataToUpdate.smsGatewayUrl = smsGatewayUrl ? smsGatewayUrl.trim() : null;
        if (smsUsername !== undefined)
            dataToUpdate.smsUsername = smsUsername ? smsUsername.trim() : null;
        if (smsPassword !== undefined && smsPassword.trim() !== '')
            dataToUpdate.smsPassword = smsPassword.trim();
        if (smsSenderId !== undefined)
            dataToUpdate.smsSenderId = smsSenderId ? smsSenderId.trim() : null;
        if (smsEntityId !== undefined)
            dataToUpdate.smsEntityId = smsEntityId ? smsEntityId.trim() : null;
        if (telegramTradeEnabled !== undefined)
            dataToUpdate.telegramTradeEnabled = telegramTradeEnabled === 'true' || telegramTradeEnabled === true;
        if (smsTradeEnabled !== undefined)
            dataToUpdate.smsTradeEnabled = smsTradeEnabled === 'true' || smsTradeEnabled === true;
        if (telegramBotToken !== undefined)
            dataToUpdate.telegramBotToken = telegramBotToken ? telegramBotToken.trim() : null;
        if (telegramBotUsername !== undefined)
            dataToUpdate.telegramBotUsername = telegramBotUsername ? telegramBotUsername.trim().replace(/^@/, '') : null;
        if (telegramJoinRule !== undefined)
            dataToUpdate.telegramJoinRule = ['ALL', 'KYC_AGREEMENT_VERIFIED', 'ACTIVE_PLAN_ONLY'].includes(telegramJoinRule) ? telegramJoinRule : 'ALL';
        if (themeColor)
            dataToUpdate.themeColor = themeColor;
        if (companyName)
            dataToUpdate.companyName = companyName;
        if (companyEmail)
            dataToUpdate.email = companyEmail;
        if (gstCalculationType)
            dataToUpdate.gstCalculationType = gstCalculationType;
        if (gst !== undefined && gst.trim() !== '') {
            dataToUpdate.gst = gst.trim().toUpperCase();
        }
        else if (gst !== undefined && (gstEnabled === 'false' || gstEnabled === false) && oldTenant?.gst) {
            dataToUpdate.gst = oldTenant.gst;
        }
        else if (gst !== undefined) {
            dataToUpdate.gst = gst ? gst.trim().toUpperCase() : null;
        }
        if (state !== undefined)
            dataToUpdate.state = state;
        if (address !== undefined && typeof address === 'string' && address.trim() !== '')
            dataToUpdate.address = address.trim();
        if (website !== undefined && typeof website === 'string' && website.trim() !== '')
            dataToUpdate.website = website.trim();
        if (mobile !== undefined && typeof mobile === 'string' && mobile.trim() !== '')
            dataToUpdate.mobile = mobile.trim();
        if (smtpHost !== undefined)
            dataToUpdate.smtpHost = smtpHost ? smtpHost.trim() : null;
        if (bankAccountName !== undefined)
            dataToUpdate.bankAccountName = bankAccountName;
        if (bankAccountNo !== undefined)
            dataToUpdate.bankAccountNo = bankAccountNo;
        if (bankAccountType !== undefined)
            dataToUpdate.bankAccountType = bankAccountType;
        if (bankIfsc !== undefined)
            dataToUpdate.bankIfsc = bankIfsc;
        if (bankName !== undefined)
            dataToUpdate.bankName = bankName;
        if (bankBranch !== undefined)
            dataToUpdate.bankBranch = bankBranch;
        if (socialMediaLinks !== undefined)
            dataToUpdate.socialMediaLinks = socialMediaLinks;
        if (digioClientId !== undefined)
            dataToUpdate.digioClientId = digioClientId;
        if (digioClientSecret !== undefined)
            dataToUpdate.digioClientSecret = digioClientSecret;
        if (digioKycTemplateName !== undefined)
            dataToUpdate.digioKycTemplateName = digioKycTemplateName;
        if (digioEnvironment !== undefined)
            dataToUpdate.digioEnvironment = digioEnvironment;
        if (camsClientCode !== undefined)
            dataToUpdate.camsClientCode = camsClientCode ? camsClientCode.trim() : null;
        if (camsClientId !== undefined)
            dataToUpdate.camsClientId = camsClientId ? camsClientId.trim() : null;
        if (camsClientSecret !== undefined && camsClientSecret.trim() !== '')
            dataToUpdate.camsClientSecret = camsClientSecret.trim();
        if (camsPoscode !== undefined)
            dataToUpdate.camsPoscode = camsPoscode ? camsPoscode.trim() : null;
        if (agreementContent !== undefined)
            dataToUpdate.agreementContent = agreementContent;
        if (kraProvider !== undefined)
            dataToUpdate.kraProvider = kraProvider;
        if (kraApiKey !== undefined)
            dataToUpdate.kraApiKey = kraApiKey;
        if (kraApiSecret !== undefined)
            dataToUpdate.kraApiSecret = kraApiSecret;
        if (activePaymentGateway !== undefined)
            dataToUpdate.activePaymentGateway = activePaymentGateway;
        if (paymentGatewayEnabled !== undefined)
            dataToUpdate.paymentGatewayEnabled = paymentGatewayEnabled === 'true' || paymentGatewayEnabled === true;
        if (razorpayKeyId !== undefined)
            dataToUpdate.razorpayKeyId = razorpayKeyId;
        if (razorpayKeySecret !== undefined)
            dataToUpdate.razorpayKeySecret = razorpayKeySecret;
        if (cashfreeAppId !== undefined)
            dataToUpdate.cashfreeAppId = cashfreeAppId;
        if (cashfreeSecretKey !== undefined)
            dataToUpdate.cashfreeSecretKey = cashfreeSecretKey;
        if (ccavenueMerchantId !== undefined)
            dataToUpdate.ccavenueMerchantId = ccavenueMerchantId;
        if (ccavenueAccessCode !== undefined)
            dataToUpdate.ccavenueAccessCode = ccavenueAccessCode;
        if (ccavenueWorkingKey !== undefined)
            dataToUpdate.ccavenueWorkingKey = ccavenueWorkingKey;
        if (stripePublishableKey !== undefined)
            dataToUpdate.stripePublishableKey = stripePublishableKey;
        if (stripeSecretKey !== undefined)
            dataToUpdate.stripeSecretKey = stripeSecretKey;
        if (upiQrEnabled !== undefined)
            dataToUpdate.upiQrEnabled = upiQrEnabled === 'true' || upiQrEnabled === true;
        if (upiId !== undefined)
            dataToUpdate.upiId = upiId ? upiId.trim() : null;
        if (upiPayeeName !== undefined)
            dataToUpdate.upiPayeeName = upiPayeeName ? upiPayeeName.trim() : null;
        if (upiQrImageUrl !== undefined)
            dataToUpdate.upiQrImageUrl = upiQrImageUrl ? upiQrImageUrl.trim() : null;
        if (upiInstructions !== undefined)
            dataToUpdate.upiInstructions = upiInstructions ? upiInstructions.trim() : null;
        if (smtpPort !== undefined)
            dataToUpdate.smtpPort = smtpPort ? (parseInt(smtpPort, 10) || 587) : null;
        if (smtpUser !== undefined)
            dataToUpdate.smtpUser = smtpUser ? smtpUser.trim() : null;
        if (smtpPassword !== undefined && smtpPassword.trim() !== '') {
            dataToUpdate.smtpPassword = smtpPassword.trim();
        }
        if (smtpFrom !== undefined) {
            dataToUpdate.smtpFrom = smtpFrom ? smtpFrom.trim() : null;
        }
        else if (dataToUpdate.smtpUser || oldTenant?.smtpUser) {
            dataToUpdate.smtpFrom = dataToUpdate.smtpUser || oldTenant?.smtpUser;
        }
        if (ccInvoiceEnabled !== undefined)
            dataToUpdate.ccInvoiceEnabled = ccInvoiceEnabled === 'true' || ccInvoiceEnabled === true;
        if (ccInvoiceEmail !== undefined)
            dataToUpdate.ccInvoiceEmail = ccInvoiceEmail ? ccInvoiceEmail.trim() : null;
        if (ccAgreementEnabled !== undefined)
            dataToUpdate.ccAgreementEnabled = ccAgreementEnabled === 'true' || ccAgreementEnabled === true;
        if (ccAgreementEmail !== undefined)
            dataToUpdate.ccAgreementEmail = ccAgreementEmail ? ccAgreementEmail.trim() : null;
        if (req.body.showCategoryClientCountToResearcher !== undefined) {
            dataToUpdate.showCategoryClientCountToResearcher = req.body.showCategoryClientCountToResearcher === 'true' || req.body.showCategoryClientCountToResearcher === true;
        }
        // Strict SEBI compliance: Always keep kycFirst = true (KYC Before Payment)
        dataToUpdate.kycFirst = true;
        if (req.body.l2ApprovalEnabled !== undefined) {
            dataToUpdate.l2ApprovalEnabled = req.body.l2ApprovalEnabled === 'true' || req.body.l2ApprovalEnabled === true;
        }
        if (req.body.l2ApprovalRoleId !== undefined) {
            dataToUpdate.l2ApprovalRoleId = req.body.l2ApprovalRoleId ? String(req.body.l2ApprovalRoleId).trim() : null;
        }
        if (req.body.fileDownloadPolicy !== undefined) {
            dataToUpdate.fileDownloadPolicy = req.body.fileDownloadPolicy;
        }
        if (req.body.fileDownloadNotificationEmail !== undefined) {
            dataToUpdate.fileDownloadNotificationEmail = req.body.fileDownloadNotificationEmail ? String(req.body.fileDownloadNotificationEmail).trim() : null;
        }
        if (req.body.maxEmailFileSizeMb !== undefined) {
            dataToUpdate.maxEmailFileSizeMb = Number(req.body.maxEmailFileSizeMb) || 10;
        }
        if (welcomeEmailText !== undefined)
            dataToUpdate.welcomeEmailText = welcomeEmailText;
        if (reportDisclaimer !== undefined)
            dataToUpdate.reportDisclaimer = reportDisclaimer;
        if (files?.logo && files.logo.length > 0) {
            dataToUpdate.logoUrl = `/uploads/branding/${files.logo[0].filename}`;
        }
        if (files?.favicon && files.favicon.length > 0) {
            dataToUpdate.faviconUrl = `/uploads/branding/${files.favicon[0].filename}`;
        }
        if (files?.termsPdf && files.termsPdf.length > 0) {
            dataToUpdate.termsPdfUrl = `/uploads/branding/${files.termsPdf[0].filename}`;
        }
        if (files?.privacyPdf && files.privacyPdf.length > 0) {
            dataToUpdate.privacyPdfUrl = `/uploads/branding/${files.privacyPdf[0].filename}`;
        }
        if (files?.coSignature && files.coSignature.length > 0) {
            dataToUpdate.coSignatureUrl = `/uploads/branding/${files.coSignature[0].filename}`;
        }
        if (files?.internalPolicyPdf && files.internalPolicyPdf.length > 0) {
            dataToUpdate.internalPolicyUrl = `/uploads/branding/${files.internalPolicyPdf[0].filename}`;
        }
        if (files?.upiQrImage && files.upiQrImage.length > 0) {
            dataToUpdate.upiQrImageUrl = `/uploads/branding/${files.upiQrImage[0].filename}`;
        }
        const targetTenantDocId = oldTenant?._id || oldTenant?.id || tenantId;
        let updated = null;
        if (targetTenantDocId && mongoose_1.default.Types.ObjectId.isValid(targetTenantDocId)) {
            updated = await db_1.default.Tenant.findByIdAndUpdate(targetTenantDocId, { $set: dataToUpdate }, { returnDocument: 'after', lean: true, new: true });
        }
        if (!updated && tenantId) {
            updated = await db_1.default.Tenant.findOneAndUpdate({ $or: [{ id: tenantId }, { tenantId }, ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ _id: tenantId }] : [])] }, { $set: dataToUpdate }, { returnDocument: 'after', lean: true, new: true });
        }
        if (!updated) {
            updated = await db_1.default.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: dataToUpdate }, { returnDocument: 'after', lean: true, new: true });
        }
        // Save/Sync to local dynamicDb.SystemSetting GLOBAL_SMTP so any service on this tenant can resolve it immediately
        if (dataToUpdate.smtpHost || dataToUpdate.smtpUser || (oldTenant?.smtpHost && dataToUpdate.smtpPassword)) {
            const finalSmtpConfig = {
                smtpHost: dataToUpdate.smtpHost !== undefined ? dataToUpdate.smtpHost : oldTenant?.smtpHost,
                smtpPort: dataToUpdate.smtpPort !== undefined ? dataToUpdate.smtpPort : (oldTenant?.smtpPort || 587),
                smtpUser: dataToUpdate.smtpUser !== undefined ? dataToUpdate.smtpUser : oldTenant?.smtpUser,
                smtpPassword: dataToUpdate.smtpPassword || oldTenant?.smtpPassword,
                smtpFrom: dataToUpdate.smtpFrom || dataToUpdate.smtpUser || oldTenant?.smtpFrom || oldTenant?.smtpUser,
                ccInvoiceEnabled: dataToUpdate.ccInvoiceEnabled !== undefined ? dataToUpdate.ccInvoiceEnabled : oldTenant?.ccInvoiceEnabled,
                ccInvoiceEmail: dataToUpdate.ccInvoiceEmail !== undefined ? dataToUpdate.ccInvoiceEmail : oldTenant?.ccInvoiceEmail,
                ccAgreementEnabled: dataToUpdate.ccAgreementEnabled !== undefined ? dataToUpdate.ccAgreementEnabled : oldTenant?.ccAgreementEnabled,
                ccAgreementEmail: dataToUpdate.ccAgreementEmail !== undefined ? dataToUpdate.ccAgreementEmail : oldTenant?.ccAgreementEmail
            };
            await db_1.default.SystemSetting.findOneAndUpdate({ key: 'GLOBAL_SMTP' }, { $set: { value: JSON.stringify(finalSmtpConfig) }, $setOnInsert: { key: 'GLOBAL_SMTP' } }, { upsert: true }).catch(() => { });
        }
        // Sync local Branding setting in dynamicDb.SystemSetting if applicable
        if (dataToUpdate.logoUrl) {
            try {
                const existingSetting = await db_1.default.SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean();
                let brandingData = {};
                if (existingSetting?.value) {
                    try {
                        brandingData = JSON.parse(existingSetting.value);
                    }
                    catch { }
                }
                brandingData.logoUrl = dataToUpdate.logoUrl;
                if (dataToUpdate.companyName)
                    brandingData.appName = dataToUpdate.companyName;
                await db_1.default.SystemSetting.findOneAndUpdate({ key: 'GLOBAL_BRANDING' }, { key: 'GLOBAL_BRANDING', value: JSON.stringify(brandingData) }, { upsert: true }).catch(() => { });
            }
            catch { }
        }
        await (0, auditService_1.logAudit)({
            tenantId: String(tenantId),
            userId: req.user.id,
            action: 'UPDATE',
            module: 'TENANTS',
            oldValue: oldTenant,
            newValue: updated,
            ipAddress: req.ip
        }).catch(() => { });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(String(tenantId), { reason: 'SETTINGS_UPDATE' }).catch((err) => {
            console.warn('Background sync for tenant settings update error:', err);
        });
        return res.status(200).json({
            success: true,
            message: 'Settings and logo updated successfully',
            data: updated || { ...oldTenant, ...dataToUpdate }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateTenantSettings = updateTenantSettings;
const testSmtp = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { toEmail } = req.body;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    if (!toEmail)
        return res.status(400).json({ success: false, message: 'Email address is required' });
    try {
        const result = await (0, emailService_1.sendTestEmail)(tenantId, toEmail);
        return res.status(result.success ? 200 : 400).json({ success: result.success, message: result.message });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Test failed', errors: [error.message] });
    }
};
exports.testSmtp = testSmtp;
const verifyPaymentGateway = async (req, res) => {
    try {
        const { gateway, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey, ccavenueMerchantId, ccavenueAccessCode, ccavenueWorkingKey, stripePublishableKey, stripeSecretKey } = req.body;
        const selectedGateway = (gateway || 'RAZORPAY').toUpperCase();
        if (selectedGateway === 'RAZORPAY') {
            if (!razorpayKeyId || !razorpayKeySecret) {
                return res.status(400).json({
                    success: false,
                    gateway: 'RAZORPAY',
                    message: 'Razorpay Key ID and Key Secret are both required for verification.'
                });
            }
            try {
                const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId.trim()}:${razorpayKeySecret.trim()}`).toString('base64');
                await axios_1.default.get('https://api.razorpay.com/v1/orders?count=1', {
                    headers: {
                        Authorization: authHeader,
                        'Content-Type': 'application/json'
                    },
                    timeout: 8000
                });
                const isLive = razorpayKeyId.trim().startsWith('rzp_live');
                return res.status(200).json({
                    success: true,
                    gateway: 'RAZORPAY',
                    mode: isLive ? 'LIVE' : 'TEST',
                    message: `Razorpay credentials verified successfully! (${isLive ? 'Live Mode' : 'Test Mode'} active)`
                });
            }
            catch (err) {
                const errMsg = err.response?.data?.error?.description || err.response?.data?.message || err.message;
                return res.status(400).json({
                    success: false,
                    gateway: 'RAZORPAY',
                    message: `Razorpay Verification Failed: ${errMsg}`
                });
            }
        }
        else if (selectedGateway === 'CASHFREE') {
            if (!cashfreeAppId || !cashfreeSecretKey) {
                return res.status(400).json({
                    success: false,
                    gateway: 'CASHFREE',
                    message: 'Cashfree App ID and Secret Key are both required for verification.'
                });
            }
            try {
                const isSandbox = cashfreeAppId.toLowerCase().includes('test') || cashfreeSecretKey.toLowerCase().includes('test');
                const url = isSandbox ? 'https://sandbox.cashfree.com/pg/orders' : 'https://api.cashfree.com/pg/orders';
                await axios_1.default.get(url, {
                    headers: {
                        'x-client-id': cashfreeAppId.trim(),
                        'x-client-secret': cashfreeSecretKey.trim(),
                        'x-api-version': '2022-09-01'
                    },
                    timeout: 8000
                });
                return res.status(200).json({
                    success: true,
                    gateway: 'CASHFREE',
                    mode: isSandbox ? 'TEST' : 'LIVE',
                    message: `Cashfree credentials verified successfully! (${isSandbox ? 'Sandbox Mode' : 'Live Mode'} active)`
                });
            }
            catch (err) {
                const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
                if (err.response?.status === 401 || err.response?.status === 403) {
                    return res.status(400).json({
                        success: false,
                        gateway: 'CASHFREE',
                        message: `Cashfree Authentication Failed: ${errMsg}`
                    });
                }
                return res.status(200).json({
                    success: true,
                    gateway: 'CASHFREE',
                    message: 'Cashfree credentials validated successfully.'
                });
            }
        }
        else if (selectedGateway === 'STRIPE') {
            if (!stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    gateway: 'STRIPE',
                    message: 'Stripe Secret Key is required for verification.'
                });
            }
            try {
                await axios_1.default.get('https://api.stripe.com/v1/balance', {
                    headers: {
                        Authorization: `Bearer ${stripeSecretKey.trim()}`
                    },
                    timeout: 8000
                });
                const isLive = stripeSecretKey.trim().startsWith('sk_live');
                return res.status(200).json({
                    success: true,
                    gateway: 'STRIPE',
                    mode: isLive ? 'LIVE' : 'TEST',
                    message: `Stripe credentials verified successfully! (${isLive ? 'Live Mode' : 'Test Mode'} active)`
                });
            }
            catch (err) {
                const errMsg = err.response?.data?.error?.message || err.message;
                return res.status(400).json({
                    success: false,
                    gateway: 'STRIPE',
                    message: `Stripe Verification Failed: ${errMsg}`
                });
            }
        }
        else if (selectedGateway === 'CCAVENUE') {
            if (!ccavenueMerchantId || !ccavenueAccessCode || !ccavenueWorkingKey) {
                return res.status(400).json({
                    success: false,
                    gateway: 'CCAVENUE',
                    message: 'CCAvenue Merchant ID, Access Code, and Working Key are all required.'
                });
            }
            if (ccavenueWorkingKey.trim().length < 16) {
                return res.status(400).json({
                    success: false,
                    gateway: 'CCAVENUE',
                    message: 'Invalid CCAvenue Working Key. It must be at least 16 characters.'
                });
            }
            return res.status(200).json({
                success: true,
                gateway: 'CCAVENUE',
                message: 'CCAvenue credentials format validated successfully.'
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Unknown payment gateway selected.'
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Payment gateway verification failed.'
        });
    }
};
exports.verifyPaymentGateway = verifyPaymentGateway;
// ----------------------------------------------------
// PAYMENT MANAGEMENT
// ----------------------------------------------------
const getAdminPayments = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        let whereClause = { tenantId };
        if (search) {
            whereClause.transactionRef = { $regex: search, $options: 'i' };
        }
        const total = await db_1.default.Payment.countDocuments(whereClause);
        const payments = await db_1.default.Payment.find(whereClause)
            .populate('couponId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const clientIds = [...new Set(payments.map((p) => p.clientId))];
        const planIds = [...new Set(payments.map((p) => p.planId).filter(Boolean))];
        const couponIds = [...new Set(payments.map((p) => p.couponId ? (typeof p.couponId === 'object' ? p.couponId._id || p.couponId.id : p.couponId) : null).filter(Boolean))];
        const clients = await db_1.default.Client.find({ _id: { $in: clientIds } })
            .populate('userId')
            .lean();
        const profiles = await db_1.default.ClientProfile.find({ clientId: { $in: clientIds } }).lean();
        const profileMap = new Map(profiles.map((p) => [String(p.clientId), p]));
        const plans = await db_1.default.Plan.find({ _id: { $in: planIds } }).lean();
        const coupons = await db_1.default.Coupon.find({ _id: { $in: couponIds } }).lean();
        const couponMap = new Map(coupons.map((c) => [String(c._id || c.id), { ...c, id: String(c._id || c.id) }]));
        const userIds = clients.map((c) => c.userId?._id || c.userId?.id || c.userId).filter(Boolean);
        const allLookupIds = [...new Set([...clientIds, ...userIds])];
        const subscriptions = await db_1.default.Subscription.find({
            clientId: { $in: allLookupIds }
        }).populate('planId').sort({ endDate: -1 }).lean();
        const subMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            if (!subMap.has(cId))
                subMap.set(cId, []);
            subMap.get(cId).push({
                ...sub,
                id: String(sub._id || sub.id),
                plan: sub.planId ? {
                    ...sub.planId,
                    id: String(sub.planId._id || sub.planId.id)
                } : null
            });
        }
        const clientMap = new Map(clients.map((c) => [
            String(c._id || c.id),
            {
                ...c,
                id: String(c._id || c.id),
                profile: profileMap.get(String(c._id || c.id)) || null,
                user: c.userId ? {
                    ...c.userId,
                    id: String(c.userId._id || c.userId.id)
                } : null,
                subscriptions: subMap.get(String(c._id || c.id)) || subMap.get(String(c.userId?._id || c.userId?.id || c.userId)) || []
            }
        ]));
        const planMap = new Map(plans.map((p) => [String(p._id || p.id), { ...p, id: String(p._id || p.id) }]));
        const staffUserIds = [...new Set(payments.map((p) => p.verifiedByStaffId || p.l1Details?.submittedBy || p.l2Details?.reviewedBy).filter(Boolean))];
        const staffUsers = staffUserIds.length > 0 ? await db_1.default.User.find({ _id: { $in: staffUserIds } }).select('firstName lastName email name roleId').lean() : [];
        const staffMap = new Map(staffUsers.map((u) => [
            String(u._id || u.id),
            `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email
        ]));
        const isFullAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';
        const hasViewSensitive = isFullAdmin;
        const enrichedPayments = payments.map((p) => {
            let clientObj = clientMap.get(String(p.clientId));
            if (clientObj && !hasViewSensitive) {
                clientObj = {
                    ...clientObj,
                    email: maskEmail(clientObj.email),
                    mobile: maskMobile(clientObj.mobile),
                    pan: maskDocument(clientObj.pan),
                    aadhaar: maskDocument(clientObj.aadhaar),
                    user: clientObj.user ? { ...clientObj.user, email: maskEmail(clientObj.user.email) } : clientObj.user,
                    profile: clientObj.profile ? {
                        ...clientObj.profile,
                        panNumber: maskDocument(clientObj.profile.panNumber),
                        aadharNumber: maskDocument(clientObj.profile.aadharNumber)
                    } : clientObj.profile
                };
            }
            const cIdStr = p.couponId ? String(typeof p.couponId === 'object' ? (p.couponId._id || p.couponId.id) : p.couponId) : null;
            const couponObj = (p.couponId && typeof p.couponId === 'object' && p.couponId.code) ? p.couponId : (cIdStr ? couponMap.get(cIdStr) : null);
            const resolvedStaffName = (p.verifiedByStaffId ? staffMap.get(String(p.verifiedByStaffId)) : null) || p.assignedByStaffName || p.assignedByAdminName || (p.l1Details?.submittedByName && !p.l1Details.submittedByName.includes('@') ? p.l1Details.submittedByName : null) || 'Alpha Admin';
            const resolvedL2ReviewerName = (p.l2Details?.reviewedBy ? staffMap.get(String(p.l2Details.reviewedBy)) : null) || (p.l2Details?.reviewedByName && !p.l2Details.reviewedByName.includes('@') ? p.l2Details.reviewedByName : null) || 'L2 Authority';
            let effectiveL1Details = p.l1Details;
            if (!effectiveL1Details && (p.verifiedByStaffId || p.approvalStatus || p.remarks)) {
                effectiveL1Details = {
                    submittedBy: p.verifiedByStaffId || null,
                    submittedByName: resolvedStaffName,
                    planId: p.planId,
                    planName: p.planId ? planMap.get(String(p.planId))?.name : 'Assigned Plan',
                    amount: p.amount,
                    validityDays: p.planValidityDays || 30,
                    discount: p.discountApplied || 0,
                    couponCode: p.couponCode || '',
                    paymentDate: p.paymentDate || p.createdAt,
                    serviceStartDate: p.serviceStartDate || p.paymentDate || p.createdAt,
                    remarks: p.remarks || 'Verified by Compliance Staff',
                    submittedAt: p.createdAt
                };
            }
            else if (effectiveL1Details && (!effectiveL1Details.submittedByName || effectiveL1Details.submittedByName.includes('@') || effectiveL1Details.submittedByName === 'Staff (Maker)')) {
                effectiveL1Details = {
                    ...effectiveL1Details,
                    submittedByName: resolvedStaffName
                };
            }
            let effectiveL2Details = p.l2Details;
            if (!effectiveL2Details && p.approvalStatus === 'REJECTED') {
                effectiveL2Details = {
                    action: 'REJECTED',
                    reviewedByName: resolvedL2ReviewerName,
                    rejectionReason: p.rejectionReason || p.l2Remarks || p.remarks || 'Declined by Approver at Level 2 clearance',
                    reviewedAt: p.updatedAt || p.paymentDate || p.createdAt
                };
            }
            else if (effectiveL2Details && (!effectiveL2Details.reviewedByName || effectiveL2Details.reviewedByName.includes('@'))) {
                effectiveL2Details = {
                    ...effectiveL2Details,
                    reviewedByName: resolvedL2ReviewerName
                };
            }
            return {
                ...p,
                id: String(p._id || p.id),
                coupon: couponObj || null,
                couponCode: couponObj?.code || p.couponCode || null,
                client: clientObj,
                plan: p.planId ? planMap.get(String(p.planId)) : null,
                assignedByStaffName: resolvedStaffName,
                l1Details: effectiveL1Details,
                l2Details: effectiveL2Details
            };
        });
        enrichedPayments.sort((a, b) => {
            const dateA = new Date(a.paymentDate || a.createdAt).getTime();
            const dateB = new Date(b.paymentDate || b.createdAt).getTime();
            return dateB - dateA;
        });
        return res.status(200).json({
            success: true,
            data: enrichedPayments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAdminPayments = getAdminPayments;
const getTenantAuditLogs = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const tId = mongoose_1.default.Types.ObjectId.isValid(tenantId) ? new mongoose_1.default.Types.ObjectId(tenantId) : tenantId;
        const tenantFilter = { $or: [{ tenantId: tId }, { tenantId: String(tenantId) }] };
        const [auditLogs, activityLogs] = await Promise.all([
            db_1.default.AuditLog.find(tenantFilter)
                .populate({
                path: 'userId',
                select: 'firstName lastName email roleId',
                populate: { path: 'roleId', select: 'name' }
            })
                .sort({ timestamp: -1 })
                .limit(300)
                .lean(),
            db_1.default.ActivityLog.find(tenantFilter)
                .populate({
                path: 'actorId',
                select: 'firstName lastName email roleId',
                populate: { path: 'roleId', select: 'name' }
            })
                .populate({
                path: 'targetClientId',
                select: 'name email mobile phone pan clientCode'
            })
                .sort({ timestamp: -1 })
                .limit(300)
                .lean()
        ]);
        // Format AuditLog entries
        const formattedAudit = (auditLogs || []).map((l) => ({
            id: String(l._id || l.id),
            _id: l._id,
            tenantId: l.tenantId,
            source: 'AUDIT',
            category: l.module || 'SYSTEM',
            action: l.action || 'AUDIT_EVENT',
            title: `${l.action || 'EVENT'} on ${l.module || 'SYSTEM'}`,
            description: l.newValue
                ? (typeof l.newValue === 'string' ? l.newValue : JSON.stringify(l.newValue).slice(0, 120))
                : (l.oldValue ? `Previous: ${typeof l.oldValue === 'string' ? l.oldValue : JSON.stringify(l.oldValue).slice(0, 80)}` : 'System Audit Record'),
            status: 'SUCCESS',
            ipAddress: l.ipAddress || '127.0.0.1',
            device: 'Desktop',
            browser: null,
            os: null,
            timestamp: l.timestamp || l.createdAt || new Date(),
            user: l.userId ? {
                id: String(l.userId._id || l.userId.id || ''),
                firstName: l.userId.firstName || '',
                lastName: l.userId.lastName || '',
                name: `${l.userId.firstName || ''} ${l.userId.lastName || ''}`.trim() || l.userId.email || 'Admin',
                email: l.userId.email || '',
                role: l.userId.roleId?.name || 'ADMIN'
            } : {
                name: 'System / Admin',
                email: req.user?.email || 'admin',
                role: 'ADMIN'
            },
            metadata: { oldValue: l.oldValue, newValue: l.newValue }
        }));
        // Format ActivityLog entries
        const formattedActivity = (activityLogs || []).map((l) => {
            const actorUser = l.actorId;
            const targetClient = l.targetClientId;
            const userName = l.actorName || (actorUser ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim() : null) || l.actorEmail || 'System';
            const userRole = actorUser?.roleId?.name || l.actorType || 'STAFF';
            return {
                id: String(l._id || l.id),
                _id: l._id,
                tenantId: l.tenantId,
                source: 'ACTIVITY',
                category: l.category || 'STAFF_ACTION',
                action: l.action || 'ACTIVITY_EVENT',
                title: l.title || l.action || 'Staff Activity',
                description: l.description || l.title || '',
                status: l.status || 'SUCCESS',
                ipAddress: l.ipAddress || '127.0.0.1',
                device: l.device || 'Desktop',
                browser: l.browser || null,
                os: l.os || null,
                timestamp: l.timestamp || l.createdAt || new Date(),
                targetClient: targetClient ? {
                    id: String(targetClient._id || targetClient.id || ''),
                    name: targetClient.name || 'Client',
                    email: targetClient.email || '',
                    mobile: targetClient.mobile || targetClient.phone || '',
                    pan: targetClient.pan || ''
                } : null,
                user: {
                    id: actorUser ? String(actorUser._id || actorUser.id || '') : null,
                    firstName: userName.split(' ')[0] || userName,
                    lastName: userName.split(' ').slice(1).join(' ') || '',
                    name: userName,
                    email: l.actorEmail || actorUser?.email || '',
                    role: userRole
                },
                metadata: l.metadata || {}
            };
        });
        // Merge and sort in reverse chronological order
        const combined = [...formattedActivity, ...formattedAudit].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
        return res.status(200).json({ success: true, count: combined.length, data: combined });
    }
    catch (error) {
        console.error('Error fetching tenant audit logs:', error);
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getTenantAuditLogs = getTenantAuditLogs;
// ─────────────────────────────────────────────────────────────
// ADMIN: Assign Plan to Client directly (bypasses payment flow)
// ─────────────────────────────────────────────────────────────
const assignPlanByAdmin = async (req, res) => {
    const tenantId = req.user.tenantId;
    const clientId = req.params.id || req.params.clientId;
    const { planId, remarks, paymentRefId, paymentDate, serviceStartDate, couponCode, customAmount, customDays } = req.body;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    if (!planId)
        return res.status(400).json({ success: false, message: 'planId is required.' });
    if (!paymentRefId)
        return res.status(400).json({ success: false, message: 'Payment Ref ID is required.' });
    if (!paymentDate)
        return res.status(400).json({ success: false, message: 'Payment Date is required.' });
    try {
        let client = null;
        if (mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            client = await db_1.default.Client.findById(clientId).lean();
        }
        if (!client) {
            client = await db_1.default.Client.findOne({ $or: [{ _id: clientId }, { userId: clientId }, { id: clientId }] }).lean();
        }
        if (!client && db_1.centralModels?.Client) {
            if (mongoose_1.default.Types.ObjectId.isValid(clientId)) {
                client = await db_1.centralModels.Client.findById(clientId).lean();
            }
            if (!client) {
                client = await db_1.centralModels.Client.findOne({ $or: [{ _id: clientId }, { userId: clientId }, { id: clientId }] }).lean();
            }
        }
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const actualClientId = client._id || client.id;
        const clientProfile = await db_1.default.ClientProfile.findOne({ $or: [{ clientId: actualClientId }, { clientId: client.userId }] }).lean();
        let plan = null;
        if (mongoose_1.default.Types.ObjectId.isValid(planId)) {
            plan = await db_1.default.Plan.findById(planId).lean();
        }
        if (!plan) {
            plan = await db_1.default.Plan.findOne({ $or: [{ _id: planId }, { id: planId }] }).lean();
        }
        if (!plan || Boolean(plan.deletedAt)) {
            return res.status(404).json({ success: false, message: 'Plan not found or inactive.' });
        }
        const assigner = await db_1.default.User.findById(req.user.id).populate('roleId').lean();
        const tenantObj = await db_1.default.Tenant.findById(tenantId).lean();
        const isAdmin = assigner?.roleId?.name === 'SUPER_ADMIN' || assigner?.roleId?.name === 'ADMIN';
        const assignerName = `${assigner?.firstName || ''} ${assigner?.lastName || ''}`.trim();
        const effectiveBase = (customAmount !== undefined && customAmount !== null)
            ? Number(customAmount)
            : Number(plan.price);
        let discountAmount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await db_1.default.Coupon.findOne({
                code: String(couponCode).trim().toUpperCase(),
                tenantId,
                status: 'ACTIVE'
            }).lean();
            if (!coupon)
                return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
            if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
                return res.status(400).json({ success: false, message: 'Coupon code has expired.' });
            }
            if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
                return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
            }
            if (coupon.clientId && String(coupon.clientId) !== String(actualClientId) && String(coupon.clientId) !== String(clientId)) {
                return res.status(400).json({ success: false, message: 'Coupon is not applicable to this client.' });
            }
            if (coupon.planId) {
                let allowedPlans = [];
                try {
                    allowedPlans = JSON.parse(String(coupon.planId));
                    if (!Array.isArray(allowedPlans))
                        allowedPlans = [String(coupon.planId)];
                }
                catch {
                    allowedPlans = [String(coupon.planId)];
                }
                if (allowedPlans.length > 0 && !allowedPlans.includes(String(plan._id || plan.id))) {
                    return res.status(400).json({ success: false, message: 'Coupon is not applicable to this plan.' });
                }
            }
            if (coupon.categoryId) {
                let allowedCats = [];
                try {
                    allowedCats = JSON.parse(String(coupon.categoryId));
                    if (!Array.isArray(allowedCats))
                        allowedCats = [String(coupon.categoryId)];
                }
                catch {
                    allowedCats = [String(coupon.categoryId)];
                }
                if (allowedCats.length > 0 && !allowedCats.includes(String(plan.categoryId))) {
                    return res.status(400).json({ success: false, message: 'Coupon is not applicable to this category.' });
                }
            }
            if (coupon.minPurchaseValue && effectiveBase < coupon.minPurchaseValue) {
                return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchaseValue} required.` });
            }
            if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                discountAmount = coupon.discountValue;
            }
            else if (coupon.discountType === 'PERCENTAGE') {
                discountAmount = (effectiveBase * coupon.discountValue) / 100;
                if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
                    discountAmount = coupon.maxDiscountValue;
                }
            }
            if (discountAmount > effectiveBase)
                discountAmount = effectiveBase;
            appliedCouponId = coupon._id || coupon.id;
        }
        const isGstActive = tenantObj?.gstEnabled !== false;
        const isExclusive = isGstActive && tenantObj?.gstCalculationType === 'EXCLUSIVE';
        // GST Inclusive vs Exclusive discount handling
        // When GST is inclusive, effectiveBase has 18% GST included, so pre-tax main value is effectiveBase / 1.18
        const preTaxBase = (isGstActive && !isExclusive)
            ? parseFloat((effectiveBase / 1.18).toFixed(2))
            : effectiveBase;
        // Recalculate discount strictly on pre-tax base value
        if (couponCode && appliedCouponId) {
            const coupon = await db_1.default.Coupon.findById(appliedCouponId).lean();
            if (coupon) {
                if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
                    discountAmount = (isGstActive && !isExclusive)
                        ? parseFloat((Number(coupon.discountValue || 0) / 1.18).toFixed(2))
                        : Number(coupon.discountValue || 0);
                }
                else if (coupon.discountType === 'PERCENTAGE') {
                    discountAmount = parseFloat(((preTaxBase * Number(coupon.discountValue || 0)) / 100).toFixed(2));
                    if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > Number(coupon.maxDiscountValue)) {
                        discountAmount = Number(coupon.maxDiscountValue);
                    }
                }
                if (discountAmount > preTaxBase)
                    discountAmount = preTaxBase;
            }
        }
        const taxableBase = Math.max(0, parseFloat((preTaxBase - discountAmount).toFixed(2)));
        const gstAmt = isGstActive ? parseFloat((taxableBase * 0.18).toFixed(2)) : 0;
        const finalTotalAmount = parseFloat((taxableBase + gstAmt).toFixed(2));
        const finalBasePrice = taxableBase;
        const finalGstAmount = gstAmt;
        const adminRemark = remarks?.trim()
            ? `Assigned by Admin - ${remarks.trim()}`
            : 'Assigned by Admin';
        const isCustomAssignment = customAmount !== undefined || customDays !== undefined;
        const finalRemark = isCustomAssignment ? `[PRO-RATA] ${adminRemark}` : adminRemark;
        const paymentMode = isCustomAssignment ? 'CUSTOM_PRO_RATA' : 'ADMIN_ASSIGNED';
        const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
        const parsedServiceStartDate = serviceStartDate ? new Date(serviceStartDate) : parsedPaymentDate;
        // Strict validation: serviceStartDate >= paymentDate
        const pDateOnly = new Date(parsedPaymentDate.getFullYear(), parsedPaymentDate.getMonth(), parsedPaymentDate.getDate()).getTime();
        const sDateOnly = new Date(parsedServiceStartDate.getFullYear(), parsedServiceStartDate.getMonth(), parsedServiceStartDate.getDate()).getTime();
        if (sDateOnly < pDateOnly) {
            return res.status(400).json({ success: false, message: 'Validation Error: Service start date cannot be earlier than payment date.' });
        }
        // SEBI Annual Fee Cap Check (Max ₹1,51,000 Base Fee per FY per Client)
        if (finalBasePrice > 0) {
            const feeSummary = await (0, feeCapHelper_1.getClientFyFeeSummary)(actualClientId, tenantId, db_1.default);
            if (feeSummary.isQuotaFull || (feeSummary.totalBasePaid + finalBasePrice > feeSummary.maxBaseFeeCap)) {
                return res.status(400).json({
                    success: false,
                    code: 'SEBI_FEE_CAP_EXCEEDED',
                    message: `SEBI Annual Fee Limit Exceeded: Client has ₹${feeSummary.totalApprovedBasePaid.toLocaleString('en-IN')} approved + ₹${feeSummary.totalPendingBaseFee.toLocaleString('en-IN')} pending in L2 queue (Total committed: ₹${feeSummary.totalBasePaid.toLocaleString('en-IN')}) in ${feeSummary.fyLabel}. Maximum allowed limit is ₹1,51,000 (+ GST). Remaining quota for new requests is ₹${feeSummary.remainingBaseQuota.toLocaleString('en-IN')} (+ GST). Only up to this remaining limit can be assigned or requested.`,
                    feeSummary
                });
            }
        }
        // Check if there is an existing active subscription for the same category or plan (sequential queueing)
        let matchingPlanIds = [plan._id || plan.id];
        if (plan.categoryId) {
            const categoryPlans = await db_1.default.Plan.find({ categoryId: plan.categoryId }).select('_id').lean();
            if (categoryPlans.length > 0)
                matchingPlanIds = categoryPlans.map((p) => p._id);
        }
        const existingSub = await db_1.default.Subscription.findOne({
            $or: [{ clientId: actualClientId }, { clientId: client.userId }],
            planId: { $in: matchingPlanIds },
            status: 'ACTIVE',
            endDate: { $gt: parsedPaymentDate }
        }).sort({ endDate: -1 }).lean();
        if (existingSub) {
            const expDate = new Date(existingSub.endDate);
            const minAllowedStartDate = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate() + 1);
            const minDateOnly = minAllowedStartDate.getTime();
            if (sDateOnly < minDateOnly) {
                return res.status(400).json({
                    success: false,
                    message: `Validation Error: Client already has an active subscription for this plan expiring on ${expDate.toLocaleDateString('en-IN')}. The new service start date must be on or after ${minAllowedStartDate.toLocaleDateString('en-IN')}.`
                });
            }
        }
        let startDate = parsedServiceStartDate;
        const planValidityDays = customDays !== undefined ? customDays : (plan.durationMonths * 30 || 30);
        // If L2 Approval is Enabled in Tenant Settings: Queue for L2 Approval
        if (tenantObj?.l2ApprovalEnabled === true) {
            const pendingPayment = await db_1.default.Payment.create({
                tenantId: tenantId || client.tenantId,
                clientId: actualClientId,
                planId: plan._id || plan.id,
                amount: parseFloat(finalTotalAmount.toFixed(2)),
                paymentMode,
                transactionRef: paymentRefId,
                paymentDate: parsedPaymentDate,
                serviceStartDate: parsedServiceStartDate,
                status: 'PENDING',
                approvalStatus: 'L2_PENDING',
                remarks: finalRemark,
                verifiedByStaffId: req.user.id,
                assignedByAdminName: isAdmin ? assignerName : null,
                assignedByStaffName: !isAdmin ? assignerName : null,
                clientCity: clientProfile?.city || null,
                clientState: clientProfile?.state || null,
                tenantState: tenantObj?.state || null,
                planValidityDays,
                paymentGatewayId: null,
                couponId: appliedCouponId,
                discountApplied: discountAmount > 0 ? parseFloat(discountAmount.toFixed(2)) : null,
                couponCode: couponCode || null,
                l1Details: {
                    submittedBy: req.user.id,
                    submittedByName: assignerName,
                    planId: plan._id || plan.id,
                    planName: plan.name,
                    categoryId: plan.categoryId,
                    couponCode: couponCode || null,
                    transactionRef: paymentRefId,
                    amount: parseFloat(finalTotalAmount.toFixed(2)),
                    validityDays: planValidityDays,
                    discount: discountAmount > 0 ? parseFloat(discountAmount.toFixed(2)) : 0,
                    paymentDate: parsedPaymentDate,
                    serviceStartDate: parsedServiceStartDate,
                    remarks: finalRemark,
                    submittedAt: new Date()
                }
            });
            return res.status(201).json({
                success: true,
                message: 'Plan assignment request submitted successfully and queued for L2 Approval.',
                isL2Queued: true,
                data: pendingPayment
            });
        }
        const endDate = new Date(startDate.getTime() + planValidityDays * 24 * 60 * 60 * 1000);
        const subscription = await db_1.default.Subscription.create({
            clientId: actualClientId,
            planId: plan._id || plan.id,
            startDate,
            endDate,
            status: 'ACTIVE',
            amountBase: finalBasePrice,
            amountGst: finalGstAmount,
            amountTotal: parseFloat(finalTotalAmount.toFixed(2)),
            isGstInclusive: isGstActive && tenantObj?.gstCalculationType === 'INCLUSIVE'
        });
        const activePolicy = tenantObj?.invoiceDispatchPolicy || 'AFTER_KYC_AGREEMENT';
        let initialInvoiceStatus = 'GENERATED';
        if (activePolicy === 'AFTER_KYC_AGREEMENT') {
            const isAgreementSigned = Boolean(client.agreementSigned);
            initialInvoiceStatus = isAgreementSigned ? 'GENERATED' : 'PENDING_AGREEMENT';
        }
        const payment = await db_1.default.Payment.create({
            tenantId: tenantId || client.tenantId,
            clientId: actualClientId,
            planId: plan._id || plan.id,
            subscriptionId: subscription._id,
            amount: parseFloat(finalTotalAmount.toFixed(2)),
            paymentMode,
            transactionRef: paymentRefId,
            paymentDate: new Date(paymentDate),
            status: 'SUCCESS',
            invoicePolicy: activePolicy,
            invoiceStatus: initialInvoiceStatus,
            remarks: finalRemark,
            verifiedByStaffId: req.user.id,
            assignedByAdminName: isAdmin ? assignerName : null,
            assignedByStaffName: !isAdmin ? assignerName : null,
            clientCity: clientProfile?.city || null,
            clientState: clientProfile?.state || null,
            tenantState: tenantObj?.state || null,
            planValidityDays,
            paymentGatewayId: null,
            couponId: appliedCouponId,
            discountApplied: discountAmount > 0 ? parseFloat(discountAmount.toFixed(2)) : null
        });
        if (initialInvoiceStatus === 'GENERATED' && activePolicy === 'IMMEDIATE_ON_PAYMENT' && client.email) {
            (0, invoiceGenerator_1.generateInvoicePdf)(String(payment._id || payment.id))
                .then(pdfBuffer => {
                return (0, emailService_1.sendTaxInvoiceEmail)({
                    tenantId,
                    toEmail: client.email,
                    clientName: client.name || 'Client',
                    companyName: tenantObj?.companyName,
                    planName: plan.name,
                    invoiceNumber: `INV/${new Date().getFullYear()}/${String(paymentRefId).slice(-6).toUpperCase()}`,
                    amount: payment.amount,
                    pdfBuffer
                });
            })
                .then(() => {
                db_1.default.Payment.findByIdAndUpdate(payment._id || payment.id, {
                    $set: { invoiceSentAt: new Date(), lastEmailedTo: client.email }
                }).catch(() => { });
            })
                .catch(err => console.warn('[Auto Invoice Email] Failed to send on assignment:', err.message));
        }
        await db_1.default.Client.findByIdAndUpdate(actualClientId, {
            $set: { status: 'ACTIVE' }
        });
        if (client.userId) {
            await db_1.default.User.findByIdAndUpdate(client.userId, {
                $set: { status: 'ACTIVE' }
            });
        }
        if (appliedCouponId) {
            await db_1.default.Coupon.findByIdAndUpdate(appliedCouponId, {
                $inc: { usedCount: 1 }
            });
        }
        const assignedDays = customDays !== undefined ? customDays : plan.durationMonths * 30;
        await db_1.default.NotificationLog.create({
            tenantId,
            recipient: client.email,
            channel: 'INAPP',
            title: 'New Plan Assigned',
            message: `Your account has been assigned the "${plan.name}" plan by your advisor. The plan is now active and valid until ${new Date(Date.now() + assignedDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}.`,
            type: 'account',
            data: { action: 'PLAN_ASSIGNED', planId: plan._id?.toString(), planName: plan.name },
            status: 'SENT'
        }).catch(() => { });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId: req.user.id,
            action: 'CREATE',
            module: 'PAYMENTS',
            newValue: { action: 'ADMIN_PLAN_ASSIGNMENT', clientId, planId, planName: plan.name, remark: adminRemark },
            ipAddress: req.ip
        });
        // Log Activity for Client Timeline
        (0, activityService_1.logActivity)({
            tenantId,
            actorType: isAdmin ? 'ADMIN' : 'STAFF',
            actorId: req.user.id,
            actorName: assignerName,
            targetClientId: actualClientId,
            category: 'SUBSCRIPTION',
            action: 'PLAN_ASSIGNED',
            title: `Plan Assigned: ${plan.name}`,
            description: `Plan "${plan.name}" assigned manually by ${assignerName || 'Admin'} (Ref: ${paymentRefId})`,
            status: 'SUCCESS',
            metadata: {
                planId: plan._id || plan.id,
                planName: plan.name,
                paymentRefId,
                paymentDate,
                amount: payment?.amount,
                finalRemark,
                validityDays: planValidityDays
            },
            req
        });
        return res.status(200).json({
            success: true,
            message: `Plan "${plan.name}" successfully assigned to client. Subscription is now active.`,
            data: {
                subscription,
                payment
            }
        });
    }
    catch (error) {
        if (error.code === 11000 && error.keyPattern?.transactionRef) {
            return res.status(400).json({ success: false, message: 'This Payment Reference ID has already been used. Please provide a unique Payment Ref ID.' });
        }
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.assignPlanByAdmin = assignPlanByAdmin;
const getEmailTemplates = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const existing = await db_1.default.EmailTemplate.find({ tenantId }).lean();
        const existingMap = new Map();
        for (const item of existing) {
            existingMap.set(item.type, item);
            // Legacy 'WELCOME' backwards compatibility
            if (item.type === 'WELCOME' && !existingMap.has('WELCOME_CLIENT')) {
                existingMap.set('WELCOME_CLIENT', item);
            }
        }
        const merged = defaultEmailTemplates_1.DEFAULT_EMAIL_TEMPLATES.map(def => {
            const found = existingMap.get(def.type);
            return {
                type: def.type,
                name: def.name,
                description: def.description,
                subject: found?.subject || def.subject,
                body: found?.body || def.body,
                variables: def.variables,
                variableLabels: def.variableLabels,
                sampleVariables: def.sampleVariables,
                isCustomized: Boolean(found && (found.subject !== def.subject || found.body !== def.body)),
                updatedAt: found?.updatedAt || null
            };
        });
        return res.status(200).json({ success: true, data: merged });
    }
    catch (err) {
        return res.status(500).json({ success: false, errors: [err.message] });
    }
};
exports.getEmailTemplates = getEmailTemplates;
const updateEmailTemplate = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { type } = req.params;
    const { subject, body } = req.body;
    if (!subject || !subject.trim()) {
        return res.status(400).json({ success: false, message: 'Email subject is required' });
    }
    if (!body || !body.trim()) {
        return res.status(400).json({ success: false, message: 'Email body content is required' });
    }
    try {
        const def = defaultEmailTemplates_1.DEFAULT_EMAIL_TEMPLATES.find(d => d.type === type);
        const updated = await db_1.default.EmailTemplate.findOneAndUpdate({ tenantId, type }, {
            $set: {
                subject: subject.trim(),
                body: body.trim(),
                name: def?.name,
                description: def?.description,
                variables: def?.variables || []
            },
            $setOnInsert: { tenantId, type }
        }, { upsert: true, returnDocument: 'after', lean: true });
        // If type is WELCOME_CLIENT, also keep legacy WELCOME synced
        if (type === 'WELCOME_CLIENT') {
            await db_1.default.EmailTemplate.updateOne({ tenantId, type: 'WELCOME' }, { $set: { subject: subject.trim(), body: body.trim() } }).catch(() => { });
        }
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'EMAIL_TEMPLATE_UPDATE' }).catch(() => { });
        return res.status(200).json({ success: true, data: updated, message: 'Email template updated successfully' });
    }
    catch (err) {
        return res.status(500).json({ success: false, errors: [err.message] });
    }
};
exports.updateEmailTemplate = updateEmailTemplate;
const resetEmailTemplate = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    const { type } = req.params;
    const def = defaultEmailTemplates_1.DEFAULT_EMAIL_TEMPLATES.find(d => d.type === type);
    if (!def) {
        return res.status(404).json({ success: false, message: 'Default template not found for this type' });
    }
    try {
        await db_1.default.EmailTemplate.deleteOne({ tenantId, type });
        if (type === 'WELCOME_CLIENT') {
            await db_1.default.EmailTemplate.deleteOne({ tenantId, type: 'WELCOME' });
        }
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'EMAIL_TEMPLATE_RESET' }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Template restored to default successfully',
            data: {
                type: def.type,
                name: def.name,
                description: def.description,
                subject: def.subject,
                body: def.body,
                variables: def.variables,
                variableLabels: def.variableLabels,
                sampleVariables: def.sampleVariables,
                isCustomized: false
            }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, errors: [err.message] });
    }
};
exports.resetEmailTemplate = resetEmailTemplate;
const uploadSignature = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.headers['x-tenant-id'];
        if (!tenantId)
            throw new Error('Tenant ID required');
        if (!req.file)
            throw new Error('No signature file uploaded');
        const updated = await db_1.default.Tenant.findByIdAndUpdate(tenantId, { $set: { coSignatureUrl: `/uploads/branding/${req.file.filename}` } }, { returnDocument: 'after', lean: true });
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'SIGNATURE_UPDATE' }).catch(() => { });
        res.status(200).json({ success: true, message: 'Signature updated successfully', data: updated });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.uploadSignature = uploadSignature;
// Helper for date filter
const getDateFilter = (req) => {
    const { range, startDate, endDate } = req.query;
    if (range === 'date' && startDate && endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return {
            $gte: new Date(startDate),
            $lte: end
        };
    }
    return undefined;
};
const arrayToCsv = (data) => {
    if (!data || !data.length)
        return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : row[header].toString();
        cell = cell.replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
        }
        return cell;
    }).join(','));
    return [headers.join(','), ...rows].join('\n');
};
const exportInvoicesZip = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        const filterQuery = { tenantId, status: 'SUCCESS' };
        if (dateFilter)
            filterQuery.createdAt = dateFilter;
        const payments = await db_1.default.Payment.find(filterQuery).lean();
        const clientIds = payments.map(p => p.clientId);
        const clients = await db_1.default.Client.find({ _id: { $in: clientIds } }).lean();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Invoices.zip"');
        const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
        archive.pipe(res);
        for (const payment of payments) {
            try {
                const client = clients.find(c => String(c._id || c.id) === String(payment.clientId));
                const pan = client?.pan || 'UNKNOWN_PAN';
                const dateStr = new Date(payment.createdAt).toISOString().split('T')[0];
                const pdfBuffer = await (0, invoiceGenerator_1.generateInvoicePdf)(String(payment._id || payment.id));
                archive.append(pdfBuffer, { name: `${pan}_Invoice_${dateStr}.pdf` });
            }
            catch (err) {
                console.error(`Failed to generate invoice for payment ${payment._id || payment.id}`, err);
            }
        }
        await archive.finalize();
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};
exports.exportInvoicesZip = exportInvoicesZip;
const exportAgreementsZip = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        const clients = await db_1.default.Client.find({ tenantId }).lean();
        const clientIds = clients.map((c) => c._id || c.id);
        const agQuery = { clientId: { $in: clientIds } };
        if (dateFilter)
            agQuery.signedAt = dateFilter;
        const agreements = await db_1.default.Agreement.find(agQuery).lean();
        const clientMap = new Map(clients.map((c) => [String(c._id || c.id), c]));
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Agreements.zip"');
        const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
        archive.pipe(res);
        for (const agreement of agreements) {
            const client = clientMap.get(String(agreement.clientId));
            if (agreement.agreementUrl) {
                const filePath = path_1.default.join(__dirname, '../../public', agreement.agreementUrl);
                if (fs_1.default.existsSync(filePath)) {
                    const dateStr = new Date(agreement.signedAt || agreement.createdAt).toISOString().split('T')[0];
                    archive.file(filePath, { name: `${client?.pan || 'CLIENT'}_Agreement_${dateStr}.pdf` });
                }
            }
        }
        await archive.finalize();
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};
exports.exportAgreementsZip = exportAgreementsZip;
const exportKRAZip = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        const clients = await db_1.default.Client.find({ tenantId }).lean();
        const clientIds = clients.map((c) => c._id || c.id);
        const docQuery = { clientId: { $in: clientIds } };
        if (dateFilter)
            docQuery.uploadedAt = dateFilter;
        const documents = await db_1.default.ClientDocument.find(docQuery).lean();
        const clientMap = new Map(clients.map((c) => [String(c._id || c.id), c]));
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="KRA_Documents.zip"');
        const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
        archive.pipe(res);
        for (const doc of documents) {
            const client = clientMap.get(String(doc.clientId));
            if (doc.fileUrl) {
                const filePath = path_1.default.join(__dirname, '../../public', doc.fileUrl);
                if (fs_1.default.existsSync(filePath)) {
                    const ext = path_1.default.extname(doc.fileUrl) || '.pdf';
                    const dateStr = new Date(doc.uploadedAt || doc.createdAt).toISOString().split('T')[0];
                    archive.file(filePath, { name: `${client?.pan || 'CLIENT'}_${doc.docType}_${dateStr}${ext}` });
                }
            }
        }
        await archive.finalize();
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};
exports.exportKRAZip = exportKRAZip;
const exportClientsCSV = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        // 1. Find client roles
        const clientRoles = await db_1.default.Role.find({
            name: { $regex: /^(client|user|customer|investor)$/i }
        }).lean();
        const clientRoleIds = clientRoles.map((r) => r._id || r.id);
        const userFilter = {
            $and: [
                {
                    $or: [
                        { tenantId: tenantId },
                        ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose_1.default.Types.ObjectId(tenantId) }] : [])
                    ]
                },
                { deletedAt: null },
                {
                    $or: [
                        { roleId: { $in: clientRoleIds } },
                        { role: { $regex: /^(client|user|customer|investor)$/i } }
                    ]
                }
            ]
        };
        if (dateFilter)
            userFilter.createdAt = dateFilter;
        const users = await db_1.default.User.find(userFilter).populate('roleId').sort({ createdAt: -1 }).lean();
        const userIds = users.map((u) => u._id || u.id);
        const userMap = new Map(users.map((u) => [String(u._id || u.id), u]));
        const rawClients = await db_1.default.Client.find({
            $or: [
                { userId: { $in: userIds } },
                { tenantId: tenantId },
                ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose_1.default.Types.ObjectId(tenantId) }] : [])
            ]
        }).populate('userId').sort({ createdAt: -1 }).lean();
        const clientByUserId = new Map(rawClients.map((c) => [String(c.userId?._id || c.userId?.id || c.userId || ''), c]));
        const combinedClients = [...rawClients];
        for (const u of users) {
            const uIdStr = String(u._id || u.id);
            if (!clientByUserId.has(uIdStr)) {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Client';
                const synthClient = {
                    _id: u._id,
                    id: uIdStr,
                    userId: u,
                    name: fullName,
                    email: u.email,
                    mobile: u.mobile || '',
                    pan: u.pan || 'N/A',
                    aadhaar: u.aadhaar || 'N/A',
                    category: u.category || 'INDIVIDUAL',
                    occupation: u.occupation || 'other',
                    status: u.status || 'ACTIVE',
                    kraVerified: false,
                    createdById: u.createdById || null,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                };
                combinedClients.push(synthClient);
            }
        }
        const allClientIds = combinedClients.map((c) => c._id || c.id);
        const allLookupIds = [...new Set([...allClientIds, ...userIds])];
        const profiles = await db_1.default.ClientProfile.find({ clientId: { $in: allLookupIds } }).lean();
        const profileMap = new Map(profiles.map((p) => [String(p.clientId || p.userId), p]));
        const subscriptions = await db_1.default.Subscription.find({ clientId: { $in: allLookupIds }, status: 'ACTIVE' })
            .populate('planId')
            .lean();
        const subMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            if (!subMap.has(cId))
                subMap.set(cId, []);
            subMap.get(cId).push(sub);
        }
        const agreements = await db_1.default.Agreement.find({ clientId: { $in: allLookupIds } }).lean();
        const agMap = new Map();
        for (const ag of agreements) {
            const cId = String(ag.clientId);
            if (!agMap.has(cId))
                agMap.set(cId, []);
            agMap.get(cId).push(ag);
        }
        const alerts = await db_1.default.ComplianceAlert.find({ clientId: { $in: allLookupIds } }).lean();
        const alertMap = new Map();
        for (const al of alerts) {
            const cId = String(al.clientId);
            if (!alertMap.has(cId))
                alertMap.set(cId, []);
            alertMap.get(cId).push(al);
        }
        const creatorIds = [...new Set(combinedClients.map((c) => c.createdById).filter(Boolean))];
        const creatorUsers = creatorIds.length > 0 ? await db_1.default.User.find({
            _id: { $in: creatorIds }
        }).populate('roleId').lean() : [];
        const creatorMap = new Map(creatorUsers.map((u) => [
            String(u._id || u.id),
            `${u.firstName || ''} ${u.lastName || ''}`.trim() + ` (${u.roleId?.name || 'Staff'})`
        ]));
        const csvData = combinedClients.map((c) => {
            const cIdStr = String(c._id || c.id);
            const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || cIdStr);
            const user = (c.userId && typeof c.userId === 'object' && c.userId.email) ? c.userId : (userMap.get(uIdStr) || {});
            const clientAlerts = alertMap.get(cIdStr) || alertMap.get(uIdStr) || [];
            const isKraFailed = clientAlerts.some((a) => a.alertType === 'KYC_FAILED');
            const kraStatus = isKraFailed ? 'FAILED' : (c.status && c.status !== 'PENDING_ONBOARDING' && c.status !== 'KYC_PENDING' && c.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
            const isEsignSigned = (agMap.get(cIdStr) || agMap.get(uIdStr) || []).some((a) => a.status === 'SIGNED' || a.status === 'ACTIVE');
            let sourceStr = 'Self Signup';
            const creatorId = c.createdById || user.createdById;
            if (creatorId) {
                sourceStr = creatorMap.get(String(creatorId)) || 'Added by Staff/Admin';
            }
            const prof = profileMap.get(cIdStr) || profileMap.get(uIdStr);
            const clientSubs = subMap.get(cIdStr) || subMap.get(uIdStr) || [];
            return {
                'Client ID': cIdStr,
                'Name': c.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                'Email': c.email || user.email,
                'Mobile': c.mobile || user.mobile,
                'PAN': c.pan || user.pan || 'N/A',
                'Aadhaar': c.aadhaar || user.aadhaar || 'N/A',
                'Category': c.category || 'INDIVIDUAL',
                'Occupation': c.occupation || 'N/A',
                'City': prof?.city || 'N/A',
                'State': prof?.state || 'N/A',
                'Joined Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A',
                'Status': user.status || c.status,
                'KRA Status': kraStatus,
                'eSign Status': isEsignSigned ? 'SIGNED' : 'PENDING',
                'Added By / Source': sourceStr,
                'Active Plan': clientSubs.length > 0 && clientSubs[0].planId ? clientSubs[0].planId.name : 'None'
            };
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="All_Clients_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(arrayToCsv(csvData));
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.exportClientsCSV = exportClientsCSV;
const exportDeletedClientsCSV = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        const clientRoles = await db_1.default.Role.find({
            name: { $regex: /^(client|user|customer|investor)$/i }
        }).lean();
        const clientRoleIds = clientRoles.map((r) => r._id || r.id);
        const userFilter = {
            $and: [
                {
                    $or: [
                        { tenantId: tenantId },
                        ...(mongoose_1.default.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose_1.default.Types.ObjectId(tenantId) }] : [])
                    ]
                },
                { deletedAt: { $ne: null } },
                {
                    $or: [
                        { roleId: { $in: clientRoleIds } },
                        { role: { $regex: /^(client|user|customer|investor)$/i } }
                    ]
                }
            ]
        };
        if (dateFilter)
            userFilter.deletedAt = dateFilter;
        const deletedUsers = await db_1.default.User.find(userFilter).lean();
        const userIds = deletedUsers.map((u) => u._id || u.id);
        const clients = await db_1.default.Client.find({ userId: { $in: userIds } }).lean();
        const clientMap = new Map(clients.map((c) => [String(c.userId), c]));
        const csvData = deletedUsers.map((u) => {
            const client = clientMap.get(String(u._id || u.id));
            return {
                'User ID': String(u._id || u.id),
                'Client ID': client ? String(client._id || client.id) : '',
                'Name': `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                'Email': u.email,
                'Mobile': u.mobile,
                'PAN': client?.pan || u.pan || '',
                'Aadhaar': client?.aadhaar || u.aadhaar || '',
                'Joined Date': u.createdAt ? new Date(u.createdAt).toISOString() : '',
                'Deleted At': u.deletedAt ? new Date(u.deletedAt).toISOString() : '',
                'Deleted By': u.deletedBy || ''
            };
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Deleted_Clients.csv"');
        res.send(arrayToCsv(csvData));
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.exportDeletedClientsCSV = exportDeletedClientsCSV;
const exportPaymentsCSV = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        const payFilter = { tenantId };
        if (dateFilter)
            payFilter.createdAt = dateFilter;
        const payments = await db_1.default.Payment.find(payFilter)
            .populate('planId')
            .lean();
        const clientIds = payments.map((p) => p.clientId);
        const clients = await db_1.default.Client.find({ _id: { $in: clientIds } }).lean();
        const clientMap = new Map(clients.map((c) => [String(c._id || c.id), c]));
        const csvData = payments.map((p) => {
            const client = clientMap.get(String(p.clientId));
            return {
                'Payment ID': String(p._id || p.id),
                'Client Name': client?.name || 'Unknown',
                'Client Email': client?.email || 'Unknown',
                'Client Mobile': client?.mobile || 'Unknown',
                'Amount': p.amount,
                'Payment Mode': p.paymentMode,
                'Transaction Ref': p.transactionRef,
                'Status': p.status,
                'Plan Name': p.planId?.name || 'Unknown',
                'Payment Date': p.createdAt ? new Date(p.createdAt).toISOString() : ''
            };
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Payments_Report.csv"');
        res.send(arrayToCsv(csvData));
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.exportPaymentsCSV = exportPaymentsCSV;
const getClientFeeSummaryEndpoint = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        let actualClientId = id;
        const clientDoc = await db_1.default.Client.findOne({ $or: [{ _id: id }, { userId: id }] }).lean();
        if (clientDoc)
            actualClientId = clientDoc._id || clientDoc.id;
        const summary = await (0, feeCapHelper_1.getClientFyFeeSummary)(actualClientId, tenantId, db_1.default);
        return res.json({ success: true, data: summary });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getClientFeeSummaryEndpoint = getClientFeeSummaryEndpoint;
const exportGstReadySheetCSV = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const tenant = await db_1.default.Tenant.findById(tenantId).lean();
        const tenantState = (tenant?.state || 'DELHI').trim().toUpperCase();
        const dateFilter = getDateFilter(req);
        const payFilter = { tenantId, status: 'SUCCESS' };
        if (dateFilter)
            payFilter.createdAt = dateFilter;
        const payments = await db_1.default.Payment.find(payFilter)
            .populate('planId')
            .populate('clientId')
            .sort({ createdAt: -1 })
            .lean();
        const subIds = payments.map(p => p.subscriptionId).filter(Boolean);
        const subs = await db_1.default.Subscription.find({ _id: { $in: subIds } }).lean();
        const subMap = new Map(subs.map(s => [String(s._id || s.id), s]));
        const csvData = payments.map((p, idx) => {
            const client = p.clientId || {};
            const sub = p.subscriptionId ? subMap.get(String(p.subscriptionId)) : null;
            const clientState = (client.state || p.clientState || 'DELHI').trim().toUpperCase();
            const isInterState = clientState !== tenantState;
            let isGstActive = tenant?.gstEnabled !== false;
            if (p.gstEnabled !== undefined && p.gstEnabled !== null) {
                isGstActive = Boolean(p.gstEnabled);
            }
            const isInclusive = p.gstCalculationType === 'INCLUSIVE' || tenant?.gstCalculationType === 'INCLUSIVE';
            const totalGross = Number(p.amount || 0);
            let base = 0;
            let gst = 0;
            if (sub && sub.amountBase != null) {
                base = Number(sub.amountBase);
                gst = Number(sub.amountGst ?? (totalGross - base));
            }
            else {
                if (!isGstActive) {
                    base = totalGross;
                    gst = 0;
                }
                else {
                    base = parseFloat((totalGross / 1.18).toFixed(2));
                    gst = parseFloat((totalGross - base).toFixed(2));
                }
            }
            let cgst = 0;
            let sgst = 0;
            let igst = 0;
            if (gst > 0) {
                if (isInterState) {
                    igst = gst;
                }
                else {
                    cgst = parseFloat((gst / 2).toFixed(2));
                    sgst = parseFloat((gst - cgst).toFixed(2));
                }
            }
            const invNo = p.invoiceNumber || `INV-${new Date(p.createdAt || Date.now()).getFullYear()}-${String(idx + 1).padStart(4, '0')}`;
            return {
                'Invoice No': invNo,
                'Invoice Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '',
                'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : ''),
                'Client Name': client.name || 'Unknown',
                'Client Mobile': client.mobile || 'Unknown',
                'Client Email': client.email || '',
                'Client PAN': client.pan || 'N/A',
                'Client State (POS)': clientState,
                'Tenant State': tenantState,
                'Tax Type': isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST+SGST)',
                'SAC Code': '998311',
                'Service Description': p.planId?.name || 'Investment / Research Advisory Service',
                'GST Status': !isGstActive ? 'GST DISABLED (0%)' : (isInclusive ? 'INCLUSIVE (18%)' : 'EXCLUSIVE (18%)'),
                'Taxable Value (Base Amount)': base,
                'GST Rate': isGstActive ? '18%' : '0%',
                'CGST (9%)': cgst,
                'SGST (9%)': sgst,
                'IGST (18%)': igst,
                'Total GST Amount': gst,
                'Total Invoice Amount': totalGross,
                'Payment Mode': p.paymentMode || 'ONLINE',
                'Transaction Ref / UTR': p.transactionRef || 'N/A'
            };
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="GSTR_Ready_Filing_Sheet.csv"');
        res.send(arrayToCsv(csvData));
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.exportGstReadySheetCSV = exportGstReadySheetCSV;
const exportResearchReportsZip = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const dateFilter = getDateFilter(req);
        const sigFilter = {
            tenantId,
            reportUrl: { $ne: null }
        };
        if (dateFilter)
            sigFilter.createdAt = dateFilter;
        const signals = await db_1.default.Signal.find(sigFilter)
            .populate('stockId')
            .sort({ createdAt: -1 })
            .lean();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Research_Reports.zip"');
        const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
        archive.pipe(res);
        for (const signal of signals) {
            if (signal.reportUrl) {
                const filePath = path_1.default.join(__dirname, '../../..', signal.reportUrl);
                if (fs_1.default.existsSync(filePath)) {
                    const dateStr = new Date(signal.createdAt).toISOString().split('T')[0];
                    const symbol = signal.stockId?.symbol || 'UNKNOWN';
                    const uniqueId = String(signal._id || signal.id).slice(0, 6);
                    const ext = path_1.default.extname(signal.reportUrl) || '.pdf';
                    archive.file(filePath, { name: `${dateStr}_${symbol}_${uniqueId}_Research${ext}` });
                }
            }
        }
        await archive.finalize();
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};
exports.exportResearchReportsZip = exportResearchReportsZip;
const getClientCommunications = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'No tenant' });
        const client = await db_1.default.Client.findById(id).populate('userId').lean();
        if (!client || (client.userId && client.userId.tenantId !== tenantId)) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const recipients = [];
        if (client.email)
            recipients.push(client.email);
        if (client.mobile)
            recipients.push(client.mobile);
        if (client.userId?.email && client.userId.email !== client.email)
            recipients.push(client.userId.email);
        if (recipients.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }
        const logs = await db_1.default.NotificationLog.find({
            tenantId,
            recipient: { $in: recipients }
        }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getClientCommunications = getClientCommunications;
const previewPolicyPdf = async (req, res) => {
    try {
        const { type } = req.params;
        const tenantId = req.user?.tenantId || req.tenantId || req.query.tenantId;
        let tenant = null;
        if (tenantId) {
            if (mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                tenant = await db_1.default.Tenant.findById(tenantId).lean();
            }
            if (!tenant) {
                tenant = await db_1.default.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId }] }).lean();
            }
        }
        if (!tenant) {
            tenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        }
        let filePath = null;
        let fallbackGenerator = null;
        let defaultFilename = 'document.pdf';
        const normalizedType = String(type || '').toLowerCase();
        if (normalizedType === 'terms' || normalizedType === 'terms-conditions' || normalizedType === 'terms-and-conditions') {
            defaultFilename = `${(tenant?.companyName || 'Service').replace(/[^a-zA-Z0-9]/g, '_')}_Terms_and_Conditions.pdf`;
            filePath = (0, pdfService_1.resolveAttachmentFilePath)(tenant?.termsPdfUrl);
            fallbackGenerator = pdfService_1.generateTermsAndConditionsPdf;
        }
        else if (normalizedType === 'privacy' || normalizedType === 'privacy-policy') {
            defaultFilename = `${(tenant?.companyName || 'Service').replace(/[^a-zA-Z0-9]/g, '_')}_Privacy_Policy.pdf`;
            filePath = (0, pdfService_1.resolveAttachmentFilePath)(tenant?.privacyPdfUrl);
            fallbackGenerator = pdfService_1.generatePrivacyPolicyPdf;
        }
        else if (normalizedType === 'internal-policy' || normalizedType === 'policy' || normalizedType === 'internal') {
            defaultFilename = `${(tenant?.companyName || 'Service').replace(/[^a-zA-Z0-9]/g, '_')}_Internal_Policy.pdf`;
            filePath = (0, pdfService_1.resolveAttachmentFilePath)(tenant?.internalPolicyUrl);
            fallbackGenerator = pdfService_1.generateInternalPolicyPdf;
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid policy type. Use terms, privacy, or internal-policy' });
        }
        if (filePath && fs_1.default.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${defaultFilename}"`);
            return fs_1.default.createReadStream(filePath).pipe(res);
        }
        if (fallbackGenerator) {
            const pdfBuffer = await fallbackGenerator(tenant);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${defaultFilename}"`);
            return res.send(pdfBuffer);
        }
        return res.status(404).json({ success: false, message: 'Policy PDF not found' });
    }
    catch (error) {
        console.error('[PREVIEW-POLICY-PDF] Error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: error.message || 'Failed to preview policy PDF' });
        }
    }
};
exports.previewPolicyPdf = previewPolicyPdf;
const resetClientKyc = async (req, res) => {
    try {
        const searchParam = req.body?.name ||
            req.query?.name ||
            req.body?.clientName ||
            req.query?.clientName ||
            req.body?.username ||
            req.query?.username ||
            req.body?.email ||
            req.query?.email ||
            req.body?.mobile ||
            req.query?.mobile ||
            req.body?.phone ||
            req.query?.phone ||
            req.body?.pan ||
            req.query?.pan ||
            req.body?.aadhaar ||
            req.query?.aadhaar ||
            req.body?.clientId ||
            req.query?.clientId ||
            req.body?.userId ||
            req.query?.userId ||
            req.body?.id ||
            req.query?.id ||
            req.body?.search ||
            req.query?.search ||
            req.body?.query ||
            req.query?.query ||
            req.body?.identifier ||
            req.query?.identifier;
        if (!searchParam || String(searchParam).trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'User / Client identifier is required. Please provide name, username, email, mobile, or pan.',
                examples: {
                    json_body: { name: 'Pavan Kumar' },
                    query_param: '/api/v1/admin/clients/reset-kyc?name=Pavan'
                }
            });
        }
        const queryStr = String(searchParam).trim();
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const safeRegex = new RegExp(escapeRegex(queryStr), 'i');
        const exactRegex = new RegExp(`^${escapeRegex(queryStr)}$`, 'i');
        let client = null;
        let targetDb = db_1.default;
        // Helper to find client in a specific database model container
        const findClientInDb = async (db) => {
            if (!db || !db.Client)
                return null;
            // 1. Direct match by ObjectId (Client ID or User ID)
            if (mongoose_1.default.Types.ObjectId.isValid(queryStr)) {
                const directClient = await db.Client.findById(queryStr);
                if (directClient)
                    return directClient;
                const byUserId = await db.Client.findOne({ userId: queryStr });
                if (byUserId)
                    return byUserId;
            }
            // 2. Match by exact PAN (e.g. ABCDE1234F)
            const byPan = await db.Client.findOne({ pan: exactRegex });
            if (byPan)
                return byPan;
            // 3. Match by exact Email
            const byEmail = await db.Client.findOne({ email: exactRegex });
            if (byEmail)
                return byEmail;
            // 4. Match by Mobile
            const cleanDigits = queryStr.replace(/\D/g, '');
            if (cleanDigits.length >= 10) {
                const byMobile = await db.Client.findOne({
                    mobile: { $regex: escapeRegex(cleanDigits.slice(-10)) }
                });
                if (byMobile)
                    return byMobile;
            }
            else {
                const byMobile = await db.Client.findOne({ mobile: exactRegex });
                if (byMobile)
                    return byMobile;
            }
            // 5. Match by exact Name (Client name, panName, aadhaarName)
            const byExactName = await db.Client.findOne({
                $or: [
                    { name: exactRegex },
                    { panName: exactRegex },
                    { aadhaarName: exactRegex }
                ]
            });
            if (byExactName)
                return byExactName;
            // 6. Match by partial Name in Client
            const byPartialName = await db.Client.findOne({
                $or: [
                    { name: safeRegex },
                    { panName: safeRegex },
                    { aadhaarName: safeRegex }
                ]
            });
            if (byPartialName)
                return byPartialName;
            // 7. Match via User collection (Email, Mobile, Username, firstName, lastName, Name)
            if (db.User) {
                const matchedUsers = await db.User.find({
                    $or: [
                        { email: exactRegex },
                        { mobile: exactRegex },
                        { username: exactRegex },
                        { name: safeRegex },
                        { firstName: safeRegex },
                        { lastName: safeRegex }
                    ]
                }).limit(10).lean();
                if (matchedUsers.length > 0) {
                    const userIds = matchedUsers.map((u) => u._id || u.id);
                    const clientByUser = await db.Client.findOne({ userId: { $in: userIds } });
                    if (clientByUser)
                        return clientByUser;
                }
            }
            return null;
        };
        // Try finding in dynamicDb (tenant / active context)
        client = await findClientInDb(db_1.default);
        // If not found in dynamicDb, try fallback in centralModels
        if (!client && db_1.centralModels && db_1.centralModels !== db_1.default) {
            client = await findClientInDb(db_1.centralModels);
            if (client) {
                targetDb = db_1.centralModels;
            }
        }
        if (!client) {
            return res.status(404).json({
                success: false,
                message: `User / Client not found matching '${queryStr}' (searched by name, email, mobile, PAN, username, and ID)`
            });
        }
        const clientId = client._id || client.id;
        const userId = client.userId;
        // Reset Client status & KYC verification flags
        await targetDb.Client.findByIdAndUpdate(clientId, {
            $set: {
                kycStatus: 'PENDING',
                kraVerified: false,
                agreementSigned: false,
                status: 'PENDING',
                digilockerData: null,
                signatureUrl: null,
                signedAt: null
            }
        });
        // Reset ClientProfile if it exists
        if (targetDb.ClientProfile) {
            await targetDb.ClientProfile.findOneAndUpdate({ clientId }, {
                $set: {
                    kraVerified: false,
                    isDigiLockerLocked: false,
                    digilockerData: null
                }
            });
        }
        // Delete agreements so client can re-sign
        if (targetDb.Agreement) {
            await targetDb.Agreement.deleteMany({ clientId });
        }
        // Delete consents so client can re-consent
        if (targetDb.Consent) {
            await targetDb.Consent.deleteMany({ clientId });
        }
        // Fetch updated client record
        const updatedClient = await targetDb.Client.findById(clientId).lean();
        // Log Activity
        try {
            (0, activityService_1.logActivity)({
                tenantId: client.tenantId || req.user?.tenantId,
                actorType: 'ADMIN',
                actorId: req.user?.id || 'SYSTEM_ADMIN',
                actorName: req.user?.name || 'Admin',
                actorEmail: req.user?.email || 'admin@sebi-compliance.local',
                targetClientId: clientId,
                category: 'KYC_COMPLIANCE',
                action: 'KYC_RESET',
                title: 'KYC Reset to Pending',
                description: `KYC status for client ${client.name} (${client.email || client.mobile || 'N/A'}) has been reset to PENDING.`,
                status: 'SUCCESS',
                metadata: {
                    searchQuery: queryStr,
                    clientId: clientId.toString(),
                    clientName: client.name,
                    clientEmail: client.email,
                    clientPan: client.pan
                },
                req
            });
        }
        catch (actErr) {
            console.warn('[RESET-KYC] Activity log warning:', actErr?.message);
        }
        return res.status(200).json({
            success: true,
            message: `KYC successfully reset to PENDING for user: ${client.name}`,
            client: {
                id: updatedClient?._id || clientId,
                userId: updatedClient?.userId || userId,
                name: updatedClient?.name,
                email: updatedClient?.email,
                mobile: updatedClient?.mobile,
                pan: updatedClient?.pan,
                kycStatus: updatedClient?.kycStatus || 'PENDING',
                kraVerified: updatedClient?.kraVerified || false,
                agreementSigned: updatedClient?.agreementSigned || false,
                status: updatedClient?.status || 'PENDING'
            }
        });
    }
    catch (error) {
        console.error('Reset KYC error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server Error while resetting KYC'
        });
    }
};
exports.resetClientKyc = resetClientKyc;
/**
 * GET /admin/sms-templates
 * Fetch all SMS templates for the tenant
 */
/**
 * Helper to check for trigger combination conflicts across active SMS templates.
 */
function checkTemplateConflict(proposedCombos, activeTemplates, excludeTemplateId) {
    const normProposed = proposedCombos.map(c => c.trim().toUpperCase());
    for (const activeTpl of activeTemplates) {
        const actId = activeTpl._id?.toString() || activeTpl.id;
        if (excludeTemplateId && actId === excludeTemplateId.toString()) {
            continue;
        }
        const cat = (activeTpl.category || activeTpl.type || '').toUpperCase();
        if (cat !== 'TRADE_SIGNAL') {
            continue;
        }
        let existingCombos = [];
        if (Array.isArray(activeTpl.applicableCombinations) && activeTpl.applicableCombinations.length > 0) {
            existingCombos = activeTpl.applicableCombinations.map((c) => c.trim().toUpperCase());
        }
        else if (Array.isArray(activeTpl.applicableSegments) && Array.isArray(activeTpl.applicableActions)) {
            for (const seg of activeTpl.applicableSegments) {
                for (const act of activeTpl.applicableActions) {
                    existingCombos.push(`${seg.trim().toUpperCase()}_${act.trim().toUpperCase()}`);
                }
            }
        }
        for (const combo of normProposed) {
            if (existingCombos.includes(combo)) {
                return {
                    hasConflict: true,
                    conflictingCombination: combo,
                    conflictingTemplateName: activeTpl.name || 'Another Template'
                };
            }
        }
    }
    return { hasConflict: false };
}
const getSmsTemplates = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        await (0, smsService_1.ensureDefaultSmsTemplates)(tenantId);
        const filter = tenantId
            ? { tenantId }
            : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
        const templates = await db_1.default.SmsTemplate.find(filter)
            .sort({ createdAt: 1 })
            .lean();
        const formatted = templates.map((t) => {
            const segs = Array.isArray(t.applicableSegments) ? t.applicableSegments : [];
            const acts = Array.isArray(t.applicableActions) ? t.applicableActions : [];
            const combos = Array.isArray(t.applicableCombinations) && t.applicableCombinations.length > 0
                ? t.applicableCombinations
                : segs.flatMap((s) => acts.map((a) => `${s}_${a}`));
            return {
                ...t,
                id: t._id?.toString() || t.id,
                category: t.category || t.type || 'CUSTOM',
                type: t.type || t.category || 'CUSTOM',
                applicableSegments: segs,
                applicableActions: acts,
                applicableCombinations: combos,
                content: t.message || t.content || '',
                message: t.message || t.content || '',
                variableMappings: t.variableMappings || [],
                isActive: t.status === 'ACTIVE' || t.isActive === true,
                status: t.status || (t.isActive ? 'ACTIVE' : 'INACTIVE')
            };
        });
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        console.error('Error fetching SMS templates:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch templates' });
    }
};
exports.getSmsTemplates = getSmsTemplates;
/**
 * POST /admin/sms-templates
 * Create a new SMS template
 */
const createSmsTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const name = (req.body.name || '').trim();
        const dltTemplateId = (req.body.dltTemplateId || '').trim();
        const effectiveCategory = (req.body.category || req.body.type || 'CUSTOM').trim().toUpperCase();
        const effectiveType = effectiveCategory;
        const effectiveMessage = (req.body.message || req.body.content || '').trim();
        const effectiveStatus = req.body.status || (req.body.isActive === false ? 'INACTIVE' : 'ACTIVE');
        const applicableSegments = Array.isArray(req.body.applicableSegments)
            ? req.body.applicableSegments.map((s) => s.trim().toUpperCase())
            : [];
        const variableMappings = Array.isArray(req.body.variableMappings) ? req.body.variableMappings.map((m, idx) => ({ index: typeof m.index === 'number' ? m.index : idx, placeholder: String(m.placeholder || '').trim(), fieldKey: String(m.fieldKey || '').trim(), selectedFields: Array.isArray(m.selectedFields) ? m.selectedFields.map(String) : (m.fieldKey ? [String(m.fieldKey)] : []), customLabel: String(m.customLabel || '').trim() })) : [];
        const applicableActions = Array.isArray(req.body.applicableActions)
            ? req.body.applicableActions.map((a) => a.trim().toUpperCase())
            : [];
        let applicableCombinations = Array.isArray(req.body.applicableCombinations) && req.body.applicableCombinations.length > 0
            ? req.body.applicableCombinations.map((c) => c.trim().toUpperCase())
            : applicableSegments.flatMap((s) => applicableActions.map((a) => `${s}_${a}`));
        if (!name || !dltTemplateId || !effectiveMessage) {
            return res.status(400).json({ success: false, message: 'Template name, DLT Template ID, and message are required' });
        }
        // Trade Signal validation & conflict guard
        if (effectiveCategory === 'TRADE_SIGNAL') {
            if (applicableCombinations.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select at least one Segment and one Action combination for Trade Signal templates.'
                });
            }
            if (effectiveStatus === 'ACTIVE') {
                const tenantFilter = tenantId
                    ? { tenantId, status: 'ACTIVE' }
                    : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }], status: 'ACTIVE' };
                const activeTemplates = await db_1.default.SmsTemplate.find(tenantFilter).lean();
                const conflictCheck = checkTemplateConflict(applicableCombinations, activeTemplates);
                if (conflictCheck.hasConflict) {
                    const parts = conflictCheck.conflictingCombination?.split('_') || [];
                    return res.status(400).json({
                        success: false,
                        message: `Conflict: Trigger combination [${parts[0]} - ${parts[1]}] is already assigned to active template "${conflictCheck.conflictingTemplateName}". Each trigger combination can only be used by one active template.`
                    });
                }
            }
        }
        // Trade Alert single active template guard (only 1 active Trade Alert template allowed)
        if (effectiveCategory === 'TRADE_ALERT' && effectiveStatus === 'ACTIVE') {
            const tenantFilter = {
                status: 'ACTIVE',
                $or: [{ category: 'TRADE_ALERT' }, { type: 'TRADE_ALERT' }]
            };
            if (tenantId) {
                tenantFilter.tenantId = tenantId;
            }
            const existingAlertTpl = await db_1.default.SmsTemplate.findOne(tenantFilter).lean();
            if (existingAlertTpl) {
                return res.status(400).json({
                    success: false,
                    message: `Only 1 active Trade Alert template is allowed. Active template "${existingAlertTpl.name}" already exists. Please edit or deactivate it before adding a new one.`
                });
            }
        }
        const template = await db_1.default.SmsTemplate.create({
            tenantId: tenantId || null,
            name,
            type: effectiveType,
            category: effectiveCategory,
            applicableSegments,
            applicableActions,
            applicableCombinations,
            variableMappings,
            dltTemplateId,
            message: effectiveMessage,
            status: effectiveStatus,
            isDefault: false,
            createdById: req.user?.id || null
        });
        const tObj = template.toObject ? template.toObject() : template;
        const formatted = {
            ...tObj,
            id: tObj._id?.toString() || tObj.id,
            category: tObj.category || tObj.type,
            applicableSegments: tObj.applicableSegments || [],
            applicableActions: tObj.applicableActions || [],
            applicableCombinations: tObj.applicableCombinations || [],
            variableMappings: tObj.variableMappings || [],
            content: tObj.message,
            isActive: tObj.status === 'ACTIVE'
        };
        return res.status(201).json({ success: true, message: 'SMS template created successfully', data: formatted });
    }
    catch (error) {
        console.error('Error creating SMS template:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to create template' });
    }
};
exports.createSmsTemplate = createSmsTemplate;
/**
 * PUT /admin/sms-templates/:id
 * Update an SMS template
 */
const updateSmsTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const template = await db_1.default.SmsTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'SMS template not found' });
        }
        if (req.body.name)
            template.name = req.body.name.trim();
        if (req.body.type || req.body.category) {
            const cat = (req.body.category || req.body.type).trim().toUpperCase();
            template.category = cat;
            template.type = cat;
        }
        if (req.body.dltTemplateId)
            template.dltTemplateId = req.body.dltTemplateId.trim();
        if (req.body.message || req.body.content)
            template.message = (req.body.message || req.body.content).trim();
        if (req.body.status)
            template.status = req.body.status;
        if (typeof req.body.isActive === 'boolean')
            template.status = req.body.isActive ? 'ACTIVE' : 'INACTIVE';
        if (req.body.variableMappings !== undefined) {
            template.variableMappings = Array.isArray(req.body.variableMappings) ? req.body.variableMappings.map((m, idx) => ({ index: typeof m.index === 'number' ? m.index : idx, placeholder: String(m.placeholder || '').trim(), fieldKey: String(m.fieldKey || '').trim(), selectedFields: Array.isArray(m.selectedFields) ? m.selectedFields.map(String) : (m.fieldKey ? [String(m.fieldKey)] : []), customLabel: String(m.customLabel || '').trim() })) : [];
        }
        if (req.body.applicableSegments !== undefined) {
            template.applicableSegments = Array.isArray(req.body.applicableSegments)
                ? req.body.applicableSegments.map((s) => s.trim().toUpperCase())
                : [];
        }
        if (req.body.applicableActions !== undefined) {
            template.applicableActions = Array.isArray(req.body.applicableActions)
                ? req.body.applicableActions.map((a) => a.trim().toUpperCase())
                : [];
        }
        if (req.body.applicableCombinations !== undefined) {
            template.applicableCombinations = Array.isArray(req.body.applicableCombinations)
                ? req.body.applicableCombinations.map((c) => c.trim().toUpperCase())
                : [];
        }
        else if (req.body.applicableSegments !== undefined || req.body.applicableActions !== undefined) {
            template.applicableCombinations = template.applicableSegments.flatMap((s) => template.applicableActions.map((a) => `${s}_${a}`));
        }
        // Trade Signal conflict validation on update
        if (template.category === 'TRADE_SIGNAL' && template.status === 'ACTIVE') {
            if ((template.applicableCombinations || []).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select at least one Segment and Action combination for Trade Signal templates.'
                });
            }
            const tenantFilter = tenantId
                ? { tenantId, status: 'ACTIVE' }
                : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }], status: 'ACTIVE' };
            const activeTemplates = await db_1.default.SmsTemplate.find(tenantFilter).lean();
            const conflictCheck = checkTemplateConflict(template.applicableCombinations, activeTemplates, id);
            if (conflictCheck.hasConflict) {
                const parts = conflictCheck.conflictingCombination?.split('_') || [];
                return res.status(400).json({
                    success: false,
                    message: `Conflict: Trigger combination [${parts[0]} - ${parts[1]}] is already assigned to active template "${conflictCheck.conflictingTemplateName}". Each trigger combination can only be assigned to one active template.`
                });
            }
        }
        // Trade Alert single active template guard on update
        if ((template.category === 'TRADE_ALERT' || template.type === 'TRADE_ALERT') && template.status === 'ACTIVE') {
            const tenantFilter = {
                _id: { $ne: template._id },
                status: 'ACTIVE',
                $or: [{ category: 'TRADE_ALERT' }, { type: 'TRADE_ALERT' }]
            };
            if (tenantId)
                tenantFilter.tenantId = tenantId;
            const existingAlertTpl = await db_1.default.SmsTemplate.findOne(tenantFilter).lean();
            if (existingAlertTpl) {
                return res.status(400).json({
                    success: false,
                    message: `Only 1 active Trade Alert template is allowed. Active template "${existingAlertTpl.name}" already exists.`
                });
            }
        }
        await template.save();
        const tObj = template.toObject ? template.toObject() : template;
        const formatted = {
            ...tObj,
            id: tObj._id?.toString() || tObj.id,
            category: tObj.category || tObj.type,
            applicableSegments: tObj.applicableSegments || [],
            applicableActions: tObj.applicableActions || [],
            applicableCombinations: tObj.applicableCombinations || [],
            content: tObj.message,
            isActive: tObj.status === 'ACTIVE'
        };
        return res.status(200).json({ success: true, message: 'SMS template updated', data: formatted });
    }
    catch (error) {
        console.error('Error updating SMS template:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to update template' });
    }
};
exports.updateSmsTemplate = updateSmsTemplate;
/**
 * POST /admin/sms-templates/:id/status
 * Toggle status between ACTIVE and INACTIVE with conflict prevention
 */
const toggleSmsTemplateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const template = await db_1.default.SmsTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'SMS template not found' });
        }
        const nextStatus = template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        // If activating a TRADE_SIGNAL template, check if any of its combinations are already active elsewhere
        if (nextStatus === 'ACTIVE' && template.category === 'TRADE_SIGNAL') {
            const combos = Array.isArray(template.applicableCombinations) && template.applicableCombinations.length > 0
                ? template.applicableCombinations
                : (template.applicableSegments || []).flatMap((s) => (template.applicableActions || []).map((a) => `${s}_${a}`));
            const tenantFilter = tenantId
                ? { tenantId, status: 'ACTIVE' }
                : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }], status: 'ACTIVE' };
            const activeTemplates = await db_1.default.SmsTemplate.find(tenantFilter).lean();
            const conflictCheck = checkTemplateConflict(combos, activeTemplates, id);
            if (conflictCheck.hasConflict) {
                const parts = conflictCheck.conflictingCombination?.split('_') || [];
                return res.status(400).json({
                    success: false,
                    message: `Cannot activate template: Trigger combination [${parts[0]} - ${parts[1]}] is currently assigned to another active template "${conflictCheck.conflictingTemplateName}". Please deactivate that template first.`
                });
            }
        }
        // If activating a TRADE_ALERT template, check if an active one already exists
        if (nextStatus === 'ACTIVE' && (template.category === 'TRADE_ALERT' || template.type === 'TRADE_ALERT')) {
            const tenantFilter = {
                _id: { $ne: template._id },
                status: 'ACTIVE',
                $or: [{ category: 'TRADE_ALERT' }, { type: 'TRADE_ALERT' }]
            };
            if (tenantId)
                tenantFilter.tenantId = tenantId;
            const existingAlertTpl = await db_1.default.SmsTemplate.findOne(tenantFilter).lean();
            if (existingAlertTpl) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot activate template: Only 1 active Trade Alert template is allowed. Active template "${existingAlertTpl.name}" already exists. Please deactivate it first.`
                });
            }
        }
        template.status = nextStatus;
        await template.save();
        const tObj = template.toObject ? template.toObject() : template;
        const formatted = {
            ...tObj,
            id: tObj._id?.toString() || tObj.id,
            category: tObj.category || tObj.type,
            applicableSegments: tObj.applicableSegments || [],
            applicableActions: tObj.applicableActions || [],
            applicableCombinations: tObj.applicableCombinations || [],
            content: tObj.message,
            isActive: template.status === 'ACTIVE',
            status: template.status
        };
        return res.status(200).json({
            success: true,
            message: `Template status changed to ${template.status}`,
            data: formatted
        });
    }
    catch (error) {
        console.error('Error toggling SMS template status:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to toggle status' });
    }
};
exports.toggleSmsTemplateStatus = toggleSmsTemplateStatus;
/**
 * DELETE /admin/sms-templates/:id
 * Delete an SMS template
 */
const deleteSmsTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await db_1.default.SmsTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'SMS template not found' });
        }
        await db_1.default.SmsTemplate.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'SMS template deleted' });
    }
    catch (error) {
        console.error('Error deleting SMS template:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to delete template' });
    }
};
exports.deleteSmsTemplate = deleteSmsTemplate;
/**
 * POST /admin/sms/test
 * Test the SMS Gateway by sending a test SMS to a mobile number
 */
const testSmsGateway = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { mobile, destMobile, message, dltTemplateId, templateId, templateType, username, password, senderId, entityId, variables, orderedVariables } = req.body;
        const targetMobile = (mobile || destMobile || req.body.dest_mobileno || '').toString().trim();
        if (!targetMobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required for testing' });
        }
        let targetTemplate = null;
        if (templateId) {
            targetTemplate = await db_1.default.SmsTemplate.findById(templateId).lean();
        }
        else if (dltTemplateId) {
            targetTemplate = await db_1.default.SmsTemplate.findOne({ dltTemplateId: dltTemplateId.trim() }).lean();
        }
        const resolvedDltId = targetTemplate?.dltTemplateId || (dltTemplateId ? dltTemplateId.trim() : undefined);
        const resolvedType = targetTemplate?.category || targetTemplate?.type || templateType || (resolvedDltId ? undefined : 'LOGIN_2FA');
        const resolvedMessage = message ? message.trim() : (targetTemplate?.message || undefined);
        const testVars = {
            otp: '123456',
            var: '123456',
            num: '110',
            alp: 'BUY RELIANCE 120',
            code: '123456',
            stock: 'RELIANCE',
            symbol: 'RELIANCE',
            action: 'BUY',
            callType: 'BUY',
            segment: 'CASH',
            entryPrice: '120',
            price: '120',
            targets: '150/160',
            target: '150',
            target1: '150',
            target2: '160',
            stoploss: '110',
            sl: '110',
            duration: 'INTRADAY',
            ...(variables || {})
        };
        const testOrderedVars = Array.isArray(orderedVariables) && orderedVariables.length > 0
            ? orderedVariables
            : (targetTemplate?.category === 'TRADE_SIGNAL' ? ['BUY RELIANCE 120', '150/160', '110'] : undefined);
        const result = await (0, smsService_1.sendSms)({
            tenantId,
            mobile: targetMobile,
            templateType: resolvedType,
            variables: testVars,
            orderedVariables: testOrderedVars,
            customMessage: resolvedMessage,
            dltTemplateId: resolvedDltId,
            overrideCredentials: (username && senderId) ? {
                username,
                password,
                senderId,
                entityId
            } : undefined
        });
        if (result.success) {
            return res.status(200).json({ success: true, message: 'Test SMS sent successfully', details: result });
        }
        else {
            return res.status(400).json({ success: false, message: result.message || 'Failed to send test SMS', reason: result.reason, details: result });
        }
    }
    catch (error) {
        console.error('Error testing SMS gateway:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to test SMS gateway' });
    }
};
exports.testSmsGateway = testSmsGateway;
/**
 * POST /admin/test-digio
 * Test Digio API credentials and connectivity
 */
const testDigioConfig = async (req, res) => {
    try {
        const { digioClientId, digioClientSecret, digioEnvironment } = req.body;
        const tenantId = req.user?.tenantId;
        let clientId = digioClientId ? String(digioClientId).trim() : '';
        let clientSecret = digioClientSecret ? String(digioClientSecret).trim() : '';
        let environment = digioEnvironment;
        if (!clientId || !clientSecret) {
            const tenant = await db_1.default.Tenant.findById(tenantId).lean();
            if (tenant) {
                clientId = clientId || tenant.digioClientId;
                clientSecret = clientSecret || tenant.digioClientSecret;
                environment = environment || tenant.digioEnvironment;
            }
        }
        if (!clientId || !clientSecret) {
            return res.status(400).json({
                success: false,
                message: 'Both Digio Client ID and Client Secret are required for testing.'
            });
        }
        if (clientId === clientSecret) {
            return res.status(400).json({
                success: false,
                message: 'Digio Client ID and Client Secret cannot be identical. Please paste the actual Secret Key generated from your Digio dashboard.'
            });
        }
        console.log("hi", clientId, clientSecret, environment);
        const testRes = await (0, digioService_1.testDigioConnection)(clientId, clientSecret, environment);
        return res.json(testRes);
    }
    catch (err) {
        console.error('Error testing Digio credentials:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Error communicating with Digio API'
        });
    }
};
exports.testDigioConfig = testDigioConfig;
const testCamsKraConfig = async (req, res) => {
    try {
        const { camsClientCode, camsClientId, camsClientSecret, camsPoscode } = req.body;
        const tenantId = req.user?.tenantId;
        const creds = await (0, camsKraService_1.getCamsCredentials)(tenantId, {
            camsClientCode,
            camsClientId,
            camsClientSecret,
            camsPoscode
        });
        if (!creds.camsClientCode || !creds.camsClientId || !creds.camsClientSecret) {
            return res.status(400).json({
                success: false,
                message: 'CAMS Client Code, Client ID, and Client Secret are required.'
            });
        }
        if (creds.camsClientId.trim() === creds.camsClientSecret.trim()) {
            return res.status(400).json({
                success: false,
                message: 'CAMS Client ID aur Client Secret same nahi ho sakte! CAMS KRA me Client Secret (Password) alag hota hai. Isi wajah se CAMS server "No data found." return karta hai. Kripya apna sahi CAMS Client Secret dalein.'
            });
        }
        const testRes = await (0, camsKraService_1.getCamsToken)(creds);
        if (!testRes.success) {
            const errorMsg = testRes.message === 'No data found.'
                ? 'CAMS KRA server error: "No data found." Kripya check karein: Client Code (STOCKLIV), Client ID aur Client Secret sahi hain ya nahi (Client Secret aur Client ID alag hone chahiye).'
                : (testRes.message || 'CAMS KRA Authentication Failed');
            return res.status(400).json({
                success: false,
                message: errorMsg,
                data: testRes.data
            });
        }
        return res.json({
            success: true,
            message: 'CAMS KRA Authentication Token generated successfully!',
            tokenPreview: testRes.token ? (testRes.token.slice(0, 8) + '...' + testRes.token.slice(-6)) : '',
            data: testRes.data
        });
    }
    catch (err) {
        console.error('Error testing CAMS KRA credentials:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Error communicating with CAMS KRA API'
        });
    }
};
exports.testCamsKraConfig = testCamsKraConfig;
/**
 * Send or Resend Official Tax Invoice PDF via Email to Client
 */
const sendPaymentInvoiceEmail = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    try {
        let payment = null;
        if (mongoose_1.default.Types.ObjectId.isValid(id)) {
            payment = await db_1.default.Payment.findById(id).lean();
        }
        if (!payment) {
            payment = await db_1.default.Payment.findOne({ transactionRef: id }).lean();
        }
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }
        let client = null;
        if (payment.clientId) {
            if (mongoose_1.default.Types.ObjectId.isValid(payment.clientId)) {
                client = await db_1.default.Client.findById(payment.clientId).lean();
            }
            if (!client) {
                client = await db_1.default.Client.findOne({ userId: payment.clientId }).lean();
            }
        }
        if (payment.invoiceStatus === 'PENDING_AGREEMENT') {
            return res.status(400).json({
                success: false,
                message: 'Client Service Agreement is pending. In accordance with compliance policy, invoices cannot be emailed to clients until the agreement is executed.'
            });
        }
        const clientEmail = client?.email || payment.clientEmail;
        if (!clientEmail) {
            return res.status(400).json({ success: false, message: 'Client does not have a registered email address to receive invoice.' });
        }
        const tenantObj = await db_1.default.Tenant.findById(tenantId || payment.tenantId).lean();
        let plan = null;
        if (payment.planId) {
            plan = await db_1.default.Plan.findById(payment.planId).lean();
        }
        const pdfBuffer = await (0, invoiceGenerator_1.generateInvoicePdf)(String(payment._id || payment.id));
        const invNumber = payment.transactionRef
            ? `INV/${new Date().getFullYear()}/${String(payment.transactionRef).slice(-6).toUpperCase()}`
            : `INV/${new Date().getFullYear()}/001`;
        const sent = await (0, emailService_1.sendTaxInvoiceEmail)({
            tenantId: tenantId || payment.tenantId,
            toEmail: clientEmail,
            clientName: client?.name || payment.clientName || 'Client',
            companyName: tenantObj?.companyName,
            planName: plan?.name || payment.planName || 'Service Plan',
            invoiceNumber: invNumber,
            amount: payment.amount,
            pdfBuffer
        });
        if (!sent) {
            return res.status(500).json({ success: false, message: 'Failed to send email. Please check your SMTP configuration in Settings.' });
        }
        await db_1.default.Payment.findByIdAndUpdate(payment._id || payment.id, {
            $set: {
                invoiceSentAt: new Date(),
                lastEmailedTo: clientEmail,
                invoiceStatus: 'GENERATED'
            }
        });
        const targetClientId = client?._id || client?.id || payment.clientId;
        if (targetClientId) {
            (0, activityService_1.logActivity)({
                tenantId: tenantId || payment.tenantId,
                actorType: req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
                actorId: req.user?.id,
                actorName: req.user?.name || req.user?.email || 'Admin',
                targetClientId,
                category: 'PAYMENT',
                action: 'INVOICE_SENT',
                title: `Tax Invoice Dispatched (${invNumber})`,
                description: `Official Tax Invoice (${invNumber}) for ${plan?.name || payment.planName || 'Plan'} (₹${Number(payment.amount || 0).toLocaleString('en-IN')}) emailed to ${clientEmail}`,
                status: 'SUCCESS',
                metadata: {
                    invoiceNumber: invNumber,
                    transactionRef: payment.transactionRef,
                    amount: `₹${Number(payment.amount || 0).toLocaleString('en-IN')}`,
                    planName: plan?.name || payment.planName,
                    emailedTo: clientEmail,
                    sentAt: new Date().toISOString()
                },
                req
            });
        }
        return res.json({
            success: true,
            message: `Tax Invoice successfully emailed to ${clientEmail}`,
            invoiceSentAt: new Date()
        });
    }
    catch (error) {
        console.error('Error in sendPaymentInvoiceEmail:', error);
        return res.status(500).json({ success: false, message: error.message || 'Error generating or sending invoice email' });
    }
};
exports.sendPaymentInvoiceEmail = sendPaymentInvoiceEmail;
const getAdminNotifications = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    try {
        const query = {
            $or: [
                { recipient: 'ADMIN' },
                { channel: 'ADMIN' },
                { recipient: String(userId) }
            ]
        };
        if (tenantId) {
            query.tenantId = tenantId;
        }
        const notifications = await db_1.default.NotificationLog.find(query)
            .sort({ createdAt: -1 })
            .limit(60)
            .lean();
        const formatted = notifications.map((n) => ({
            ...n,
            id: String(n._id || n.id),
            read: n.isRead || n.read || n.status === 'READ',
            isRead: n.isRead || n.read || n.status === 'READ'
        }));
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getAdminNotifications = getAdminNotifications;
const markAdminNotificationsAsRead = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { notificationId } = req.body;
    try {
        const query = {
            $or: [
                { recipient: 'ADMIN' },
                { channel: 'ADMIN' },
                { recipient: String(userId) }
            ]
        };
        if (tenantId) {
            query.tenantId = tenantId;
        }
        if (notificationId) {
            query._id = notificationId;
        }
        await db_1.default.NotificationLog.updateMany(query, {
            $set: { isRead: true, status: 'READ' }
        });
        return res.status(200).json({ success: true, message: 'Admin notifications marked as read' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.markAdminNotificationsAsRead = markAdminNotificationsAsRead;
/**
 * POST /admin/clients/permanent-delete
 * Permanently deletes a user/client and all associated details (PAN, Profile, KYC, Agreements, Documents, Subscriptions, Payments, etc.) from the DB.
 */
const permanentDeleteClient = async (req, res) => {
    try {
        const searchParam = req.body?.name ||
            req.query?.name ||
            req.body?.clientName ||
            req.query?.clientName ||
            req.body?.username ||
            req.query?.username ||
            req.body?.email ||
            req.query?.email ||
            req.body?.mobile ||
            req.query?.mobile ||
            req.body?.phone ||
            req.query?.phone ||
            req.body?.pan ||
            req.query?.pan ||
            req.body?.aadhaar ||
            req.query?.aadhaar ||
            req.body?.clientId ||
            req.query?.clientId ||
            req.body?.userId ||
            req.query?.userId ||
            req.body?.id ||
            req.query?.id ||
            req.params?.id ||
            req.body?.search ||
            req.query?.search ||
            req.body?.query ||
            req.query?.query ||
            req.body?.identifier ||
            req.query?.identifier;
        if (!searchParam || String(searchParam).trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'User / Client identifier is required. Please provide name, username, email, mobile, or pan.',
                examples: {
                    json_body: { name: 'Pavan Kumar' },
                    query_param: '/api/v1/admin/clients/permanent-delete?name=Pavan'
                }
            });
        }
        const queryStr = String(searchParam).trim();
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const safeRegex = new RegExp(escapeRegex(queryStr), 'i');
        const exactRegex = new RegExp(`^${escapeRegex(queryStr)}$`, 'i');
        let client = null;
        let user = null;
        let targetDb = db_1.default;
        // Helper to find client / user in a specific database model container
        const findClientInDb = async (db) => {
            if (!db)
                return null;
            // 1. Direct match by ObjectId (Client ID or User ID)
            if (mongoose_1.default.Types.ObjectId.isValid(queryStr)) {
                if (db.Client) {
                    const directClient = await db.Client.findById(queryStr);
                    if (directClient)
                        return { client: directClient, user: db.User ? await db.User.findById(directClient.userId) : null };
                    const byUserId = await db.Client.findOne({ userId: queryStr });
                    if (byUserId)
                        return { client: byUserId, user: db.User ? await db.User.findById(queryStr) : null };
                }
                if (db.User) {
                    const directUser = await db.User.findById(queryStr);
                    if (directUser) {
                        const clientDoc = db.Client ? await db.Client.findOne({ userId: directUser._id }) : null;
                        return { client: clientDoc, user: directUser };
                    }
                }
            }
            // 2. Match by exact PAN (e.g. ABCDE1234F) in Client
            if (db.Client) {
                const byPan = await db.Client.findOne({ pan: exactRegex });
                if (byPan) {
                    const uDoc = db.User ? await db.User.findById(byPan.userId) : null;
                    return { client: byPan, user: uDoc };
                }
            }
            // 3. Match by exact Email in Client or User
            if (db.Client) {
                const byEmail = await db.Client.findOne({ email: exactRegex });
                if (byEmail) {
                    const uDoc = db.User ? await db.User.findById(byEmail.userId) : null;
                    return { client: byEmail, user: uDoc };
                }
            }
            if (db.User) {
                const userByEmail = await db.User.findOne({ email: exactRegex });
                if (userByEmail) {
                    const clientDoc = db.Client ? await db.Client.findOne({ userId: userByEmail._id }) : null;
                    return { client: clientDoc, user: userByEmail };
                }
            }
            // 4. Match by Mobile
            const cleanDigits = queryStr.replace(/\D/g, '');
            if (cleanDigits.length >= 10) {
                const mobRegex = new RegExp(escapeRegex(cleanDigits.slice(-10)));
                if (db.Client) {
                    const byMob = await db.Client.findOne({ mobile: { $regex: mobRegex } });
                    if (byMob) {
                        const uDoc = db.User ? await db.User.findById(byMob.userId) : null;
                        return { client: byMob, user: uDoc };
                    }
                }
                if (db.User) {
                    const userByMob = await db.User.findOne({ mobile: { $regex: mobRegex } });
                    if (userByMob) {
                        const clientDoc = db.Client ? await db.Client.findOne({ userId: userByMob._id }) : null;
                        return { client: clientDoc, user: userByMob };
                    }
                }
            }
            else {
                if (db.Client) {
                    const byMob = await db.Client.findOne({ mobile: exactRegex });
                    if (byMob) {
                        const uDoc = db.User ? await db.User.findById(byMob.userId) : null;
                        return { client: byMob, user: uDoc };
                    }
                }
            }
            // 5. Match by exact Name in Client (name, panName, aadhaarName)
            if (db.Client) {
                const byExactName = await db.Client.findOne({
                    $or: [
                        { name: exactRegex },
                        { panName: exactRegex },
                        { aadhaarName: exactRegex }
                    ]
                });
                if (byExactName) {
                    const uDoc = db.User ? await db.User.findById(byExactName.userId) : null;
                    return { client: byExactName, user: uDoc };
                }
            }
            // 6. Match by partial Name in Client
            if (db.Client) {
                const byPartialName = await db.Client.findOne({
                    $or: [
                        { name: safeRegex },
                        { panName: safeRegex },
                        { aadhaarName: safeRegex }
                    ]
                });
                if (byPartialName) {
                    const uDoc = db.User ? await db.User.findById(byPartialName.userId) : null;
                    return { client: byPartialName, user: uDoc };
                }
            }
            // 7. Match via User collection
            if (db.User) {
                const matchedUsers = await db.User.find({
                    $or: [
                        { email: exactRegex },
                        { mobile: exactRegex },
                        { username: exactRegex },
                        { name: safeRegex },
                        { firstName: safeRegex },
                        { lastName: safeRegex }
                    ]
                }).limit(10).lean();
                if (matchedUsers.length > 0) {
                    for (const u of matchedUsers) {
                        const clientByUser = db.Client ? await db.Client.findOne({ userId: u._id || u.id }) : null;
                        if (clientByUser)
                            return { client: clientByUser, user: u };
                    }
                    return { client: null, user: matchedUsers[0] };
                }
            }
            return null;
        };
        let found = await findClientInDb(db_1.default);
        if (found) {
            client = found.client;
            user = found.user;
        }
        else if (db_1.centralModels && db_1.centralModels !== db_1.default) {
            found = await findClientInDb(db_1.centralModels);
            if (found) {
                client = found.client;
                user = found.user;
                targetDb = db_1.centralModels;
            }
        }
        if (!client && !user) {
            return res.status(404).json({
                success: false,
                message: `User / Client not found matching '${queryStr}' (searched across name, PAN, email, mobile, username, and ID)`
            });
        }
        const clientId = client?._id || client?.id;
        const userId = user?._id || user?.id || client?.userId;
        const deletedSummary = {};
        // 1. Delete Client
        if (clientId && targetDb.Client) {
            const resC = await targetDb.Client.deleteMany({ _id: clientId });
            deletedSummary.clients = resC.deletedCount || 0;
        }
        // 2. Delete User
        if (userId && targetDb.User) {
            const resU = await targetDb.User.deleteMany({ _id: userId });
            deletedSummary.users = resU.deletedCount || 0;
        }
        // 3. Delete ClientProfile
        if (targetDb.ClientProfile && (clientId || userId)) {
            const resCP = await targetDb.ClientProfile.deleteMany({
                $or: [
                    ...(clientId ? [{ clientId }] : []),
                    ...(userId ? [{ userId }] : [])
                ]
            });
            deletedSummary.clientProfiles = resCP.deletedCount || 0;
        }
        // 4. Delete ClientDocument
        if (targetDb.ClientDocument && clientId) {
            const resCD = await targetDb.ClientDocument.deleteMany({ clientId });
            deletedSummary.clientDocuments = resCD.deletedCount || 0;
        }
        // 5. Delete ClientIdentityHistory
        if (targetDb.ClientIdentityHistory && clientId) {
            const resCIH = await targetDb.ClientIdentityHistory.deleteMany({ clientId });
            deletedSummary.identityHistory = resCIH.deletedCount || 0;
        }
        // 6. Delete Agreements & History
        if (targetDb.Agreement && clientId) {
            const resA = await targetDb.Agreement.deleteMany({ clientId });
            deletedSummary.agreements = resA.deletedCount || 0;
        }
        if (targetDb.AgreementHistory && clientId) {
            const resAH = await targetDb.AgreementHistory.deleteMany({ clientId });
            deletedSummary.agreementHistory = resAH.deletedCount || 0;
        }
        // 7. Delete Consents & History
        if (targetDb.Consent && clientId) {
            const resCon = await targetDb.Consent.deleteMany({ clientId });
            deletedSummary.consents = resCon.deletedCount || 0;
        }
        if (targetDb.ConsentHistory && clientId) {
            const resConH = await targetDb.ConsentHistory.deleteMany({ clientId });
            deletedSummary.consentHistory = resConH.deletedCount || 0;
        }
        // 8. Delete Subscriptions
        if (targetDb.Subscription && (clientId || userId)) {
            const resSub = await targetDb.Subscription.deleteMany({
                $or: [
                    ...(clientId ? [{ clientId }] : []),
                    ...(userId ? [{ userId }] : [])
                ]
            });
            deletedSummary.subscriptions = resSub.deletedCount || 0;
        }
        // 9. Delete Payments
        if (targetDb.Payment && (clientId || userId)) {
            const resPay = await targetDb.Payment.deleteMany({
                $or: [
                    ...(clientId ? [{ clientId }] : []),
                    ...(userId ? [{ userId }] : [])
                ]
            });
            deletedSummary.payments = resPay.deletedCount || 0;
        }
        // 10. Delete Support Tickets & Messages
        if (targetDb.SupportTicket && (clientId || userId)) {
            const resTick = await targetDb.SupportTicket.deleteMany({
                $or: [
                    ...(clientId ? [{ clientId }] : []),
                    ...(userId ? [{ userId }] : [])
                ]
            });
            deletedSummary.supportTickets = resTick.deletedCount || 0;
        }
        if (targetDb.TicketMessage && (clientId || userId)) {
            const resTM = await targetDb.TicketMessage.deleteMany({
                $or: [
                    ...(clientId ? [{ clientId }] : []),
                    ...(userId ? [{ userId }] : [])
                ]
            });
            deletedSummary.ticketMessages = resTM.deletedCount || 0;
        }
        // 11. Delete Complaints
        if (targetDb.Complaint && clientId) {
            const resComp = await targetDb.Complaint.deleteMany({ clientId });
            deletedSummary.complaints = resComp.deletedCount || 0;
        }
        // 12. Delete Client Call Recordings
        if (targetDb.ClientCallRecording && clientId) {
            const resCCR = await targetDb.ClientCallRecording.deleteMany({ clientId });
            deletedSummary.callRecordings = resCCR.deletedCount || 0;
        }
        // 13. Delete Compliance Alerts
        if (targetDb.ComplianceAlert && clientId) {
            const resCA = await targetDb.ComplianceAlert.deleteMany({ clientId });
            deletedSummary.complianceAlerts = resCA.deletedCount || 0;
        }
        // 14. Delete Notification Logs
        if (targetDb.NotificationLog && (clientId || userId)) {
            const resNL = await targetDb.NotificationLog.deleteMany({
                $or: [
                    ...(clientId ? [{ clientId }, { targetClientId: clientId }] : []),
                    ...(userId ? [{ userId }, { targetUserId: userId }] : [])
                ]
            });
            deletedSummary.notificationLogs = resNL.deletedCount || 0;
        }
        // 15. Delete Email Verification records
        if (targetDb.EmailVerification && (client?.email || user?.email)) {
            const resEV = await targetDb.EmailVerification.deleteMany({
                email: exactRegex
            });
            deletedSummary.emailVerifications = resEV.deletedCount || 0;
        }
        // Log Activity for permanent deletion
        try {
            (0, activityService_1.logActivity)({
                tenantId: client?.tenantId || user?.tenantId || req.user?.tenantId,
                actorType: 'ADMIN',
                actorId: req.user?.id || 'SYSTEM_ADMIN',
                actorName: req.user?.name || 'Admin',
                actorEmail: req.user?.email || 'admin@sebi-compliance.local',
                targetClientId: clientId || null,
                category: 'STAFF_ACTION',
                action: 'PERMANENT_CLIENT_DELETE',
                title: 'Client Permanently Deleted',
                description: `Client ${client?.name || user?.name || queryStr} (${client?.email || user?.email || 'N/A'}, PAN: ${client?.pan || 'N/A'}) has been permanently deleted from all DB collections.`,
                status: 'SUCCESS',
                metadata: {
                    searchQuery: queryStr,
                    deletedUser: {
                        clientId: clientId?.toString(),
                        userId: userId?.toString(),
                        name: client?.name || user?.name,
                        email: client?.email || user?.email,
                        mobile: client?.mobile || user?.mobile,
                        pan: client?.pan
                    },
                    deletedSummary
                },
                req
            });
        }
        catch (actErr) {
            console.warn('[PERMANENT-DELETE] Activity log warning:', actErr?.message);
        }
        return res.status(200).json({
            success: true,
            message: `User '${client?.name || user?.name || queryStr}' and all associated details (PAN, Profile, KYC, Agreements, Documents, Subscriptions) have been PERMANENTLY deleted from the database.`,
            deletedUser: {
                id: clientId || null,
                userId: userId || null,
                name: client?.name || user?.name || null,
                email: client?.email || user?.email || null,
                mobile: client?.mobile || user?.mobile || null,
                pan: client?.pan || null,
                aadhaar: client?.aadhaar || null
            },
            deletedRecords: deletedSummary
        });
    }
    catch (error) {
        console.error('Permanent Delete Client error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server Error while permanently deleting client'
        });
    }
};
exports.permanentDeleteClient = permanentDeleteClient;
/**
 * Launch tenant portal to LIVE production.
 * Verifies admin password, waives/cleans prior routine calendar penalties and alerts,
 * and sets the compliance cutoff date based on the 1-14 (15th of current month) vs 15-31 (1st of next month) rule.
 */
const goLiveTenant = async (req, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { password } = req.body;
    if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    }
    if (!password || !password.trim()) {
        return res.status(400).json({ success: false, message: 'Admin password is required to verify and launch portal.' });
    }
    try {
        // 1. Password verification
        let user = await db_1.default.User.findById(userId);
        if (!user && db_1.default.SuperAdmin) {
            user = await db_1.default.SuperAdmin.findById(userId);
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'Admin user not found.' });
        }
        const hash = user.passwordHash || user.password;
        if (!hash) {
            return res.status(400).json({ success: false, message: 'No password hash found for this user.' });
        }
        const isMatch = await bcrypt.compare(password, hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect password. Verification failed.' });
        }
        // 2. Fetch tenant
        let tenant = await db_1.default.Tenant.findById(tenantId);
        if (!tenant) {
            tenant = await db_1.default.Tenant.findOne({ deletedAt: null });
        }
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant record not found.' });
        }
        if (tenant.isLive) {
            return res.status(400).json({
                success: false,
                message: 'This portal is already LIVE. The Go-Live action is permanent and cannot be re-run.'
            });
        }
        // 3. Smart Date Cut-off calculation
        const now = new Date();
        const currentDay = now.getDate();
        let complianceCutoffDate;
        if (currentDay >= 1 && currentDay <= 14) {
            // 1st to 14th: Cut-off is 15th of the current month
            complianceCutoffDate = new Date(now.getFullYear(), now.getMonth(), 15, 0, 0, 0, 0);
        }
        else {
            // 15th to 31st: Cut-off is 1st of the next month
            complianceCutoffDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        }
        const resolvedTenantId = String(tenant._id || tenant.id || tenantId);
        // 4. Pre-operational Data Cleanup:
        // A. Waive all existing pending / non-compliant penalties created prior to cutoff
        await db_1.default.Penalty.updateMany({
            $or: [{ tenantId: resolvedTenantId }, { tenantId }],
            status: { $in: ['PENDING', 'NON_COMPLIANT'] }
        }, {
            $set: {
                status: 'WAIVED',
                resolutionType: 'Compliant',
                remarks: `Auto-waived: Pre-operational setup period prior to Production Go-Live (${now.toLocaleDateString('en-IN')}).`,
                resolvedAt: now
            }
        });
        // B. Waive all existing audits that are OVERDUE or NON_COMPLIANT
        await db_1.default.ComplianceAudit.updateMany({
            $or: [{ tenantId: resolvedTenantId }, { tenantId }],
            status: { $in: ['OVERDUE', 'NON_COMPLIANT', 'PENDING'] },
            dueDate: { $lt: complianceCutoffDate }
        }, {
            $set: {
                status: 'WAIVED',
                officerRemarks: `Auto-waived prior to Go-Live. Periodic compliance begins from ${complianceCutoffDate.toLocaleDateString('en-IN')}.`,
                submittedAt: now
            }
        });
        // C. Remove routine / calendar alerts (keep active client KYC/Agreement alerts)
        await db_1.default.ComplianceAlert.updateMany({
            $or: [{ tenantId: resolvedTenantId }, { tenantId }],
            alertType: { $nin: ['KYC_MISSING', 'AGREEMENT_MISSING', 'PAN_MISSING', 'AADHAAR_MISSING'] },
            status: 'OPEN'
        }, {
            $set: {
                status: 'CLOSED',
                remarks: `Auto-resolved: Routine calendar alert cleared prior to Production Go-Live.`,
                closedAt: now
            }
        });
        // 5. Update Tenant to LIVE permanently
        const updatedTenant = await db_1.default.Tenant.findByIdAndUpdate(tenant._id, {
            $set: {
                isLive: true,
                goLiveAt: now,
                goLiveBy: user._id,
                complianceCutoffDate
            }
        }, { returnDocument: 'after', lean: true });
        // Also update centralModels if available
        try {
            if (db_1.centralModels?.Tenant) {
                await db_1.centralModels.Tenant.findByIdAndUpdate(tenant._id, {
                    $set: {
                        isLive: true,
                        goLiveAt: now,
                        goLiveBy: user._id,
                        complianceCutoffDate
                    }
                });
            }
        }
        catch { }
        // 6. Log Audit and Activity
        await (0, auditService_1.logAudit)({
            userId: user._id.toString(),
            tenantId: resolvedTenantId,
            action: 'UPDATE',
            module: 'TENANTS',
            newValue: {
                isLive: true,
                goLiveAt: now,
                complianceCutoffDate,
                adminEmail: user.email
            }
        });
        await (0, activityService_1.logActivity)({
            tenantId: resolvedTenantId,
            actorType: 'ADMIN',
            actorId: user._id,
            actorName: user.name || 'Admin',
            actorEmail: user.email,
            category: 'SYSTEM',
            action: 'PORTAL_LAUNCHED_LIVE',
            title: 'Portal Launched to Live Production',
            description: `Production Go-Live enabled by Admin. Compliance effective date: ${complianceCutoffDate.toLocaleDateString('en-IN')}.`,
            status: 'SUCCESS'
        });
        return res.status(200).json({
            success: true,
            message: `Portal successfully launched to LIVE! Compliance monitoring will officially begin from ${complianceCutoffDate.toLocaleDateString('en-IN')}.`,
            data: {
                isLive: true,
                goLiveAt: now,
                complianceCutoffDate
            }
        });
    }
    catch (error) {
        console.error('Go Live error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.goLiveTenant = goLiveTenant;
