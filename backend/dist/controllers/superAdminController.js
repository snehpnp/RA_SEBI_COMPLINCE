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
exports.updateComplianceRule = exports.getComplianceRules = exports.parseNismCertificate = exports.parseSebiCertificate = exports.updateSuperAdminPassword = exports.updateTenantDetails = exports.getTenantDetails = exports.getGlobalTelemetry = exports.getAuditLogs = exports.impersonateTenant = exports.permanentDeleteTenant = exports.restoreTenant = exports.deleteTenant = exports.toggleTenantStatus = exports.getTenants = exports.getTenantDocumentHistory = exports.createTenant = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcrypt = __importStar(require("bcryptjs"));
const auditService_1 = require("../services/auditService");
const jwt = __importStar(require("jsonwebtoken"));
const pdfParse = require('pdf-parse');
const pdfOcr_1 = require("../utils/pdfOcr");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const createTenant = async (req, res) => {
    const { companyName, companyType, raType, ownerName, sebiRegistration, bseEnrollment, email, mobile, address, pan, gst, website, certificateValidity, nismValidity, depositAmount } = req.body;
    if (!companyName || !ownerName || !sebiRegistration || !email || !mobile || !pan || !address) {
        return res.status(400).json({
            success: false,
            message: 'All fields are mandatory: Company Name, Owner Name, SEBI Registration, Email, Mobile, PAN, and Address.'
        });
    }
    try {
        // Check duplicates
        const existingTenants = await db_1.default.tenant.findMany({
            where: {
                OR: [
                    { email },
                    { sebiRegistration },
                    { pan },
                    { mobile },
                    ...(gst ? [{ gst }] : []),
                    ...(bseEnrollment ? [{ bseEnrollment }] : [])
                ]
            }
        });
        if (existingTenants.length > 0) {
            const duplicates = [];
            existingTenants.forEach(tenant => {
                if (tenant.email === email)
                    duplicates.push('Email');
                if (tenant.sebiRegistration === sebiRegistration)
                    duplicates.push('SEBI Registration');
                if (tenant.pan === pan)
                    duplicates.push('PAN');
                if (tenant.mobile === mobile)
                    duplicates.push('Mobile');
                if (gst && tenant.gst === gst)
                    duplicates.push('GST');
                if (bseEnrollment && tenant.bseEnrollment === bseEnrollment)
                    duplicates.push('BSE Enrollment');
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
        const existingUser = await db_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with the same Email already exists in the system.',
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
        let ocrExtractedReg = sebiRegistration;
        // Generate credentials
        const randomPassword = 'Temp@' + Math.floor(1000 + Math.random() * 9000);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPassword, salt);
        // Get ADMIN role id
        const adminRole = await db_1.default.role.findUnique({ where: { name: 'ADMIN' } });
        if (!adminRole) {
            return res.status(500).json({ success: false, message: 'Admin role is not seeded yet.' });
        }
        // DB Transaction to create tenant and initial user
        const result = await db_1.default.$transaction(async (tx) => {
            const tenantObj = await tx.tenant.create({
                data: {
                    companyName,
                    companyType: companyType || 'INDIVIDUAL',
                    raType: raType || 'FULL_TIME',
                    ownerName,
                    sebiRegistration: ocrExtractedReg,
                    bseEnrollment,
                    email,
                    mobile,
                    address,
                    pan,
                    gst,
                    website,
                    certificateUrl,
                    certificateValidity: certificateValidity ? new Date(certificateValidity) : null,
                    nismCertificateUrl,
                    nismValidity: nismValidity ? new Date(nismValidity) : null,
                    depositAmount: depositAmount ? parseFloat(depositAmount) : 0.0,
                    status: 'PENDING_PROFILE'
                }
            });
            const userObj = await tx.user.create({
                data: {
                    tenantId: tenantObj.id,
                    roleId: adminRole.id,
                    firstName: companyName,
                    lastName: 'Admin',
                    email,
                    mobile,
                    passwordHash,
                    tempPassword: randomPassword
                }
            });
            // Automatically create the 6 mandatory pages for the new tenant
            const defaultPages = [
                { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '', isSystem: true },
                { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '', isSystem: true },
                { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '', isSystem: true },
                { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '', isSystem: true },
                { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '', isSystem: true },
                { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '', isSystem: true }
            ];
            await tx.customPage.createMany({
                data: defaultPages.map(page => ({
                    ...page,
                    tenantId: tenantObj.id
                }))
            });
            if (certificateUrl && files.sebiCertificate && files.sebiCertificate[0]) {
                await tx.tenantDocumentHistory.create({
                    data: {
                        tenantId: tenantObj.id,
                        docType: 'SEBI_CERTIFICATE',
                        fileUrl: certificateUrl,
                        fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
                    }
                });
            }
            if (nismCertificateUrl && files.nismCertificate && files.nismCertificate[0]) {
                await tx.tenantDocumentHistory.create({
                    data: {
                        tenantId: tenantObj.id,
                        docType: 'NISM_CERTIFICATE',
                        fileUrl: nismCertificateUrl,
                        fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
                    }
                });
            }
            return { tenantObj, userObj };
        });
        // Write SMTP notification log
        await db_1.default.notificationLog.create({
            data: {
                tenantId: result.tenantObj.id,
                recipient: email,
                channel: 'EMAIL',
                title: 'Company Registration & Account Credentials',
                message: `Welcome ${companyName}! Your company is registered on RAGCP. Credentials: Username: ${email}, Password: ${randomPassword}. Please complete your profile wizard upon login.`,
                status: 'SENT'
            }
        });
        // Log Super Admin Audit Trail
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'CREATE',
            module: 'TENANTS',
            newValue: result.tenantObj,
            ipAddress: req.ip
        });
        return res.status(201).json({
            success: true,
            message: 'Company registration successful. Credentials sent via Email.',
            data: {
                company: result.tenantObj,
                adminUser: {
                    id: result.userObj.id,
                    email: result.userObj.email,
                    generatedPassword: randomPassword // Returning for local testing ease
                }
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create company tenant',
            errors: [error.message]
        });
    }
};
exports.createTenant = createTenant;
const getTenantDocumentHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const history = await db_1.default.tenantDocumentHistory.findMany({
            where: { tenantId: id },
            orderBy: { uploadedAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: history });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getTenantDocumentHistory = getTenantDocumentHistory;
const getTenants = async (req, res) => {
    try {
        const tenants = await db_1.default.tenant.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: tenants });
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
        const oldTenant = await db_1.default.tenant.findUnique({ where: { id } });
        if (!oldTenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        const updatedTenant = await db_1.default.tenant.update({
            where: { id },
            data: { status }
        });
        // Suspend only admin/staff users of this tenant (exclude clients)
        const rolesToSuspend = await db_1.default.role.findMany({
            where: { name: { not: 'CLIENT' } }
        });
        const roleIds = rolesToSuspend.map((r) => r.id);
        await db_1.default.user.updateMany({
            where: { tenantId: id, roleId: { in: roleIds } },
            data: { status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' }
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'TENANTS',
            oldValue: oldTenant,
            newValue: updatedTenant,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: `Company status changed to ${status}`,
            data: updatedTenant
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
        const oldTenant = await db_1.default.tenant.findUnique({ where: { id } });
        if (!oldTenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        // Save the current status before deleting so we can restore it later
        const statusBeforeDelete = oldTenant.status !== 'DELETED' ? oldTenant.status : (oldTenant.previousStatus || 'ACTIVE');
        const updatedTenant = await db_1.default.tenant.update({
            where: { id },
            data: { status: 'DELETED', deletedAt: new Date(), previousStatus: statusBeforeDelete }
        });
        // Mark ALL users of this tenant as DELETED
        await db_1.default.user.updateMany({
            where: { tenantId: id },
            data: { status: 'DELETED', deletedAt: new Date() }
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'SOFT_DELETE',
            module: 'TENANTS',
            oldValue: oldTenant,
            newValue: updatedTenant,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Company successfully deleted (soft delete)',
            data: updatedTenant
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
        const oldTenant = await db_1.default.tenant.findUnique({ where: { id } });
        if (!oldTenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        // Restore to the status the company had BEFORE it was deleted
        const restoreToStatus = oldTenant.previousStatus || 'ACTIVE';
        const updatedTenant = await db_1.default.tenant.update({
            where: { id },
            data: { status: restoreToStatus, deletedAt: null, previousStatus: null }
        });
        // Restore users: if company restores to SUSPENDED, only restore admin/staff (not to ACTIVE);
        // if restoring to ACTIVE, restore everyone to ACTIVE
        if (restoreToStatus === 'SUSPENDED') {
            // Restore users to ACTIVE status but company is SUSPENDED (they can't login anyway due to middleware)
            await db_1.default.user.updateMany({
                where: { tenantId: id, deletedAt: { not: null } },
                data: { status: 'ACTIVE', deletedAt: null }
            });
        }
        else {
            await db_1.default.user.updateMany({
                where: { tenantId: id },
                data: { status: 'ACTIVE', deletedAt: null }
            });
        }
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'RESTORE',
            module: 'TENANTS',
            oldValue: oldTenant,
            newValue: updatedTenant,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: `Company successfully restored to ${restoreToStatus} status`,
            data: updatedTenant
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
        const superAdmin = await db_1.default.user.findUnique({ where: { id: req.user.id } });
        if (!superAdmin) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const isMatch = await bcrypt.compare(password, superAdmin.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect password' });
        }
        const oldTenant = await db_1.default.tenant.findUnique({ where: { id } });
        if (!oldTenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found' });
        }
        // This will cascade delete everything linked to this tenant
        await db_1.default.tenant.delete({
            where: { id }
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'HARD_DELETE',
            module: 'TENANTS',
            oldValue: oldTenant,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Company permanently deleted'
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
        const tenant = await db_1.default.tenant.findUnique({ where: { id } });
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }
        // Find the Admin user for this tenant
        const adminUser = await db_1.default.user.findFirst({
            where: { tenantId: id, role: { name: 'ADMIN' } },
            include: { role: true }
        });
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found for this tenant' });
        }
        // Generate token with isImpersonated flag
        const accessToken = jwt.sign({
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role.name,
            tenantId: adminUser.tenantId,
            isImpersonated: true
        }, JWT_SECRET, { expiresIn: '1h' });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'IMPERSONATE',
            module: 'TENANTS',
            newValue: { impersonatedUserId: adminUser.id, tenantId: id },
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: `Impersonating Admin of ${tenant.companyName}`,
            data: {
                accessToken,
                user: {
                    id: adminUser.id,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    email: adminUser.email,
                    role: adminUser.role.name,
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
const getAuditLogs = async (req, res) => {
    try {
        const logs = await db_1.default.auditLog.findMany({
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { timestamp: 'desc' }
        });
        return res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAuditLogs = getAuditLogs;
const getGlobalTelemetry = async (req, res) => {
    try {
        const totalCompanies = await db_1.default.tenant.count({ where: { deletedAt: null } });
        const activeCompanies = await db_1.default.tenant.count({ where: { deletedAt: null, status: 'ACTIVE' } });
        const totalUsers = await db_1.default.user.count({ where: { deletedAt: null } });
        const auditLogsCount = await db_1.default.auditLog.count();
        // Fetch alerts count
        const activeAlerts = await db_1.default.complianceAlert.count({ where: { status: 'OPEN' } });
        return res.status(200).json({
            success: true,
            data: {
                totalCompanies,
                activeCompanies,
                totalUsers,
                auditLogsCount,
                activeAlerts
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
        const tenant = await db_1.default.tenant.findUnique({
            where: { id },
            include: {
                users: {
                    include: { role: true, staff: { include: { personAssociated: true } } }
                }
            }
        });
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }
        const admin = tenant.users.find(u => u.role.name === 'ADMIN');
        const officers = tenant.users.filter(u => ['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER'].includes(u.role.name));
        return res.status(200).json({
            success: true,
            data: {
                tenant,
                admin,
                officers
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
    const { companyName, certificateValidity, status, address, gst, supportMobile, adminName, adminMobile, adminEmail, adminPassword, adminStatus, nismValidity, companyType, sebiRegistration, bseEnrollment, pan, website, depositAmount, raType } = req.body;
    try {
        const oldTenant = await db_1.default.tenant.findUnique({ where: { id } });
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
        const updatedTenant = await db_1.default.tenant.update({
            where: { id },
            data: {
                companyName,
                certificateValidity: certificateValidity ? new Date(certificateValidity) : null,
                status,
                address,
                gst,
                mobile: supportMobile || req.body.tenantMobile,
                nismValidity: nismValidity ? new Date(nismValidity) : null,
                companyType,
                sebiRegistration,
                bseEnrollment,
                pan,
                website,
                depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
                certificateUrl: newSebiUrl,
                nismCertificateUrl: newNismUrl,
                raType: raType || undefined
            }
        });
        if (files && files.sebiCertificate && files.sebiCertificate[0] && newSebiUrl) {
            await db_1.default.tenantDocumentHistory.create({
                data: {
                    tenantId: id,
                    docType: 'SEBI_CERTIFICATE',
                    fileUrl: newSebiUrl,
                    fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
                }
            });
        }
        if (files && files.nismCertificate && files.nismCertificate[0] && newNismUrl) {
            await db_1.default.tenantDocumentHistory.create({
                data: {
                    tenantId: id,
                    docType: 'NISM_CERTIFICATE',
                    fileUrl: newNismUrl,
                    fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
                }
            });
        }
        const adminUser = await db_1.default.user.findFirst({
            where: { tenantId: id, role: { name: 'ADMIN' } }
        });
        if (adminUser) {
            const parts = (adminName || '').split(' ');
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            const updateData = {
                firstName: firstName || adminUser.firstName,
                lastName: lastName || adminUser.lastName,
                mobile: adminMobile || adminUser.mobile,
                email: adminEmail || adminUser.email,
                status: adminStatus || adminUser.status
            };
            if (adminPassword) {
                const salt = await bcrypt.genSalt(10);
                updateData.passwordHash = await bcrypt.hash(adminPassword, salt);
            }
            await db_1.default.user.update({
                where: { id: adminUser.id },
                data: updateData
            });
        }
        // Write audit log
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'TENANTS',
            oldValue: oldTenant,
            newValue: updatedTenant,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Company and Admin details updated successfully',
            data: updatedTenant
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateTenantDetails = updateTenantDetails;
const updateSuperAdminPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await db_1.default.user.findUnique({ where: { id: req.user.id } });
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
        await db_1.default.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });
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
            // Prevent NISM being uploaded as SEBI
            if (file.originalname.toLowerCase().includes('nism')) {
                return res.status(200).json({
                    success: false,
                    data: null,
                    message: 'Document Mismatch: You uploaded a NISM certificate in the SEBI field.'
                });
            }
            // Graceful fallback — return empty data so user can fill manually
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
        return res.status(200).json({
            success: true,
            data: {
                sebiRegistration,
                certificateValidity,
                companyName,
                address
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
            // Graceful fallback — return empty data so user can fill manually
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
        const rules = await db_1.default.complianceRequirement.findMany({
            orderBy: { serialNo: 'asc' }
        });
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
        const oldRule = await db_1.default.complianceRequirement.findUnique({ where: { id } });
        if (!oldRule) {
            return res.status(404).json({ success: false, message: 'Rule not found' });
        }
        const updatedRule = await db_1.default.complianceRequirement.update({
            where: { id },
            data: {
                requirement,
                frequency,
                frequencyType,
                severityLevel,
                penaltyAmount,
                isActive: typeof isActive === 'boolean' ? isActive : undefined
            }
        });
        await (0, auditService_1.logAudit)({
            userId: req.user.id,
            action: 'UPDATE',
            module: 'COMPLIANCE',
            oldValue: oldRule,
            newValue: updatedRule,
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Compliance Rule updated successfully',
            data: updatedRule
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateComplianceRule = updateComplianceRule;
