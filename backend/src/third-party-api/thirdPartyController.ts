import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * Helper to resolve Tenant from route params, query, or headers without requiring JWT auth
 */
export const resolveTenantFromRequest = async (req: Request) => {
  const paramId = req.params.tenantId || req.params.adminId || (req.params as any).companyId;
  const queryTenantId = (req.query.tenantId || req.query.companyId || req.query.id) as string;
  const queryAdminId = (req.query.adminId || req.query.userId) as string;
  const queryEmail = (req.query.email || req.query.adminEmail) as string;
  const apiKey = (req.headers['x-tenant-api-key'] as string) || (req.headers['x-api-key'] as string) || (req.query.apiKey as string);
  const domainHeader = (req.headers['x-tenant-domain'] as string) || (req.query.domain as string) || (req.headers.host as string);
  const headerTenantId = (req.headers['x-tenant-id'] as string) || (req.headers['tenant-id'] as string);

  // 1. Try by API Key
  if (apiKey) {
    const tenant = await prisma.tenant.findFirst({
      where: { tenantApiKey: apiKey }
    });
    if (tenant) return tenant;
  }

  // 2. Try by Tenant ID (Header / Param / Query)
  const directTenantId = headerTenantId || paramId || queryTenantId;
  if (directTenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: directTenantId }
    }).catch(() => null);
    if (tenant) return tenant;
  }

  // 3. Try by Admin User ID / Email
  const adminIdentifier = queryEmail || paramId || queryAdminId;
  if (adminIdentifier) {
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: adminIdentifier },
          { email: adminIdentifier.toLowerCase().trim() }
        ]
      },
      include: { tenant: true }
    }).catch(() => null);
    if (adminUser?.tenant) return adminUser.tenant;
  }

  // 4. Try by Domain Name / Website / Host
  if (domainHeader) {
    const cleanDomain = domainHeader.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\/.*$/, '').toLowerCase().trim();
    if (cleanDomain && cleanDomain !== 'localhost' && cleanDomain !== '127.0.0.1') {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domainUrl: { contains: cleanDomain, mode: 'insensitive' } },
            { website: { contains: cleanDomain, mode: 'insensitive' } }
          ]
        }
      });
      if (tenant) return tenant;
    }
  }

  // 5. Fallback for Single-Tenant standalone instance
  const tenantCount = await prisma.tenant.count({ where: { deletedAt: null } });
  if (tenantCount === 1) {
    return await prisma.tenant.findFirst({ where: { deletedAt: null } });
  }

  return null;
};

/**
 * GET /api/v1/third-party-api/clients
 * GET /api/v1/third-party-api/:tenantId/clients
 */
export const getThirdPartyClients = async (req: Request, res: Response) => {
  try {
    const tenant = await resolveTenantFromRequest(req);

    const whereClause: any = {};
    if (tenant) {
      whereClause.user = { tenantId: tenant.id };
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
            lastLogin: true
          }
        },
        profile: true,
        subscriptions: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
                durationMonths: true,
                researchSegments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        agreements: {
          select: {
            id: true,
            status: true,
            signedAt: true,
            agreementUrl: true
          }
        },
        documents: {
          select: {
            id: true,
            docType: true,
            status: true,
            fileName: true,
            uploadedAt: true
          }
        }
      },
      orderBy: {
        user: { createdAt: 'desc' }
      }
    });

    const sanitizedClients = clients.map(c => ({
      id: c.id,
      userId: c.userId,
      name: c.name || `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(),
      email: c.email || c.user?.email,
      mobile: c.mobile || c.user?.mobile,
      pan: c.pan,
      aadhaar: c.aadhaar,
      category: c.category,
      occupation: c.occupation,
      status: c.status || c.user?.status,
      riskProfile: c.profile?.riskProfile || 'MODERATE',
      city: c.profile?.city || null,
      state: c.profile?.state || null,
      joinedAt: c.user?.createdAt,
      activeSubscription: c.subscriptions?.[0] || null,
      subscriptionsCount: c.subscriptions?.length || 0,
      agreementsCount: c.agreements?.length || 0,
      documentsCount: c.documents?.length || 0
    }));

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: tenant ? {
        id: tenant.id,
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration,
        domainUrl: tenant.domainUrl,
        website: tenant.website
      } : null,
      count: sanitizedClients.length,
      data: sanitizedClients
    });
  } catch (error: any) {
    console.error('Error in getThirdPartyClients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch third-party clients: ' + error.message
    });
  }
};

/**
 * GET /api/v1/third-party-api/staff
 * GET /api/v1/third-party-api/:tenantId/staff
 */
export const getThirdPartyStaff = async (req: Request, res: Response) => {
  try {
    const tenant = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant company not found.'
      });
    }

    const staffMembers = await prisma.staff.findMany({
      where: {
        user: { tenantId: tenant.id }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            firstName: true,
            lastName: true,
            status: true,
            role: { select: { name: true } }
          }
        },
        personAssociated: true
      },
      orderBy: {
        user: { createdAt: 'desc' }
      }
    });

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: {
        id: tenant.id,
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration
      },
      count: staffMembers.length,
      data: staffMembers
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch third-party staff: ' + error.message
    });
  }
};

/**
 * GET /api/v1/third-party-api/plans
 * GET /api/v1/third-party-api/:tenantId/plans
 */
export const getThirdPartyPlans = async (req: Request, res: Response) => {
  try {
    const tenant = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant company not found.'
      });
    }

    const plans = await prisma.plan.findMany({
      where: {
        tenantId: tenant.id,
        status: 'ACTIVE'
      },
      include: {
        category: true
      },
      orderBy: { price: 'asc' }
    });

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      count: plans.length,
      data: plans
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch third-party plans: ' + error.message
    });
  }
};

/**
 * GET /api/v1/third-party-api/info
 * GET /api/v1/third-party-api/:tenantId/info
 */
export const getThirdPartyInfo = async (req: Request, res: Response) => {
  try {
    const tenant = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant company not found.'
      });
    }

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      data: {
        id: tenant.id,
        companyName: tenant.companyName,
        panelName: tenant.panelName || `${tenant.companyName} Portal`,
        sebiRegistration: tenant.sebiRegistration,
        bseEnrollment: tenant.bseEnrollment,
        domainUrl: tenant.domainUrl,
        website: tenant.website,
        email: tenant.email,
        mobile: tenant.mobile,
        address: tenant.address,
        logoUrl: tenant.logoUrl,
        faviconUrl: tenant.faviconUrl,
        status: tenant.status
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company info: ' + error.message
    });
  }
};
