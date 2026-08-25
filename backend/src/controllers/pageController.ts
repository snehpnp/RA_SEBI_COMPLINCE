import { Request, Response } from 'express';
import prisma from '../config/db';

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

    let pages = await prisma.customPage.findMany({
      where: {
        tenantId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        content: true,
        externalUrl: true,
        isSystem: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Only return pages explicitly marked ACTIVE by the admin
    // Removed strict content checks so that the Active/Inactive toggle determines visibility.
    // Also, explicitly exclude complaint-status because it is now a dedicated sidebar feature, not a policy.
    pages = pages.filter(p => p.slug !== 'complaint-status');

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

    const page = await prisma.customPage.findUnique({
      where: {
        tenantId_slug: { tenantId, slug }
      }
    });

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
    const tenantId = req.user!.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    let pages = await prisma.customPage.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    const mandatoryPagesTemplate = [
      { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', isSystem: true, tenantId },
      { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', isSystem: true, tenantId },
      { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', isSystem: true, tenantId },
      { title: 'Grievance Redressal Process', slug: 'grievance-redressal', type: 'CONTENT', isSystem: true, tenantId },
      { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', isSystem: true, tenantId },
    ];

    const existingSlugs = new Set(pages.map(p => p.slug));
    const missingPages = mandatoryPagesTemplate.filter(p => !existingSlugs.has(p.slug));

    if (missingPages.length > 0) {
      await prisma.customPage.createMany({ data: missingPages as any });
      
      pages = await prisma.customPage.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
      });
    }

    res.status(200).json({ success: true, data: pages });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const savePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { id, title, slug, type, content, externalUrl, status } = req.body;

    if (!title || !slug || !type) {
      throw new Error('Title, slug, and type are required');
    }

    let page;
    if (id) {
      if (!isValidObjectId(id)) throw new Error('Invalid Page ID format');
      page = await prisma.customPage.update({
        where: { id },
        data: {
          title,
          slug,
          type,
          content: type === 'CONTENT' ? content : null,
          externalUrl: type === 'URL' ? externalUrl : null,
          status
        }
      });
    } else {
      page = await prisma.customPage.create({
        data: {
          tenantId,
          title,
          slug,
          type,
          content: type === 'CONTENT' ? content : null,
          externalUrl: type === 'URL' ? externalUrl : null,
          status: status || 'ACTIVE'
        }
      });
    }

    res.status(200).json({ success: true, message: 'Page saved successfully', data: page });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { id } = req.params;

    if (!isValidObjectId(id)) throw new Error('Invalid Page ID format');
    const page = await prisma.customPage.findUnique({ where: { id } });
    if (!page || page.tenantId !== tenantId) throw new Error('Page not found');
    if (page.isSystem) throw new Error('Cannot delete a system page');

    await prisma.customPage.delete({ where: { id } });

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

    let { month, year } = req.query;
    
    let targetMonth: number;
    let targetYear: number;

    if (month && year) {
      targetMonth = parseInt(month as string);
      targetYear = parseInt(year as string);
    } else {
      const now = new Date();
      if (now.getMonth() === 0) { // Jan -> Dec of prev year
        targetMonth = 12;
        targetYear = now.getFullYear() - 1;
      } else {
        targetMonth = now.getMonth(); // 1-12 mapped
        targetYear = now.getFullYear();
      }
    }

    const report = await prisma.complaintMonthlyReport.findUnique({
      where: {
        tenantId_month_year: { tenantId, month: targetMonth, year: targetYear }
      }
    });

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
    const tenantId = req.user!.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');
    const { month, year, data } = req.body;

    if (!month || !year || !data) {
      throw new Error('Month, year, and data are required');
    }

    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

    const report = await prisma.complaintMonthlyReport.upsert({
      where: {
        tenantId_month_year: { tenantId, month: parseInt(month), year: parseInt(year) }
      },
      update: { data: jsonStr },
      create: {
        tenantId,
        month: parseInt(month),
        year: parseInt(year),
        data: jsonStr
      }
    });

    res.status(200).json({ success: true, message: 'Complaint report saved successfully', data: report });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getComplaintReportHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || !isValidObjectId(tenantId)) throw new Error('Valid Tenant ID required');

    const reports = await prisma.complaintMonthlyReport.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    const parsedReports = reports.map(r => ({
      id: r.id,
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
