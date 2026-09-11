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

    const tenantIdStr = tenant ? (tenant._id || tenant.id || tenant.tenantId).toString() : null;
    const isObjectId = tenantIdStr && mongoose.Types.ObjectId.isValid(tenantIdStr);

    const tenantIds = tenantIdStr ? [
      tenantIdStr,
      ...(tenant.tenantId ? [tenant.tenantId.toString()] : []),
      ...(tenant._id ? [tenant._id.toString()] : [])
    ] : [];
    const tenantOids = tenantIds
      .filter(tId => mongoose.Types.ObjectId.isValid(tId))
      .map(tId => new mongoose.Types.ObjectId(tId));

    // 1. Find all matching Client users for this tenant
    const clientRoles = await dynamicDb.Role.find({
      name: { $regex: /^(client|user|customer|investor)$/i }
    }).lean();
    const clientRoleIds = clientRoles.map((r: any) => r._id || r.id);

    const matchingUsers: any[] = await dynamicDb.User.find({
      deletedAt: null,
      $and: [
        ...(tenantIds.length > 0 ? [{
          $or: [
            { tenantId: { $in: [...tenantIds, ...tenantOids] } },
            { tenantId: tenantIdStr }
          ]
        }] : []),
        {
          $or: [
            { roleId: { $in: clientRoleIds } },
            { role: { $regex: /^(client|user|customer|investor)$/i } }
          ]
        }
      ]
    }).populate('roleId', 'id name description').sort({ createdAt: -1 }).lean();

    const userIds = matchingUsers.map(u => u._id || u.id);
    const userOids = userIds
      .filter(uId => mongoose.Types.ObjectId.isValid(String(uId)))
      .map(uId => new mongoose.Types.ObjectId(String(uId)));

    // 2. Find Client documents for this tenant directly or linked via users
    const matchingClients: any[] = await dynamicDb.Client.find({
      ...(tenantIds.length > 0 ? {
        $or: [
          { tenantId: { $in: [...tenantIds, ...tenantOids] } },
          ...(userIds.length > 0 ? [{ userId: { $in: [...userIds, ...userOids, ...userIds.map(String)] } }] : [])
        ]
      } : {})
    })
      .populate('userId')
      .sort({ createdAt: -1 })
      .lean();

    // Map existing Client records by userId
    const clientByUserId = new Map<string, any>();
    for (const c of matchingClients) {
      const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || '');
      if (uIdStr) {
        clientByUserId.set(uIdStr, c);
      }
    }

    // Combine Client records and any Users with client role that don't have a Client doc yet
    const combinedClients: any[] = [...matchingClients];
    for (const u of matchingUsers) {
      const uIdStr = String(u._id || u.id);
      if (!clientByUserId.has(uIdStr)) {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'Client';
        const synthClient: any = {
          _id: u._id,
          id: uIdStr,
          userId: u,
          name: fullName,
          email: u.email,
          mobile: u.mobile || '',
          dob: u.dob || null,
          pan: u.pan || null,
          aadhaar: u.aadhaar || null,
          category: u.category || 'INDIVIDUAL',
          occupation: u.occupation || 'OTHER',
          status: u.status || 'ACTIVE',
          kraVerified: false,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        };
        combinedClients.push(synthClient);
        clientByUserId.set(uIdStr, synthClient);
      }
    }

    const allClientIds = combinedClients.map((c: any) => c._id || c.id);
    const allUserIds = combinedClients.map((c: any) => String(c.userId?._id || c.userId?.id || c.userId || c._id || c.id));
    const allLookupIds = [...new Set([...allClientIds, ...allUserIds])];

    // Look up Profiles, Subscriptions, Agreements, Documents
    const [profiles, subscriptions, agreements, documents] = await Promise.all([
      dynamicDb.ClientProfile.find({ clientId: { $in: allLookupIds } }).lean().catch(() => []),
      dynamicDb.Subscription.find({ clientId: { $in: allLookupIds } })
        .populate('planId', 'id name price durationMonths researchSegments')
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => []),
      dynamicDb.Agreement.find({ clientId: { $in: allLookupIds } }).lean().catch(() => []),
      dynamicDb.ClientDocument.find({ clientId: { $in: allLookupIds } }).lean().catch(() => [])
    ]);

    const profileMap = new Map((profiles as any[]).map(p => [String(p.clientId), p]));
    const subMap = new Map<string, any[]>();
    for (const sub of (subscriptions as any[])) {
      const cId = String(sub.clientId);
      if (!subMap.has(cId)) subMap.set(cId, []);
      subMap.get(cId)!.push(sub);
    }

    const agMap = new Map<string, number>();
    for (const ag of (agreements as any[])) {
      const cId = String(ag.clientId);
      agMap.set(cId, (agMap.get(cId) || 0) + 1);
    }

    const docMap = new Map<string, number>();
    for (const doc of (documents as any[])) {
      const cId = String(doc.clientId);
      docMap.set(cId, (docMap.get(cId) || 0) + 1);
    }

    const sanitizedClients = combinedClients.map((c: any) => {
      const cIdStr = String(c._id || c.id);
      const userObj: any = c.userId || {};
      const uIdStr = String(userObj._id || userObj.id || c.userId || cIdStr);
      const prof: any = profileMap.get(cIdStr) || profileMap.get(uIdStr);
      const clientSubs = subMap.get(cIdStr) || subMap.get(uIdStr) || [];
      const primarySub = clientSubs[0] || null;

      const planObj = primarySub?.planId && typeof primarySub.planId === 'object'
        ? primarySub.planId
        : (primarySub?.plan || null);

      return {
        id: cIdStr,
        userId: uIdStr,
        name: c.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.name || 'Client',
        email: c.email || userObj.email || '',
        mobile: c.mobile || userObj.mobile || '',
        dob: c.dob || userObj.dob || null,
        pan: c.pan || userObj.pan || null,
        aadhaar: c.aadhaar || userObj.aadhaar || null,
        category: c.category || 'INDIVIDUAL',
        occupation: c.occupation || 'OTHER',
        status: c.status || userObj.status || 'ACTIVE',
        kraVerified: c.kraVerified || false,
        riskProfile: prof?.riskProfile || 'MODERATE',
        city: prof?.city || null,
        state: prof?.state || null,
        address: prof?.address || null,
        joinedAt: userObj.createdAt || c.createdAt,
        lastLogin: userObj.lastLogin || null,
        activeSubscription: primarySub ? {
          id: primarySub._id || primarySub.id,
          plan: planObj ? {
            id: planObj._id || planObj.id,
            name: planObj.name || 'Subscription Plan',
            price: planObj.price,
            durationMonths: planObj.durationMonths || 1,
            researchSegments: planObj.researchSegments || []
          } : null,
          startDate: primarySub.startDate,
          endDate: primarySub.endDate,
          status: primarySub.status,
          amountTotal: primarySub.amountTotal || primarySub.amountBase || null
        } : null,
        subscriptionsCount: clientSubs.length,
        agreementsCount: agMap.get(cIdStr) || agMap.get(uIdStr) || 0,
        documentsCount: docMap.get(cIdStr) || docMap.get(uIdStr) || 0
      };
    });

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: tenant ? {
        id: tenantIdStr,
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

/**
 * GET /api/v1/third-party-api/stats
 * GET /api/v1/third-party-api/:tenantId/stats
 * Returns aggregated dashboard counts — accessible with x-tenant-api-key only (no JWT)
 */
export const getThirdPartyStats = async (req: Request, res: Response) => {
  try {
    const tenant: any = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const tenantId = (tenant._id || tenant.id).toString();

    const [
      totalClients,
      activeClients,
      totalStaff,
      totalPlans,
      activePlans,
      totalResearch
    ] = await Promise.all([
      dynamicDb.Client.countDocuments({}),
      dynamicDb.Client.countDocuments({ status: 'ACTIVE' }),
      dynamicDb.Staff.countDocuments({}),
      dynamicDb.Plan.countDocuments({ deletedAt: null }),
      dynamicDb.Plan.countDocuments({ status: 'ACTIVE', deletedAt: null }),
      dynamicDb.ResearchReport.countDocuments({ tenantId }).catch(() => 0)
    ]);

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: {
        id: tenantId,
        companyName: tenant.companyName,
        status: tenant.status
      },
      data: {
        clientCount: totalClients,
        activeClients,
        pendingClients: totalClients - activeClients,
        staffCount: totalStaff,
        planCount: activePlans,
        totalPlans,
        researchCount: totalResearch
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats: ' + error.message
    });
  }
};

/**
 * GET /api/v1/third-party-api/compliance
 * GET /api/v1/third-party-api/:tenantId/compliance
 */
export const getThirdPartyCompliance = async (req: Request, res: Response) => {
  try {
    const tenant: any = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const tenantId = (tenant._id || tenant.id).toString();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const audits = await dynamicDb.ComplianceAudit.find({
      $or: [{ tenantId }, { tenantId: tenant._id }]
    })
      .populate('requirementId')
      .populate('penalty')
      .lean();

    const normalizeAudit = (a: any) => {
      const reqObj = a.requirementId && typeof a.requirementId === 'object' ? a.requirementId : (a.requirement || {});
      return {
        id: a._id ? a._id.toString() : a.id,
        _id: a._id,
        tenantId,
        status: a.status,
        dueDate: a.dueDate,
        officerRemarks: a.officerRemarks,
        proofDocumentUrl: a.proofDocumentUrl,
        resolvedAt: a.resolvedAt,
        updatedAt: a.updatedAt,
        requirement: {
          id: reqObj._id ? reqObj._id.toString() : reqObj.id,
          serialNo: reqObj.serialNo,
          requirement: reqObj.requirement || reqObj.title || 'SEBI Regulation',
          frequency: reqObj.frequency,
          frequencyType: reqObj.frequencyType,
          severityLevel: reqObj.severityLevel,
          penaltyAmount: reqObj.penaltyAmount
        },
        requirementId: reqObj,
        penalty: a.penalty || null,
        tenant: {
          id: tenantId,
          companyName: tenant.companyName,
          sebiRegistration: tenant.sebiRegistration,
          domainUrl: tenant.domainUrl,
          website: tenant.website
        }
      };
    };

    const upcoming = audits.filter((a: any) => 
      (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'UPCOMING') && 
      a.dueDate && new Date(a.dueDate) >= now && new Date(a.dueDate) <= thirtyDaysFromNow
    ).map(normalizeAudit);

    const due = audits.filter((a: any) => 
      (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'DUE') && 
      a.dueDate && new Date(a.dueDate) >= now
    ).map(normalizeAudit);

    const overdue = audits.filter((a: any) => 
      ((a.status === 'PENDING' || a.status === 'OVERDUE') && a.dueDate && new Date(a.dueDate) < now) || 
      a.status === 'OVERDUE'
    ).map(normalizeAudit);

    const penalty = audits.filter((a: any) => 
      a.penalty && (a.penalty.status === 'PENDING_PAYMENT' || a.status === 'PENALTY')
    ).map(normalizeAudit);

    const closed = audits.filter((a: any) => 
      a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED' || a.status === 'CLOSED'
    ).map(normalizeAudit);

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      company: {
        id: tenantId,
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration,
        bseEnrollment: tenant.bseEnrollment,
        domainUrl: tenant.domainUrl,
        website: tenant.website,
        status: tenant.status
      },
      data: {
        counts: {
          upcoming: upcoming.length,
          due: due.length,
          overdue: overdue.length,
          penalty: penalty.length,
          closed: closed.length,
          total: audits.length
        },
        upcoming,
        due,
        overdue,
        penalty,
        closed
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch third party compliance: ' + error.message
    });
  }
};

/**
 * POST /api/v1/third-party-api/compliance/sweep
 * POST /api/v1/third-party-api/:tenantId/compliance/sweep
 */
export const runThirdPartyComplianceSweep = async (req: Request, res: Response) => {
  try {
    const tenant: any = await resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const tenantId = (tenant._id || tenant.id).toString();
    const { checkComplianceForTenant } = await import('../controllers/complianceController');
    const alertsCreated = await checkComplianceForTenant(tenantId);

    return res.status(200).json({
      success: true,
      source: 'THIRD_PARTY_API',
      message: `Compliance sweep completed for ${tenant.companyName}. Evaluated rules and updated audit records.`,
      company: {
        id: tenantId,
        companyName: tenant.companyName
      },
      alertsGenerated: Array.isArray(alertsCreated) ? alertsCreated.length : 0
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to execute compliance sweep: ' + error.message
    });
  }
};

