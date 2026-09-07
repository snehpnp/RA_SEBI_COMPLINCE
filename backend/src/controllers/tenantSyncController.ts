import { Request, Response } from 'express';
import prisma from '../config/db';
import * as bcrypt from 'bcryptjs';

/**
 * Endpoint on any deployed instance / client build to bootstrap/provision its database via API call.
 * POST /api/v1/sync/bootstrap
 */
export const bootstrapTenant = async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-tenant-api-key'] as string) || req.body.apiKey;
    const { tenant, adminUser } = req.body;

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

    // 1. Seed standard Roles
    const roles = [
      { name: 'SUPER_ADMIN', description: 'System Owner' },
      { name: 'ADMIN', description: 'RA Company Owner' },
      { name: 'PRINCIPAL_OFFICER', description: 'Company Principal Officer' },
      { name: 'COMPLIANCE_OFFICER', description: 'Company Compliance Officer' },
      { name: 'RESEARCHER', description: 'Company Research Analyst' },
      { name: 'PERSON_ASSOCIATED', description: 'Associated Services' },
      { name: 'CLIENT', description: 'End Client' }
    ];

    const roleMap: Record<string, string> = {};
    for (const role of roles) {
      const createdRole = await prisma.role.upsert({
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

    const permMap: Record<string, string> = {};
    for (const perm of permissions) {
      const createdPerm = await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm
      });
      permMap[perm.code] = createdPerm.id;
    }

    // 3. Map Permissions to Admin Role
    const adminRoleId = roleMap['ADMIN'];
    for (const permCode of Object.keys(permMap)) {
      const pId = permMap[permCode];
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRoleId, permissionId: pId } },
        update: {},
        create: { roleId: adminRoleId, permissionId: pId }
      });
    }

    // 4. Upsert Tenant Record
    const tenantPayload: any = {
      companyName: tenant.companyName,
      companyType: tenant.companyType || 'INDIVIDUAL',
      raType: tenant.raType || 'FULL_TIME',
      sebiRegistration: tenant.sebiRegistration,
      bseEnrollment: tenant.bseEnrollment || null,
      email: tenant.email,
      mobile: tenant.mobile,
      address: tenant.address,
      pan: tenant.pan,
      gst: tenant.gst || null,
      website: tenant.website || null,
      ownerName: tenant.ownerName || `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin User',
      certificateUrl: tenant.certificateUrl || null,
      certificateValidity: tenant.certificateValidity ? new Date(tenant.certificateValidity) : null,
      nismCertificateUrl: tenant.nismCertificateUrl || null,
      nismValidity: tenant.nismValidity ? new Date(tenant.nismValidity) : null,
      depositAmount: tenant.depositAmount !== undefined ? Number(tenant.depositAmount) : 0.0,
      status: tenant.status || 'ACTIVE',
      panelName: tenant.panelName || `${tenant.companyName} Portal`,
      domainUrl: tenant.domainUrl || null,
      mongoDbUrl: tenant.mongoDbUrl || null,
      dbName: tenant.dbName || null,
      tenantApiKey: apiKey || tenant.tenantApiKey || null
    };

    let localTenant;
    if (tenant.id) {
      localTenant = await prisma.tenant.upsert({
        where: { id: tenant.id },
        update: tenantPayload,
        create: {
          id: tenant.id,
          ...tenantPayload
        }
      });
    } else {
      localTenant = await prisma.tenant.upsert({
        where: { email: tenant.email },
        update: tenantPayload,
        create: tenantPayload
      });
    }

    // 5. Ensure password hash
    let finalPasswordHash = adminUser.passwordHash;
    if (!finalPasswordHash && adminUser.password) {
      finalPasswordHash = await bcrypt.hash(adminUser.password, 10);
    } else if (!finalPasswordHash && adminUser.tempPassword) {
      finalPasswordHash = await bcrypt.hash(adminUser.tempPassword, 10);
    }

    const adminEmail = adminUser.email.toLowerCase().trim();

    // 6. Upsert Admin User in Local DB (User Collection)
    let existingUser = null;
    if (adminUser.id) {
      existingUser = await prisma.user.findUnique({ where: { id: adminUser.id } }).catch(() => null);
    }
    if (!existingUser && adminEmail) {
      existingUser = await prisma.user.findUnique({ where: { email: adminEmail } }).catch(() => null);
    }
    if (!existingUser) {
      existingUser = await prisma.user.findFirst({
        where: { tenantId: localTenant.id, roleId: adminRoleId }
      }).catch(() => null);
    }

    const effectiveUserStatus = (localTenant.status === 'SUSPENDED' ? 'SUSPENDED' : (adminUser.status || 'ACTIVE'));

    let createdAdminUser;
    if (existingUser) {
      const userUpdatePayload: any = {
        tenantId: localTenant.id,
        roleId: adminRoleId,
        firstName: adminUser.firstName || tenant.companyName,
        lastName: adminUser.lastName || '',
        email: adminEmail,
        mobile: adminUser.mobile || tenant.mobile,
        status: effectiveUserStatus
      };

      if (finalPasswordHash && finalPasswordHash.trim()) {
        userUpdatePayload.passwordHash = finalPasswordHash.trim();
      }
      if (adminUser.tempPassword !== undefined || adminUser.password !== undefined) {
        userUpdatePayload.tempPassword = adminUser.tempPassword || adminUser.password || null;
      }

      createdAdminUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: userUpdatePayload
      });
    } else {
      createdAdminUser = await prisma.user.create({
        data: {
          ...(adminUser.id ? { id: adminUser.id } : {}),
          tenantId: localTenant.id,
          roleId: adminRoleId,
          firstName: adminUser.firstName || tenant.companyName,
          lastName: adminUser.lastName || 'Admin',
          email: adminEmail,
          mobile: adminUser.mobile || tenant.mobile,
          passwordHash: finalPasswordHash || '',
          tempPassword: adminUser.tempPassword || adminUser.password || null,
          status: effectiveUserStatus
        }
      });
    }

    if (localTenant.status === 'SUSPENDED') {
      await prisma.user.updateMany({
        where: { tenantId: localTenant.id },
        data: {
          status: 'SUSPENDED',
          tokenVersion: { increment: 1 },
          currentSessionId: null
        }
      });
    }

    // 7. Seed Mandatory Default Pages
    const defaultPages = [
      { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '', isSystem: true },
      { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '', isSystem: true },
      { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '', isSystem: true },
      { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '', isSystem: true },
      { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '', isSystem: true },
      { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '', isSystem: true }
    ];

    for (const page of defaultPages) {
      await prisma.customPage.upsert({
        where: {
          tenantId_slug: {
            tenantId: localTenant.id,
            slug: page.slug
          }
        },
        update: {},
        create: {
          ...page,
          tenantId: localTenant.id
        }
      });
    }

    // 8. Seed Default AdminPermissions
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
      await prisma.adminPermission.upsert({
        where: {
          tenantId_module: {
            tenantId: localTenant.id,
            module: moduleName
          }
        },
        update: {},
        create: {
          tenantId: localTenant.id,
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

    return res.status(200).json({
      success: true,
      message: `Tenant "${localTenant.companyName}" and Admin User "${adminEmail}" successfully provisioned via API. Ready for immediate login.`,
      data: {
        tenantId: localTenant.id,
        companyName: localTenant.companyName,
        adminEmail: createdAdminUser.email,
        adminUserId: createdAdminUser.id,
        tempPassword: createdAdminUser.tempPassword
      }
    });
  } catch (error: any) {
    console.error('Error in bootstrapTenant API:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to bootstrap tenant via API: ${error.message}`,
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

    let tenant = null;

    if (apiKey) {
      tenant = await prisma.tenant.findFirst({
        where: { tenantApiKey: apiKey },
        include: { adminPermissions: true, users: { where: { role: { name: 'ADMIN' } } } }
      });
    } else if (domainHeader) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domainUrl: { contains: domainHeader, mode: 'insensitive' } },
            { website: { contains: domainHeader, mode: 'insensitive' } }
          ]
        },
        include: { adminPermissions: true, users: { where: { role: { name: 'ADMIN' } } } }
      });
    } else if (tenantIdQuery) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantIdQuery },
        include: { adminPermissions: true, users: { where: { role: { name: 'ADMIN' } } } }
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
