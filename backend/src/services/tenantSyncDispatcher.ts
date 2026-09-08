import prisma from '../config/db';
import * as crypto from 'crypto';
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
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: {
          OR: [
            { role: { name: 'ADMIN' } },
            { role: { name: 'SUPER_ADMIN' } }
          ]
        }
      },
      adminPermissions: true,
      emailTemplates: true,
      customPages: true
    }
  });

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
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { tenantApiKey: apiKey }
    });
    tenant.tenantApiKey = apiKey;
  }

  let adminUser = tenant.users && tenant.users.length > 0 ? tenant.users[0] : null;
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: { tenantId }
    });
  }

  const effectiveStatus = tenant.status === 'SUSPENDED'
    ? 'SUSPENDED'
    : (tenant.status === 'DELETED' ? 'DELETED' : (adminUser?.status || 'ACTIVE'));

  const adminPayload = {
    id: adminUser?.id,
    email: adminUser?.email || tenant.email,
    firstName: adminUser?.firstName || tenant.companyName,
    lastName: adminUser?.lastName || 'Admin',
    mobile: adminUser?.mobile || tenant.mobile,
    passwordHash: adminUser?.passwordHash || '',
    tempPassword: adminUser?.tempPassword || options?.adminPassword || null,
    status: effectiveStatus
  };

  // Fetch all related collections for dynamic sync
  const [plans, planCategories, complianceRequirements, complianceAudits, systemSettings] = await Promise.all([
    prisma.plan.findMany({ where: { tenantId, deletedAt: null } }).catch(() => []),
    prisma.planCategory.findMany({ where: { tenantId } }).catch(() => []),
    prisma.complianceRequirement.findMany({ orderBy: { serialNo: 'asc' } }).catch(() => []),
    prisma.complianceAudit.findMany({ where: { tenantId } }).catch(() => []),
    prisma.systemSetting.findMany().catch(() => [])
  ]);

  const tenantPayload = {
    ...tenant,
    tenantApiKey: apiKey,
    customPages: tenant.customPages || [],
    emailTemplates: tenant.emailTemplates || [],
    plans,
    planCategories,
    complianceRequirements,
    complianceAudits,
    systemSettings
  };

  const syncPayload = {
    apiKey,
    action: options?.reason || 'UPDATE',
    tenant: tenantPayload,
    adminUser: adminPayload,
    permissions: tenant.adminPermissions || [],
    emailTemplates: tenant.emailTemplates || [],
    customPages: tenant.customPages || [],
    plans,
    planCategories,
    complianceRequirements,
    complianceAudits,
    systemSettings,
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

      const candidateEndpoints = [
        `${rawDomain}/api/v1/sync/update`,
        `${rawDomain}/api/v1/sync/bootstrap`,
        `${rawDomain}/api/v1/sync/tenant`,
        `${rawDomain}/sync/update`,
        `${rawDomain}/api/sync`
      ];

      let successData: any = null;
      let endpointSuccess = '';
      let lastErr: any = null;

      for (const endpoint of candidateEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);

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
      } else {
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
    let dbSyncResult: any = null;
    if (tenant.mongoDbUrl && tenant.mongoDbUrl.trim()) {
      try {
        const result = await provisionTenantDatabase(
          tenant.mongoDbUrl.trim(),
          tenantPayload,
          adminPayload,
          tenant.adminPermissions
        );
        dbSyncResult = result;
      } catch (dbErr: any) {
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

  const messages: string[] = [];
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
    tenantId: tenant.id,
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
export async function syncAllTenantsToRemote(
  options?: { reason?: string }
): Promise<{ total: number; successCount: number; failedCount: number; results: SyncDispatchResult[] }> {
  const tenants = await prisma.tenant.findMany({
    where: {
      status: { not: 'DELETED' }
    },
    select: { id: true, companyName: true, domainUrl: true, website: true, mongoDbUrl: true }
  });

  const promises = tenants.map(t => syncTenantToRemote(t.id, { reason: options?.reason || 'GLOBAL_UPDATE' }));
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
