import { Request, Response } from 'express';
import prisma from '../config/db';
import { provisionAllTenantCollections } from '../services/tenantProvisionService';

/**
 * Universal Endpoint on any deployed instance / client build to sync, bootstrap,
 * or update its tenant database and collections via API call.
 * POST /api/v1/sync/bootstrap
 * POST /api/v1/sync/update
 * POST /api/v1/sync/tenant
 */
export const bootstrapTenant = async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-tenant-api-key'] as string) || req.body.apiKey;
    const {
      tenant,
      adminUser,
      permissions,
      action,
      emailTemplates,
      customPages,
      plans,
      planCategories,
      complianceRequirements,
      complianceAudits,
      systemSettings
    } = req.body;

    if (!tenant || !adminUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload. "tenant" and "adminUser" objects are required.'
      });
    }

    if (!adminUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Admin user email is required.'
      });
    }

    const tenantData = {
      ...tenant,
      customPages: customPages || tenant.customPages || [],
      emailTemplates: emailTemplates || tenant.emailTemplates || [],
      plans: plans || tenant.plans || [],
      planCategories: planCategories || tenant.planCategories || [],
      complianceRequirements: complianceRequirements || tenant.complianceRequirements || [],
      complianceAudits: complianceAudits || tenant.complianceAudits || [],
      systemSettings: systemSettings || tenant.systemSettings || [],
      tenantApiKey: apiKey || tenant.tenantApiKey || null
    };

    // Execute comprehensive provisioning of all 11 collections on the local DB
    const result = await provisionAllTenantCollections(
      prisma,
      tenantData,
      adminUser,
      permissions
    );

    return res.status(200).json({
      success: true,
      action: action || 'SYNC',
      message: `Tenant "${result.tenant.companyName}" successfully synchronized on domain database. All collections updated and Admin user "${result.adminUser.email}" is ready.`,
      data: {
        tenantId: result.tenant.id,
        companyName: result.tenant.companyName,
        status: result.tenant.status,
        domainUrl: result.tenant.domainUrl,
        adminEmail: result.adminUser.email,
        adminUserId: result.adminUser.id,
        tempPassword: result.adminUser.tempPassword
      }
    });
  } catch (error: any) {
    console.error('Error in bootstrapTenant API:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to sync tenant on domain database: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Alias for sync update endpoint
 */
export const syncTenantUpdate = bootstrapTenant;

/**
 * Endpoint to retrieve tenant sync configuration
 * GET /api/v1/sync/config
 */
export const getTenantSyncConfig = async (req: Request, res: Response) => {
  try {
    const domainHeader = (req.headers['x-tenant-domain'] as string) || (req.query.domain as string);
    const apiKey = (req.headers['x-tenant-api-key'] as string) || (req.query.apiKey as string);
    const tenantIdQuery = req.query.tenantId as string;

    if (!domainHeader && !apiKey && !tenantIdQuery) {
      return res.status(400).json({
        success: false,
        message: 'Domain, API Key, or Tenant ID is required to sync configuration.'
      });
    }

    let tenant = null;

    if (apiKey) {
      tenant = await prisma.tenant.findFirst({
        where: { tenantApiKey: apiKey },
        include: { users: { where: { role: { name: 'ADMIN' } } }, adminPermissions: true }
      });
    } else if (domainHeader) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domainUrl: { contains: domainHeader, mode: 'insensitive' } },
            { website: { contains: domainHeader, mode: 'insensitive' } }
          ]
        },
        include: { users: { where: { role: { name: 'ADMIN' } } }, adminPermissions: true }
      });
    } else if (tenantIdQuery) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantIdQuery },
        include: { users: { where: { role: { name: 'ADMIN' } } }, adminPermissions: true }
      });
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'No tenant configuration found for given domain/credentials.'
      });
    }

    const adminUser = tenant.users && tenant.users[0] ? tenant.users[0] : null;

    return res.status(200).json({
      success: true,
      data: {
        tenantId: tenant.id,
        companyName: tenant.companyName,
        panelName: tenant.panelName || `${tenant.companyName} Portal`,
        domainUrl: tenant.domainUrl,
        mongoDbUrl: tenant.mongoDbUrl,
        dbName: tenant.dbName,
        status: tenant.status,
        sebiRegistration: tenant.sebiRegistration,
        logoUrl: tenant.logoUrl,
        faviconUrl: tenant.faviconUrl,
        activePaymentGateway: tenant.activePaymentGateway,
        permissions: tenant.adminPermissions,
        adminUser: adminUser ? {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          mobile: adminUser.mobile,
          passwordHash: adminUser.passwordHash,
          tempPassword: adminUser.tempPassword
        } : null,
        syncedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to sync tenant configuration.',
      error: error.message
    });
  }
};
