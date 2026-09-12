import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import { provisionAllTenantCollections } from '../services/tenantProvisionService';
import * as bcrypt from 'bcryptjs';

/**
 * Universal Endpoint on any deployed instance / client build to bootstrap its tenant database.
 * POST /api/v1/sync/bootstrap
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
      systemSettings,
      resources
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
      resources: resources || tenant.resources || [],
      tenantApiKey: apiKey || tenant.tenantApiKey || null
    };

    // Execute comprehensive provisioning of all collections on the local DB
    const result = await provisionAllTenantCollections(
      dynamicDb,
      tenantData,
      adminUser,
      permissions
    );

    return res.status(200).json({
      success: true,
      action: action || 'BOOTSTRAP',
      message: `Tenant "${result.tenant.companyName}" successfully initialized on domain database. All collections updated and Admin user "${result.adminUser.email}" is ready.`,
      data: {
        tenantId: String(result.tenant._id || result.tenant.id),
        companyName: result.tenant.companyName,
        status: result.tenant.status,
        domainUrl: result.tenant.domainUrl,
        adminEmail: result.adminUser.email,
        adminUserId: String(result.adminUser._id || result.adminUser.id),
        tempPassword: result.adminUser.tempPassword
      }
    });
  } catch (error: any) {
    console.error('Error in bootstrapTenant API:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to bootstrap tenant on domain database: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Universal Endpoint on any deployed instance to update tenant information,
 * branding, admin user, or permissions.
 * POST /api/v1/sync/update
 */
export const syncTenantUpdate = async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-tenant-api-key'] as string) || req.body.apiKey;
    const {
      tenant,
      adminUser,
      permissions,
      action,
      status
    } = req.body;

    // Check if tenant already exists in local DB
    let localTenant = await dynamicDb.Tenant.findOne({}).lean();
    if (!localTenant && tenant) {
      // If not yet present, run bootstrap
      return bootstrapTenant(req, res);
    }

    const tenantUpdates: any = {};
    if (tenant) {
      const allowedFields = [
        'companyName', 'panelName', 'domainUrl', 'website', 'ownerName',
        'sebiRegistration', 'bseEnrollment', 'email', 'mobile', 'address',
        'state', 'pan', 'gst', 'certificateUrl', 'certificateValidity',
        'nismCertificateUrl', 'nismValidity', 'depositAmount', 'status',
        'logoUrl', 'faviconUrl', 'activePaymentGateway'
      ];
      allowedFields.forEach(f => {
        if (tenant[f] !== undefined) tenantUpdates[f] = tenant[f];
      });
      if (apiKey) tenantUpdates.tenantApiKey = apiKey;
    }

    if (status) {
      tenantUpdates.status = status;
    }

    // Update local Tenant document
    if (Object.keys(tenantUpdates).length > 0) {
      localTenant = await dynamicDb.Tenant.findOneAndUpdate(
        {},
        { $set: tenantUpdates },
        { returnDocument: 'after', upsert: true }
      ).lean();
    }

    // Update Admin User if provided
    if (adminUser) {
      const adminUpdates: any = {};
      if (adminUser.firstName) adminUpdates.firstName = adminUser.firstName;
      if (adminUser.lastName) adminUpdates.lastName = adminUser.lastName;
      if (adminUser.mobile) adminUpdates.mobile = adminUser.mobile;
      if (adminUser.status) adminUpdates.status = adminUser.status;
      if (adminUser.tempPassword) adminUpdates.tempPassword = adminUser.tempPassword;
      if (adminUser.passwordHash) adminUpdates.passwordHash = adminUser.passwordHash;

      const adminRole = await dynamicDb.Role.findOne({ name: 'ADMIN' }).lean();
      if (adminRole) {
        await dynamicDb.User.findOneAndUpdate(
          { roleId: adminRole._id || adminRole.id },
          { $set: adminUpdates },
          { returnDocument: 'after' }
        );
      }
    }

    // Update permissions if provided
    if (Array.isArray(permissions) && permissions.length > 0 && localTenant) {
      const tenantIdStr = String(localTenant._id || localTenant.id);
      for (const p of permissions) {
        if (p.permissionKey) {
          await dynamicDb.AdminPermission.findOneAndUpdate(
            { tenantId: tenantIdStr, permissionKey: p.permissionKey },
            { $set: { isEnabled: p.isEnabled !== false } },
            { upsert: true }
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      action: action || 'UPDATE',
      message: `Tenant "${localTenant?.companyName || 'Company'}" updated successfully on domain database.`,
      data: localTenant
    });
  } catch (error: any) {
    console.error('Error in syncTenantUpdate API:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to update tenant on domain database: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Universal Endpoint to change status (Stop/Start/Suspend/Activate) on the deployed instance.
 * POST /api/v1/sync/status
 */
export const syncTenantStatus = async (req: Request, res: Response) => {
  try {
    const { status, action } = req.body;
    const effectiveStatus = (status || (action === 'SUSPEND' ? 'SUSPENDED' : (action === 'ACTIVATE' ? 'ACTIVE' : null)))?.toUpperCase();

    if (!effectiveStatus || !['ACTIVE', 'SUSPENDED', 'DELETED', 'INACTIVE'].includes(effectiveStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status ("ACTIVE", "SUSPENDED", "DELETED") is required.'
      });
    }

    const updatedTenant = await dynamicDb.Tenant.findOneAndUpdate(
      {},
      { $set: { status: effectiveStatus } },
      { returnDocument: 'after' }
    ).lean();

    // Toggle user login access on this instance
    const userStatus = effectiveStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
    await dynamicDb.User.updateMany(
      {},
      { $set: { status: userStatus } }
    );

    return res.status(200).json({
      success: true,
      status: effectiveStatus,
      message: `Tenant status successfully updated to "${effectiveStatus}" on domain database. User access ${effectiveStatus === 'ACTIVE' ? 'restored' : 'restricted'}.`,
      data: updatedTenant
    });
  } catch (error: any) {
    console.error('Error in syncTenantStatus API:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to update tenant status: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Universal Endpoint to soft-delete / deactivate the deployed instance.
 * POST /api/v1/sync/delete
 */
export const syncTenantDelete = async (req: Request, res: Response) => {
  try {
    const updatedTenant = await dynamicDb.Tenant.findOneAndUpdate(
      {},
      { $set: { status: 'DELETED', deletedAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    // Deactivate all users on this instance
    await dynamicDb.User.updateMany(
      {},
      { $set: { status: 'INACTIVE', deletedAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'Tenant successfully marked as DELETED on domain database.',
      data: updatedTenant
    });
  } catch (error: any) {
    console.error('Error in syncTenantDelete API:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete tenant: ${error.message}`,
      error: error.message
    });
  }
};

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

    let tenant: any = null;

    if (apiKey) {
      tenant = await dynamicDb.Tenant.findOne({ tenantApiKey: apiKey }).lean();
    } else if (domainHeader) {
      tenant = await dynamicDb.Tenant.findOne({
        $or: [
          { domainUrl: { $regex: domainHeader, $options: 'i' } },
          { website: { $regex: domainHeader, $options: 'i' } }
        ]
      }).lean();
    } else if (tenantIdQuery) {
      tenant = await dynamicDb.Tenant.findById(tenantIdQuery).lean();
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'No tenant configuration found for given domain/credentials.'
      });
    }

    const tenantIdStr = String(tenant._id || tenant.id);
    const adminRole = await dynamicDb.Role.findOne({ name: 'ADMIN' }).lean();
    let adminUser: any = null;
    if (adminRole) {
      adminUser = await dynamicDb.User.findOne({
        tenantId: tenantIdStr,
        roleId: adminRole._id || adminRole.id
      }).lean();
    }

    const adminPermissions = await dynamicDb.AdminPermission.find({
      tenantId: tenantIdStr
    }).lean();

    return res.status(200).json({
      success: true,
      data: {
        tenantId: tenantIdStr,
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
        permissions: adminPermissions,
        adminUser: adminUser ? {
          id: String(adminUser._id || adminUser.id),
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

