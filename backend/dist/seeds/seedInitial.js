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
exports.seedInitial = seedInitial;
const bcrypt = __importStar(require("bcryptjs"));
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
async function seedInitial() {
    console.log('Seeding roles & permissions into Central DB...');
    const roles = [
        { name: 'SUPER_ADMIN', description: 'System Owner' },
        { name: 'ADMIN', description: 'RA Company Owner' },
        { name: 'PRINCIPAL_OFFICER', description: 'Company Principal Officer' },
        { name: 'COMPLIANCE_OFFICER', description: 'Company Compliance Officer' },
        { name: 'RESEARCHER', description: 'Company Research Analyst' },
        { name: 'PERSON_ASSOCIATED', description: 'Associated Services (Sales, Marketing, etc.)' },
        { name: 'CLIENT', description: 'End Client Subscribing to Research' },
        { name: 'SALES', description: 'Sales Staff' },
        { name: 'MARKETING', description: 'Marketing Staff' }
    ];
    const roleMap = {};
    for (const role of roles) {
        const doc = await tenantConnectionManager_1.centralModels.Role.findOneAndUpdate({ name: role.name }, { $set: role }, { upsert: true, returnDocument: 'after' });
        roleMap[role.name] = doc._id;
    }
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
        { code: 'ACCESS_ROLES', name: 'Access Roles Management' },
        { code: 'CREATE_PLANS', name: 'Create Plans' },
        { code: 'EDIT_PLANS', name: 'Edit Plans' },
        { code: 'DELETE_PLANS', name: 'Delete Plans' },
        { code: 'VIEW_ALL_PLANS', name: 'View All Plans' },
        { code: 'VIEW_OWN_PLANS', name: 'View Own Created Plans' },
        { code: 'CREATE_CLIENTS', name: 'Create Clients' },
        { code: 'EDIT_CLIENTS', name: 'Edit Clients' },
        { code: 'DELETE_CLIENTS', name: 'Delete Clients' },
        { code: 'VIEW_ALL_CLIENTS', name: 'View All Clients' },
        { code: 'VIEW_OWN_CLIENTS', name: 'View Own Created Clients' },
        { code: 'ACCESS_TICKETS', name: 'Access Tickets Desk' },
        { code: 'VIEW_ALL_TICKETS', name: 'View All Tickets' },
        { code: 'VIEW_OWN_TICKETS', name: 'View Own Client Tickets' },
        { code: 'VIEW_RESEARCH', name: 'View Only Research' },
        { code: 'ADD_RESEARCH', name: 'Add Research' },
        { code: 'OWN_RESEARCH', name: 'Own Research' },
        { code: 'VIEW_SENSITIVE_DATA', name: 'View Sensitive Client Details (Unmask)' },
        { code: 'EXPORT_DATA', name: 'Export Data to CSV' }
    ];
    const permMap = {};
    for (const perm of permissions) {
        const doc = await tenantConnectionManager_1.centralModels.Permission.findOneAndUpdate({ code: perm.code }, { $set: perm }, { upsert: true, returnDocument: 'after' });
        permMap[perm.code] = doc._id;
    }
    // Bind all permissions to SUPER_ADMIN, ADMIN
    const fullAdminRoles = ['SUPER_ADMIN', 'ADMIN'];
    for (const roleName of fullAdminRoles) {
        const rId = roleMap[roleName];
        for (const permCode of Object.keys(permMap)) {
            const pId = permMap[permCode];
            await tenantConnectionManager_1.centralModels.RolePermission.findOneAndUpdate({ roleId: rId, permissionId: pId }, { $setOnInsert: { roleId: rId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
        }
    }
    // Bind specific permissions to PRINCIPAL_OFFICER
    const poId = roleMap['PRINCIPAL_OFFICER'];
    const poPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_STAFF', 'ACCESS_RESEARCH'];
    for (const permCode of poPerms) {
        const pId = permMap[permCode];
        await tenantConnectionManager_1.centralModels.RolePermission.findOneAndUpdate({ roleId: poId, permissionId: pId }, { $setOnInsert: { roleId: poId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
    }
    // Bind specific permissions to COMPLIANCE_OFFICER
    const coId = roleMap['COMPLIANCE_OFFICER'];
    const coPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_COMPLIANCE'];
    for (const permCode of coPerms) {
        const pId = permMap[permCode];
        await tenantConnectionManager_1.centralModels.RolePermission.findOneAndUpdate({ roleId: coId, permissionId: pId }, { $setOnInsert: { roleId: coId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
    }
    // Bind READ and PUBLISH to RESEARCHER
    const researcherId = roleMap['RESEARCHER'];
    const researcherPerms = ['CREATE', 'READ', 'UPDATE', 'PUBLISH', 'DOWNLOAD', 'ACCESS_RESEARCH'];
    for (const permCode of researcherPerms) {
        const pId = permMap[permCode];
        await tenantConnectionManager_1.centralModels.RolePermission.findOneAndUpdate({ roleId: researcherId, permissionId: pId }, { $setOnInsert: { roleId: researcherId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
    }
    // Bind READ to PERSON_ASSOCIATED
    const associateId = roleMap['PERSON_ASSOCIATED'];
    const associatePerms = ['READ', 'CREATE', 'UPDATE'];
    for (const permCode of associatePerms) {
        const pId = permMap[permCode];
        await tenantConnectionManager_1.centralModels.RolePermission.findOneAndUpdate({ roleId: associateId, permissionId: pId }, { $setOnInsert: { roleId: associateId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
    }
    // Bind READ, DOWNLOAD to CLIENT
    const clientId = roleMap['CLIENT'];
    const clientPerms = ['READ', 'DOWNLOAD', 'CREATE'];
    for (const permCode of clientPerms) {
        const pId = permMap[permCode];
        await tenantConnectionManager_1.centralModels.RolePermission.findOneAndUpdate({ roleId: clientId, permissionId: pId }, { $setOnInsert: { roleId: clientId, permissionId: pId } }, { upsert: true, returnDocument: 'after' });
    }
    // Create Super Admin User
    console.log('Seeding default Super Admin...');
    const salt = await bcrypt.genSalt(10);
    const superAdminPasswordHash = await bcrypt.hash('Admin@987', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@12345', salt);
    await tenantConnectionManager_1.centralModels.User.findOneAndUpdate({ email: 'superadmin@gmail.com' }, {
        $setOnInsert: {
            email: 'superadmin@gmail.com',
            firstName: 'Super',
            lastName: 'Admin',
            mobile: '9999999999',
            passwordHash: superAdminPasswordHash,
            roleId: roleMap['SUPER_ADMIN'],
            status: 'ACTIVE'
        }
    }, { upsert: true, returnDocument: 'after' });
    // Create Tenant (RA Company)
    console.log('Seeding default Tenant (RA Company)...');
    const tenant = await tenantConnectionManager_1.centralModels.Tenant.findOneAndUpdate({ email: 'admin@alpharesearch.com' }, {
        $setOnInsert: {
            companyName: 'Alpha Research Partners',
            sebiRegistration: 'INH000001234',
            bseEnrollment: 'BSE998877',
            email: 'admin@alpharesearch.com',
            mobile: '9876543210',
            address: '101, Finance Towers, BKC, Mumbai, Maharashtra 400051',
            pan: 'ABCDE1234F',
            gst: '27ABCDE1234F1Z5',
            website: 'www.alpharesearch.com',
            certificateValidity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            depositAmount: 120000,
            aiUsage: true
        }
    }, { upsert: true, returnDocument: 'after' });
    // Also sync to AllCompany
    await tenantConnectionManager_1.centralModels.AllCompany.findOneAndUpdate({ email: 'admin@alpharesearch.com' }, {
        $set: {
            companyId: tenant._id.toString(),
            companyName: tenant.companyName,
            sebiRegistration: tenant.sebiRegistration,
            bseEnrollment: tenant.bseEnrollment,
            email: tenant.email,
            mobile: tenant.mobile,
            address: tenant.address,
            pan: tenant.pan,
            gst: tenant.gst,
            website: tenant.website,
            status: 'ACTIVE',
            depositAmount: tenant.depositAmount,
            aiUsage: tenant.aiUsage
        }
    }, { upsert: true, returnDocument: 'after' });
    // Create RA Admin User
    await tenantConnectionManager_1.centralModels.User.findOneAndUpdate({ email: 'admin@alpharesearch.com' }, {
        $setOnInsert: {
            tenantId: tenant._id,
            email: 'admin@alpharesearch.com',
            firstName: 'Alpha',
            lastName: 'Admin',
            mobile: '9876543210',
            passwordHash: adminPasswordHash,
            roleId: roleMap['ADMIN'],
            status: 'ACTIVE'
        }
    }, { upsert: true, returnDocument: 'after' });
    // Create Support Staff User (Compliance Officer)
    console.log('Seeding compliance & researcher staff...');
    const complianceUser = await tenantConnectionManager_1.centralModels.User.findOneAndUpdate({ email: 'compliance@alpharesearch.com' }, {
        $setOnInsert: {
            tenantId: tenant._id,
            email: 'compliance@alpharesearch.com',
            firstName: 'Rahul',
            lastName: 'Sharma',
            mobile: '9811122233',
            passwordHash: adminPasswordHash,
            roleId: roleMap['COMPLIANCE_OFFICER'],
            status: 'ACTIVE'
        }
    }, { upsert: true, returnDocument: 'after' });
    await tenantConnectionManager_1.centralModels.Staff.findOneAndUpdate({ userId: complianceUser._id }, {
        $setOnInsert: {
            userId: complianceUser._id,
            employeeId: 'EMP001',
            name: 'Rahul Sharma',
            email: 'compliance@alpharesearch.com',
            mobile: '9811122233',
            nismNumber: 'NISM-2024-8899',
            nismValidity: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE'
        }
    }, { upsert: true, returnDocument: 'after' });
    const researcherUser = await tenantConnectionManager_1.centralModels.User.findOneAndUpdate({ email: 'researcher@alpharesearch.com' }, {
        $setOnInsert: {
            tenantId: tenant._id,
            email: 'researcher@alpharesearch.com',
            firstName: 'Amit',
            lastName: 'Verma',
            mobile: '9822233344',
            passwordHash: adminPasswordHash,
            roleId: roleMap['RESEARCHER'],
            status: 'ACTIVE'
        }
    }, { upsert: true, returnDocument: 'after' });
    await tenantConnectionManager_1.centralModels.Staff.findOneAndUpdate({ userId: researcherUser._id }, {
        $setOnInsert: {
            userId: researcherUser._id,
            employeeId: 'EMP002',
            name: 'Amit Verma',
            email: 'researcher@alpharesearch.com',
            mobile: '9822233344',
            nismNumber: 'NISM-2024-5544',
            nismValidity: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE'
        }
    }, { upsert: true, returnDocument: 'after' });
    // Seed plans for Alpha Research Partners
    console.log('Seeding plans...');
    const plans = [
        {
            tenantId: tenant._id,
            name: 'BASIC',
            description: 'Equity research segments only.',
            price: 1500,
            durationMonths: 1,
            researchSegments: 'EQUITY',
            notificationsAllowed: 'EMAIL,INAPP',
            clientLimit: 100
        },
        {
            tenantId: tenant._id,
            name: 'PREMIUM',
            description: 'Equity & Derivative calls plus model portfolios.',
            price: 4500,
            durationMonths: 3,
            researchSegments: 'EQUITY,DERIVATIVE',
            notificationsAllowed: 'EMAIL,INAPP,PUSH',
            clientLimit: 500
        },
        {
            tenantId: tenant._id,
            name: 'VIP',
            description: 'Full segment access, high frequency calls, direct alerts.',
            price: 15000,
            durationMonths: 12,
            researchSegments: 'EQUITY,DERIVATIVE,COMMODITY,CURRENCY,IPO,ETF',
            notificationsAllowed: 'EMAIL,INAPP,PUSH',
            clientLimit: 1000
        }
    ];
    for (const plan of plans) {
        await tenantConnectionManager_1.centralModels.Plan.findOneAndUpdate({ tenantId: plan.tenantId, name: plan.name }, { $setOnInsert: plan }, { upsert: true, returnDocument: 'after' });
    }
    console.log('Initial Seeding Completed Successfully.');
}
if (require.main === module) {
    seedInitial()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
