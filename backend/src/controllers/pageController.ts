import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import { syncTenantToRemote } from '../services/tenantSyncDispatcher';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// ----------------------------------------------------
// CUSTOM PAGES (POLICIES)
// ----------------------------------------------------

export const getActivePages = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');

    let pages = await dynamicDb.CustomPage.find({
      tenantId,
      status: 'ACTIVE'
    })
      .select('title slug type content externalUrl isSystem')
      .sort({ createdAt: 1 })
      .lean();

    // Only return pages explicitly marked ACTIVE by the admin
    // Also, explicitly exclude complaint-status because it is now a dedicated sidebar feature, not a policy.
    pages = pages.filter((p: any) => p.slug !== 'complaint-status');

    res.status(200).json({ success: true, data: pages });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPageBySlug = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { slug } = req.params;

    const page = await dynamicDb.CustomPage.findOne({
      tenantId,
      slug
    }).lean();

    if (!page || page.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    res.status(200).json({ success: true, data: page });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAdminPages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const pages = await dynamicDb.CustomPage.find({ tenantId })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({ success: true, data: pages });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const savePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { id, title, slug, type, content, externalUrl, status } = req.body;

    if (!title || !slug || !type) {
      throw new Error('Title, slug, and type are required');
    }

    let page;
    if (id) {
      if (!isValidObjectId(id)) throw new Error('Invalid Page ID format');
      page = await dynamicDb.CustomPage.findByIdAndUpdate(
        id,
        {
          $set: {
            title,
            slug,
            type,
            content: type === 'CONTENT' ? content : null,
            externalUrl: type === 'URL' ? externalUrl : null,
            status
          }
        },
        { returnDocument: 'after', lean: true }
      );
    } else {
      page = await dynamicDb.CustomPage.create({
        tenantId,
        title,
        slug,
        type,
        content: type === 'CONTENT' ? content : null,
        externalUrl: type === 'URL' ? externalUrl : null,
        status: status || 'ACTIVE'
      });
    }

    // Automatically sync updated page to tenant's domain DB
    syncTenantToRemote(tenantId, { reason: 'PAGE_UPDATE' }).catch((e: any) =>
      console.warn(`[PageSync] Domain sync note for tenant ${tenantId}:`, e.message)
    );

    res.status(200).json({ success: true, message: 'Page saved successfully', data: page });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { id } = req.params;

    if (!isValidObjectId(id)) throw new Error('Invalid Page ID format');
    const page = await dynamicDb.CustomPage.findById(id);
    if (!page || page.tenantId !== tenantId) throw new Error('Page not found');

    await dynamicDb.CustomPage.findByIdAndDelete(id);

    // Automatically sync deletion to tenant's domain DB
    syncTenantToRemote(tenantId, { reason: 'PAGE_DELETE' }).catch((e: any) =>
      console.warn(`[PageSync] Domain sync note for tenant ${tenantId}:`, e.message)
    );

    res.status(200).json({ success: true, message: 'Page deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// COMPLAINT STATUS REPORT
// ----------------------------------------------------

export const getComplaintReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');

    const { month, year } = req.query;

    let targetMonth: number;
    let targetYear: number;

    if (month && year) {
      targetMonth = parseInt(month as string);
      targetYear = parseInt(year as string);
    } else {
      const now = new Date();
      if (now.getMonth() === 0) {
        // Jan -> Dec of prev year
        targetMonth = 12;
        targetYear = now.getFullYear() - 1;
      } else {
        targetMonth = now.getMonth(); // 1-12 mapped
        targetYear = now.getFullYear();
      }
    }

    const report = await dynamicDb.ComplaintMonthlyReport.findOne({
      tenantId,
      month: targetMonth,
      year: targetYear
    }).lean();

    res.status(200).json({
      success: true,
      data: report ? JSON.parse(report.data) : null,
      month: targetMonth,
      year: targetYear
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const saveComplaintReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { month, year, data } = req.body;

    if (!month || !year || !data) {
      throw new Error('Month, year, and data are required');
    }

    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

    const report = await dynamicDb.ComplaintMonthlyReport.findOneAndUpdate(
      {
        tenantId,
        month: parseInt(month),
        year: parseInt(year)
      },
      {
        $set: { data: jsonStr },
        $setOnInsert: {
          tenantId,
          month: parseInt(month),
          year: parseInt(year)
        }
      },
      { upsert: true, returnDocument: 'after', lean: true }
    );

    res.status(200).json({ success: true, message: 'Complaint report saved successfully', data: report });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getComplaintReportHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');

    const reports = await dynamicDb.ComplaintMonthlyReport.find({ tenantId })
      .sort({ year: -1, month: -1 })
      .lean();

    const parsedReports = reports.map((r: any) => ({
      id: String(r._id || r.id),
      month: r.month,
      year: r.year,
      updatedAt: r.updatedAt,
      data: JSON.parse(r.data)
    }));

    res.status(200).json({
      success: true,
      data: parsedReports
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
