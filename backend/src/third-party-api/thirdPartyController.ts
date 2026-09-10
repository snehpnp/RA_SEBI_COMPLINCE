import { Request, Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb, { centralModels } from '../config/db';

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
    let tenant: any = await dynamicDb.Tenant.findOne({ tenantApiKey: apiKey }).lean();
    if (!tenant && centralModels.CentralTenant) {
      tenant = await centralModels.CentralTenant.findOne({ tenantApiKey: apiKey }).lean();
    }
    if (!tenant && centralModels.AllCompany) {
      tenant = await centralModels.AllCompany.findOne({ apiKey: apiKey }).lean();
    }
    if (tenant) return tenant;
  }

  // 2. Try by Tenant ID (Header / Param / Query)
  const directTenantId = headerTenantId || paramId || queryTenantId;
  if (directTenantId) {
    let tenant: any = null;
    if (mongoose.Types.ObjectId.isValid(directTenantId)) {
      tenant = await dynamicDb.Tenant.findById(directTenantId).lean().catch(() => null);
      if (!tenant && centralModels.CentralTenant) {
        tenant = await centralModels.CentralTenant.findById(directTenantId).lean().catch(() => null);
      }
    }
    if (!tenant && centralModels.AllCompany) {
      tenant = await centralModels.AllCompany.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(directTenantId) ? [{ _id: directTenantId }] : []),
          { companyId: directTenantId }
        ]
      }).lean().catch(() => null);
    }
    if (tenant) return tenant;
  }

  // 3. Try by Admin User ID / Email
  const adminIdentifier = queryEmail || paramId || queryAdminId;
  if (adminIdentifier) {
    const isOid = mongoose.Types.ObjectId.isValid(adminIdentifier);
    const adminUser: any = await dynamicDb.User.findOne({
      $or: [
        ...(isOid ? [{ _id: adminIdentifier }] : []),
        { email: String(adminIdentifier).toLowerCase().trim() }
      ]
    }).populate('tenant').lean().catch(() => null);
    if (adminUser?.tenant) return adminUser.tenant;
  }

  // 4. Try by Domain Name / Website / Host
  if (domainHeader) {
    const cleanDomain = domainHeader.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\/.*$/, '').toLowerCase().trim();
    if (cleanDomain && cleanDomain !== 'localhost' && cleanDomain !== '127.0.0.1') {
      let tenant: any = await dynamicDb.Tenant.findOne({
        $or: [
          { domainUrl: { $regex: cleanDomain, $options: 'i' } },
          { website: { $regex: cleanDomain, $options: 'i' } }
        ]
      }).lean();
      if (!tenant && centralModels.CentralTenant) {
        tenant = await centralModels.CentralTenant.findOne({
          $or: [
            { domainUrl: { $regex: cleanDomain, $options: 'i' } },
            { website: { $regex: cleanDomain, $options: 'i' } }
          ]
        }).lean();
      }
      if (tenant) return tenant;
    }
  }

  // 5. Fallback for Single-Tenant standalone instance
  const tenantCount = await dynamicDb.Tenant.countDocuments({ deletedAt: null });
  if (tenantCount === 1) {
    return await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
  }

  return null;
};

/**
 * GET /api/v1/third-party-api/clients
 * GET /api/v1/third-party-api/:tenantId/clients
 */
export const getThirdPartyClients = async (req: Request, res: Response) => {
  try {
    const tenant: any = await resolveTenantFromRequest(req);

    const userFilter: any = {};
    if (tenant) {
      userFilter.tenantId = tenant._id || tenant.id;
    }

    const matchingUsers = await dynamicDb.User.find(userFilter).select('_id').lean();
    const userIds = matchingUsers.map(u => u._id);

    const clients = await dynamicDb.Client.find({
      ...(userIds.length > 0 || !tenant ? { userId: { $in: userIds } } : { _id: null })
    })
      .populate({
        path: 'userId',
        select: 'id email mobile firstName lastName status createdAt lastLogin'
      })
      .populate('profile')
      .populate({
        path: 'subscriptions',
        populate: {
          path: 'plan',
          select: 'id name price durationMonths researchSegments'
        },
        options: { sort: { createdAt: -1 } }
      })
      .populate({
        path: 'agreements',
        select: 'id status signedAt agreementUrl'
      })
      .populate({
        path: 'documents',
        select: 'id docType status fileName uploadedAt'
      })
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedClients = clients.map((c: any) => {
      const user = c.userId || {};
      return {
        id: c._id?.toString() || c.id,
        userId: user._id?.toString() || user.id || c.userId,
        name: c.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: c.email || user.email,
        mobile: c.mobile || user.mobile,
        pan: c.pan,
        aadhaar: c.aadhaar,
        category: c.category,
        occupation: c.occupation,
        status: c.status || user.status,
        riskProfile: c.profile?.riskProfile || 'MODERATE',
        city: c.profile?.city || null,
        state: c.profile?.state || null,
        joinedAt: user.createdAt,
        activeSubscription: c.subscriptions?.[0] || null,
        subscriptionsCount: c.subscriptions?.length || 0,
        agreementsCount: c.agreements?.length || 0,
        documentsCount: c.documents?.length || 0
      };
    });

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: tenant ? {
        id: tenant._id?.toString() || tenant.id,
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
    const tenant: any = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant company not found.'
      });
    }

    const tenantId = tenant._id || tenant.id;
    const users = await dynamicDb.User.find({ tenantId }).select('_id').lean();
    const userIds = users.map(u => u._id);

    const staffMembers = await dynamicDb.Staff.find({
      userId: { $in: userIds }
    })
      .populate({
        path: 'userId',
        select: 'id email mobile firstName lastName status roleId',
        populate: { path: 'role', select: 'name' }
      })
      .populate('personAssociated')
      .sort({ createdAt: -1 })
      .lean();

    const formattedStaff = staffMembers.map((s: any) => {
      const user = s.userId || {};
      return {
        ...s,
        id: s._id?.toString() || s.id,
        user: user ? {
          id: user._id?.toString() || user.id,
          email: user.email,
          mobile: user.mobile,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          role: user.role ? { name: user.role.name } : null
        } : null
      };
    });

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: {
        id: tenant._id?.toString() || tenant.id,
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration
      },
      count: formattedStaff.length,
      data: formattedStaff
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
    const tenant: any = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant company not found.'
      });
    }

    const tenantId = tenant._id || tenant.id;
    const plans = await dynamicDb.Plan.find({
      tenantId,
      status: 'ACTIVE'
    })
      .populate('category')
      .sort({ price: 1 })
      .lean();

    const formattedPlans = plans.map((p: any) => ({
      ...p,
      id: p._id?.toString() || p.id
    }));

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      count: formattedPlans.length,
      data: formattedPlans
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
    const tenant: any = await resolveTenantFromRequest(req);
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
        id: tenant._id?.toString() || tenant.id,
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
