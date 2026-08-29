"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveComplaint = exports.createComplaint = exports.getComplaints = void 0;
const client_1 = require("@prisma/client");
const complianceDateHelper_1 = require("../utils/complianceDateHelper");
const emailService_1 = require("../services/emailService");
const prisma = new client_1.PrismaClient();
// Get all complaints for a tenant
const getComplaints = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required in headers' });
        }
        let whereClause = { tenantId };
        if (req.user?.role === 'CLIENT') {
            const client = await prisma.client.findFirst({ where: { userId: req.user.id } });
            if (client) {
                whereClause.clientId = client.id;
            }
            else {
                return res.json([]);
            }
        }
        const complaints = await prisma.complaint.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        res.json(complaints);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
};
exports.getComplaints = getComplaints;
// Create a new complaint manually
const createComplaint = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'] || 'system';
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required in headers' });
        }
        let { clientName, clientPan, clientEmail, clientMobile, source, scoresRefId, subject, description, receivedAt } = req.body;
        let clientId = null;
        if (req.user?.role === 'CLIENT') {
            const client = await prisma.client.findFirst({ where: { userId: req.user.id } });
            if (client) {
                clientId = client.id;
                clientName = client.name;
                clientEmail = client.email || '';
                clientMobile = client.mobile || '';
                clientPan = client.pan || '';
                source = 'CLIENT_PORTAL';
            }
        }
        else {
            clientId = req.body.clientId || null;
        }
        const receivedDate = receivedAt ? new Date(receivedAt) : new Date();
        const deadlineDate = new Date(receivedDate);
        deadlineDate.setDate(deadlineDate.getDate() + 21); // SEBI 21 days resolution deadline
        const complaint = await prisma.complaint.create({
            data: {
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
            }
        });
        let actualUserId = userId;
        let adminEmail = null;
        if (userId === 'system' || !userId || req.user?.role === 'CLIENT') {
            const adminUser = await prisma.user.findFirst({ where: { tenantId, role: { name: 'ADMIN' } } });
            if (adminUser) {
                actualUserId = adminUser.id;
                adminEmail = adminUser.email;
            }
        }
        if (actualUserId && actualUserId !== 'system' && req.user?.role !== 'CLIENT') {
            // Create Audit Log if created by admin/staff
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    userId: actualUserId,
                    action: 'CREATE',
                    module: 'COMPLIANCE',
                    newValue: JSON.stringify(complaint),
                }
            });
        }
        if (req.user?.role === 'CLIENT' && adminEmail) {
            await (0, emailService_1.sendComplaintNotificationEmail)({
                tenantId,
                adminEmail,
                clientName,
                clientPan: clientPan || '',
                subject,
                description
            });
        }
        res.status(201).json(complaint);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create complaint' });
    }
};
exports.createComplaint = createComplaint;
// Resolve a complaint
const resolveComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'] || 'system';
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
        const complaint = await prisma.complaint.update({
            where: { id },
            data: {
                status: 'CLOSED',
                resolutionNote,
                atrProofUrl,
                resolvedAt: new Date()
            }
        });
        let actualUserId = userId;
        if (userId === 'system' || !userId) {
            const adminUser = await prisma.user.findFirst({ where: { tenantId } });
            if (adminUser)
                actualUserId = adminUser.id;
        }
        if (actualUserId && actualUserId !== 'system') {
            // Create Audit Log
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    userId: actualUserId,
                    action: 'UPDATE',
                    module: 'COMPLIANCE',
                    oldValue: JSON.stringify({ status: 'OPEN' }),
                    newValue: JSON.stringify({ status: 'CLOSED', resolutionNote, atrProofUrl }),
                }
            });
        }
        // Check if all complaints for this tenant are resolved
        const openComplaintsCount = await prisma.complaint.count({
            where: { tenantId, status: 'OPEN' }
        });
        if (openComplaintsCount === 0) {
            const scoresRequirement = await prisma.complianceRequirement.findFirst({
                where: { serialNo: 44 }
            });
            if (scoresRequirement) {
                const activeAudit = await prisma.complianceAudit.findFirst({
                    where: {
                        tenantId,
                        requirementId: scoresRequirement.id,
                        status: { in: ['PENDING', 'OVERDUE', 'NON_COMPLIANT'] }
                    }
                });
                if (activeAudit) {
                    const prevStatus = activeAudit.status;
                    // Update compliance audit status to COMPLIANT
                    await prisma.complianceAudit.update({
                        where: { id: activeAudit.id },
                        data: {
                            status: 'COMPLIANT',
                            officerRemarks: `Auto-resolved: All SEBI complaints closed. Resolved complaint ID: ${id}.`
                        }
                    });
                    // Write to ComplianceAuditHistory
                    const period = (0, complianceDateHelper_1.getCompliancePeriod)(scoresRequirement.frequencyType, activeAudit.updatedAt || new Date());
                    const updaterUser = await prisma.user.findUnique({
                        where: { id: actualUserId }
                    });
                    const updatedByName = updaterUser ? `${updaterUser.firstName} ${updaterUser.lastName}` : 'System';
                    await prisma.complianceAuditHistory.create({
                        data: {
                            tenantId,
                            requirementId: scoresRequirement.id,
                            auditId: activeAudit.id,
                            previousStatus: prevStatus,
                            newStatus: 'COMPLIANT',
                            officerRemarks: `Auto-resolved: All SEBI complaints closed. Resolved complaint ID: ${id}.`,
                            proofDocumentUrl: atrProofUrl,
                            updatedByUserId: actualUserId,
                            updatedByName,
                            periodLabel: period.label
                        }
                    });
                }
            }
        }
        // Write individual complaint resolution to ComplianceAuditHistory
        // Find SCORES-related requirement (serialNo 44) to link the history record
        const scoresReq = await prisma.complianceRequirement.findFirst({
            where: { serialNo: 44 }
        });
        if (scoresReq) {
            const activeAudit = await prisma.complianceAudit.findFirst({
                where: {
                    tenantId,
                    requirementId: scoresReq.id
                },
                orderBy: { updatedAt: 'desc' }
            });
            if (activeAudit) {
                const period = (0, complianceDateHelper_1.getCompliancePeriod)(scoresReq.frequencyType, activeAudit.updatedAt || new Date());
                const updaterUser = actualUserId && actualUserId !== 'system'
                    ? await prisma.user.findUnique({ where: { id: actualUserId } })
                    : null;
                const updatedByName = updaterUser ? `${updaterUser.firstName} ${updaterUser.lastName}` : 'System';
                await prisma.complianceAuditHistory.create({
                    data: {
                        tenantId,
                        requirementId: scoresReq.id,
                        auditId: activeAudit.id,
                        previousStatus: activeAudit.status,
                        newStatus: activeAudit.status, // Status may not change for individual complaint
                        officerRemarks: `Complaint resolved: ${complaint.subject || id}. ATR: ${resolutionNote}`,
                        proofDocumentUrl: atrProofUrl,
                        updatedByUserId: actualUserId !== 'system' ? actualUserId : undefined,
                        updatedByName,
                        periodLabel: period.label
                    }
                });
            }
        }
        res.json({ success: true, message: 'Complaint resolved successfully.', data: complaint });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
    }
};
exports.resolveComplaint = resolveComplaint;
