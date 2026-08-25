import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';

export const createResearch = async (req: AuthenticatedRequest, res: Response) => {
  const { segment, type, title, summary, details, recommendation, targetPrice } = req.body;
  const tenantId = req.user!.tenantId!;

  if (!segment || !type || !title || !summary || !details) {
    return res.status(400).json({ success: false, message: 'Missing required research fields.' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant company not found' });

    // Set disclaimer and conflict disclosure default text
    const disclaimer = 'Investments in securities market are subject to market risks. Read all the related documents carefully before investing.';
    const conflictDisclosure = 'The research analyst or their associates/relatives do not hold any financial interest in the subject company.';

    const report = await prisma.researchReport.create({
      data: {
        tenantId,
        segment,
        type,
        title,
        summary,
        details,
        recommendation,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        disclaimer,
        conflictDisclosure,
        sebiRegNo: tenant.sebiRegistration,
        version: 1,
        status: 'DRAFT',
        createdById: req.user!.id
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Research draft created successfully.',
      data: report
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateResearch = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { segment, type, title, summary, details, recommendation, targetPrice } = req.body;

  try {
    const existing = await prisma.researchReport.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Research report not found.' });

    // Version Control Rule: Published research is LOCKED. Cannot edit. Must create a new version.
    if (existing.status === 'PUBLISHED') {
      const nextVersion = existing.version + 1;
      const newVersionReport = await prisma.researchReport.create({
        data: {
          tenantId: existing.tenantId,
          segment: segment || existing.segment,
          type: type || existing.type,
          title: title || existing.title,
          summary: summary || existing.summary,
          details: details || existing.details,
          recommendation: recommendation || existing.recommendation,
          targetPrice: targetPrice ? parseFloat(targetPrice) : existing.targetPrice,
          disclaimer: existing.disclaimer,
          conflictDisclosure: existing.conflictDisclosure,
          sebiRegNo: existing.sebiRegNo,
          version: nextVersion,
          status: 'DRAFT',
          createdById: req.user!.id
        }
      });

      // Archive old one
      await prisma.researchReport.update({
        where: { id },
        data: { status: 'ARCHIVED' }
      });

      return res.status(200).json({
        success: true,
        message: 'Research is locked because it was already published. Created a new draft version.',
        data: newVersionReport
      });
    }

    // Otherwise edit standard draft
    const updated = await prisma.researchReport.update({
      where: { id },
      data: {
        segment,
        type,
        title,
        summary,
        details,
        recommendation,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Research draft updated successfully.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const publishResearch = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { acceptTnc, acceptPolicy, acceptConsent } = req.body;

  // Publish checklist validation
  if (!acceptTnc || !acceptPolicy || !acceptConsent) {
    return res.status(400).json({
      success: false,
      message: 'Publish Blocked',
      errors: ['You must accept the terms, advisor policies, and disclosures checklist before publishing.']
    });
  }

  try {
    const report = await prisma.researchReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ success: false, message: 'Research report not found.' });

    const published = await prisma.researchReport.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });

    // Notify all active clients in this tenant
    const subscribedClients = await prisma.client.findMany({
      where: {
        user: { tenantId: report.tenantId },
        status: 'ACTIVE',
        subscriptions: {
          some: {
            status: 'ACTIVE',
            plan: {
              researchSegments: {
                contains: report.segment
              }
            }
          }
        }
      }
    });

    // Create Notification Logs
    for (const client of subscribedClients) {
      await prisma.notificationLog.create({
        data: {
          tenantId: report.tenantId,
          recipient: client.email,
          channel: 'EMAIL',
          title: `New Research Recommendation: ${report.title}`,
          message: `Dear ${client.name}, a new research call has been published. Title: ${report.title}. Target: ${report.targetPrice}. Check the Client portal for details.`,
          status: 'SENT'
        }
      });
    }

    await logAudit({
      tenantId: report.tenantId,
      userId: req.user!.id,
      action: 'PUBLISH',
      module: 'RESEARCH',
      newValue: published,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Research call published successfully. Dispatched notifications to ${subscribedClients.length} clients.`,
      data: published
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const listResearch = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const userRole = req.user!.role;

  if (!tenantId) {
    return res.status(200).json({ success: true, data: [] });
  }

  try {
    let filter: any = { tenantId, deletedAt: null };

    // Strict Client Subscription and Web-only View Rules
    if (userRole === 'CLIENT') {
      const client = await prisma.client.findFirst({ where: { userId: req.user!.id } });
      if (!client || client.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted',
          errors: ['You must have an active subscription to access research recommendations.']
        });
      }

      // Filter only published reports matching the segment access from the active plan
      const activeSub = await prisma.subscription.findFirst({
        where: { clientId: client.id, status: 'ACTIVE' },
        include: { plan: true }
      });

      if (!activeSub) {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted',
          errors: ['No active subscription found.']
        });
      }

      const allowedSegments = activeSub.plan.researchSegments.split(',');
      filter = {
        tenantId,
        status: 'PUBLISHED',
        segment: { in: allowedSegments },
        deletedAt: null
      };
    }

    const reports = await prisma.researchReport.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: reports });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const viewResearchDetail = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userRole = req.user!.role;

  try {
    const report = await prisma.researchReport.findUnique({ where: { id } });
    if (!report || report.deletedAt) {
      return res.status(404).json({ success: false, message: 'Research recommendation not found.' });
    }

    // Client verification
    if (userRole === 'CLIENT') {
      const client = await prisma.client.findFirst({ where: { userId: req.user!.id } });
      if (!client || client.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Active subscription required.' });
      }

      // Save view analytics
      await prisma.researchAnalytics.create({
        data: {
          reportId: id,
          userId: req.user!.id,
          action: 'VIEW',
          ipAddress: req.ip
        }
      });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
