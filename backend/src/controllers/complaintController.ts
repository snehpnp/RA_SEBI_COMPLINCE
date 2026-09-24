import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import { getCompliancePeriod } from '../utils/complianceDateHelper';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendComplaintNotificationEmail } from '../services/emailService';

// Get all complaints for a tenant
export const getComplaints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required in headers' });
    }

    let whereClause: any = { tenantId };

    if (req.user?.role === 'CLIENT') {
      const client = await dynamicDb.Client.findOne({ userId: req.user.id }).lean();
      if (client) {
        whereClause.clientId = client._id;
      } else {
        return res.json([]);
      }
    }

    const complaints = await dynamicDb.Complaint.find(whereClause)
      .sort({ createdAt: -1 })
      .lean();

    const formattedComplaints = complaints.map((c: any) => ({
      ...c,
      id: c._id?.toString() || c.id
    }));

    return res.json(formattedComplaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// Create a new complaint manually
export const createComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || req.user?.tenantId;
    const userId = (req.headers['x-user-id'] as string) || req.user?.id || 'system';
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required in headers' });
    }

    let { clientName, clientPan, clientEmail, clientMobile, source, scoresRefId, subject, description, receivedAt } = req.body;
    let clientId = null;

    if (req.user?.role === 'CLIENT') {
      const client = await dynamicDb.Client.findOne({ userId: req.user.id }).lean();
      if (client) {
        clientId = client._id;
        clientName = client.name;
        clientEmail = client.email || '';
        clientMobile = client.mobile || '';
        clientPan = client.pan || '';
        source = 'CLIENT_PORTAL';
      }
    } else {
      clientId = req.body.clientId || null;
    }
    
    const receivedDate = receivedAt ? new Date(receivedAt) : new Date();
    const deadlineDate = new Date(receivedDate);
    deadlineDate.setDate(deadlineDate.getDate() + 21); // SEBI 21 days resolution deadline

    const complaint = await dynamicDb.Complaint.create({
      tenantId,
      clientId,
      clientName,
      clientEmail,
      clientMobile,
      clientPan,
      source,
      scoresRefId,
      subject,
      description,
      receivedAt: receivedDate,
      deadlineAt: deadlineDate,
      status: 'OPEN'
    });

    let actualUserId = userId;
    let adminEmail = null;
    if (userId === 'system' || !userId || req.user?.role === 'CLIENT') {
      const adminRole = await dynamicDb.Role.findOne({ name: 'ADMIN' }).lean();
      const adminUser = await dynamicDb.User.findOne({
        tenantId,
        ...(adminRole ? { roleId: adminRole._id } : {})
      }).lean();
      if (adminUser) {
        actualUserId = adminUser._id.toString();
        adminEmail = adminUser.email;
      }
    }

    if (actualUserId && actualUserId !== 'system' && req.user?.role !== 'CLIENT') {
      // Create Audit Log if created by admin/staff
      await dynamicDb.AuditLog.create({
        tenantId,
        userId: actualUserId,
        action: 'CREATE',
        module: 'COMPLIANCE',
        newValue: JSON.stringify(complaint.toObject())
      });
    }

    if (req.user?.role === 'CLIENT' && adminEmail) {
      await sendComplaintNotificationEmail({
        tenantId,
        adminEmail,
        clientName,
        clientPan: clientPan || '',
        subject,
        description
      });
    }

    return res.status(201).json({
      ...complaint.toObject(),
      id: complaint._id.toString()
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create complaint' });
  }
};

// Resolve a complaint
export const resolveComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const userId = (req.headers['x-user-id'] as string) || (req as any).user?.id || 'system';
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    // Frontend sends 'remarks', fallback to 'resolutionNote' for backward compatibility
    const resolutionNote = req.body.remarks || req.body.resolutionNote || '';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'ATR Proof document is mandatory to resolve a complaint.' });
    }
    
    const atrProofUrl = `/uploads/compliance/${file.filename}`;

    const complaint = await dynamicDb.Complaint.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'CLOSED',
          resolutionNote,
          atrProofUrl,
          resolvedAt: new Date()
        }
      },
      { returnDocument: 'after', lean: true }
    );

    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found.' });
    }

    let actualUserId = userId;
    if (userId === 'system' || !userId) {
      const adminUser = await dynamicDb.User.findOne({ tenantId }).lean();
      if (adminUser) actualUserId = adminUser._id.toString();
    }

    if (actualUserId && actualUserId !== 'system') {
      // Create Audit Log
      await dynamicDb.AuditLog.create({
        tenantId,
        userId: actualUserId,
        action: 'UPDATE',
        module: 'COMPLIANCE',
        oldValue: JSON.stringify({ status: 'OPEN' }),
        newValue: JSON.stringify({ status: 'CLOSED', resolutionNote, atrProofUrl })
      });
    }

    // Check if all complaints for this tenant are resolved
    const openComplaintsCount = await dynamicDb.Complaint.countDocuments({
      tenantId,
      status: 'OPEN'
    });

    if (openComplaintsCount === 0) {
      const scoresRequirement = await dynamicDb.ComplianceRequirement.findOne({
        serialNo: 44
      }).lean();

      if (scoresRequirement) {
        const activeAudit = await dynamicDb.ComplianceAudit.findOne({
          tenantId,
          requirementId: scoresRequirement._id,
          status: { $in: ['PENDING', 'OVERDUE', 'NON_COMPLIANT'] }
        }).lean();

        if (activeAudit) {
          const prevStatus = activeAudit.status;
          
          // Update compliance audit status to COMPLIANT
          await dynamicDb.ComplianceAudit.findByIdAndUpdate(activeAudit._id, {
            $set: {
              status: 'COMPLIANT',
              officerRemarks: `Auto-resolved: All SEBI complaints closed. Resolved complaint ID: ${id}.`
            }
          });

          // Write to ComplianceAuditHistory
          const period = getCompliancePeriod(scoresRequirement.frequencyType, activeAudit.updatedAt || new Date());
          const updaterUser = await dynamicDb.User.findById(actualUserId).lean();
          const updatedByName = updaterUser ? `${updaterUser.firstName || ''} ${updaterUser.lastName || ''}`.trim() : 'System';

          await dynamicDb.ComplianceAuditHistory.create({
            tenantId,
            requirementId: scoresRequirement._id,
            auditId: activeAudit._id,
            previousStatus: prevStatus,
            newStatus: 'COMPLIANT',
            officerRemarks: `Auto-resolved: All SEBI complaints closed. Resolved complaint ID: ${id}.`,
            proofDocumentUrl: atrProofUrl,
            updatedByUserId: actualUserId,
            updatedByName,
            periodLabel: period.label
          });
        }
      }
    }

    // Write individual complaint resolution to ComplianceAuditHistory
    // Find SCORES-related requirement (serialNo 44) to link the history record
    const scoresReq = await dynamicDb.ComplianceRequirement.findOne({
      serialNo: 44
    }).lean();

    if (scoresReq) {
      const activeAudit = await dynamicDb.ComplianceAudit.findOne({
        tenantId,
        requirementId: scoresReq._id
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (activeAudit) {
        const period = getCompliancePeriod(scoresReq.frequencyType, activeAudit.updatedAt || new Date());
        const updaterUser = actualUserId && actualUserId !== 'system'
          ? await dynamicDb.User.findById(actualUserId).lean()
          : null;
        const updatedByName = updaterUser ? `${updaterUser.firstName || ''} ${updaterUser.lastName || ''}`.trim() : 'System';

        await dynamicDb.ComplianceAuditHistory.create({
          tenantId,
          requirementId: scoresReq._id,
          auditId: activeAudit._id,
          previousStatus: activeAudit.status,
          newStatus: activeAudit.status, // Status may not change for individual complaint
          officerRemarks: `Complaint resolved: ${complaint.subject || id}. ATR: ${resolutionNote}`,
          proofDocumentUrl: atrProofUrl,
          updatedByUserId: actualUserId !== 'system' ? actualUserId : undefined,
          updatedByName,
          periodLabel: period.label
        });
      }
    }

    return res.json({
      success: true,
      message: 'Complaint resolved successfully.',
      data: {
        ...complaint,
        id: complaint._id?.toString() || complaint.id
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
  }
};
