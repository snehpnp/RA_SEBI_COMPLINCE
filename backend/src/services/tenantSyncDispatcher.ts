import {
  Tenant,
  User,
  Plan,
  PlanCategory,
  ComplianceRequirement,
  ComplianceAudit,
  SystemSetting,
  Resource,
  AdminPermission,
  EmailTemplate,
  CustomPage
} from '../config/db';
import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { centralModels } from './tenantConnectionManager';
import { provisionTenantDatabase } from './tenantProvisionService';

export interface SyncOptions {
  targetUrl?: string;
  reason?: string;
  adminPassword?: string;
}

export interface SyncDispatchResult {
  success: boolean;
  tenantId: string;
  companyName: string;
  domainUrl?: string | null;
  isRemoteUnreachable?: boolean;
  domainSyncResult?: {
    success: boolean;
    endpointUsed?: string;
    message: string;
    error?: any;
  } | null;
  dbSyncResult?: {
    success: boolean;
    message: string;
    error?: any;
  } | null;
  message: string;
}

/**
 * Dispatches synchronization for a specific tenant to its configured domainUrl API
 * and/or its dedicated MongoDB database.
 */
export async function syncTenantToRemote(
  tenantId: string,
  options?: SyncOptions
): Promise<SyncDispatchResult> {
  if (!tenantId || tenantId === 'undefined' || !mongoose.Types.ObjectId.isValid(tenantId)) {
    return {
      success: false,
      tenantId: tenantId || 'unknown',
      companyName: 'Unknown',
      message: `Invalid company ID provided: ${tenantId}`
    };
  }

  let tenant: any = await centralModels.AllCompany.findById(tenantId).lean();
  if (!tenant) {
    tenant = await centralModels.Tenant.findById(tenantId).lean();
  }
  if (!tenant) {
    tenant = await centralModels.AllCompany.findOne({ _id: tenantId }).lean();
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
    await centralModels.AllCompany.findByIdAndUpdate(tenant._id || tenant.id, { tenantApiKey: apiKey }).catch(() => {});
    await centralModels.Tenant.findByIdAndUpdate(tenant._id || tenant.id, { tenantApiKey: apiKey }).catch(() => {});
    tenant.tenantApiKey = apiKey;
  }

  const [adminUser, adminPermissions, emailTemplates, customPages, plans, planCategories, complianceRequirements, complianceAudits, systemSettings, rawResources] = await Promise.all([
    centralModels.User.findOne({
      $or: [
        { tenantId },
        { tenantId: tenant._id },
        { email: tenant.email }
      ]
    }).populate('role').lean(),
    centralModels.AdminPermission.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
    centralModels.EmailTemplate.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
    centralModels.CustomPage.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
    centralModels.Plan.find({ $or: [{ tenantId }, { tenantId: tenant._id }], deletedAt: null }).lean().catch(() => []),
    centralModels.PlanCategory.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
    centralModels.ComplianceRequirement.find({}).sort({ serialNo: 1 }).lean().catch(() => []),
    centralModels.ComplianceAudit.find({ $or: [{ tenantId }, { tenantId: tenant._id }] }).lean().catch(() => []),
    centralModels.SystemSetting.find({}).lean().catch(() => []),
    centralModels.Resource.find({}).lean().catch(() => [])
  ]);

  const effectiveStatus = tenant.status === 'SUSPENDED'
    ? 'SUSPENDED'
    : (tenant.status === 'DELETED' ? 'DELETED' : (adminUser?.status || 'ACTIVE'));

  const adminPayload = {
    id: (adminUser as any)?._id?.toString() || (adminUser as any)?.id,
    email: adminUser?.email || tenant.email,
    firstName: adminUser?.firstName || tenant.companyName,
    lastName: adminUser?.lastName || 'Admin',
    mobile: adminUser?.mobile || tenant.mobile,
    passwordHash: adminUser?.passwordHash || '',
    tempPassword: adminUser?.tempPassword || options?.adminPassword || null,
    status: effectiveStatus
  };

  // Read physical files for resources to sync binary content
  const uploadRoot = path.join(__dirname, '../../../uploads');
  const resources = rawResources.map((r: any) => {
    let fileBase64: string | null = null;
    try {
      const fileName = path.basename(r.fileUrl);
      const candidates = [
        path.resolve(uploadRoot, 'resources', fileName),
        path.resolve(process.cwd(), '../uploads/resources', fileName),
        path.resolve(process.cwd(), 'uploads/resources', fileName),
        path.resolve('a:/RA_SEBI_COMPLINCE/uploads/resources', fileName),
        path.join(__dirname, '../../..', r.fileUrl.replace(/^[/\\]+/, ''))
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          fileBase64 = fs.readFileSync(cand).toString('base64');
          break;
        }
      }
    } catch (fErr) {
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
    let domainSyncResult: any = null;

    if (targetDomainRaw) {
      let rawDomain = targetDomainRaw;
      if (!rawDomain.startsWith('http://') && !rawDomain.startsWith('https://')) {
        rawDomain = 'https://' + rawDomain;
      }
      rawDomain = rawDomain.replace(/\/+$/, '');

      const reason = options?.reason || 'UPDATE';
      let candidateEndpoints: string[] = [];

      if (reason === 'BOOTSTRAP') {
        candidateEndpoints = [
          `${rawDomain}/backend/api/v1/sync/bootstrap`,
          `${rawDomain}/backend/api/v1/sync/tenant`,
          `${rawDomain}/backend/api/v1/sync/update`,
          `${rawDomain}/api/v1/sync/bootstrap`,
          `${rawDomain}/api/v1/sync/tenant`,
          `${rawDomain}/api/v1/sync/update`,
          `${rawDomain}/sync/bootstrap`
        ];
      } else if (reason === 'STATUS_CHANGE') {
        candidateEndpoints = [
          `${rawDomain}/backend/api/v1/sync/status`,
          `${rawDomain}/backend/api/v1/sync/update`,
          `${rawDomain}/api/v1/sync/status`,
          `${rawDomain}/api/v1/sync/update`,
          `${rawDomain}/sync/status`
        ];
      } else if (reason === 'DELETE') {
        candidateEndpoints = [
          `${rawDomain}/backend/api/v1/sync/delete`,
          `${rawDomain}/backend/api/v1/sync/update`,
          `${rawDomain}/api/v1/sync/delete`,
          `${rawDomain}/api/v1/sync/update`,
          `${rawDomain}/sync/delete`
        ];
      } else {
        candidateEndpoints = [
          `${rawDomain}/backend/api/v1/sync/update`,
          `${rawDomain}/backend/api/v1/sync/tenant`,
          `${rawDomain}/backend/api/v1/sync/bootstrap`,
          `${rawDomain}/api/v1/sync/update`,
          `${rawDomain}/api/v1/sync/tenant`,
          `${rawDomain}/api/v1/sync/bootstrap`,
          `${rawDomain}/sync/update`
        ];
      }

      let successData: any = null;
      let endpointSuccess = '';
      let lastErr: any = null;

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
          } else {
            const respBody: any = await response.json().catch(() => null);
            lastErr = { status: response.status, message: respBody?.message || `HTTP ${response.status}` };
          }
        } catch (err: any) {
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
  const isDomainSynced = Boolean(domainSyncResult?.success);

  let finalMessage = 'Tenant updated in master database successfully.';
  if (domainSyncResult?.success) {
    finalMessage = domainSyncResult.message;
  } else if (hasDomain && !isDomainSynced) {
    finalMessage = `Tenant updated in master database successfully. Remote domain (${targetDomainRaw}) is offline or unreachable.`;
  }

  return {
    success: true,
    isRemoteUnreachable: hasDomain && !isDomainSynced,
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
export async function syncAllTenantsToRemote(
  options?: { reason?: string }
): Promise<{ total: number; successCount: number; failedCount: number; results: SyncDispatchResult[] }> {
  const tenants: any[] = await Tenant.find({
    status: { $ne: 'DELETED' }
  }).select('id companyName domainUrl website mongoDbUrl').lean();

  const promises = tenants.map(t => syncTenantToRemote(t._id ? t._id.toString() : t.id, { reason: options?.reason || 'GLOBAL_UPDATE' }));
  const results = await Promise.allSettled(promises);

  const successResults: SyncDispatchResult[] = [];
  let failedCount = 0;

  results.forEach(res => {
    if (res.status === 'fulfilled') {
      successResults.push(res.value);
      if (!res.value.success) {
        failedCount++;
      }
    } else {
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
