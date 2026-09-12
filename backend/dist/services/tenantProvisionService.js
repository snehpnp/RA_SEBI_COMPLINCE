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
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionAllTenantCollections = provisionAllTenantCollections;
exports.syncTenantDedicatedMongoDirect = syncTenantDedicatedMongoDirect;
exports.provisionTenantDatabase = provisionTenantDatabase;
const mongodb_1 = require("mongodb");
const bcrypt = __importStar(require("bcryptjs"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stateService_1 = require("./stateService");
const complianceDateHelper_1 = require("../utils/complianceDateHelper");
/**
 * Provisions ALL collections and baseline records required for a Tenant using Mongoose ITenantModels.
 */
async function provisionAllTenantCollections(targetModels, tenantData, adminUserData, customPermissions) {
    // 1. Seed standard Roles
    const roles = [
        { name: 'SUPER_ADMIN', description: 'System Owner' },
        { name: 'ADMIN', description: 'RA Company Owner' },
        { name: 'PRINCIPAL_OFFICER', description: 'Company Principal Officer' },
        { name: 'COMPLIANCE_OFFICER', description: 'Company Compliance Officer' },
        { name: 'RESEARCHER', description: 'Company Research Analyst' },
        { name: 'PERSON_ASSOCIATED', description: 'Associated Services (Sales, Marketing, etc.)' },
        { name: 'CLIENT', description: 'End Client Subscribing to Research' }
    ];
    const roleMap = {};
    for (const role of roles) {
        const createdRole = await targetModels.Role.findOneAndUpdate({ name: role.name }, { $set: role }, { upsert: true, returnDocument: 'after' });
        roleMap[role.name] = createdRole._id.toString();
    }
    // 2. Seed standard Permissions
    const permissions = [
        { code: 'CREATE', name: 'Create Records' },
        { code: 'READ', name: 'Read Records' },
        { code: 'UPDATE', name: 'Update Records' },
        { code: 'DELETE', name: 'Soft Delete Records' },
        { code: 'APPROVE', name: 'Approve Workflows' },
        { code: 'REJECT', name: 'Reject Workflows' },
        { code: 'PUBLISH', name: 'Publish Research' },
        { code: 'EXPORT', name: 'Export Data (CSV/Excel)' },
        { code: 'DOWNLOAD', name: 'Download PDF Agreements/Reports' },
        { code: 'ACCESS_DASHBOARD', name: 'Access Dashboard' },
        { code: 'ACCESS_STAFF', name: 'Access Staff Control' },
        { code: 'ACCESS_CLIENTS', name: 'Access Client Management' },
        { code: 'ACCESS_PLANS', name: 'Access Plan Management' },
        { code: 'ACCESS_RESEARCH', name: 'Access Signal & Research Management' },
        { code: 'ACCESS_PAYMENTS', name: 'Access Payment Approvals' },
        { code: 'ACCESS_COMPLIANCE', name: 'Access Compliance Desk' },
        { code: 'ACCESS_SETTINGS', name: 'Access Settings' },
        { code: 'ACCESS_ROLES', name: 'Access Roles Management' }
    ];
    const permMap = {};
    for (const perm of permissions) {
        const createdPerm = await targetModels.Permission.findOneAndUpdate({ code: perm.code }, { $set: perm }, { upsert: true, returnDocument: 'after' });
        permMap[perm.code] = createdPerm._id.toString();
    }
    // 3. Bind RolePermissions (ADMIN & SUPER_ADMIN get all permissions)
    const fullAdminRoles = ['SUPER_ADMIN', 'ADMIN'];
    for (const roleName of fullAdminRoles) {
        const rId = roleMap[roleName];
        if (!rId)
            continue;
        for (const permCode of Object.keys(permMap)) {
            const pId = permMap[permCode];
            await targetModels.RolePermission.findOneAndUpdate({ roleId: rId, permissionId: pId }, { $set: { roleId: rId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
        }
    }
    // Specific permissions for PO, CO, Researcher
    const poId = roleMap['PRINCIPAL_OFFICER'];
    if (poId) {
        const poPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_STAFF', 'ACCESS_RESEARCH'];
        for (const permCode of poPerms) {
            const pId = permMap[permCode];
            if (pId) {
                await targetModels.RolePermission.findOneAndUpdate({ roleId: poId, permissionId: pId }, { $set: { roleId: poId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
            }
        }
    }
    const coId = roleMap['COMPLIANCE_OFFICER'];
    if (coId) {
        const coPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_COMPLIANCE'];
        for (const permCode of coPerms) {
            const pId = permMap[permCode];
            if (pId) {
                await targetModels.RolePermission.findOneAndUpdate({ roleId: coId, permissionId: pId }, { $set: { roleId: coId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
            }
        }
    }
    const researcherId = roleMap['RESEARCHER'];
    if (researcherId) {
        const researcherPerms = ['CREATE', 'READ', 'UPDATE', 'PUBLISH', 'DOWNLOAD', 'ACCESS_RESEARCH'];
        for (const permCode of researcherPerms) {
            const pId = permMap[permCode];
            if (pId) {
                await targetModels.RolePermission.findOneAndUpdate({ roleId: researcherId, permissionId: pId }, { $set: { roleId: researcherId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
            }
        }
    }
    // 4. Upsert Tenant
    const certValidity = tenantData.certificateValidity && !isNaN(new Date(tenantData.certificateValidity).getTime())
        ? new Date(tenantData.certificateValidity)
        : null;
    const nismValidity = tenantData.nismValidity && !isNaN(new Date(tenantData.nismValidity).getTime())
        ? new Date(tenantData.nismValidity)
        : null;
    const depositAmt = tenantData.depositAmount !== undefined && !isNaN(Number(tenantData.depositAmount))
        ? Number(tenantData.depositAmount)
        : 0.0;
    const tenantPayload = {
        companyName: tenantData.companyName,
        companyType: tenantData.companyType || 'INDIVIDUAL',
        raType: tenantData.raType || 'FULL_TIME',
        sebiRegistration: tenantData.sebiRegistration,
        bseEnrollment: tenantData.bseEnrollment || null,
        email: tenantData.email,
        mobile: tenantData.mobile,
        address: tenantData.address,
        pan: tenantData.pan,
        gst: tenantData.gst || null,
        website: tenantData.website || null,
        ownerName: tenantData.ownerName || `${adminUserData.firstName || ''} ${adminUserData.lastName || ''}`.trim() || 'Admin User',
        certificateUrl: tenantData.certificateUrl || null,
        certificateValidity: certValidity,
        nismCertificateUrl: tenantData.nismCertificateUrl || null,
        nismValidity: nismValidity,
        depositAmount: depositAmt,
        status: tenantData.status || 'ACTIVE',
        previousStatus: tenantData.previousStatus || null,
        panelName: tenantData.panelName || `${tenantData.companyName} Portal`,
        domainUrl: tenantData.domainUrl || null,
        mongoDbUrl: tenantData.mongoDbUrl || null,
        dbName: tenantData.dbName || null,
        tenantApiKey: tenantData.tenantApiKey || null,
        state: tenantData.state || null,
        gstCalculationType: tenantData.gstCalculationType || 'EXCLUSIVE',
        smtpHost: tenantData.smtpHost || null,
        smtpPort: tenantData.smtpPort !== undefined ? tenantData.smtpPort : null,
        smtpUser: tenantData.smtpUser || null,
        smtpPassword: tenantData.smtpPassword || null,
        smtpFrom: tenantData.smtpFrom || null,
        bankAccountName: tenantData.bankAccountName || null,
        bankAccountNo: tenantData.bankAccountNo || null,
        bankAccountType: tenantData.bankAccountType || null,
        bankIfsc: tenantData.bankIfsc || null,
        bankName: tenantData.bankName || null,
        bankBranch: tenantData.bankBranch || null,
        socialMediaLinks: tenantData.socialMediaLinks || null,
        digioClientId: tenantData.digioClientId || null,
        digioClientSecret: tenantData.digioClientSecret || null,
        digioKycTemplateName: tenantData.digioKycTemplateName || null,
        agreementContent: tenantData.agreementContent || null,
        kraProvider: tenantData.kraProvider || null,
        kraApiKey: tenantData.kraApiKey || null,
        kraApiSecret: tenantData.kraApiSecret || null,
        coSignatureUrl: tenantData.coSignatureUrl || null,
        activePaymentGateway: tenantData.activePaymentGateway || 'RAZORPAY',
        razorpayKeyId: tenantData.razorpayKeyId || null,
        razorpayKeySecret: tenantData.razorpayKeySecret || null,
        cashfreeAppId: tenantData.cashfreeAppId || null,
        cashfreeSecretKey: tenantData.cashfreeSecretKey || null,
        ccavenueMerchantId: tenantData.ccavenueMerchantId || null,
        ccavenueAccessCode: tenantData.ccavenueAccessCode || null,
        ccavenueWorkingKey: tenantData.ccavenueWorkingKey || null,
        stripePublishableKey: tenantData.stripePublishableKey || null,
        stripeSecretKey: tenantData.stripeSecretKey || null,
        kycFirst: tenantData.kycFirst !== undefined ? tenantData.kycFirst : true,
        welcomeEmailText: tenantData.welcomeEmailText || null,
        termsPdfUrl: tenantData.termsPdfUrl || null,
        privacyPdfUrl: tenantData.privacyPdfUrl || null,
        reportDisclaimer: tenantData.reportDisclaimer || null,
        logoUrl: tenantData.logoUrl || null,
        faviconUrl: tenantData.faviconUrl || null,
        internalPolicyUrl: tenantData.internalPolicyUrl || null
    };
    const tenantFilter = tenantData.id
        ? { _id: tenantData.id }
        : { email: tenantData.email };
    const targetTenant = await targetModels.Tenant.findOneAndUpdate(tenantFilter, { $set: tenantPayload }, { upsert: true, returnDocument: 'after' });
    const tenantId = targetTenant._id ? targetTenant._id.toString() : targetTenant.id;
    // 5. Upsert Admin User
    let finalPasswordHash = adminUserData.passwordHash;
    if (!finalPasswordHash && adminUserData.password) {
        finalPasswordHash = await bcrypt.hash(adminUserData.password, 10);
    }
    else if (!finalPasswordHash && adminUserData.tempPassword) {
        finalPasswordHash = await bcrypt.hash(adminUserData.tempPassword, 10);
    }
    else if (!finalPasswordHash) {
        const defaultPassword = 'Admin@' + Math.floor(1000 + Math.random() * 9000);
        finalPasswordHash = await bcrypt.hash(defaultPassword, 10);
        adminUserData.tempPassword = defaultPassword;
    }
    const superAdminRoleId = roleMap['SUPER_ADMIN'];
    const adminRoleId = roleMap['ADMIN'];
    const adminEmail = adminUserData.email.toLowerCase().trim();
    let targetUser = null;
    if (adminUserData.id) {
        targetUser = await targetModels.User.findById(adminUserData.id).lean();
        if (targetUser && (targetUser.roleId?.toString() === superAdminRoleId)) {
            targetUser = null;
        }
    }
    if (!targetUser && adminEmail) {
        targetUser = await targetModels.User.findOne({ email: adminEmail }).lean();
        if (targetUser && (targetUser.roleId?.toString() === superAdminRoleId)) {
            targetUser = null;
        }
    }
    const effectiveStatus = targetTenant.status === 'SUSPENDED'
        ? 'SUSPENDED'
        : (targetTenant.status === 'DELETED' ? 'DELETED' : (adminUserData.status || 'ACTIVE'));
    const userPayload = {
        tenantId,
        roleId: adminRoleId,
        firstName: adminUserData.firstName || targetTenant.companyName,
        lastName: adminUserData.lastName || 'Admin',
        email: adminEmail,
        mobile: adminUserData.mobile || targetTenant.mobile,
        passwordHash: finalPasswordHash || '',
        tempPassword: adminUserData.tempPassword || null,
        status: effectiveStatus
    };
    let createdAdminUser;
    if (targetUser) {
        createdAdminUser = await targetModels.User.findByIdAndUpdate(targetUser._id, { $set: userPayload }, { returnDocument: 'after' });
    }
    else {
        createdAdminUser = await targetModels.User.create(userPayload);
    }
    // 6. Admin Permissions (10 Modules)
    const defaultModules = [
        'CLIENTS',
        'RESEARCH_REPORTS',
        'SIGNALS',
        'COMPLIANCE',
        'BILLING',
        'KYC',
        'COUPONS',
        'CUSTOM_PAGES',
        'AI_FEATURES',
        'EXPORT_DATA'
    ];
    const permsToSync = customPermissions && customPermissions.length > 0
        ? customPermissions
        : defaultModules.map((m) => ({ module: m, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true, isEnabled: true }));
    for (const p of permsToSync) {
        await targetModels.AdminPermission.findOneAndUpdate({ tenantId, module: p.module }, {
            $set: {
                tenantId,
                module: p.module,
                canView: p.canView ?? true,
                canCreate: p.canCreate ?? true,
                canEdit: p.canEdit ?? true,
                canDelete: p.canDelete ?? true,
                canExport: p.canExport ?? true,
                isEnabled: p.isEnabled ?? true,
                customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits
            }
        }, { upsert: true, returnDocument: 'after' });
    }
    // 7. Custom Pages
    const defaultPages = [
        { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '<h3>Monthly Complaint Status</h3><p>Status of investor complaints received and resolved per SEBI guidelines.</p>', isSystem: true },
        { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '<h3>Refund Policy</h3><p>Details regarding fee refunds and advisory subscription cancellations.</p>', isSystem: true },
        { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '<h3>SEBI Disclosures</h3><p>Mandatory disclosures regarding research analyst activities, ownership, and conflicts of interest.</p>', isSystem: true },
        { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '<h3>Disclaimer</h3><p>Investment in securities market are subject to market risks. Read all scheme related documents carefully before investing.</p>', isSystem: true },
        { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '<h3>Grievance Redressal Mechanism</h3><p>Step-by-step procedure for lodging and escalating complaints.</p>', isSystem: true },
        { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '<h3>Investor Charter</h3><p>Investor rights, responsibilities, and code of conduct under SEBI Research Analyst Regulations.</p>', isSystem: true },
        { title: 'Terms & Conditions', slug: 'terms-and-conditions', type: 'CONTENT', content: '<h3>Terms of Service</h3><p>Terms and conditions governing use of research and advisory services.</p>', isSystem: true },
        { title: 'Privacy Policy', slug: 'privacy-policy', type: 'CONTENT', content: '<h3>Privacy Policy</h3><p>Information on data collection, privacy, and confidentiality practices.</p>', isSystem: true }
    ];
    const pagesToSync = tenantData.customPages && tenantData.customPages.length > 0 ? tenantData.customPages : defaultPages;
    for (const page of pagesToSync) {
        if (!page.slug)
            continue;
        await targetModels.CustomPage.findOneAndUpdate({ tenantId, slug: page.slug }, {
            $set: {
                tenantId,
                title: page.title,
                slug: page.slug,
                type: page.type || 'CONTENT',
                content: page.content || null,
                externalUrl: page.externalUrl || null,
                isSystem: page.isSystem ?? true,
                status: page.status || 'ACTIVE'
            }
        }, { upsert: true, returnDocument: 'after' });
    }
    // 8. Email Templates
    const defaultTemplates = [
        { type: 'WELCOME', subject: `Welcome to ${targetTenant.companyName}`, body: `Dear {{clientName}},\n\nWelcome to ${targetTenant.companyName}! Your advisory account is registered.\n\nBest regards,\n${targetTenant.companyName}` },
        { type: 'CHANGE_PASSWORD', subject: 'Password Reset Request', body: `Dear {{userName}},\n\nYour password reset request has been received. Please use your temporary credentials to log in.\n\nBest regards,\n${targetTenant.companyName}` },
        { type: 'KYC_AGREEMENT', subject: 'Advisory Service Agreement & KYC Confirmation', body: `Dear {{clientName}},\n\nYour KYC verification and Research Advisory Agreement have been successfully recorded.\n\nBest regards,\n${targetTenant.companyName}` },
        { type: 'INVOICE', subject: `Tax Invoice - ${targetTenant.companyName}`, body: `Dear {{clientName}},\n\nPlease find attached the tax invoice for your research advisory subscription.\n\nBest regards,\n${targetTenant.companyName}` }
    ];
    const templatesToSync = tenantData.emailTemplates && tenantData.emailTemplates.length > 0 ? tenantData.emailTemplates : defaultTemplates;
    for (const t of templatesToSync) {
        if (!t.type)
            continue;
        await targetModels.EmailTemplate.findOneAndUpdate({ tenantId, type: t.type }, {
            $set: {
                tenantId,
                type: t.type,
                subject: t.subject,
                body: t.body
            }
        }, { upsert: true, returnDocument: 'after' });
    }
    // 9. Compliance Requirements & Audits
    try {
        let rulesToSync = tenantData.complianceRequirements;
        if (!rulesToSync || rulesToSync.length === 0) {
            const rulesPath = path.join(__dirname, '../seeds/rules.json');
            if (fs.existsSync(rulesPath)) {
                try {
                    rulesToSync = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
                }
                catch { }
            }
        }
        if (rulesToSync && rulesToSync.length > 0) {
            for (const rule of rulesToSync) {
                await targetModels.ComplianceRequirement.findOneAndUpdate({ serialNo: rule.serialNo }, {
                    $set: {
                        serialNo: rule.serialNo,
                        requirement: rule.requirement,
                        frequency: rule.frequency,
                        frequencyType: rule.frequencyType || 'CONTINUOUS',
                        severityLevel: rule.severityLevel || 'HIGH',
                        penaltyAmount: rule.penaltyAmount || null,
                        isActive: rule.isActive ?? true
                    }
                }, { upsert: true, returnDocument: 'after' });
            }
        }
        const activeRequirements = await targetModels.ComplianceRequirement.find({ isActive: true }).lean();
        const now = new Date();
        for (const req of activeRequirements) {
            const period = (0, complianceDateHelper_1.getCompliancePeriod)(req.frequencyType, now, targetTenant.createdAt || now);
            const reqId = req._id ? req._id.toString() : req.id;
            const existingAudit = await targetModels.ComplianceAudit.findOne({
                tenantId,
                requirementId: reqId,
                dueDate: { $gte: period.startDate, $lte: period.dueDate }
            }).lean();
            if (!existingAudit) {
                await targetModels.ComplianceAudit.create({
                    tenantId,
                    requirementId: reqId,
                    status: 'PENDING',
                    dueDate: period.dueDate
                });
            }
        }
    }
    catch (auditErr) {
        console.warn('Compliance audit sync note:', auditErr);
    }
    // 10. Seed Indian States
    await (0, stateService_1.ensureStates)(targetModels.State).catch(() => { });
    // 11. Plan Category & Plans
    try {
        const categoryCount = await targetModels.PlanCategory.countDocuments({ tenantId });
        if (categoryCount === 0) {
            const defaultCategory = await targetModels.PlanCategory.create({
                tenantId,
                name: 'Equity & Derivatives',
                segments: 'EQUITY,DERIVATIVE',
                status: 'ACTIVE'
            });
            await targetModels.Plan.create({
                tenantId,
                categoryId: defaultCategory._id,
                name: 'Standard Advisory Plan',
                description: 'Comprehensive equity recommendations and research reports with SEBI compliant disclosures.',
                price: 5000.0,
                durationMonths: 1,
                researchSegments: 'EQUITY,DERIVATIVE',
                notificationsAllowed: 'EMAIL,INAPP',
                clientLimit: 100,
                status: 'ACTIVE'
            });
        }
    }
    catch (planErr) {
        console.warn('Plan sync note:', planErr);
    }
    // 12. System Settings
    if (tenantData.systemSettings && tenantData.systemSettings.length > 0) {
        for (const setting of tenantData.systemSettings) {
            if (!setting.key)
                continue;
            await targetModels.SystemSetting.findOneAndUpdate({ key: setting.key }, {
                $set: {
                    key: setting.key,
                    value: typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)
                }
            }, { upsert: true, returnDocument: 'after' });
        }
    }
    return { tenant: targetTenant, adminUser: createdAdminUser };
}
/**
 * Direct native MongoDB synchronizer for tenant dedicated database.
 */
async function syncTenantDedicatedMongoDirect(mongoDbUrl, tenantData, adminUserData, customPermissions) {
    const client = new mongodb_1.MongoClient(mongoDbUrl, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000
    });
    try {
        await client.connect();
        const db = client.db();
        const tenantId = tenantData.id || new mongodb_1.ObjectId().toString();
        // Roles
        const roles = [
            { name: 'SUPER_ADMIN', description: 'System Owner' },
            { name: 'ADMIN', description: 'RA Company Owner' },
            { name: 'PRINCIPAL_OFFICER', description: 'Company Principal Officer' },
            { name: 'COMPLIANCE_OFFICER', description: 'Company Compliance Officer' },
            { name: 'RESEARCHER', description: 'Company Research Analyst' },
            { name: 'PERSON_ASSOCIATED', description: 'Associated Services (Sales, Marketing, etc.)' },
            { name: 'CLIENT', description: 'End Client Subscribing to Research' }
        ];
        const roleMap = {};
        for (const r of roles) {
            const res = await db.collection('Role').findOneAndUpdate({ name: r.name }, { $set: { name: r.name, description: r.description, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, returnDocument: 'after' });
            if (res && res._id) {
                roleMap[r.name] = res._id.toString();
            }
        }
        // Permissions
        const permissions = [
            { code: 'CREATE', name: 'Create Records' },
            { code: 'READ', name: 'Read Records' },
            { code: 'UPDATE', name: 'Update Records' },
            { code: 'DELETE', name: 'Soft Delete Records' },
            { code: 'APPROVE', name: 'Approve Workflows' },
            { code: 'REJECT', name: 'Reject Workflows' },
            { code: 'PUBLISH', name: 'Publish Research' },
            { code: 'EXPORT', name: 'Export Data (CSV/Excel)' },
            { code: 'DOWNLOAD', name: 'Download PDF Agreements/Reports' },
            { code: 'ACCESS_DASHBOARD', name: 'Access Dashboard' },
            { code: 'ACCESS_STAFF', name: 'Access Staff Control' },
            { code: 'ACCESS_CLIENTS', name: 'Access Client Management' },
            { code: 'ACCESS_PLANS', name: 'Access Plan Management' },
            { code: 'ACCESS_RESEARCH', name: 'Access Signal & Research Management' },
            { code: 'ACCESS_PAYMENTS', name: 'Access Payment Approvals' },
            { code: 'ACCESS_COMPLIANCE', name: 'Access Compliance Desk' },
            { code: 'ACCESS_SETTINGS', name: 'Access Settings' },
            { code: 'ACCESS_ROLES', name: 'Access Roles Management' }
        ];
        const permMap = {};
        for (const p of permissions) {
            const res = await db.collection('Permission').findOneAndUpdate({ code: p.code }, { $set: { code: p.code, name: p.name, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, returnDocument: 'after' });
            if (res && res._id) {
                permMap[p.code] = res._id.toString();
            }
        }
        // RolePermissions
        const adminRoleId = roleMap['ADMIN'];
        if (adminRoleId) {
            for (const pCode of Object.keys(permMap)) {
                const pId = permMap[pCode];
                await db.collection('RolePermission').updateOne({ roleId: adminRoleId, permissionId: pId }, { $set: { roleId: adminRoleId, permissionId: pId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
            }
        }
        // Tenant
        const tenantDoc = {
            companyName: tenantData.companyName,
            companyType: tenantData.companyType || 'INDIVIDUAL',
            raType: tenantData.raType || 'FULL_TIME',
            sebiRegistration: tenantData.sebiRegistration,
            bseEnrollment: tenantData.bseEnrollment || null,
            email: tenantData.email,
            mobile: tenantData.mobile,
            address: tenantData.address,
            pan: tenantData.pan,
            gst: tenantData.gst || null,
            website: tenantData.website || null,
            ownerName: tenantData.ownerName || null,
            certificateUrl: tenantData.certificateUrl || null,
            certificateValidity: tenantData.certificateValidity ? new Date(tenantData.certificateValidity) : null,
            nismCertificateUrl: tenantData.nismCertificateUrl || null,
            nismValidity: tenantData.nismValidity ? new Date(tenantData.nismValidity) : null,
            depositAmount: typeof tenantData.depositAmount === 'number' ? tenantData.depositAmount : parseFloat(String(tenantData.depositAmount || 0)),
            status: tenantData.status || 'ACTIVE',
            panelName: tenantData.panelName || `${tenantData.companyName} Portal`,
            domainUrl: tenantData.domainUrl || null,
            mongoDbUrl: tenantData.mongoDbUrl || null,
            dbName: tenantData.dbName || null,
            tenantApiKey: tenantData.tenantApiKey || null,
            state: tenantData.state || null,
            gstCalculationType: tenantData.gstCalculationType || 'EXCLUSIVE',
            smtpHost: tenantData.smtpHost || null,
            smtpPort: tenantData.smtpPort || null,
            smtpUser: tenantData.smtpUser || null,
            smtpPassword: tenantData.smtpPassword || null,
            smtpFrom: tenantData.smtpFrom || null,
            bankAccountName: tenantData.bankAccountName || null,
            bankAccountNo: tenantData.bankAccountNo || null,
            bankAccountType: tenantData.bankAccountType || null,
            bankIfsc: tenantData.bankIfsc || null,
            bankName: tenantData.bankName || null,
            bankBranch: tenantData.bankBranch || null,
            socialMediaLinks: tenantData.socialMediaLinks || null,
            digioClientId: tenantData.digioClientId || null,
            digioClientSecret: tenantData.digioClientSecret || null,
            digioKycTemplateName: tenantData.digioKycTemplateName || null,
            agreementContent: tenantData.agreementContent || null,
            kraProvider: tenantData.kraProvider || null,
            kraApiKey: tenantData.kraApiKey || null,
            kraApiSecret: tenantData.kraApiSecret || null,
            coSignatureUrl: tenantData.coSignatureUrl || null,
            activePaymentGateway: tenantData.activePaymentGateway || null,
            razorpayKeyId: tenantData.razorpayKeyId || null,
            razorpayKeySecret: tenantData.razorpayKeySecret || null,
            cashfreeAppId: tenantData.cashfreeAppId || null,
            cashfreeSecretKey: tenantData.cashfreeSecretKey || null,
            ccavenueMerchantId: tenantData.ccavenueMerchantId || null,
            ccavenueAccessCode: tenantData.ccavenueAccessCode || null,
            ccavenueWorkingKey: tenantData.ccavenueWorkingKey || null,
            stripePublishableKey: tenantData.stripePublishableKey || null,
            stripeSecretKey: tenantData.stripeSecretKey || null,
            kycFirst: tenantData.kycFirst ?? false,
            welcomeEmailText: tenantData.welcomeEmailText || null,
            termsPdfUrl: tenantData.termsPdfUrl || null,
            privacyPdfUrl: tenantData.privacyPdfUrl || null,
            reportDisclaimer: tenantData.reportDisclaimer || null,
            logoUrl: tenantData.logoUrl || null,
            faviconUrl: tenantData.faviconUrl || null,
            internalPolicyUrl: tenantData.internalPolicyUrl || null,
            updatedAt: new Date()
        };
        let targetTenant = await db.collection('Tenant').findOne({
            $or: [
                ...(tenantData.id ? [{ _id: new mongodb_1.ObjectId(tenantData.id) }, { id: tenantData.id }] : []),
                { sebiRegistration: tenantData.sebiRegistration },
                { email: tenantData.email }
            ]
        });
        if (targetTenant) {
            await db.collection('Tenant').updateOne({ _id: targetTenant._id }, { $set: tenantDoc });
        }
        else {
            const inserted = await db.collection('Tenant').insertOne({
                ...(tenantData.id ? { _id: new mongodb_1.ObjectId(tenantData.id), id: tenantData.id } : {}),
                ...tenantDoc,
                createdAt: new Date()
            });
            targetTenant = { _id: inserted.insertedId, ...tenantDoc };
        }
        // Admin User
        const adminEmail = (adminUserData.email || tenantData.email).toLowerCase().trim();
        let finalPasswordHash = adminUserData.passwordHash;
        if (!finalPasswordHash && (adminUserData.tempPassword || adminUserData.password)) {
            const salt = await bcrypt.genSalt(10);
            finalPasswordHash = await bcrypt.hash((adminUserData.tempPassword || adminUserData.password).trim(), salt);
        }
        const userDoc = {
            tenantId,
            roleId: adminRoleId,
            firstName: adminUserData.firstName || tenantData.companyName,
            lastName: adminUserData.lastName || 'Admin',
            email: adminEmail,
            mobile: adminUserData.mobile || tenantData.mobile,
            status: tenantData.status === 'SUSPENDED' ? 'SUSPENDED' : (tenantData.status === 'DELETED' ? 'DELETED' : (adminUserData.status || 'ACTIVE')),
            updatedAt: new Date()
        };
        if (finalPasswordHash)
            userDoc.passwordHash = finalPasswordHash;
        if (adminUserData.tempPassword !== undefined)
            userDoc.tempPassword = adminUserData.tempPassword;
        let targetUser = await db.collection('User').findOne({ email: adminEmail });
        if (targetUser) {
            await db.collection('User').updateOne({ _id: targetUser._id }, { $set: userDoc });
        }
        else {
            await db.collection('User').insertOne({
                ...(adminUserData.id ? { _id: new mongodb_1.ObjectId(adminUserData.id), id: adminUserData.id } : {}),
                ...userDoc,
                createdAt: new Date()
            });
        }
        return {
            success: true,
            message: `Dedicated MongoDB database provisioned successfully for ${tenantData.companyName}.`,
            tenantId,
            companyName: tenantData.companyName,
            adminEmail,
            adminUserId: adminUserData.id
        };
    }
    finally {
        await client.close().catch(() => { });
    }
}
/**
 * Connects to a target MongoDB database, ensuring all collections and baseline records
 * are created or updated on the remote dedicated database.
 */
async function provisionTenantDatabase(mongoDbUrl, tenantData, adminUserData, customPermissions) {
    if (!mongoDbUrl || (!mongoDbUrl.startsWith('mongodb://') && !mongoDbUrl.startsWith('mongodb+srv://'))) {
        return {
            success: false,
            message: 'Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://'
        };
    }
    return await syncTenantDedicatedMongoDirect(mongoDbUrl, tenantData, adminUserData, customPermissions);
}
