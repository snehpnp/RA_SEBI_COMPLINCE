"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionTenantDatabase = provisionTenantDatabase;
const client_1 = require("@prisma/client");
const stateService_1 = require("./stateService");
/**
 * Connects to a target MongoDB database via Prisma, seeds required collections (Roles, Permissions,
 * RolePermissions, Tenant, Admin User, Mandatory Pages, AdminPermissions) so that a standalone
 * build or multi-tenant instance can run immediately and authenticate the Admin user.
 */
async function provisionTenantDatabase(mongoDbUrl, tenantData, adminUserData) {
    if (!mongoDbUrl || (!mongoDbUrl.startsWith('mongodb://') && !mongoDbUrl.startsWith('mongodb+srv://'))) {
        return {
            success: false,
            message: 'Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://'
        };
    }
    let targetPrisma = null;
    try {
        targetPrisma = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: mongoDbUrl
                }
            }
        });
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
            const createdRole = await targetPrisma.role.upsert({
                where: { name: role.name },
                update: {},
                create: role
            });
            roleMap[role.name] = createdRole.id;
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
            const createdPerm = await targetPrisma.permission.upsert({
                where: { code: perm.code },
                update: {},
                create: perm
            });
            permMap[perm.code] = createdPerm.id;
        }
        // 3. Bind RolePermissions (ADMIN & SUPER_ADMIN get all permissions)
        const fullAdminRoles = ['SUPER_ADMIN', 'ADMIN'];
        for (const roleName of fullAdminRoles) {
            const rId = roleMap[roleName];
            if (!rId)
                continue;
            for (const permCode of Object.keys(permMap)) {
                const pId = permMap[permCode];
                await targetPrisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: rId, permissionId: pId } },
                    update: {},
                    create: { roleId: rId, permissionId: pId }
                });
            }
        }
        // Bind specific permissions to PRINCIPAL_OFFICER
        const poId = roleMap['PRINCIPAL_OFFICER'];
        if (poId) {
            const poPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_STAFF', 'ACCESS_RESEARCH'];
            for (const permCode of poPerms) {
                const pId = permMap[permCode];
                if (pId) {
                    await targetPrisma.rolePermission.upsert({
                        where: { roleId_permissionId: { roleId: poId, permissionId: pId } },
                        update: {},
                        create: { roleId: poId, permissionId: pId }
                    });
                }
            }
        }
        // Bind specific permissions to COMPLIANCE_OFFICER
        const coId = roleMap['COMPLIANCE_OFFICER'];
        if (coId) {
            const coPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_COMPLIANCE'];
            for (const permCode of coPerms) {
                const pId = permMap[permCode];
                if (pId) {
                    await targetPrisma.rolePermission.upsert({
                        where: { roleId_permissionId: { roleId: coId, permissionId: pId } },
                        update: {},
                        create: { roleId: coId, permissionId: pId }
                    });
                }
            }
        }
        // Bind permissions to RESEARCHER
        const researcherId = roleMap['RESEARCHER'];
        if (researcherId) {
            const researcherPerms = ['CREATE', 'READ', 'UPDATE', 'PUBLISH', 'DOWNLOAD', 'ACCESS_RESEARCH'];
            for (const permCode of researcherPerms) {
                const pId = permMap[permCode];
                if (pId) {
                    await targetPrisma.rolePermission.upsert({
                        where: { roleId_permissionId: { roleId: researcherId, permissionId: pId } },
                        update: {},
                        create: { roleId: researcherId, permissionId: pId }
                    });
                }
            }
        }
        // 4. Upsert Tenant Record in Target DB
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
            ownerName: tenantData.ownerName || `${adminUserData.firstName} ${adminUserData.lastName}`.trim() || 'Admin User',
            certificateUrl: tenantData.certificateUrl || null,
            certificateValidity: (tenantData.certificateValidity && !isNaN(new Date(tenantData.certificateValidity).getTime())) ? new Date(tenantData.certificateValidity) : null,
            nismCertificateUrl: tenantData.nismCertificateUrl || null,
            nismValidity: (tenantData.nismValidity && !isNaN(new Date(tenantData.nismValidity).getTime())) ? new Date(tenantData.nismValidity) : null,
            depositAmount: (tenantData.depositAmount !== undefined && !isNaN(Number(tenantData.depositAmount))) ? Number(tenantData.depositAmount) : 0.0,
            status: tenantData.status || 'ACTIVE',
            panelName: tenantData.panelName || `${tenantData.companyName} Portal`,
            domainUrl: tenantData.domainUrl || null,
            mongoDbUrl: tenantData.mongoDbUrl || null,
            dbName: tenantData.dbName || null,
            tenantApiKey: tenantData.tenantApiKey || null,
            state: tenantData.state || null
        };
        let targetTenant;
        if (tenantData.id) {
            targetTenant = await targetPrisma.tenant.upsert({
                where: { id: tenantData.id },
                update: tenantPayload,
                create: {
                    id: tenantData.id,
                    ...tenantPayload
                }
            });
        }
        else {
            targetTenant = await targetPrisma.tenant.upsert({
                where: { email: tenantData.email },
                update: tenantPayload,
                create: tenantPayload
            });
        }
        const tenantIdInTarget = targetTenant.id;
        // 5. Upsert Admin User in Target DB (User Collection)
        const adminRoleId = roleMap['ADMIN'];
        const adminEmail = adminUserData.email.toLowerCase().trim();
        let targetUser = null;
        if (adminUserData.id) {
            targetUser = await targetPrisma.user.findUnique({ where: { id: adminUserData.id } }).catch(() => null);
        }
        if (!targetUser && adminEmail) {
            targetUser = await targetPrisma.user.findUnique({ where: { email: adminEmail } }).catch(() => null);
        }
        if (!targetUser) {
            targetUser = await targetPrisma.user.findFirst({
                where: { tenantId: tenantIdInTarget, roleId: adminRoleId }
            }).catch(() => null);
        }
        const effectiveStatus = tenantData.status === 'SUSPENDED'
            ? 'SUSPENDED'
            : (adminUserData.status || 'ACTIVE');
        if (targetUser) {
            const userUpdatePayload = {
                tenantId: tenantIdInTarget,
                roleId: adminRoleId,
                firstName: adminUserData.firstName || tenantData.companyName,
                lastName: adminUserData.lastName || '',
                email: adminEmail,
                mobile: adminUserData.mobile || tenantData.mobile,
                status: effectiveStatus
            };
            if (adminUserData.passwordHash && adminUserData.passwordHash.trim()) {
                userUpdatePayload.passwordHash = adminUserData.passwordHash.trim();
            }
            if (adminUserData.tempPassword !== undefined) {
                userUpdatePayload.tempPassword = adminUserData.tempPassword || null;
            }
            await targetPrisma.user.update({
                where: { id: targetUser.id },
                data: userUpdatePayload
            });
        }
        else {
            await targetPrisma.user.create({
                data: {
                    ...(adminUserData.id ? { id: adminUserData.id } : {}),
                    tenantId: tenantIdInTarget,
                    roleId: adminRoleId,
                    firstName: adminUserData.firstName || tenantData.companyName,
                    lastName: adminUserData.lastName || 'Admin',
                    email: adminEmail,
                    mobile: adminUserData.mobile || tenantData.mobile,
                    passwordHash: adminUserData.passwordHash || '',
                    tempPassword: adminUserData.tempPassword || null,
                    status: effectiveStatus
                }
            });
        }
        if (tenantData.status === 'SUSPENDED') {
            await targetPrisma.user.updateMany({
                where: { tenantId: tenantIdInTarget },
                data: {
                    status: 'SUSPENDED',
                    tokenVersion: { increment: 1 },
                    currentSessionId: null
                }
            });
        }
        // 6. Upsert Mandatory Default Pages
        const defaultPages = [
            { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '', isSystem: true },
            { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '', isSystem: true },
            { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '', isSystem: true },
            { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '', isSystem: true },
            { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '', isSystem: true },
            { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '', isSystem: true }
        ];
        for (const page of defaultPages) {
            await targetPrisma.customPage.upsert({
                where: {
                    tenantId_slug: {
                        tenantId: tenantIdInTarget,
                        slug: page.slug
                    }
                },
                update: {},
                create: {
                    ...page,
                    tenantId: tenantIdInTarget
                }
            });
        }
        // 7. Upsert Default AdminPermissions
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
        for (const moduleName of defaultModules) {
            await targetPrisma.adminPermission.upsert({
                where: {
                    tenantId_module: {
                        tenantId: tenantIdInTarget,
                        module: moduleName
                    }
                },
                update: {},
                create: {
                    tenantId: tenantIdInTarget,
                    module: moduleName,
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                    canDelete: true,
                    canExport: true,
                    isEnabled: true
                }
            });
        }
        // 8. Seed State collection in Target DB
        await (0, stateService_1.ensureStates)(targetPrisma);
        return {
            success: true,
            message: `Tenant database provisioned successfully. Admin user ${adminEmail} is ready for login.`
        };
    }
    catch (error) {
        console.error('Failed to provision tenant database at:', mongoDbUrl, error);
        return {
            success: false,
            message: `Database provisioning failed: ${error.message}`,
            error: error.message
        };
    }
    finally {
        if (targetPrisma) {
            await targetPrisma.$disconnect().catch(() => { });
        }
    }
}
