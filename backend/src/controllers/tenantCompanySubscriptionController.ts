import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { TenantSubscription, PlatformPlan, PlatformInvoice, AllCompany, Tenant, dynamicDb } from '../config/db';
import { centralModels } from '../services/tenantConnectionManager';

/**
 * Get the current company's active SaaS Subscription, Plan details, Active Client Quota usage, and Invoices
 */
export const getMyCompanySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    }

    let company: any = null;
    try {
      company = await AllCompany.findById(tenantId).lean() || await centralModels.AllCompany.findById(tenantId).lean();
    } catch {}

    if (!company) {
      try {
        company = await dynamicDb.Tenant.findById(tenantId).lean() || await Tenant.findById(tenantId).lean();
      } catch {}
    }

    if (!company) {
      try {
        company = await dynamicDb.Tenant.findOne().lean() || await AllCompany.findOne().lean();
      } catch {}
    }

    const companyId = company?._id || tenantId;

    // 1. Find active or latest TenantSubscription
    let activeSub: any = null;
    try {
      activeSub = await TenantSubscription.findOne({
        $or: [{ tenantId: companyId }, { tenantId }]
      })
        .populate('planId')
        .populate('invoiceId')
        .sort({ createdAt: -1 })
        .lean();
    } catch {}

    // 2. Count Active Advisory Clients (Option A: Client status ACTIVE and has active advisory subscription)
    let activeClientsCount = 0;
    try {
      const now = new Date();
      const activeAdvisorySubs = await dynamicDb.Subscription.find({
        status: 'ACTIVE',
        endDate: { $gte: now }
      }).select('clientId').lean();

      const activeClientIds = new Set(activeAdvisorySubs.map((s: any) => String(s.clientId)));
      activeClientsCount = activeClientIds.size;
    } catch {}

    // 3. Check legacy unassigned status
    const isLegacyUnassigned = !activeSub;

    // 4. Fetch all available platform plans for upgrade preview
    let availablePlans: any[] = [];
    try {
      availablePlans = await PlatformPlan.find({ isActive: true }).sort({ price: 1 }).lean();
    } catch {}

    // 5. Fetch past invoices for this tenant
    let invoices: any[] = [];
    try {
      invoices = await PlatformInvoice.find({
        $or: [{ tenantId: companyId }, { tenantId }]
      }).sort({ createdAt: -1 }).lean();
    } catch {}

    return res.status(200).json({
      success: true,
      data: {
        isLegacyUnassigned,
        company: {
          id: companyId,
          companyName: company?.companyName || 'My Organization',
          state: company?.state || '',
          email: company?.email || '',
          mobile: company?.mobile || ''
        },
        subscription: activeSub || null,
        activeClientsCount,
        maxActiveClients: activeSub?.maxActiveClients ?? null,
        availablePlans,
        invoices
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
