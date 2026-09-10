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
exports.tenantProvisionEngine = exports.TenantProvisionEngine = void 0;
const mongodb_1 = require("mongodb");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const tenantConnectionManager_1 = require("./tenantConnectionManager");
const tenantProvisionService_1 = require("./tenantProvisionService");
class TenantProvisionEngine {
    ALL_COLLECTIONS = [
        'Tenant',
        'User',
        'Role',
        'Permission',
        'RolePermission',
        'AdminPermission',
        'Staff',
        'PersonAssociated',
        'Client',
        'ClientProfile',
        'ClientDocument',
        'Agreement',
        'AgreementHistory',
        'Consent',
        'ConsentHistory',
        'Subscription',
        'ClientIdentityHistory',
        'PlanCategory',
        'Plan',
        'Coupon',
        'Payment',
        'Signal',
        'SignalMessage',
        'ResearchReport',
        'ResearchAnalytics',
        'Stock',
        'ComplianceRequirement',
        'ComplianceAudit',
        'ComplianceAuditHistory',
        'ComplianceAlert',
        'Penalty',
        'Complaint',
        'ComplaintMonthlyReport',
        'CustomPage',
        'EmailTemplate',
        'EmailVerification',
        'SystemSetting',
        'State',
        'SupportTicket',
        'TicketMessage',
        'AuditLog',
        'NotificationLog',
        'TenantDocumentHistory',
        'Resource'
    ];
    /**
     * Pre-creates all collections in the dedicated MongoDB database using native driver
     */
    async precreateAllCollections(mongoDbUrl, dbName) {
        const client = new mongodb_1.MongoClient(mongoDbUrl, { serverSelectionTimeoutMS: 5000 });
        try {
            await client.connect();
            const db = dbName ? client.db(dbName) : client.db();
            const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);
            for (const colName of this.ALL_COLLECTIONS) {
                if (!existingCollections.includes(colName)) {
                    await db.createCollection(colName).catch(() => { });
                }
            }
        }
        finally {
            await client.close().catch(() => { });
        }
    }
    /**
     * Provisions a company:
     * 1. Registers the company in Central DB's `all_companies` collection.
     * 2. In Company DB (DB B):
     *    - Creates `Tenant` collection with Company B's single profile.
     *    - Creates `User` collection with Company B's Admin user.
     *    - Initializes all other collections in Company B's database.
     */
    async provisionTenantFull(tenantPayload, adminPayload, createdById) {
        const companyName = tenantPayload.companyName.trim();
        const adminEmail = adminPayload.email.toLowerCase().trim();
        const rawPassword = adminPayload.tempPassword || adminPayload.password || 'Admin@' + Math.floor(1000 + Math.random() * 9000);
        const apiKey = tenantPayload.tenantApiKey || 'ragcp_' + crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = adminPayload.passwordHash || (await bcrypt.hash(rawPassword, salt));
        // Step 1: Generate unique tenantId, database name and connection URI
        const tenantId = tenantPayload.id || new mongodb_1.ObjectId().toHexString();
        const dbName = tenantPayload.dbName || tenantConnectionManager_1.tenantConnectionManager.sanitizeTenantDbName(companyName, tenantId);
        const mongoDbUrl = tenantPayload.mongoDbUrl || tenantConnectionManager_1.tenantConnectionManager.buildTenantMongoUri(dbName);
        const ownerName = tenantPayload.ownerName || `${adminPayload.firstName || ''} ${adminPayload.lastName || ''}`.trim() || 'Admin User';
        const certValidity = tenantPayload.certificateValidity && !isNaN(new Date(tenantPayload.certificateValidity).getTime())
            ? new Date(tenantPayload.certificateValidity)
            : null;
        const nismVal = tenantPayload.nismValidity && !isNaN(new Date(tenantPayload.nismValidity).getTime())
            ? new Date(tenantPayload.nismValidity)
            : null;
        const depAmt = tenantPayload.depositAmount && !isNaN(parseFloat(String(tenantPayload.depositAmount)))
            ? parseFloat(String(tenantPayload.depositAmount))
            : 0.0;
        try {
            // Step 2: Register in Central DB `all_companies` collection
            await tenantConnectionManager_1.centralModels.AllCompany.findOneAndUpdate({ email: tenantPayload.email }, {
                companyName,
                companyType: tenantPayload.companyType || 'INDIVIDUAL',
                raType: tenantPayload.raType || 'FULL_TIME',
                sebiRegistration: tenantPayload.sebiRegistration,
                bseEnrollment: tenantPayload.bseEnrollment || null,
                email: tenantPayload.email,
                mobile: tenantPayload.mobile,
                address: tenantPayload.address || null,
                pan: tenantPayload.pan || null,
                gst: tenantPayload.gst || null,
                website: tenantPayload.website || null,
                ownerName,
                certificateUrl: tenantPayload.certificateUrl || null,
                certificateValidity: certValidity,
                nismCertificateUrl: tenantPayload.nismCertificateUrl || null,
                nismValidity: nismVal,
                status: tenantPayload.status || 'ACTIVE',
                depositAmount: depAmt,
                state: tenantPayload.state || null,
                panelName: tenantPayload.panelName || `${companyName} Portal`,
                domainUrl: tenantPayload.domainUrl || null,
                mongoDbUrl,
                dbName,
                tenantApiKey: apiKey,
                createdById: createdById || null
            }, { upsert: true, returnDocument: 'after' });
            // Step 3: Provision in Company Database
            const fullTenantData = {
                ...tenantPayload,
                id: tenantId,
                ownerName,
                dbName,
                mongoDbUrl,
                tenantApiKey: apiKey
            };
            const fullAdminData = {
                ...adminPayload,
                email: adminEmail,
                passwordHash,
                tempPassword: rawPassword,
                status: 'ACTIVE'
            };
            // Provision tenant and admin in central database
            const result = await (0, tenantProvisionService_1.provisionAllTenantCollections)(tenantConnectionManager_1.centralModels, fullTenantData, fullAdminData);
            const createdAdmin = result.adminUser;
            return {
                success: true,
                message: `Company '${companyName}' successfully created. Profile registered and Admin account initialized.`,
                tenantId,
                companyName,
                domainUrl: tenantPayload.domainUrl || null,
                dbName,
                mongoDbUrl,
                adminEmail,
                adminUserId: createdAdmin?._id?.toString() || createdAdmin?.id,
                tempPassword: rawPassword
            };
        }
        catch (error) {
            console.error(`Automated Tenant Provisioning failed for ${companyName}:`, error);
            // Rollback Central DB all_companies record if provisioning fails
            await tenantConnectionManager_1.centralModels.AllCompany.deleteMany({ email: tenantPayload.email }).catch(() => { });
            return {
                success: false,
                message: `Failed to provision company database: ${error.message}`,
                tenantId,
                companyName,
                dbName,
                mongoDbUrl,
                adminEmail,
                errors: [error.message]
            };
        }
    }
    /**
     * Drops a tenant's dedicated database during hard deletion
     */
    async dropTenantDatabase(mongoDbUrl) {
        const client = new mongodb_1.MongoClient(mongoDbUrl, { serverSelectionTimeoutMS: 5000 });
        try {
            await client.connect();
            await client.db().dropDatabase();
        }
        catch (err) {
            console.warn('Failed to drop tenant database:', mongoDbUrl, err.message);
        }
        finally {
            await client.close().catch(() => { });
        }
    }
}
exports.TenantProvisionEngine = TenantProvisionEngine;
exports.tenantProvisionEngine = new TenantProvisionEngine();
exports.default = exports.tenantProvisionEngine;
