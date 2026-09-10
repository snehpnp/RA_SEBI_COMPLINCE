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
exports.syncTenantToRemote = syncTenantToRemote;
exports.syncAllTenantsToRemote = syncAllTenantsToRemote;
const db_1 = require("../config/db");
const crypto = __importStar(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const tenantProvisionService_1 = require("./tenantProvisionService");
/**
 * Dispatches synchronization for a specific tenant to its configured domainUrl API
 * and/or its dedicated MongoDB database.
 */
async function syncTenantToRemote(tenantId, options) {
    const tenant = await db_1.Tenant.findById(tenantId).lean();
    if (!tenant) {
        return {
            success: false,
            tenantId,
            companyName: 'Unknown',
            message: `Tenant with ID ${tenantId} not found.`
        };
    }
    // Ensure tenantApiKey exists
    let apiKey = tenant.tenantApiKey;
    if (!apiKey) {
        apiKey = 'ragcp_' + crypto.randomBytes(16).toString('hex');
        await db_1.Tenant.findByIdAndUpdate(tenant._id || tenant.id, { tenantApiKey: apiKey });
        tenant.tenantApiKey = apiKey;
    }
    const [adminUser, adminPermissions, emailTemplates, customPages, plans, planCategories, complianceRequirements, complianceAudits, systemSettings, rawResources] = await Promise.all([
        db_1.User.findOne({
            tenantId,
            $or: [
                { role: 'ADMIN' },
                { roleId: { $ne: null } }
            ]
        }).populate('role').lean(),
        db_1.AdminPermission.find({ tenantId }).lean().catch(() => []),
        db_1.EmailTemplate.find({ tenantId }).lean().catch(() => []),
        db_1.CustomPage.find({ tenantId }).lean().catch(() => []),
        db_1.Plan.find({ tenantId, deletedAt: null }).lean().catch(() => []),
        db_1.PlanCategory.find({ tenantId }).lean().catch(() => []),
        db_1.ComplianceRequirement.find({}).sort({ serialNo: 1 }).lean().catch(() => []),
        db_1.ComplianceAudit.find({ tenantId }).lean().catch(() => []),
        db_1.SystemSetting.find({}).lean().catch(() => []),
        db_1.Resource.find({}).lean().catch(() => [])
    ]);
    const effectiveStatus = tenant.status === 'SUSPENDED'
        ? 'SUSPENDED'
        : (tenant.status === 'DELETED' ? 'DELETED' : (adminUser?.status || 'ACTIVE'));
    const adminPayload = {
        id: adminUser?._id?.toString() || adminUser?.id,
        email: adminUser?.email || tenant.email,
        firstName: adminUser?.firstName || tenant.companyName,
        lastName: adminUser?.lastName || 'Admin',
        mobile: adminUser?.mobile || tenant.mobile,
        passwordHash: adminUser?.passwordHash || '',
        tempPassword: adminUser?.tempPassword || options?.adminPassword || null,
        status: effectiveStatus
    };
    // Read physical files for resources to sync binary content
    const uploadRoot = path_1.default.join(__dirname, '../../../uploads');
    const resources = rawResources.map((r) => {
        let fileBase64 = null;
        try {
            const fileName = path_1.default.basename(r.fileUrl);
            const candidates = [
                path_1.default.resolve(uploadRoot, 'resources', fileName),
                path_1.default.resolve(process.cwd(), '../uploads/resources', fileName),
                path_1.default.resolve(process.cwd(), 'uploads/resources', fileName),
                path_1.default.resolve('a:/RA_SEBI_COMPLINCE/uploads/resources', fileName),
                path_1.default.join(__dirname, '../../..', r.fileUrl.replace(/^[/\\]+/, ''))
            ];
            for (const cand of candidates) {
                if (fs_1.default.existsSync(cand) && fs_1.default.statSync(cand).isFile()) {
                    fileBase64 = fs_1.default.readFileSync(cand).toString('base64');
                    break;
                }
            }
        }
        catch (fErr) {
            console.warn('[SYNC] Note reading resource file for payload:', fErr);
        }
        return {
            id: r._id ? r._id.toString() : r.id,
            title: r.title,
            category: r.category,
            fileUrl: r.fileUrl,
            fileName: r.fileName,
            uploadedAt: r.uploadedAt,
            fileBase64
        };
    });
    const tenantPayload = {
        ...tenant,
        id: tenant._id ? tenant._id.toString() : tenant.id,
        tenantApiKey: apiKey,
        customPages: customPages || [],
        emailTemplates: emailTemplates || [],
        plans,
        planCategories,
        complianceRequirements,
        complianceAudits,
        systemSettings,
        resources
    };
    const syncPayload = {
        apiKey,
        action: options?.reason || 'UPDATE',
        tenant: tenantPayload,
        adminUser: adminPayload,
        permissions: adminPermissions || [],
        emailTemplates: emailTemplates || [],
        customPages: customPages || [],
        plans,
        planCategories,
        complianceRequirements,
        complianceAudits,
        systemSettings,
        resources,
        syncedAt: new Date().toISOString()
    };
    const targetDomainRaw = (options?.targetUrl || tenant.domainUrl || tenant.website || '').trim();
    const syncPromise = async () => {
        let domainSyncResult = null;
        if (targetDomainRaw) {
            let rawDomain = targetDomainRaw;
            if (!rawDomain.startsWith('http://') && !rawDomain.startsWith('https://')) {
                rawDomain = 'https://' + rawDomain;
            }
            rawDomain = rawDomain.replace(/\/+$/, '');
            const candidateEndpoints = [
                `${rawDomain}/api/v1/sync/update`,
                `${rawDomain}/api/v1/sync/bootstrap`,
                `${rawDomain}/api/v1/sync/tenant`,
                `${rawDomain}/sync/update`,
                `${rawDomain}/api/sync`
            ];
            let successData = null;
            let endpointSuccess = '';
            let lastErr = null;
            for (const endpoint of candidateEndpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-tenant-api-key': apiKey
                        },
                        body: JSON.stringify(syncPayload),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        successData = await response.json().catch(() => ({ success: true, message: 'Synced successfully' }));
                        endpointSuccess = endpoint;
                        break;
                    }
                    else {
                        const respBody = await response.json().catch(() => null);
                        lastErr = { status: response.status, message: respBody?.message || `HTTP ${response.status}` };
                    }
                }
                catch (err) {
                    lastErr = { status: 500, message: err.message };
                }
            }
            if (successData) {
                domainSyncResult = {
                    success: true,
                    endpointUsed: endpointSuccess,
                    message: successData.message || `Successfully synced to ${rawDomain} via API!`
                };
            }
            else {
                domainSyncResult = {
                    success: false,
                    message: `Remote server at ${rawDomain} could not be reached or returned error: ${lastErr?.message || 'Offline'}`,
                    error: lastErr
                };
            }
        }
        return domainSyncResult;
    };
    const dbPromise = async () => {
        let dbSyncResult = null;
        if (tenant.mongoDbUrl && tenant.mongoDbUrl.trim()) {
            try {
                const result = await (0, tenantProvisionService_1.provisionTenantDatabase)(tenant.mongoDbUrl.trim(), tenantPayload, adminPayload, adminPermissions);
                dbSyncResult = result;
            }
            catch (dbErr) {
                dbSyncResult = {
                    success: false,
                    message: `Dedicated MongoDB sync failed: ${dbErr.message}`,
                    error: dbErr.message
                };
            }
        }
        return dbSyncResult;
    };
    const [domainSyncResult, dbSyncResult] = await Promise.all([syncPromise(), dbPromise()]);
    const hasDb = Boolean(tenant.mongoDbUrl && tenant.mongoDbUrl.trim());
    const hasDomain = Boolean(targetDomainRaw);
    const overallSuccess = (hasDb && dbSyncResult?.success) ||
        (hasDomain && domainSyncResult?.success) ||
        (!hasDb && !hasDomain);
    const messages = [];
    if (dbSyncResult) {
        messages.push(dbSyncResult.message);
    }
    if (domainSyncResult) {
        messages.push(domainSyncResult.message);
    }
    if (messages.length === 0) {
        messages.push('Tenant updated in master database successfully.');
    }
    return {
        success: overallSuccess,
        tenantId: tenant._id ? tenant._id.toString() : tenant.id,
        companyName: tenant.companyName,
        domainUrl: tenant.domainUrl || tenant.website,
        domainSyncResult,
        dbSyncResult,
        message: messages.join(' | ')
    };
}
/**
 * Broadcasts updates to all active tenants (e.g. when Compliance Rules,
 * Global Branding, or system-wide settings are updated by Super Admin).
 */
async function syncAllTenantsToRemote(options) {
    const tenants = await db_1.Tenant.find({
        status: { $ne: 'DELETED' }
    }).select('id companyName domainUrl website mongoDbUrl').lean();
    const promises = tenants.map(t => syncTenantToRemote(t._id ? t._id.toString() : t.id, { reason: options?.reason || 'GLOBAL_UPDATE' }));
    const results = await Promise.allSettled(promises);
    const successResults = [];
    let failedCount = 0;
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            successResults.push(res.value);
            if (!res.value.success) {
                failedCount++;
            }
        }
        else {
            failedCount++;
        }
    });
    return {
        total: tenants.length,
        successCount: tenants.length - failedCount,
        failedCount,
        results: successResults
    };
}
