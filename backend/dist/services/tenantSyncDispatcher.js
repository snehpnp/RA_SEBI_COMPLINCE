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
const mongoose_1 = __importDefault(require("mongoose"));
const tenantConnectionManager_1 = require("./tenantConnectionManager");
/**
 * Dispatches synchronization for a specific tenant to its configured domainUrl API
 * and/or its dedicated MongoDB database.
 */
async function syncTenantToRemote(tenantId, options) {
    if (!tenantId || tenantId === 'undefined' || !mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
        return {
            success: false,
            tenantId: tenantId || 'unknown',
            companyName: 'Unknown',
            message: `Invalid company ID provided: ${tenantId}`
        };
    }
    let tenant = await tenantConnectionManager_1.centralModels.AllCompany.findById(tenantId).lean();
    if (!tenant) {
        tenant = await tenantConnectionManager_1.centralModels.Tenant.findById(tenantId).lean();
    }
    if (!tenant) {
        tenant = await tenantConnectionManager_1.centralModels.AllCompany.findOne({ _id: tenantId }).lean();
    }
    if (!tenant) {
        return {
            success: false,
            tenantId,
            companyName: 'Unknown',
            message: `Company with ID ${tenantId} not found.`
        };
    }
    // Ensure tenantApiKey exists
    let apiKey = tenant.tenantApiKey;
    if (!apiKey) {
        apiKey = 'ragcp_' + crypto.randomBytes(16).toString('hex');
        await tenantConnectionManager_1.centralModels.AllCompany.findByIdAndUpdate(tenant._id || tenant.id, { tenantApiKey: apiKey }).catch(() => { });
        await tenantConnectionManager_1.centralModels.Tenant.findByIdAndUpdate(tenant._id || tenant.id, { tenantApiKey: apiKey }).catch(() => { });
        tenant.tenantApiKey = apiKey;
    }
    const [adminUser, adminPermissions, emailTemplates, customPages, plans, planCategories, complianceRequirements, complianceAudits, systemSettings, rawResources] = await Promise.all([
        tenantConnectionManager_1.centralModels.User.findOne({
            $or: [
                { tenantId },
                { tenantId: tenant._id },
                { email: tenant.email }
            ]
        }).populate('role').lean(),
        tenantConnectionManager_1.centralModels.AdminPermission.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.EmailTemplate.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.CustomPage.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.Plan.find({ $or: [{ tenantId }, { tenantId: tenant._id }], deletedAt: null }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.PlanCategory.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.ComplianceRequirement.find({}).sort({ serialNo: 1 }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.ComplianceAudit.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.SystemSetting.find({}).lean().catch(() => []),
        tenantConnectionManager_1.centralModels.Resource.find({}).lean().catch(() => [])
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
                    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout per candidate endpoint
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
        }
        return domainSyncResult;
    };
    const domainSyncResult = await syncPromise();
    const hasDomain = Boolean(targetDomainRaw);
    const overallSuccess = hasDomain ? Boolean(domainSyncResult?.success) : true;
    let finalMessage = 'Tenant updated in master database successfully.';
    if (domainSyncResult) {
        finalMessage = domainSyncResult.message;
    }
    return {
        success: overallSuccess,
        tenantId: tenant._id ? tenant._id.toString() : tenant.id,
        companyName: tenant.companyName,
        domainUrl: tenant.domainUrl || tenant.website,
        domainSyncResult,
        message: finalMessage
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
