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
exports.runCompanyComplianceSweep = exports.getCompanyCompliance = exports.getCompanyStaff = exports.getCompanyClients = exports.testMongoConnection = exports.verifyDomainUrl = exports.syncAllTenantsApi = exports.syncTenantApi = exports.provisionTenantDb = exports.updateComplianceRule = exports.getComplianceRules = exports.parseNismCertificate = exports.parseSebiCertificate = exports.updateSuperAdminPassword = exports.updateTenantDetails = exports.getTenantDetails = exports.getGlobalTelemetry = exports.getAuditLogs = exports.getCompanyPanelStats = exports.impersonateTenant = exports.permanentDeleteTenant = exports.restoreTenant = exports.deleteTenant = exports.toggleTenantStatus = exports.getTenants = exports.getTenantDocumentHistory = exports.createTenant = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_1 = require("mongodb");
const db_1 = __importStar(require("../config/db"));
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const auditService_1 = require("../services/auditService");
const tenantProvisionEngine_1 = require("../services/tenantProvisionEngine");
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const stateService_1 = require("../services/stateService");
const jwt = __importStar(require("jsonwebtoken"));
const pdfOcr_1 = require("../utils/pdfOcr");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const createTenant = async (req, res) => {
    const { companyName, panelName, domainUrl, mongoDbUrl, dbName, companyType, raType, ownerName, sebiRegistration, bseEnrollment, email, mobile, address, pan, gst, website, certificateValidity, nismValidity, depositAmount, adminEmail, adminPassword, password, adminName, adminMobile, state } = req.body;
    if (!companyName || !ownerName || !sebiRegistration || !email || !mobile || !pan || !address) {
        return res.status(400).json({
            success: false,
            message: 'All fields are mandatory: Company Name, Owner Name, SEBI Registration, Email, Mobile, PAN, and Address.'
        });
    }
    const adminEmailToUse = (adminEmail || email || '').toLowerCase().trim();
    const rawAdminPassword = (adminPassword || password || '').trim() || ('Temp@' + Math.floor(1000 + Math.random() * 9000));
    const adminFullName = (adminName || ownerName || `${companyName} Admin`).trim();
    const nameParts = adminFullName.split(' ');
    const adminFirstName = nameParts[0] || companyName;
    const adminLastName = nameParts.slice(1).join(' ') || 'Admin';
    const adminMobileToUse = adminMobile || mobile;
    const effectiveState = state || (0, stateService_1.detectStateFromGst)(gst) || (0, stateService_1.detectStateFromText)(address) || null;
    try {
        // Check duplicates in Central DB all_companies
        let existingTenants = [];
        try {
            const orConditions = [
                { email },
                { sebiRegistration },
                { mobile }
            ];
            if (pan)
                orConditions.push({ pan });
            if (gst)
                orConditions.push({ gst });
            if (bseEnrollment)
                orConditions.push({ bseEnrollment });
            if (domainUrl)
                orConditions.push({ domainUrl });
            existingTenants = await db_1.centralModels.AllCompany.find({
                $or: orConditions
            }).lean();
        }
        catch {
            existingTenants = [];
        }
        if (existingTenants.length > 0) {
            const duplicates = [];
            existingTenants.forEach((tenant) => {
                if (tenant.email === email)
                    duplicates.push('Email');
                if (tenant.sebiRegistration === sebiRegistration)
                    duplicates.push('SEBI Registration');
                if (pan && tenant.pan === pan)
                    duplicates.push('PAN');
                if (tenant.mobile === mobile)
                    duplicates.push('Mobile');
                if (gst && tenant.gst === gst)
                    duplicates.push('GST');
                if (bseEnrollment && tenant.bseEnrollment === bseEnrollment)
                    duplicates.push('BSE Enrollment');
                if (domainUrl && tenant.domainUrl === domainUrl)
                    duplicates.push('Domain URL');
            });
            const uniqueDuplicates = Array.from(new Set(duplicates));
            return res.status(400).json({
                success: false,
                message: `Duplicate data found for: ${uniqueDuplicates.join(', ')}. Please use unique values.`,
                duplicateFields: uniqueDuplicates,
                errors: [`Duplicate entries found for ${uniqueDuplicates.join(', ')}.`]
            });
        }
        // Check duplicates in User table
        const existingUser = await db_1.centralModels.User.findOne({
            email: adminEmailToUse
        }).lean();
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: `A user with the Admin Email '${adminEmailToUse}' already exists in the system.`,
                duplicateFields: ['Email'],
                errors: ['Duplicate user email found.']
            });
        }
        // Extract certificates from req.files
        let certificateUrl = null;
        let nismCertificateUrl = null;
        const files = req.files;
        if (files && files.sebiCertificate && files.sebiCertificate[0]) {
            certificateUrl = `/uploads/policies/${files.sebiCertificate[0].filename}`;
        }
        if (files && files.nismCertificate && files.nismCertificate[0]) {
            nismCertificateUrl = `/uploads/policies/${files.nismCertificate[0].filename}`;
        }
        const ocrExtractedReg = sebiRegistration;
        // Hash credentials
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(rawAdminPassword, salt);
        const generatedApiKey = 'ragcp_' + crypto.randomBytes(16).toString('hex');
        // 1. Prepare Tenant & Admin provision payloads
        const certValidity = certificateValidity && !isNaN(new Date(certificateValidity).getTime())
            ? new Date(certificateValidity)
            : null;
        const nismVal = nismValidity && !isNaN(new Date(nismValidity).getTime())
            ? new Date(nismValidity)
            : null;
        const depAmt = depositAmount && !isNaN(parseFloat(depositAmount))
            ? parseFloat(depositAmount)
            : 0.0;
        const tenantPayload = {
            companyName,
            panelName: panelName || `${companyName} Portal`,
            domainUrl: domainUrl || null,
            tenantApiKey: generatedApiKey,
            companyType: companyType || 'INDIVIDUAL',
            raType: raType || 'FULL_TIME',
            ownerName,
            sebiRegistration: ocrExtractedReg,
            bseEnrollment: bseEnrollment || null,
            email,
            mobile,
            address,
            pan,
            gst: gst || null,
            website: website || null,
            certificateUrl,
            certificateValidity: certValidity,
            nismCertificateUrl,
            nismValidity: nismVal,
            depositAmount: depAmt,
            state: effectiveState,
            status: 'PENDING_PROFILE'
        };
        const adminUserPayload = {
            email: adminEmailToUse,
            firstName: adminFirstName,
            lastName: adminLastName,
            mobile: adminMobileToUse,
            passwordHash,
            tempPassword: rawAdminPassword,
            status: 'ACTIVE'
        };
        // 2. Automated Multi-Tenant Database & Collection Provisioning Engine
        const provisionResult = await tenantProvisionEngine_1.tenantProvisionEngine.provisionTenantFull(tenantPayload, adminUserPayload, req.user?.id);
        if (!provisionResult.success) {
            return res.status(500).json({
                success: false,
                message: provisionResult.message,
                errors: provisionResult.errors || [provisionResult.message]
            });
        }
        const createdTenant = await db_1.centralModels.AllCompany.findOne({
            tenantId: provisionResult.tenantId
        }).lean();
        // Record document history if certificate files were uploaded
        if (certificateUrl && files?.sebiCertificate?.[0]) {
            await db_1.centralModels.TenantDocumentHistory.create({
                tenantId: provisionResult.tenantId,
                docType: 'SEBI_CERTIFICATE',
                fileUrl: certificateUrl,
                fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
            }).catch(() => { });
        }
        if (nismCertificateUrl && files?.nismCertificate?.[0]) {
            await db_1.centralModels.TenantDocumentHistory.create({
                tenantId: provisionResult.tenantId,
                docType: 'NISM_CERTIFICATE',
                fileUrl: nismCertificateUrl,
                fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
            }).catch(() => { });
        }
        // Automatically dispatch sync if remote domainUrl API is configured
        let syncResult = null;
        try {
            syncResult = await (0, tenantSyncDispatcher_1.syncTenantToRemote)(provisionResult.tenantId, {
                reason: 'CREATE',
                adminPassword: rawAdminPassword
            });
        }
        catch (syncErr) {
            console.warn('Auto-sync dispatch warning during tenant creation:', syncErr?.message || syncErr);
        }
        // Write SMTP notification log in Central DB
        await db_1.centralModels.NotificationLog.create({
            tenantId: provisionResult.tenantId,
            recipient: adminEmailToUse,
            channel: 'EMAIL',
            title: 'Company Registration & Dedicated Database Created',
            message: `Welcome ${companyName}! Your dedicated database (${provisionResult.dbName}) is provisioned with all collections on RAGCP. Admin credentials: Username: ${adminEmailToUse}, Password: ${rawAdminPassword}. Domain: ${domainUrl || 'Configured'}.`,
            status: 'SENT'
        }).catch(() => { });
        // Log Super Admin Audit Trail
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'CREATE',
            module: 'TENANTS',
            newValue: { ...createdTenant, adminEmail: adminEmailToUse, dbName: provisionResult.dbName, syncResult },
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(201).json({
            success: true,
            message: `Company '${companyName}' onboarded successfully. Dedicated database '${provisionResult.dbName}' provisioned with all collections and Admin account.`,
            data: {
                tenant: createdTenant,
                database: {
                    dbName: provisionResult.dbName,
                    mongoDbUrl: provisionResult.mongoDbUrl,
                    domainUrl: provisionResult.domainUrl
                },
                adminUser: {
                    id: provisionResult.adminUserId,
                    email: provisionResult.adminEmail,
                    firstName: adminFirstName,
                    lastName: adminLastName,
                    mobile: adminMobileToUse,
                    role: 'ADMIN',
                    tempPassword: rawAdminPassword,
                    generatedPassword: rawAdminPassword,
                    tenantApiKey: generatedApiKey
                },
                syncResult
            }
        });
    }
    catch (error) {
        console.error('Error creating tenant:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create company tenant: ' + error.message,
            errors: [error.message]
        });
    }
};
exports.createTenant = createTenant;
const getTenantDocumentHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const history = await db_1.centralModels.TenantDocumentHistory.find({
            tenantId: id
        })
            .sort({ uploadedAt: -1 })
            .lean();
        return res.status(200).json({ success: true, data: history });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getTenantDocumentHistory = getTenantDocumentHistory;
const getTenants = async (req, res) => {
    try {
        const companies = await db_1.centralModels.AllCompany.find({ deletedAt: null, status: { $ne: 'DELETED' } })
            .sort({ createdAt: -1 })
            .lean();
        const mapped = companies.map((c) => ({
            ...c,
            id: c._id ? c._id.toString() : c.id,
            _id: c._id ? c._id.toString() : c.id
        }));
        return res.status(200).json({ success: true, data: mapped });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getTenants = getTenants;
const toggleTenantStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE, SUSPENDED
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const oldCompany = await db_1.centralModels.AllCompany.findOne({
            $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
        }).lean();
        if (!oldCompany) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const updatedCompany = await db_1.centralModels.AllCompany.findByIdAndUpdate(oldCompany._id || oldCompany.id, { $set: { status } }, { returnDocument: 'after', lean: true });
        await tenantConnectionManager_1.tenantConnectionManager.evictTenant(id);
        // Auto-sync status change to remote domainUrl API if configured
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(id, { reason: 'STATUS_CHANGE' }).catch((syncErr) => {
            console.warn('Auto-sync status change warning:', syncErr);
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'TENANTS',
            oldValue: oldCompany,
            newValue: updatedCompany,
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: `Company status changed to ${status}. Panel access has been ${status === 'SUSPENDED' ? 'disabled immediately' : 'reactivated'}.`,
            data: updatedCompany
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleTenantStatus = toggleTenantStatus;
const deleteTenant = async (req, res) => {
    const { id } = req.params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const oldCompany = await db_1.centralModels.AllCompany.findOne({
            $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
        }).lean();
        if (!oldCompany) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const updatedCompany = await db_1.centralModels.AllCompany.findByIdAndUpdate(oldCompany._id || oldCompany.id, { $set: { status: 'DELETED' } }, { returnDocument: 'after', lean: true });
        await tenantConnectionManager_1.tenantConnectionManager.evictTenant(id);
        // Auto-sync soft delete to remote domainUrl API if configured
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(id, { reason: 'DELETE' }).catch((syncErr) => {
            console.warn('Auto-sync soft-delete warning:', syncErr);
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'SOFT_DELETE',
            module: 'TENANTS',
            oldValue: oldCompany,
            newValue: updatedCompany,
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Company successfully deleted (soft delete).',
            data: updatedCompany
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.deleteTenant = deleteTenant;
const restoreTenant = async (req, res) => {
    const { id } = req.params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const oldCompany = await db_1.centralModels.AllCompany.findOne({
            $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
        }).lean();
        if (!oldCompany) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const updatedCompany = await db_1.centralModels.AllCompany.findByIdAndUpdate(oldCompany._id || oldCompany.id, { $set: { status: 'ACTIVE' } }, { returnDocument: 'after', lean: true });
        await tenantConnectionManager_1.tenantConnectionManager.evictTenant(id);
        // Auto-sync restore to remote domainUrl API if configured
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(id, { reason: 'RESTORE' }).catch((syncErr) => {
            console.warn('Auto-sync restore warning:', syncErr);
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'RESTORE',
            module: 'TENANTS',
            oldValue: oldCompany,
            newValue: updatedCompany,
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Company successfully restored to ACTIVE status.',
            data: updatedCompany
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.restoreTenant = restoreTenant;
const permanentDeleteTenant = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to confirm permanent deletion' });
        }
        const superAdmin = await db_1.centralModels.User.findById(req.user.id).lean();
        if (!superAdmin) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const isMatch = await bcrypt.compare(password, superAdmin.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect password' });
        }
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const oldCompany = await db_1.centralModels.AllCompany.findOne({
            $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
        }).lean();
        if (!oldCompany) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        // Delete from all_companies in Central DB
        await db_1.centralModels.AllCompany.findByIdAndDelete(oldCompany._id || oldCompany.id);
        // Drop the dedicated MongoDB database
        if (oldCompany.mongoDbUrl) {
            await tenantProvisionEngine_1.tenantProvisionEngine.dropTenantDatabase(oldCompany.mongoDbUrl).catch(() => { });
        }
        await tenantConnectionManager_1.tenantConnectionManager.evictTenant(id);
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'HARD_DELETE',
            module: 'TENANTS',
            oldValue: oldCompany,
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Company permanently deleted and database removed.'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.permanentDeleteTenant = permanentDeleteTenant;
const impersonateTenant = async (req, res) => {
    const { id } = req.params; // tenantId
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const tenant = await db_1.centralModels.AllCompany.findOne({
            $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
        }).lean() || await db_1.default.Tenant.findById(id).lean();
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }
        const tenantIdStr = (tenant.tenantId || tenant._id || tenant.id).toString();
        // Find the Admin user for this tenant
        const adminRole = await db_1.default.Role.findOne({ name: 'ADMIN' }).lean();
        let adminUser = await db_1.default.User.findOne({
            tenantId: tenantIdStr,
            ...(adminRole ? { roleId: adminRole._id || adminRole.id } : {})
        }).populate('roleId').lean();
        if (!adminUser) {
            adminUser = await db_1.default.User.findOne({ tenantId: tenantIdStr }).populate('roleId').lean();
        }
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found for this tenant' });
        }
        const roleName = adminUser.roleId?.name || 'ADMIN';
        // Generate token with isImpersonated flag
        const accessToken = jwt.sign({
            id: String(adminUser._id || adminUser.id),
            email: adminUser.email,
            role: roleName,
            tenantId: adminUser.tenantId,
            isImpersonated: true
        }, JWT_SECRET, { expiresIn: '1h' });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'IMPERSONATE',
            module: 'TENANTS',
            newValue: { impersonatedUserId: String(adminUser._id || adminUser.id), tenantId: id },
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: `Impersonating Admin of ${tenant.companyName}`,
            data: {
                accessToken,
                user: {
                    id: String(adminUser._id || adminUser.id),
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    email: adminUser.email,
                    role: roleName,
                    tenantId: adminUser.tenantId,
                    tenantStatus: tenant.status,
                    isImpersonated: true
                }
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.impersonateTenant = impersonateTenant;
// Helper: make a GET request to a remote panel endpoint with api-key auth, with timeout
const fetchRemote = async (url, apiKey) => {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey)
        headers['x-tenant-api-key'] = apiKey;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok)
            return null;
        const json = await res.json().catch(() => null);
        return json;
    }
    catch {
        clearTimeout(tid);
        return null;
    }
};
// Fetch live dashboard stats for a specific company panel via its remote third-party API
const getCompanyPanelStats = async (req, res) => {
    const { id } = req.params;
    try {
        const company = await db_1.centralModels.AllCompany.findById(id).lean();
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        const rawDomain = (company.domainUrl || '').trim();
        const apiKey = company.tenantApiKey || null;
        let source = 'CENTRAL_DATABASE';
        let stats = {
            staffCount: 0,
            clientCount: 0,
            researchCount: 0,
            planCount: 0,
            activeClients: 0,
            pendingClients: 0
        };
        if (rawDomain) {
            let origin = rawDomain;
            if (!origin.startsWith('http://') && !origin.startsWith('https://'))
                origin = 'https://' + origin;
            origin = origin.replace(/\/+$/, '');
            // Try both path prefixes: /backend/api/v1 and /api/v1
            const prefixes = [`${origin}/backend/api/v1`, `${origin}/api/v1`];
            for (const prefix of prefixes) {
                try {
                    // 1st: Try single aggregated /stats endpoint (most efficient)
                    const statsRes = await fetchRemote(`${prefix}/third-party-api/stats`, apiKey);
                    if (statsRes?.success && statsRes?.data) {
                        stats = statsRes.data;
                        source = 'REMOTE_PANEL';
                        break;
                    }
                    // 2nd fallback: Make parallel requests to clients + staff + plans
                    const [clientsRes, staffRes, plansRes] = await Promise.all([
                        fetchRemote(`${prefix}/third-party-api/clients`, apiKey),
                        fetchRemote(`${prefix}/third-party-api/staff`, apiKey),
                        fetchRemote(`${prefix}/third-party-api/plans`, apiKey)
                    ]);
                    const anySuccess = (clientsRes?.success) || (staffRes?.success) || (plansRes?.success);
                    if (!anySuccess)
                        continue;
                    const clients = clientsRes?.data || [];
                    const staff = staffRes?.data || [];
                    const plans = plansRes?.data || [];
                    stats = {
                        staffCount: staff.length,
                        clientCount: clients.length,
                        activeClients: clients.filter((c) => c.status === 'ACTIVE').length,
                        pendingClients: clients.filter((c) => c.status !== 'ACTIVE').length,
                        planCount: plans.filter((p) => p.status === 'ACTIVE').length,
                        researchCount: 0
                    };
                    source = 'REMOTE_PANEL';
                    break;
                }
                catch {
                    // try next prefix
                }
            }
        }
        return res.status(200).json({
            success: true,
            source,
            company: {
                id: company._id.toString(),
                companyName: company.companyName,
                domainUrl: company.domainUrl,
                status: company.status
            },
            data: stats
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getCompanyPanelStats = getCompanyPanelStats;
const getAuditLogs = async (req, res) => {
    try {
        const logs = await db_1.default.AuditLog.find({})
            .populate('userId', 'firstName lastName email')
            .sort({ timestamp: -1 })
            .lean();
        return res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAuditLogs = getAuditLogs;
const getGlobalTelemetry = async (req, res) => {
    try {
        const allTenants = await db_1.centralModels.AllCompany.find({}, 'tenantId companyName status deletedAt').lean().catch(() => []);
        const validTenants = allTenants.filter((t) => !t.deletedAt && t.status !== 'DELETED');
        const totalCompanies = validTenants.length;
        const activeCompanies = validTenants.filter((t) => t.status === 'ACTIVE').length;
        const suspendedCompanies = validTenants.filter((t) => t.status === 'SUSPENDED').length;
        const pendingCompanies = validTenants.filter((t) => t.status === 'PENDING_PROFILE').length;
        // Fetch clients count safely
        let totalClients = 0;
        let activeClients = 0;
        let pendingClients = 0;
        try {
            const allClients = await db_1.default.Client.find({}, 'status kraVerified').lean();
            totalClients = allClients.length;
            activeClients = allClients.filter((c) => c.status === 'ACTIVE').length;
            pendingClients = allClients.filter((c) => c.status !== 'ACTIVE' || c.kraVerified === false).length;
            if (totalClients === 0 && validTenants.length > 0) {
                for (const t of validTenants) {
                    try {
                        const conn = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(t.tenantId || t._id || t.id);
                        if (conn && conn.models) {
                            const tClients = await conn.models.Client.find({}, 'status kraVerified').lean();
                            totalClients += tClients.length;
                            activeClients += tClients.filter((c) => c.status === 'ACTIVE').length;
                            pendingClients += tClients.filter((c) => c.status !== 'ACTIVE' || c.kraVerified === false).length;
                        }
                    }
                    catch { }
                }
            }
        }
        catch { }
        // Fetch staff count safely
        let totalStaff = 0;
        let activeStaff = 0;
        try {
            const allStaff = await db_1.default.Staff.find({}, 'status').lean();
            totalStaff = allStaff.length;
            activeStaff = allStaff.filter((s) => s.status === 'ACTIVE').length;
            if (totalStaff === 0 && validTenants.length > 0) {
                for (const t of validTenants) {
                    try {
                        const conn = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(t.tenantId || t._id || t.id);
                        if (conn && conn.models) {
                            const tStaff = await conn.models.Staff.find({}, 'status').lean();
                            totalStaff += tStaff.length;
                            activeStaff += tStaff.filter((s) => s.status === 'ACTIVE').length;
                        }
                    }
                    catch { }
                }
            }
        }
        catch { }
        // Fetch alerts count safely
        let activeAlerts = 0;
        let totalAlerts = 0;
        let resolvedAlerts = 0;
        try {
            activeAlerts = await db_1.default.ComplianceAlert.countDocuments({ status: 'OPEN' });
            totalAlerts = await db_1.default.ComplianceAlert.countDocuments();
            resolvedAlerts = await db_1.default.ComplianceAlert.countDocuments({ status: 'RESOLVED' });
        }
        catch { }
        // Audit logs count
        let auditLogsCount = 0;
        try {
            auditLogsCount = await db_1.default.AuditLog.countDocuments();
        }
        catch { }
        // Compliance audits count
        let totalAudits = 0;
        let pendingAudits = 0;
        let completedAudits = 0;
        try {
            totalAudits = await db_1.default.ComplianceAudit.countDocuments();
            pendingAudits = await db_1.default.ComplianceAudit.countDocuments({ status: { $in: ['PENDING', 'OVERDUE'] } });
            completedAudits = await db_1.default.ComplianceAudit.countDocuments({ status: 'COMPLETED' });
        }
        catch { }
        // Plans count
        let totalPlans = 0;
        let activePlans = 0;
        try {
            const allPlans = await db_1.default.Plan.find({ deletedAt: null }, 'status').lean();
            totalPlans = allPlans.length;
            activePlans = allPlans.filter((p) => p.status === 'ACTIVE').length;
        }
        catch { }
        return res.status(200).json({
            success: true,
            data: {
                totalCompanies,
                activeCompanies,
                suspendedCompanies,
                pendingCompanies,
                totalUsers: totalClients + totalStaff + totalCompanies,
                totalClients,
                activeClients,
                pendingClients,
                totalStaff,
                activeStaff,
                activeAlerts,
                totalAlerts,
                resolvedAlerts,
                auditLogsCount,
                totalAudits,
                pendingAudits,
                completedAudits,
                totalPlans,
                activePlans
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getGlobalTelemetry = getGlobalTelemetry;
const getTenantDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        let company = null;
        if (isObjectId) {
            company = await db_1.centralModels.AllCompany.findOne({
                $or: [{ tenantId: id.trim() }, { _id: id.trim() }]
            }).lean();
        }
        else {
            company = await db_1.centralModels.AllCompany.findOne({
                domainUrl: { $regex: id.trim(), $options: 'i' }
            }).lean();
        }
        if (!company) {
            company = await db_1.default.Tenant.findById(id.trim()).lean();
        }
        if (!company) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const tenantIdStr = (company.tenantId || company._id || company.id).toString();
        const rawDomain = (company.domainUrl || company.website || '').trim();
        let tenantData = company;
        let admin = null;
        let officers = [];
        let allStaff = [];
        let dataSource = 'CENTRAL_DATABASE';
        // 1. Try remote domain API if domainUrl is configured
        if (rawDomain) {
            let targetOrigin = rawDomain;
            if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
                targetOrigin = 'https://' + targetOrigin;
            }
            targetOrigin = targetOrigin.replace(/\/+$/, '');
            const candidateEndpoints = [
                `${targetOrigin}/backend/api/v1/third-party-api/info`,
                `${targetOrigin}/api/v1/third-party-api/info`,
                `${targetOrigin}/backend/api/v1/sync/config`,
                `${targetOrigin}/api/v1/sync/config`
            ];
            for (const endpoint of candidateEndpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1800);
                    const headers = {
                        'Content-Type': 'application/json',
                        'x-tenant-id': tenantIdStr
                    };
                    if (company.tenantApiKey) {
                        headers['x-tenant-api-key'] = company.tenantApiKey;
                    }
                    const remoteRes = await fetch(endpoint, {
                        method: 'GET',
                        headers,
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (remoteRes.ok) {
                        const remoteJson = await remoteRes.json().catch(() => null);
                        if (remoteJson && remoteJson.success && remoteJson.data) {
                            const rData = remoteJson.data;
                            tenantData = {
                                ...company,
                                ...rData,
                                status: rData.status || company.status,
                                logoUrl: rData.logoUrl || company.logoUrl,
                                faviconUrl: rData.faviconUrl || company.faviconUrl
                            };
                            if (rData.adminUser) {
                                admin = rData.adminUser;
                            }
                            dataSource = 'REMOTE_DOMAIN_API';
                            break;
                        }
                    }
                }
                catch (e) {
                    // Continue
                }
            }
        }
        // 2. Fetch admin and staff from Central/Local Database if not retrieved from remote
        if (!admin) {
            try {
                const liveTenant = await db_1.centralModels.Tenant.findOne({
                    $or: isObjectId ? [{ _id: id.trim() }, { id: id.trim() }] : [{ email: company?.email }]
                }).lean();
                const users = await db_1.centralModels.User.find({
                    $or: isObjectId ? [{ tenantId: id.trim() }] : [{ email: company?.email }]
                }).populate('roleId').lean();
                const userIds = users.map((u) => u._id || u.id);
                const staffRecords = await db_1.centralModels.Staff.find({ userId: { $in: userIds } }).lean();
                const staffMap = new Map(staffRecords.map((s) => [String(s.userId), s]));
                if (liveTenant) {
                    tenantData = { ...company, ...liveTenant };
                }
                admin = users.find((u) => u.roleId?.name === 'ADMIN') || admin;
                officers = users.filter((u) => ['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER'].includes(u.roleId?.name)) || [];
                allStaff = users.filter((u) => u.roleId?.name !== 'CLIENT').map((u) => {
                    const st = staffMap.get(String(u._id || u.id));
                    return {
                        id: st ? String(st._id || st.id) : String(u._id || u.id),
                        userId: String(u._id || u.id),
                        name: st?.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff Member',
                        email: st?.email || u.email,
                        mobile: st?.mobile || u.mobile,
                        role: u.roleId?.name || 'STAFF',
                        status: st?.status || u.status || 'ACTIVE'
                    };
                }) || [];
            }
            catch {
                // Fallback gracefully
            }
        }
        return res.status(200).json({
            success: true,
            source: dataSource,
            data: {
                tenant: tenantData,
                admin,
                officers,
                allStaff
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getTenantDetails = getTenantDetails;
const updateTenantDetails = async (req, res) => {
    const { id } = req.params;
    const { companyName, panelName, domainUrl, mongoDbUrl, dbName, certificateValidity, status, address, gst, supportMobile, adminName, adminMobile, adminEmail, adminPassword, adminStatus, nismValidity, companyType, sebiRegistration, bseEnrollment, pan, website, depositAmount, raType, state } = req.body;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const oldTenant = await db_1.default.Tenant.findById(id).lean() ||
            await db_1.centralModels.AllCompany.findOne({
                $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
            }).lean();
        if (!oldTenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }
        const files = req.files;
        let newSebiUrl = oldTenant.certificateUrl;
        let newNismUrl = oldTenant.nismCertificateUrl;
        if (files && files.sebiCertificate && files.sebiCertificate[0]) {
            newSebiUrl = `/uploads/policies/${files.sebiCertificate[0].filename}`;
        }
        if (files && files.nismCertificate && files.nismCertificate[0]) {
            newNismUrl = `/uploads/policies/${files.nismCertificate[0].filename}`;
        }
        // Safe Date Parsing
        let parsedCertificateValidity = undefined;
        if (certificateValidity !== undefined) {
            if (certificateValidity && !isNaN(new Date(certificateValidity).getTime())) {
                parsedCertificateValidity = new Date(certificateValidity);
            }
            else {
                parsedCertificateValidity = null;
            }
        }
        let parsedNismValidity = undefined;
        if (nismValidity !== undefined) {
            if (nismValidity && !isNaN(new Date(nismValidity).getTime())) {
                parsedNismValidity = new Date(nismValidity);
            }
            else {
                parsedNismValidity = null;
            }
        }
        // Safe Deposit Amount Parsing
        let parsedDepositAmount = undefined;
        if (depositAmount !== undefined && depositAmount !== null && depositAmount !== '') {
            const parsed = parseFloat(depositAmount);
            if (!isNaN(parsed)) {
                parsedDepositAmount = parsed;
            }
        }
        // Build update payload
        const tenantUpdateData = {};
        if (companyName !== undefined && companyName !== '')
            tenantUpdateData.companyName = String(companyName).trim();
        if (panelName !== undefined)
            tenantUpdateData.panelName = String(panelName).trim() || null;
        if (domainUrl !== undefined)
            tenantUpdateData.domainUrl = String(domainUrl).trim() || null;
        if (mongoDbUrl !== undefined)
            tenantUpdateData.mongoDbUrl = String(mongoDbUrl).trim() || null;
        if (dbName !== undefined)
            tenantUpdateData.dbName = String(dbName).trim() || null;
        if (companyType !== undefined && companyType !== '')
            tenantUpdateData.companyType = companyType;
        if (raType !== undefined && raType !== '')
            tenantUpdateData.raType = raType;
        if (sebiRegistration !== undefined && sebiRegistration !== '')
            tenantUpdateData.sebiRegistration = String(sebiRegistration).trim().toUpperCase();
        if (bseEnrollment !== undefined)
            tenantUpdateData.bseEnrollment = String(bseEnrollment).trim().toUpperCase() || null;
        if (pan !== undefined && pan !== '')
            tenantUpdateData.pan = String(pan).trim().toUpperCase();
        if (website !== undefined)
            tenantUpdateData.website = String(website).trim() || null;
        if (address !== undefined && address !== '')
            tenantUpdateData.address = String(address).trim();
        if (gst !== undefined)
            tenantUpdateData.gst = String(gst).trim().toUpperCase() || null;
        if (state !== undefined)
            tenantUpdateData.state = state ? String(state).trim() : null;
        if (status !== undefined && status !== '')
            tenantUpdateData.status = status;
        const incomingMobile = supportMobile || req.body.tenantMobile || req.body.mobile;
        if (incomingMobile !== undefined && incomingMobile !== '') {
            tenantUpdateData.mobile = String(incomingMobile).trim();
        }
        if (parsedCertificateValidity !== undefined) {
            tenantUpdateData.certificateValidity = parsedCertificateValidity;
        }
        if (parsedNismValidity !== undefined) {
            tenantUpdateData.nismValidity = parsedNismValidity;
        }
        if (parsedDepositAmount !== undefined) {
            tenantUpdateData.depositAmount = parsedDepositAmount;
        }
        if (newSebiUrl) {
            tenantUpdateData.certificateUrl = newSebiUrl;
        }
        if (newNismUrl) {
            tenantUpdateData.nismCertificateUrl = newNismUrl;
        }
        let updatedTenant = await db_1.default.Tenant.findByIdAndUpdate(id, { $set: tenantUpdateData }, { returnDocument: 'after', lean: true });
        if (!updatedTenant) {
            updatedTenant = { ...oldTenant, ...tenantUpdateData };
        }
        if (files && files.sebiCertificate && files.sebiCertificate[0] && newSebiUrl) {
            await db_1.centralModels.TenantDocumentHistory.create({
                tenantId: id,
                docType: 'SEBI_CERTIFICATE',
                fileUrl: newSebiUrl,
                fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
            }).catch(() => { });
        }
        if (files && files.nismCertificate && files.nismCertificate[0] && newNismUrl) {
            await db_1.centralModels.TenantDocumentHistory.create({
                tenantId: id,
                docType: 'NISM_CERTIFICATE',
                fileUrl: newNismUrl,
                fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
            }).catch(() => { });
        }
        // Ensure tenantApiKey exists
        let apiKey = updatedTenant.tenantApiKey;
        if (!apiKey) {
            apiKey = 'ragcp_' + crypto.randomBytes(16).toString('hex');
            await db_1.default.Tenant.findByIdAndUpdate(updatedTenant._id || updatedTenant.id || id, { $set: { tenantApiKey: apiKey } });
            updatedTenant.tenantApiKey = apiKey;
        }
        // Admin user update
        const adminRole = await db_1.default.Role.findOne({ name: 'ADMIN' }).lean();
        let adminUser = await db_1.default.User.findOne({
            tenantId: id,
            ...(adminRole ? { roleId: adminRole._id || adminRole.id } : {})
        });
        if (!adminUser) {
            adminUser = await db_1.default.User.findOne({ tenantId: id });
        }
        if (adminUser) {
            const updateData = {};
            if (adminName !== undefined && String(adminName).trim() !== '') {
                const parts = String(adminName).trim().split(' ');
                updateData.firstName = parts[0] || adminUser.firstName;
                updateData.lastName = parts.slice(1).join(' ') || '';
            }
            if (adminMobile !== undefined && String(adminMobile).trim() !== '') {
                updateData.mobile = String(adminMobile).trim();
            }
            if (adminEmail !== undefined && String(adminEmail).trim() !== '') {
                const newEmail = String(adminEmail).toLowerCase().trim();
                if (newEmail !== adminUser.email) {
                    const existingUser = await db_1.default.User.findOne({ email: newEmail }).lean();
                    if (existingUser && String(existingUser._id || existingUser.id) !== String(adminUser._id || adminUser.id)) {
                        return res.status(400).json({
                            success: false,
                            message: `Admin email '${newEmail}' is already registered to another user.`
                        });
                    }
                    updateData.email = newEmail;
                }
            }
            if (adminStatus !== undefined && String(adminStatus).trim() !== '') {
                updateData.status = String(adminStatus).trim();
            }
            if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim().length > 0) {
                const salt = await bcrypt.genSalt(10);
                updateData.passwordHash = await bcrypt.hash(adminPassword.trim(), salt);
                updateData.tempPassword = adminPassword.trim();
            }
            if (Object.keys(updateData).length > 0) {
                adminUser = await db_1.default.User.findByIdAndUpdate(adminUser._id || adminUser.id, { $set: updateData }, { returnDocument: 'after', lean: true });
            }
        }
        else {
            let roleDoc = adminRole;
            if (!roleDoc) {
                roleDoc = await db_1.default.Role.create({ name: 'ADMIN', description: 'RA Company Owner' });
            }
            const targetEmail = (adminEmail && String(adminEmail).trim()) || updatedTenant.email;
            const targetName = (adminName && String(adminName).trim()) || updatedTenant.ownerName || updatedTenant.companyName;
            const parts = targetName.split(' ');
            const firstName = parts[0] || 'Admin';
            const lastName = parts.slice(1).join(' ') || '';
            const rawPass = (adminPassword && String(adminPassword).trim()) || 'Admin@123';
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(rawPass, salt);
            adminUser = await db_1.default.User.create({
                tenantId: id,
                roleId: roleDoc._id || roleDoc.id,
                firstName,
                lastName,
                email: targetEmail.toLowerCase().trim(),
                mobile: (adminMobile && String(adminMobile).trim()) || updatedTenant.mobile,
                passwordHash: hash,
                tempPassword: rawPass,
                status: (adminStatus && String(adminStatus).trim()) || 'ACTIVE'
            });
        }
        // Sync to Central all_companies catalog
        const isIdObjectId = /^[0-9a-fA-F]{24}$/.test(String(id).trim());
        await db_1.centralModels.AllCompany.findOneAndUpdate({ $or: isIdObjectId ? [{ _id: id }, { tenantId: id }] : [{ tenantId: id }] }, {
            $set: {
                tenantId: id,
                companyName: updatedTenant.companyName,
                domainUrl: updatedTenant.domainUrl || null,
                ownerName: updatedTenant.ownerName,
                email: updatedTenant.email,
                mobile: updatedTenant.mobile,
                sebiRegistration: updatedTenant.sebiRegistration,
                status: updatedTenant.status,
                ...(updatedTenant.dbName ? { dbName: updatedTenant.dbName } : {}),
                ...(updatedTenant.mongoDbUrl ? { mongoDbUrl: updatedTenant.mongoDbUrl } : {})
            }
        }, { upsert: false, returnDocument: 'after' }).catch(() => { });
        // Invalidate cached connection metadata so changes take effect immediately
        await tenantConnectionManager_1.tenantConnectionManager.evictTenant(id);
        // Auto-sync company & admin updates to remote domainUrl API
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(id, {
            reason: 'UPDATE',
            adminPassword
        }).catch((syncErr) => {
            console.warn('Auto-sync dispatch warning during tenant edit:', syncErr);
        });
        // Write audit log safely
        if (req.user && req.user.id) {
            await (0, auditService_1.logAudit)({
                userId: req.user.id,
                action: 'UPDATE',
                module: 'TENANTS',
                oldValue: oldTenant,
                newValue: updatedTenant,
                ipAddress: req.ip
            }).catch((err) => console.error('Audit log failed:', err));
        }
        return res.status(200).json({
            success: true,
            message: 'Company and Admin details updated and dispatched to domain database successfully.',
            data: updatedTenant
        });
    }
    catch (error) {
        console.error('Error updating tenant details:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to update tenant details', errors: [error.message] });
    }
};
exports.updateTenantDetails = updateTenantDetails;
const updateSuperAdminPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await db_1.centralModels.User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Super admin user not found' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await db_1.centralModels.User.findByIdAndUpdate(user._id || user.id, { $set: { passwordHash } });
        return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateSuperAdminPassword = updateSuperAdminPassword;
const parseSebiCertificate = async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ success: false, message: 'No SEBI certificate provided' });
        // Extract text using OCR-enabled utility (tries native first, then OCR fallback)
        const text = await (0, pdfOcr_1.extractTextFromPdf)(file.path);
        // If still no readable text after OCR, return graceful fallback
        if (!text || text.trim().length < 20) {
            if (file.originalname.toLowerCase().includes('nism')) {
                return res.status(200).json({
                    success: false,
                    data: null,
                    message: 'Document Mismatch: You uploaded a NISM certificate in the SEBI field.'
                });
            }
            return res.status(200).json({
                success: false,
                data: null,
                message: 'Could not automatically read this PDF (scanned image). Please fill in SEBI details manually.'
            });
        }
        // Registration Regex
        const regMatch = text.match(/IN[A-Z]\d{8,9}/i);
        const sebiRegistration = regMatch ? regMatch[0].toUpperCase() : '';
        if (!sebiRegistration) {
            if (text.match(/NISM-\d{10,15}/i) || text.toLowerCase().includes('nism') || text.toLowerCase().includes('national institute of securities markets')) {
                return res.status(200).json({
                    success: false,
                    data: null,
                    message: 'Document Mismatch: You uploaded a NISM certificate in the SEBI field.'
                });
            }
        }
        // Date Regex
        const dateMatch = text.match(/(?:valid\s+from\s+|dated\s+)(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?[a-zA-Z]+\s*,?\s*\d{4})/i)
            || text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        let certificateValidity = '';
        if (dateMatch && dateMatch[1]) {
            try {
                const rawDateStr = dateMatch[1].replace(/(st|nd|rd|th)/, '').replace('day of', '').trim();
                const d = new Date(rawDateStr);
                if (!isNaN(d.getTime())) {
                    d.setFullYear(d.getFullYear() + 5);
                    certificateValidity = d.toISOString().split('T')[0];
                }
            }
            catch (e) { }
        }
        // Company Name Heuristic
        const lines = String(text).split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        let companyName = '';
        const nameLineIdx = lines.findIndex(l => l.toLowerCase().includes('grants a certificate of registration to'));
        if (nameLineIdx !== -1 && nameLineIdx + 1 < lines.length) {
            companyName = lines[nameLineIdx + 1];
            if (companyName.length < 3 && nameLineIdx + 2 < lines.length)
                companyName += ' ' + lines[nameLineIdx + 2];
        }
        // Corporate Office Address
        let address = '';
        const regIdx = lines.findIndex(l => l.toLowerCase().includes('registration number'));
        const addrStartIdx = lines.findIndex((l, i) => i > regIdx && l.length > 10 && !l.toLowerCase().includes('address') && !l.toLowerCase().includes('subject to'));
        if (addrStartIdx !== -1) {
            const addrEndIdx = lines.findIndex((l, i) => i > addrStartIdx && (l.toLowerCase().includes('subject to') || l.toLowerCase().includes('conditions')));
            if (addrEndIdx !== -1) {
                address = lines.slice(addrStartIdx, addrEndIdx).join(', ');
            }
        }
        // Auto-detect state from address or text
        const detectedState = (0, stateService_1.detectStateFromText)(address) || (0, stateService_1.detectStateFromText)(text) || '';
        return res.status(200).json({
            success: true,
            data: {
                sebiRegistration,
                certificateValidity,
                companyName,
                address,
                state: detectedState
            },
            message: 'SEBI certificate read successfully.'
        });
    }
    catch (error) {
        console.error('Error parsing SEBI certificate:', error);
        return res.status(500).json({ success: false, message: 'Failed to parse SEBI certificate', errors: [error.message] });
    }
};
exports.parseSebiCertificate = parseSebiCertificate;
const parseNismCertificate = async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ success: false, message: 'No NISM certificate provided' });
        // Extract text using OCR-enabled utility (tries native first, then OCR fallback)
        const text = await (0, pdfOcr_1.extractTextFromPdf)(file.path);
        // If still no readable text after OCR, return graceful fallback
        if (!text || text.trim().length < 20) {
            if (file.originalname.toLowerCase().includes('sebi') || file.originalname.toLowerCase() === 'certificate.pdf') {
                return res.status(200).json({
                    success: false,
                    data: null,
                    message: 'Document Mismatch: You uploaded a SEBI certificate in the NISM field.'
                });
            }
            return res.status(200).json({
                success: false,
                data: null,
                message: 'Could not automatically read this PDF (scanned image). Please fill in NISM details manually.'
            });
        }
        // Registration Regex — supports "Registration Number : NISM-XXXX" and bare "NISM-XXXX"
        const regMatch = text.match(/Registration\s+Number\s*[:\-]\s*(NISM-\d{10,15})/i)
            || text.match(/(NISM-\d{10,15})/i);
        const nismRegistration = regMatch ? regMatch[1].toUpperCase() : '';
        if (!nismRegistration) {
            if (text.match(/IN[A-Z]\d{8,9}/i) || text.toLowerCase().includes('securities and exchange board')) {
                return res.status(200).json({
                    success: false,
                    data: null,
                    message: 'Document Mismatch: You uploaded a SEBI certificate in the NISM field.'
                });
            }
        }
        // Validity Regex — handles "Valid Till : January 26, 2029" and variations
        const dateMatch = text.match(/Valid\s*Till\s*[:\-]?\s*([a-zA-Z]+\s+\d{1,2},?\s*\d{4})/i)
            || text.match(/Validity\s*[:\-]?\s*([a-zA-Z]+\s+\d{1,2},?\s*\d{4})/i)
            || text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
            || text.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
        let nismValidity = '';
        if (dateMatch && dateMatch[1]) {
            try {
                const d = new Date(dateMatch[1].replace(',', ''));
                if (!isNaN(d.getTime())) {
                    nismValidity = d.toISOString().split('T')[0];
                }
            }
            catch (e) { }
        }
        // Name extraction — handles NISM format: "Mr. / Ms. FIRSTNAME LASTNAME"
        const lines = String(text).split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        let name = '';
        // Strategy 1: Look for "Mr. / Ms. NAME" pattern directly in text
        const mrMsMatch = text.match(/(?:Mr\.|Ms\.|Mrs\.)\s*\/?\s*(?:Mr\.|Ms\.|Mrs\.)?\s+([A-Z][A-Z\s]{2,50})/);
        if (mrMsMatch && mrMsMatch[1]) {
            name = mrMsMatch[1].trim();
        }
        // Strategy 2: Line after "certify that"
        if (!name) {
            const certifyIdx = lines.findIndex(l => l.toLowerCase().includes('this is to certify that') || l.toLowerCase().includes('certify that'));
            if (certifyIdx !== -1 && certifyIdx + 1 < lines.length) {
                name = lines[certifyIdx + 1].replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*\/?\s*(Mr\.|Mrs\.|Ms\.|Dr\.)?\s*/i, '').trim();
            }
        }
        // Strategy 3: Line before "has successfully"
        if (!name) {
            const passedIdx = lines.findIndex(l => l.toLowerCase().includes('has successfully passed') || l.toLowerCase().includes('successfully passed') || l.toLowerCase().includes('successfully completed'));
            if (passedIdx > 0) {
                name = lines[passedIdx - 1].replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*\/?\s*(Mr\.|Mrs\.|Ms\.|Dr\.)?\s*/i, '').trim();
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                name,
                nismRegistration,
                nismValidity
            },
            message: nismRegistration ? 'NISM certificate read successfully.' : 'Partial data extracted. Please verify and fill remaining fields.'
        });
    }
    catch (error) {
        console.error('Error parsing NISM certificate:', error);
        return res.status(500).json({ success: false, message: 'Failed to parse NISM certificate', errors: [error.message] });
    }
};
exports.parseNismCertificate = parseNismCertificate;
const getComplianceRules = async (req, res) => {
    try {
        const rules = await db_1.default.ComplianceRequirement.find({})
            .sort({ serialNo: 1 })
            .lean();
        return res.status(200).json({ success: true, data: rules });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getComplianceRules = getComplianceRules;
const updateComplianceRule = async (req, res) => {
    const { id } = req.params;
    const { requirement, frequency, frequencyType, severityLevel, penaltyAmount, isActive } = req.body;
    try {
        const oldRule = await db_1.default.ComplianceRequirement.findById(id).lean();
        if (!oldRule) {
            return res.status(404).json({ success: false, message: 'Compliance rule not found' });
        }
        const updatedRule = await db_1.default.ComplianceRequirement.findByIdAndUpdate(id, {
            $set: {
                requirement: requirement !== undefined ? requirement : oldRule.requirement,
                frequency: frequency !== undefined ? frequency : oldRule.frequency,
                frequencyType: frequencyType !== undefined ? frequencyType : oldRule.frequencyType,
                severityLevel: severityLevel !== undefined ? severityLevel : oldRule.severityLevel,
                penaltyAmount: penaltyAmount !== undefined ? penaltyAmount : oldRule.penaltyAmount,
                isActive: typeof isActive === 'boolean' ? isActive : oldRule.isActive
            }
        }, { returnDocument: 'after', lean: true });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'COMPLIANCE',
            oldValue: oldRule,
            newValue: updatedRule,
            ipAddress: req.ip
        }).catch(() => { });
        // Broadcast compliance rule update across all active company domains and databases
        let syncResult = null;
        try {
            syncResult = await (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'COMPLIANCE_RULE_UPDATE' });
        }
        catch (err) {
            console.warn('Sync dispatch note for compliance rule update:', err.message);
        }
        const syncMsg = syncResult
            ? ` (${syncResult.successCount}/${syncResult.total} company domains synced)`
            : '';
        return res.status(200).json({
            success: true,
            message: `Compliance Rule #${updatedRule?.serialNo} updated and propagated across all company databases successfully${syncMsg}.`,
            data: updatedRule,
            syncResult
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateComplianceRule = updateComplianceRule;
const provisionTenantDb = async (req, res) => {
    const { id } = req.params;
    try {
        const tenant = await db_1.default.Tenant.findById(id).lean() ||
            await db_1.centralModels.AllCompany.findOne({
                $or: mongoose_1.default.Types.ObjectId.isValid(id) ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
            }).lean();
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }
        const syncRes = await (0, tenantSyncDispatcher_1.syncTenantToRemote)(id, { reason: 'PROVISION_DB' });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'TENANTS',
            newValue: { ...tenant, dbProvisionedAt: new Date(), syncRes },
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: syncRes.success,
            message: syncRes.message || 'Tenant panel synchronized successfully via API.',
            data: syncRes
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to provision/sync tenant: ' + error.message,
            errors: [error.message]
        });
    }
};
exports.provisionTenantDb = provisionTenantDb;
const syncTenantApi = async (req, res) => {
    const { id } = req.params;
    const { targetUrl } = req.body;
    if (!id || id === 'undefined' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid company ID provided for API synchronization.',
            errors: ['Invalid company ID']
        });
    }
    try {
        const result = await (0, tenantSyncDispatcher_1.syncTenantToRemote)(id, {
            targetUrl,
            reason: 'MANUAL_SYNC'
        });
        if (result.success && !result.isRemoteUnreachable) {
            await (0, auditService_1.logAudit)({
                userId: req.user.id,
                action: 'UPDATE',
                module: 'TENANTS',
                newValue: { tenantId: id, manualSyncResult: result },
                ipAddress: req.ip
            }).catch(() => { });
            return res.status(200).json({
                success: true,
                message: result.message || 'Tenant successfully synchronized to domain database via API!',
                data: result
            });
        }
        return res.status(200).json({
            success: true,
            isRemoteUnreachable: result.isRemoteUnreachable || false,
            message: result.message || `Tenant updated in master database. Remote server at ${targetUrl || 'configured domain'} could not be reached.`,
            data: result
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: `Failed to sync via API: ${error.message}`,
            errors: [error.message]
        });
    }
};
exports.syncTenantApi = syncTenantApi;
const syncAllTenantsApi = async (req, res) => {
    try {
        const result = await (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'SUPER_ADMIN_MANUAL_BULK_SYNC' });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'TENANTS',
            newValue: { bulkSyncResult: result },
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: `Bulk synchronization completed across ${result.total} companies (${result.successCount} synced, ${result.failedCount} offline/failed).`,
            data: result
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: `Failed to bulk sync tenants: ${error.message}`,
            errors: [error.message]
        });
    }
};
exports.syncAllTenantsApi = syncAllTenantsApi;
const verifyDomainUrl = async (req, res) => {
    const { domainUrl } = req.body;
    if (!domainUrl || typeof domainUrl !== 'string' || !domainUrl.trim()) {
        return res.status(400).json({
            success: false,
            reachable: false,
            message: 'Domain URL is required.'
        });
    }
    let normalizedUrl = domainUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, '');
    try {
        const parsed = new URL(normalizedUrl);
        if (!parsed.hostname || parsed.hostname.length < 3 || !parsed.hostname.includes('.')) {
            return res.status(400).json({
                success: false,
                reachable: false,
                normalizedUrl,
                message: 'Invalid domain hostname format. (e.g. portal.thinkupresearch.com)'
            });
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const startTime = Date.now();
        try {
            const resp = await fetch(normalizedUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'User-Agent': 'RAGCP-SEBI-Platform/1.0' }
            });
            clearTimeout(timeoutId);
            const responseTimeMs = Date.now() - startTime;
            const statusCode = resp.status;
            const statusText = resp.statusText;
            return res.status(200).json({
                success: true,
                reachable: true,
                normalizedUrl,
                statusCode,
                statusText,
                responseTimeMs,
                message: `Domain is live & verified (${statusCode} ${statusText} in ${responseTimeMs}ms)! Ready for sync.`
            });
        }
        catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
                return res.status(200).json({
                    success: false,
                    reachable: false,
                    normalizedUrl,
                    message: 'Connection timed out (6s). Domain server did not respond.',
                    error: 'TIMEOUT'
                });
            }
            return res.status(200).json({
                success: false,
                reachable: false,
                normalizedUrl,
                message: `Domain could not be reached: ${fetchErr.message || 'Host not found or SSL connection error'}`,
                error: fetchErr.message
            });
        }
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            reachable: false,
            normalizedUrl,
            message: 'Invalid URL syntax: ' + err.message
        });
    }
};
exports.verifyDomainUrl = verifyDomainUrl;
const testMongoConnection = async (req, res) => {
    const { mongoDbUrl } = req.body;
    if (!mongoDbUrl || typeof mongoDbUrl !== 'string' || (!mongoDbUrl.startsWith('mongodb://') && !mongoDbUrl.startsWith('mongodb+srv://'))) {
        return res.status(400).json({
            success: false,
            message: 'Invalid MongoDB connection URL. Must start with mongodb:// or mongodb+srv://'
        });
    }
    const client = new mongodb_1.MongoClient(mongoDbUrl.trim(), { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    try {
        await client.connect();
        const db = client.db();
        const collections = await db.listCollections().toArray();
        await client.close();
        return res.status(200).json({
            success: true,
            message: `Successfully connected to database '${db.databaseName}'! Found ${collections.length} existing collections.`,
            databaseName: db.databaseName,
            collectionsCount: collections.length
        });
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            message: `Failed to connect to MongoDB: ${err.message}`,
            error: err.message
        });
    }
};
exports.testMongoConnection = testMongoConnection;
/**
 * Dynamic Company Clients Endpoint for Super Admin.
 */
const getCompanyClients = async (req, res) => {
    const { id } = req.params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const tenant = await db_1.default.Tenant.findById(id).lean() ||
            await db_1.centralModels.AllCompany.findOne({
                $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
            }).lean();
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const tenantIdStr = (tenant.tenantId || tenant._id || tenant.id).toString();
        const rawDomain = (tenant.domainUrl || tenant.website || '').trim();
        const forceLocal = req.query.source === 'local';
        let remoteClients = null;
        let endpointUsed = null;
        let targetOrigin = rawDomain;
        if (targetOrigin) {
            if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
                targetOrigin = 'https://' + targetOrigin;
            }
            try {
                const parsed = new URL(targetOrigin);
                targetOrigin = parsed.origin;
            }
            catch (e) {
                targetOrigin = targetOrigin.replace(/\/+$/, '');
            }
        }
        // 1. Try remote domain API if domainUrl is configured and not forced local
        if (targetOrigin && !forceLocal) {
            const candidateEndpoints = [
                `${targetOrigin}/backend/api/v1/third-party-api/clients`,
                `${targetOrigin}/backend/api/v1/third-party-api/${tenantIdStr}/clients`,
                `${targetOrigin}/api/v1/third-party-api/clients`,
                `${targetOrigin}/api/v1/third-party-api/${tenantIdStr}/clients`,
                `${targetOrigin}/third-party-api/clients`,
                `${targetOrigin}/api/v1/clients`,
                `${targetOrigin}/clients`
            ];
            for (const endpoint of candidateEndpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const headers = {
                        'Content-Type': 'application/json',
                        'x-tenant-id': tenantIdStr
                    };
                    if (tenant.tenantApiKey) {
                        headers['x-tenant-api-key'] = tenant.tenantApiKey;
                    }
                    const remoteRes = await fetch(endpoint, {
                        method: 'GET',
                        headers,
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (remoteRes.ok) {
                        const remoteData = await remoteRes.json().catch(() => null);
                        if (remoteData && (Array.isArray(remoteData.data) || Array.isArray(remoteData))) {
                            remoteClients = Array.isArray(remoteData.data) ? remoteData.data : remoteData;
                            endpointUsed = endpoint;
                            break;
                        }
                    }
                }
                catch (remoteErr) {
                    // Continue to next endpoint
                }
            }
        }
        // 2. Fetch Central Database Clients strictly for THIS Tenant
        const dbModels = db_1.centralModels;
        const tenantOids = [
            tenantIdStr,
            id.trim(),
            ...(tenant.tenantId ? [tenant.tenantId.toString()] : []),
            ...(tenant._id ? [tenant._id.toString()] : [])
        ];
        const uniqueTenantIds = [...new Set(tenantOids)];
        const validTenantObjectIds = uniqueTenantIds
            .filter(tId => mongoose_1.default.Types.ObjectId.isValid(tId))
            .map(tId => new mongoose_1.default.Types.ObjectId(tId));
        const clientRoles = await dbModels.Role.find({
            name: { $regex: /^(client|user|customer|investor)$/i }
        }).lean().catch(() => []);
        const clientRoleIds = clientRoles.map((r) => r._id || r.id);
        // Fetch users who are clients belonging specifically to this tenant
        const localUsers = await dbModels.User.find({
            deletedAt: null,
            $and: [
                {
                    $or: [
                        { tenantId: { $in: [...uniqueTenantIds, ...validTenantObjectIds] } },
                        { tenantId: tenantIdStr }
                    ]
                },
                {
                    $or: [
                        { roleId: { $in: clientRoleIds } },
                        { role: { $regex: /^(client|user|customer|investor)$/i } }
                    ]
                }
            ]
        }).populate('roleId').sort({ createdAt: -1 }).lean().catch(() => []);
        const userIds = localUsers.map((u) => u._id || u.id);
        const userObjectIds = userIds
            .filter(uid => mongoose_1.default.Types.ObjectId.isValid(String(uid)))
            .map(uid => new mongoose_1.default.Types.ObjectId(String(uid)));
        // Fetch Client records belonging to this tenant directly or linked via tenant's users
        const localClients = await dbModels.Client.find({
            $or: [
                { tenantId: { $in: [...uniqueTenantIds, ...validTenantObjectIds] } },
                ...(userIds.length > 0 ? [
                    { userId: { $in: [...userIds, ...userObjectIds, ...userIds.map(String)] } }
                ] : [])
            ]
        })
            .populate('userId', 'email mobile firstName lastName status createdAt lastLogin tenantId')
            .sort({ createdAt: -1 })
            .lean().catch(() => []);
        const clientByUserId = new Map();
        for (const c of localClients) {
            const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || '');
            if (uIdStr) {
                clientByUserId.set(uIdStr, c);
            }
        }
        const combinedLocal = [...localClients];
        for (const u of localUsers) {
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
                    pan: u.pan || null,
                    aadhaar: u.aadhaar || null,
                    category: u.category || 'INDIVIDUAL',
                    occupation: u.occupation || 'OTHER',
                    status: u.status || 'ACTIVE',
                    tenantId: u.tenantId || tenantIdStr,
                    kraVerified: false,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                };
                combinedLocal.push(synthClient);
                clientByUserId.set(uIdStr, synthClient);
            }
        }
        const clientIds = combinedLocal.map((c) => c._id || c.id);
        const lookupIds = [...new Set([...clientIds, ...userIds.map(String)])];
        const [profiles, subscriptions, agreements, documents] = await Promise.all([
            dbModels.ClientProfile.find({ clientId: { $in: lookupIds } }).lean().catch(() => []),
            dbModels.Subscription.find({ clientId: { $in: lookupIds } })
                .populate('planId', 'id name price durationMonths researchSegments')
                .sort({ createdAt: -1 })
                .lean()
                .catch(() => []),
            dbModels.Agreement.find({ clientId: { $in: lookupIds } }).lean().catch(() => []),
            dbModels.ClientDocument.find({ clientId: { $in: lookupIds } }).lean().catch(() => [])
        ]);
        const profileMap = new Map(profiles.map(p => [String(p.clientId), p]));
        const subMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            if (!subMap.has(cId))
                subMap.set(cId, []);
            subMap.get(cId).push(sub);
        }
        const agMap = new Map();
        for (const ag of agreements) {
            const cId = String(ag.clientId);
            agMap.set(cId, (agMap.get(cId) || 0) + 1);
        }
        const docMap = new Map();
        for (const doc of documents) {
            const cId = String(doc.clientId);
            docMap.set(cId, (docMap.get(cId) || 0) + 1);
        }
        const sanitizedLocalClients = combinedLocal.map((c) => {
            const cIdStr = String(c._id || c.id);
            const userObj = c.userId || {};
            const uIdStr = String(userObj._id || userObj.id || c.userId || cIdStr);
            const prof = profileMap.get(cIdStr) || profileMap.get(uIdStr);
            const clientSubs = subMap.get(cIdStr) || subMap.get(uIdStr) || [];
            const primarySub = clientSubs[0] || null;
            const planObj = primarySub?.planId && typeof primarySub.planId === 'object'
                ? primarySub.planId
                : (primarySub?.plan || null);
            return {
                id: cIdStr,
                userId: uIdStr,
                tenantId: tenantIdStr,
                companyName: tenant.companyName,
                name: c.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.name || 'Client',
                email: c.email || userObj.email || '',
                mobile: c.mobile || userObj.mobile || '',
                pan: c.pan || userObj.pan || '',
                aadhaar: c.aadhaar || userObj.aadhaar || '',
                category: c.category || 'INDIVIDUAL',
                occupation: c.occupation || 'OTHER',
                status: c.status || userObj.status || 'ACTIVE',
                kraVerified: c.kraVerified || false,
                riskProfile: prof?.riskProfile || 'MODERATE',
                city: prof?.city || null,
                state: prof?.state || null,
                address: prof?.address || null,
                joinedAt: userObj.createdAt || c.createdAt,
                lastLogin: userObj.lastLogin || null,
                activeSubscription: primarySub ? {
                    id: primarySub._id || primarySub.id,
                    plan: planObj ? {
                        id: planObj._id || planObj.id,
                        name: planObj.name || 'Active Plan',
                        price: planObj.price,
                        durationMonths: planObj.durationMonths || 1,
                        researchSegments: planObj.researchSegments || []
                    } : null,
                    startDate: primarySub.startDate,
                    endDate: primarySub.endDate,
                    status: primarySub.status,
                    amountTotal: primarySub.amountTotal || null
                } : null,
                subscriptionsCount: clientSubs.length,
                agreementsCount: agMap.get(cIdStr) || agMap.get(uIdStr) || 0,
                documentsCount: docMap.get(cIdStr) || docMap.get(uIdStr) || 0
            };
        });
        if (remoteClients && !forceLocal) {
            return res.status(200).json({
                success: true,
                source: 'REMOTE_DOMAIN_API',
                domainUrl: targetOrigin,
                endpointUsed,
                company: {
                    id: tenantIdStr,
                    companyName: tenant.companyName,
                    sebiRegistration: tenant.sebiRegistration,
                    domainUrl: tenant.domainUrl,
                    website: tenant.website
                },
                count: remoteClients.length,
                data: remoteClients,
                localData: sanitizedLocalClients,
                remoteData: remoteClients,
                remoteCount: remoteClients.length,
                localCount: sanitizedLocalClients.length
            });
        }
        return res.status(200).json({
            success: true,
            source: 'LOCAL_DATABASE',
            domainUrl: rawDomain || null,
            company: {
                id: tenantIdStr,
                companyName: tenant.companyName,
                sebiRegistration: tenant.sebiRegistration,
                domainUrl: tenant.domainUrl,
                website: tenant.website
            },
            count: sanitizedLocalClients.length,
            data: sanitizedLocalClients,
            localData: sanitizedLocalClients,
            remoteData: remoteClients || [],
            remoteCount: remoteClients ? remoteClients.length : 0,
            localCount: sanitizedLocalClients.length
        });
    }
    catch (error) {
        console.error('Error fetching company clients:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch company clients: ' + error.message,
            errors: [error.message]
        });
    }
};
exports.getCompanyClients = getCompanyClients;
/**
 * Dynamic Company Staff Endpoint for Super Admin.
 */
const getCompanyStaff = async (req, res) => {
    const { id } = req.params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
        const tenant = await db_1.default.Tenant.findById(id).lean() ||
            await db_1.centralModels.AllCompany.findOne({
                $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
            }).lean();
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const tenantIdStr = (tenant.tenantId || tenant._id || tenant.id).toString();
        const rawDomain = (tenant.domainUrl || tenant.website || '').trim();
        // 1. Try remote domain API if domainUrl is configured
        if (rawDomain) {
            let targetOrigin = rawDomain;
            if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
                targetOrigin = 'https://' + targetOrigin;
            }
            try {
                const parsed = new URL(targetOrigin);
                targetOrigin = parsed.origin;
            }
            catch (e) {
                targetOrigin = targetOrigin.replace(/\/+$/, '');
            }
            const candidateEndpoints = [
                `${targetOrigin}/backend/api/v1/third-party-api/staff`,
                `${targetOrigin}/backend/api/v1/third-party-api/${tenantIdStr}/staff`,
                `${targetOrigin}/backend/api/v1/staff`,
                `${targetOrigin}/backend/third-party-api/staff`,
                `${targetOrigin}/backend/staff`,
                `${targetOrigin}/api/v1/third-party-api/staff`,
                `${targetOrigin}/api/v1/third-party-api/${tenantIdStr}/staff`,
                `${targetOrigin}/third-party-api/staff`,
                `${targetOrigin}/api/v1/staff`,
                `${targetOrigin}/staff`
            ];
            for (const endpoint of candidateEndpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1500);
                    const headers = {
                        'Content-Type': 'application/json',
                        'x-tenant-id': tenantIdStr
                    };
                    if (tenant.tenantApiKey) {
                        headers['x-tenant-api-key'] = tenant.tenantApiKey;
                    }
                    const remoteRes = await fetch(endpoint, {
                        method: 'GET',
                        headers,
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (remoteRes.ok) {
                        const remoteData = await remoteRes.json().catch(() => null);
                        if (remoteData && (Array.isArray(remoteData.data) || Array.isArray(remoteData))) {
                            const staffArray = Array.isArray(remoteData.data) ? remoteData.data : remoteData;
                            return res.status(200).json({
                                success: true,
                                source: 'REMOTE_DOMAIN_API',
                                domainUrl: targetOrigin,
                                endpointUsed: endpoint,
                                company: {
                                    id: tenantIdStr,
                                    companyName: tenant.companyName,
                                    sebiRegistration: tenant.sebiRegistration,
                                    domainUrl: tenant.domainUrl,
                                    website: tenant.website
                                },
                                count: staffArray.length,
                                data: staffArray
                            });
                        }
                    }
                }
                catch (remoteErr) {
                    // Continue
                }
            }
        }
        // 2. Fallback to Central Master Database
        const dbModels = db_1.centralModels;
        const clientRole = await dbModels.Role.findOne({ name: 'CLIENT' }).lean();
        const filterQuery = {
            $or: [{ tenantId: tenantIdStr }, { tenantId: id.trim() }]
        };
        if (clientRole) {
            filterQuery.roleId = { $ne: clientRole._id || clientRole.id };
        }
        const localStaffUsers = await dbModels.User.find(filterQuery)
            .populate('roleId', 'id name description')
            .sort({ createdAt: -1 })
            .lean();
        const userIds = localStaffUsers.map((u) => u._id || u.id);
        const staffList = await dbModels.Staff.find({ userId: { $in: userIds } }).lean();
        const staffIds = staffList.map((s) => s._id || s.id);
        const personAssocs = await dbModels.PersonAssociated.find({ staffId: { $in: staffIds } }).lean();
        const paMap = new Map(personAssocs.map((p) => [String(p.staffId), p]));
        const staffMap = new Map(staffList.map((s) => [String(s.userId), s]));
        const sanitizedStaff = localStaffUsers.map((u) => {
            const uIdStr = String(u._id || u.id);
            const staffRecord = staffMap.get(uIdStr);
            const personAssoc = staffRecord ? paMap.get(String(staffRecord._id || staffRecord.id)) : null;
            const roleName = u.roleId?.name || 'STAFF';
            return {
                id: staffRecord ? String(staffRecord._id || staffRecord.id) : uIdStr,
                userId: uIdStr,
                employeeId: staffRecord?.employeeId || u.employeeCode || `EMP-${uIdStr.slice(-4).toUpperCase()}`,
                name: staffRecord?.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff Member',
                email: staffRecord?.email || u.email,
                mobile: staffRecord?.mobile || u.mobile,
                role: roleName,
                roleDescription: u.roleId?.description || null,
                personAssociatedType: personAssoc?.roleType || null,
                customRole: personAssoc?.customRole || null,
                dob: staffRecord?.dob || null,
                joiningDate: staffRecord?.joiningDate || u.createdAt,
                nismNumber: staffRecord?.nismNumber || null,
                nismValidity: staffRecord?.nismValidity || null,
                nismUpload: staffRecord?.nismUpload || null,
                status: staffRecord?.status || u.status || 'ACTIVE',
                lastLogin: u.lastLogin,
                createdAt: u.createdAt
            };
        });
        return res.status(200).json({
            success: true,
            source: 'LOCAL_DATABASE',
            domainUrl: rawDomain || null,
            company: {
                id: tenantIdStr,
                companyName: tenant.companyName,
                sebiRegistration: tenant.sebiRegistration,
                domainUrl: tenant.domainUrl,
                website: tenant.website
            },
            count: sanitizedStaff.length,
            data: sanitizedStaff
        });
    }
    catch (error) {
        console.error('Error fetching company staff:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch company staff: ' + error.message,
            errors: [error.message]
        });
    }
};
exports.getCompanyStaff = getCompanyStaff;
/**
 * Dynamic Company Compliance Endpoint for Super Admin.
 * Queries remote domain API if configured, otherwise fetches from central/local database.
 */
const getCompanyCompliance = async (req, res) => {
    const { id } = req.params;
    const isGlobal = !id || id === 'ALL' || id === 'all';
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const normalizeAudit = (a, fallbackTenant) => {
            const reqObj = a.requirementId && typeof a.requirementId === 'object' ? a.requirementId : (a.requirement || {});
            const tenObj = a.tenantId && typeof a.tenantId === 'object' ? a.tenantId : (a.tenant || fallbackTenant || {});
            const tenantIdStr = (tenObj._id || tenObj.id || a.tenantId || '').toString();
            return {
                id: a._id ? a._id.toString() : a.id,
                _id: a._id,
                tenantId: tenantIdStr,
                status: a.status,
                dueDate: a.dueDate,
                officerRemarks: a.officerRemarks,
                proofDocumentUrl: a.proofDocumentUrl,
                resolvedAt: a.resolvedAt,
                updatedAt: a.updatedAt,
                requirement: {
                    id: reqObj._id ? reqObj._id.toString() : reqObj.id,
                    serialNo: reqObj.serialNo,
                    requirement: reqObj.requirement || reqObj.title || 'SEBI Regulation',
                    frequency: reqObj.frequency,
                    frequencyType: reqObj.frequencyType,
                    severityLevel: reqObj.severityLevel,
                    penaltyAmount: reqObj.penaltyAmount
                },
                requirementId: reqObj,
                penalty: a.penalty || null,
                tenant: {
                    id: tenantIdStr,
                    companyName: tenObj.companyName || '—',
                    sebiRegistration: tenObj.sebiRegistration || '—',
                    domainUrl: tenObj.domainUrl || null,
                    website: tenObj.website || null
                }
            };
        };
        if (!isGlobal) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
            const tenant = await db_1.default.Tenant.findById(id).lean() ||
                await db_1.centralModels.AllCompany.findOne({
                    $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
                }).lean();
            if (!tenant) {
                return res.status(404).json({ success: false, message: 'Tenant company not found' });
            }
            const tenantIdStr = (tenant.tenantId || tenant._id || tenant.id).toString();
            const rawDomain = (tenant.domainUrl || tenant.website || '').trim();
            // 1. Try remote domain API if domainUrl is configured
            if (rawDomain) {
                let targetOrigin = rawDomain;
                if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
                    targetOrigin = 'https://' + targetOrigin;
                }
                try {
                    const parsed = new URL(targetOrigin);
                    targetOrigin = parsed.origin;
                }
                catch (e) {
                    targetOrigin = targetOrigin.replace(/\/+$/, '');
                }
                const candidateEndpoints = [
                    `${targetOrigin}/backend/api/v1/third-party-api/compliance`,
                    `${targetOrigin}/backend/api/v1/third-party-api/${tenantIdStr}/compliance`,
                    `${targetOrigin}/backend/api/v1/compliance/dashboard-metrics`,
                    `${targetOrigin}/api/v1/third-party-api/compliance`,
                    `${targetOrigin}/api/v1/third-party-api/${tenantIdStr}/compliance`,
                    `${targetOrigin}/api/v1/compliance/dashboard-metrics`,
                    `${targetOrigin}/third-party-api/compliance`
                ];
                for (const endpoint of candidateEndpoints) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 1800);
                        const headers = {
                            'Content-Type': 'application/json',
                            'x-tenant-id': tenantIdStr
                        };
                        if (tenant.tenantApiKey) {
                            headers['x-tenant-api-key'] = tenant.tenantApiKey;
                        }
                        const remoteRes = await fetch(endpoint, {
                            method: 'GET',
                            headers,
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (remoteRes.ok) {
                            const remoteData = await remoteRes.json().catch(() => null);
                            if (remoteData && remoteData.data) {
                                return res.status(200).json({
                                    success: true,
                                    source: 'REMOTE_DOMAIN_API',
                                    domainUrl: targetOrigin,
                                    endpointUsed: endpoint,
                                    company: {
                                        id: tenantIdStr,
                                        companyName: tenant.companyName,
                                        sebiRegistration: tenant.sebiRegistration,
                                        domainUrl: tenant.domainUrl,
                                        website: tenant.website
                                    },
                                    data: remoteData.data
                                });
                            }
                        }
                    }
                    catch (remoteErr) {
                        // Continue to next endpoint or fallback
                    }
                }
            }
            // 2. Fallback to Local Central Database
            const localAudits = await db_1.default.ComplianceAudit.find({
                $or: [{ tenantId: tenantIdStr }, { tenantId: id.trim() }]
            })
                .populate('requirementId')
                .populate('penalty')
                .populate('tenantId')
                .sort({ dueDate: 1 })
                .lean();
            const upcoming = localAudits.filter((a) => (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'UPCOMING') &&
                a.dueDate && new Date(a.dueDate) >= now && new Date(a.dueDate) <= thirtyDaysFromNow).map(a => normalizeAudit(a, tenant));
            const due = localAudits.filter((a) => (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'DUE') &&
                a.dueDate && new Date(a.dueDate) >= now).map(a => normalizeAudit(a, tenant));
            const overdue = localAudits.filter((a) => ((a.status === 'PENDING' || a.status === 'OVERDUE') && a.dueDate && new Date(a.dueDate) < now) ||
                a.status === 'OVERDUE').map(a => normalizeAudit(a, tenant));
            const penalty = localAudits.filter((a) => a.penalty && (a.penalty.status === 'PENDING_PAYMENT' || a.status === 'PENALTY')).map(a => normalizeAudit(a, tenant));
            const closed = localAudits.filter((a) => a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED' || a.status === 'CLOSED').map(a => normalizeAudit(a, tenant));
            return res.status(200).json({
                success: true,
                source: 'LOCAL_DATABASE',
                domainUrl: rawDomain || null,
                company: {
                    id: tenantIdStr,
                    companyName: tenant.companyName,
                    sebiRegistration: tenant.sebiRegistration,
                    domainUrl: tenant.domainUrl,
                    website: tenant.website
                },
                data: {
                    counts: {
                        upcoming: upcoming.length,
                        due: due.length,
                        overdue: overdue.length,
                        penalty: penalty.length,
                        closed: closed.length,
                        total: localAudits.length
                    },
                    upcoming,
                    due,
                    overdue,
                    penalty,
                    closed
                }
            });
        }
        // Global / ALL Companies
        const allAudits = await db_1.default.ComplianceAudit.find()
            .populate('requirementId')
            .populate('penalty')
            .populate('tenantId')
            .sort({ dueDate: 1 })
            .lean();
        const upcoming = allAudits.filter((a) => (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'UPCOMING') &&
            a.dueDate && new Date(a.dueDate) >= now && new Date(a.dueDate) <= thirtyDaysFromNow).map(a => normalizeAudit(a));
        const due = allAudits.filter((a) => (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'DUE') &&
            a.dueDate && new Date(a.dueDate) >= now).map(a => normalizeAudit(a));
        const overdue = allAudits.filter((a) => ((a.status === 'PENDING' || a.status === 'OVERDUE') && a.dueDate && new Date(a.dueDate) < now) ||
            a.status === 'OVERDUE').map(a => normalizeAudit(a));
        const penalty = allAudits.filter((a) => a.penalty && (a.penalty.status === 'PENDING_PAYMENT' || a.status === 'PENALTY')).map(a => normalizeAudit(a));
        const closed = allAudits.filter((a) => a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED' || a.status === 'CLOSED').map(a => normalizeAudit(a));
        return res.status(200).json({
            success: true,
            source: 'LOCAL_DATABASE',
            data: {
                counts: {
                    upcoming: upcoming.length,
                    due: due.length,
                    overdue: overdue.length,
                    penalty: penalty.length,
                    closed: closed.length,
                    total: allAudits.length
                },
                upcoming,
                due,
                overdue,
                penalty,
                closed
            }
        });
    }
    catch (error) {
        console.error('Error fetching compliance for super admin:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance metrics: ' + error.message,
            errors: [error.message]
        });
    }
};
exports.getCompanyCompliance = getCompanyCompliance;
/**
 * Trigger verification sweep for a single tenant or all tenants.
 */
const runCompanyComplianceSweep = async (req, res) => {
    const { id } = req.params;
    const isGlobal = !id || id === 'ALL' || id === 'all';
    try {
        const { checkComplianceForTenant } = await Promise.resolve().then(() => __importStar(require('./complianceController')));
        if (!isGlobal) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(id.trim());
            const tenant = await db_1.default.Tenant.findById(id).lean() ||
                await db_1.centralModels.AllCompany.findOne({
                    $or: isObjectId ? [{ tenantId: id }, { _id: id }] : [{ tenantId: id }]
                }).lean();
            if (!tenant) {
                return res.status(404).json({ success: false, message: 'Tenant company not found' });
            }
            const tenantIdStr = (tenant.tenantId || tenant._id || tenant.id).toString();
            const rawDomain = (tenant.domainUrl || tenant.website || '').trim();
            // Attempt remote sweep if domain is available
            if (rawDomain) {
                let targetOrigin = rawDomain;
                if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
                    targetOrigin = 'https://' + targetOrigin;
                }
                try {
                    const parsed = new URL(targetOrigin);
                    targetOrigin = parsed.origin;
                }
                catch (e) {
                    targetOrigin = targetOrigin.replace(/\/+$/, '');
                }
                const candidateSweepUrls = [
                    `${targetOrigin}/backend/api/v1/third-party-api/compliance/sweep`,
                    `${targetOrigin}/backend/api/v1/third-party-api/${tenantIdStr}/compliance/sweep`,
                    `${targetOrigin}/api/v1/third-party-api/compliance/sweep`,
                    `${targetOrigin}/api/v1/third-party-api/${tenantIdStr}/compliance/sweep`,
                    `${targetOrigin}/api/v1/compliance/check`
                ];
                for (const sweepUrl of candidateSweepUrls) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const headers = {
                            'Content-Type': 'application/json',
                            'x-tenant-id': tenantIdStr
                        };
                        if (tenant.tenantApiKey) {
                            headers['x-tenant-api-key'] = tenant.tenantApiKey;
                        }
                        await fetch(sweepUrl, { method: 'POST', headers, signal: controller.signal });
                        clearTimeout(timeoutId);
                        break;
                    }
                    catch (e) { }
                }
            }
            // Run local sweep
            const alerts = await checkComplianceForTenant(tenantIdStr).catch(() => []);
            (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantIdStr, { reason: 'COMPLIANCE_SWEEP' }).catch(() => { });
            await (0, auditService_1.logAudit)({
                userId: req.user.id,
                action: 'UPDATE',
                module: 'COMPLIANCE',
                newValue: { tenantId: tenantIdStr, sweepResult: 'SUCCESS', alertsGenerated: alerts?.length || 0 },
                ipAddress: req.ip
            }).catch(() => { });
            return res.status(200).json({
                success: true,
                message: `Verification sweep completed successfully for ${tenant.companyName}.`,
                alertsGenerated: alerts?.length || 0
            });
        }
        // Global sweep across all tenants
        const tenants = await db_1.default.Tenant.find({ deletedAt: null }).lean();
        let totalAlerts = 0;
        for (const t of tenants) {
            const alerts = await checkComplianceForTenant(t._id.toString()).catch(() => []);
            totalAlerts += alerts?.length || 0;
        }
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'COMPLIANCE_SWEEP' }).catch(() => { });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'COMPLIANCE',
            newValue: { globalSweep: true, totalAlerts },
            ipAddress: req.ip
        }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: `Global verification sweep completed across all ${tenants.length} companies.`,
            alertsGenerated: totalAlerts
        });
    }
    catch (error) {
        console.error('Error running compliance sweep:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to run verification sweep: ' + error.message,
            errors: [error.message]
        });
    }
};
exports.runCompanyComplianceSweep = runCompanyComplianceSweep;
