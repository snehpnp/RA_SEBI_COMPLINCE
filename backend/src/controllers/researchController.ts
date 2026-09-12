import { Response } from 'express';
import dynamicDb from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';

export const createResearch = async (req: AuthenticatedRequest, res: Response) => {
  const { segment, type, title, summary, details, recommendation, targetPrice } = req.body;
  const tenantId = req.user!.tenantId!;

  if (!segment || !type || !title || !summary || !details) {
    return res.status(400).json({ success: false, message: 'Missing required research fields.' });
  }

  try {
    const tenant = await dynamicDb.Tenant.findById(tenantId).lean();
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant company not found' });

    // Set disclaimer and conflict disclosure default text
    const disclaimer = 'Investments in securities market are subject to market risks. Read all the related documents carefully before investing.';
    const conflictDisclosure = 'The research analyst or their associates/relatives do not hold any financial interest in the subject company.';

    const report = await dynamicDb.ResearchReport.create({
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
    });

    return res.status(201).json({
      success: true,
      message: 'Research draft created successfully.',
      data: {
        ...report.toObject(),
        id: report._id.toString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateResearch = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { segment, type, title, summary, details, recommendation, targetPrice } = req.body;

  try {
    const existing = await dynamicDb.ResearchReport.findById(id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Research report not found.' });

    // Version Control Rule: Published research is LOCKED. Cannot edit. Must create a new version.
    if (existing.status === 'PUBLISHED') {
      const nextVersion = (existing.version || 1) + 1;
      const newVersionReport = await dynamicDb.ResearchReport.create({
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
      });

      // Archive old one
      await dynamicDb.ResearchReport.findByIdAndUpdate(id, {
        $set: { status: 'ARCHIVED' }
      });

      return res.status(200).json({
        success: true,
        message: 'Research is locked because it was already published. Created a new draft version.',
        data: {
          ...newVersionReport.toObject(),
          id: newVersionReport._id.toString()
        }
      });
    }

    // Otherwise edit standard draft
    const updated = await dynamicDb.ResearchReport.findByIdAndUpdate(
      id,
      {
        $set: {
          segment,
          type,
          title,
          summary,
          details,
          recommendation,
          targetPrice: targetPrice ? parseFloat(targetPrice) : null
        }
      },
      { returnDocument: 'after', lean: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Research draft updated successfully.',
      data: updated ? { ...updated, id: updated._id?.toString() || updated.id } : null
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
    const report = await dynamicDb.ResearchReport.findById(id).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Research report not found.' });

    const published = await dynamicDb.ResearchReport.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      },
      { returnDocument: 'after', lean: true }
    );

    // Notify all active clients in this tenant
    const tenantUsers = await dynamicDb.User.find({ tenantId: report.tenantId }).select('_id').lean();
    const userIds = tenantUsers.map(u => u._id);

    const activeClients = await dynamicDb.Client.find({
      userId: { $in: userIds },
      status: 'ACTIVE'
    }).lean();

    const clientIds = activeClients.map(c => c._id);
    const activePlans = await dynamicDb.Plan.find({
      researchSegments: { $regex: report.segment, $options: 'i' }
    }).select('_id').lean();
    const planIds = activePlans.map(p => p._id);

    const activeSubscriptions = await dynamicDb.Subscription.find({
      clientId: { $in: clientIds },
      planId: { $in: planIds },
      status: 'ACTIVE'
    }).lean();

    const eligibleClientIds = new Set(activeSubscriptions.map((s: any) => s.clientId.toString()));
    const subscribedClients = activeClients.filter((c: any) => eligibleClientIds.has(c._id.toString()));

    // Create Notification Logs
    for (const client of subscribedClients) {
      if (client.email) {
        await dynamicDb.NotificationLog.create({
          tenantId: report.tenantId,
          recipient: client.email,
          channel: 'EMAIL',
          title: `New Research Recommendation: ${report.title}`,
          message: `Dear ${client.name}, a new research call has been published. Title: ${report.title}. Target: ${report.targetPrice}. Check the Client portal for details.`,
          status: 'SENT'
        });
      }
    }

    await logAudit({
      tenantId: report.tenantId.toString(),
      userId: req.user!.id,
      action: 'PUBLISH',
      module: 'RESEARCH',
      newValue: published,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Research call published successfully. Dispatched notifications to ${subscribedClients.length} clients.`,
      data: published ? { ...published, id: published._id?.toString() || published.id } : null
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
      const client = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
      if (!client || client.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted',
          errors: ['You must have an active subscription to access research recommendations.']
        });
      }

      // Filter only published reports matching the segment access from the active plan
      const activeSub: any = await dynamicDb.Subscription.findOne({
        clientId: client._id,
        status: 'ACTIVE'
      }).populate('plan').lean();

      if (!activeSub) {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted',
          errors: ['No active subscription found.']
        });
      }

      const plan = (activeSub.planId || activeSub.plan) as any;
      const allowedSegments = plan?.researchSegments ? plan.researchSegments.split(',').map((s: string) => s.trim()) : [];

      filter = {
        tenantId,
        status: 'PUBLISHED',
        segment: { $in: allowedSegments },
        deletedAt: null
      };
    }

    const reports = await dynamicDb.ResearchReport.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const formattedReports = reports.map((r: any) => ({
      ...r,
      id: r._id?.toString() || r.id
    }));

    return res.status(200).json({ success: true, data: formattedReports });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const viewResearchDetail = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userRole = req.user!.role;

  try {
    const report = await dynamicDb.ResearchReport.findById(id).lean();
    if (!report || report.deletedAt) {
      return res.status(404).json({ success: false, message: 'Research recommendation not found.' });
    }

    // Client verification
    if (userRole === 'CLIENT') {
      const client = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
      if (!client || client.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Active subscription required.' });
      }

      // Save view analytics
      await dynamicDb.ResearchAnalytics.create({
        reportId: id,
        userId: req.user!.id,
        action: 'VIEW',
        ipAddress: req.ip
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        id: report._id?.toString() || report.id
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
