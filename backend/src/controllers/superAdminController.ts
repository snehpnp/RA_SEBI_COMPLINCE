import { Response } from 'express';
import { MongoClient } from 'mongodb';
import prisma from '../config/db';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { provisionAllTenantCollections, provisionTenantDatabase } from '../services/tenantProvisionService';
import { syncTenantToRemote, syncAllTenantsToRemote } from '../services/tenantSyncDispatcher';
import { ensureStates, detectStateFromGst, detectStateFromText, INDIAN_STATES } from '../services/stateService';
import * as jwt from 'jsonwebtoken';
import fs from 'fs';
const pdfParse = require('pdf-parse');
import { extractTextFromPdf } from '../utils/pdfOcr';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export const createTenant = async (req: AuthenticatedRequest, res: Response) => {
  const {
    companyName,
    panelName,
    domainUrl,
    mongoDbUrl,
    dbName,
    companyType,
    raType,
    ownerName,
    sebiRegistration,
    bseEnrollment,
    email,
    mobile,
    address,
    pan,
    gst,
    website,
    certificateValidity,
    nismValidity,
    depositAmount,
    adminEmail,
    adminPassword,
    password,
    adminName,
    adminMobile,
    state
  } = req.body;

  if (!companyName || !ownerName || !sebiRegistration || !email || !mobile || !pan || !address) {
    return res.status(400).json({
      success: false,
      message: 'All fields are mandatory: Company Name, Owner Name, SEBI Registration, Email, Mobile, PAN, and Address.'
    });
  }

  const adminEmailToUse = (adminEmail || email || '').toLowerCase().trim();
  const rawAdminPassword = (adminPassword || password || '').trim() || ('Temp@' + Math.floor(1000 + Math.random() * 9000));
  const adminFullName = (adminName || ownerName || `${companyName} Admin`).trim();
  const nameParts = adminFullName.split(' ');
  const adminFirstName = nameParts[0] || companyName;
  const adminLastName = nameParts.slice(1).join(' ') || 'Admin';
  const adminMobileToUse = adminMobile || mobile;
  const effectiveState = state || detectStateFromGst(gst) || detectStateFromText(address) || null;

  try {
    // Check duplicates in Tenant table
    const existingTenants = await prisma.tenant.findMany({
      where: {
        OR: [
          { email },
          { sebiRegistration },
          { pan },
          { mobile },
          ...(gst ? [{ gst }] : []),
          ...(bseEnrollment ? [{ bseEnrollment }] : []),
          ...(domainUrl ? [{ domainUrl }] : [])
        ]
      }
    });

    if (existingTenants.length > 0) {
      const duplicates: string[] = [];
      existingTenants.forEach(tenant => {
        if (tenant.email === email) duplicates.push('Email');
        if (tenant.sebiRegistration === sebiRegistration) duplicates.push('SEBI Registration');
        if (tenant.pan === pan) duplicates.push('PAN');
        if (tenant.mobile === mobile) duplicates.push('Mobile');
        if (gst && tenant.gst === gst) duplicates.push('GST');
        if (bseEnrollment && tenant.bseEnrollment === bseEnrollment) duplicates.push('BSE Enrollment');
        if (domainUrl && tenant.domainUrl === domainUrl) duplicates.push('Domain URL');
      });
      const uniqueDuplicates = Array.from(new Set(duplicates));

      return res.status(400).json({
        success: false,
        message: `Duplicate data found for: ${uniqueDuplicates.join(', ')}. Please use unique values.`,
        duplicateFields: uniqueDuplicates,
        errors: [`Duplicate entries found for ${uniqueDuplicates.join(', ')}.`]
      });
    }

    // Check duplicates in User table
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmailToUse }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user with the Admin Email '${adminEmailToUse}' already exists in the system.`,
        duplicateFields: ['Email'],
        errors: ['Duplicate user email found.']
      });
    }

    // Extract certificates from req.files
    let certificateUrl = null;
    let nismCertificateUrl = null;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (files && files.sebiCertificate && files.sebiCertificate[0]) {
      certificateUrl = `/uploads/policies/${files.sebiCertificate[0].filename}`;
    }
    if (files && files.nismCertificate && files.nismCertificate[0]) {
      nismCertificateUrl = `/uploads/policies/${files.nismCertificate[0].filename}`;
    }

    let ocrExtractedReg = sebiRegistration;

    // Hash credentials
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawAdminPassword, salt);
    const generatedApiKey = 'ragcp_' + crypto.randomBytes(16).toString('hex');

    // Execute comprehensive provisioning of all 11 collections on the local master DB
    const provisionResult = await provisionAllTenantCollections(
      prisma,
      {
        companyName,
        panelName: panelName || `${companyName} Portal`,
        domainUrl: domainUrl || null,
        mongoDbUrl: mongoDbUrl || null,
        dbName: dbName || null,
        tenantApiKey: generatedApiKey,
        companyType: companyType || 'INDIVIDUAL',
        raType: raType || 'FULL_TIME',
        ownerName,
        sebiRegistration: ocrExtractedReg,
        bseEnrollment,
        email,
        mobile,
        address,
        pan,
        gst,
        website,
        certificateUrl,
        certificateValidity: certificateValidity ? new Date(certificateValidity) : null,
        nismCertificateUrl,
        nismValidity: nismValidity ? new Date(nismValidity) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0.0,
        state: effectiveState,
        status: 'PENDING_PROFILE'
      },
      {
        email: adminEmailToUse,
        passwordHash,
        tempPassword: rawAdminPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        mobile: adminMobileToUse,
        status: 'ACTIVE'
      }
    );

    const createdTenant = provisionResult.tenant;
    const createdAdminUser = provisionResult.adminUser;

    // Record document history if certificate files were uploaded
    if (certificateUrl && files?.sebiCertificate?.[0]) {
      await prisma.tenantDocumentHistory.create({
        data: {
          tenantId: createdTenant.id,
          docType: 'SEBI_CERTIFICATE',
          fileUrl: certificateUrl,
          fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
        }
      }).catch(() => {});
    }
    if (nismCertificateUrl && files?.nismCertificate?.[0]) {
      await prisma.tenantDocumentHistory.create({
        data: {
          tenantId: createdTenant.id,
          docType: 'NISM_CERTIFICATE',
          fileUrl: nismCertificateUrl,
          fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
        }
      }).catch(() => {});
    }

    // Automatically dispatch sync to remote domainUrl API and dedicated MongoDB
    let syncResult: any = null;
    try {
      syncResult = await syncTenantToRemote(createdTenant.id, {
        reason: 'CREATE',
        adminPassword: rawAdminPassword
      });
    } catch (syncErr: any) {
      console.warn('Auto-sync dispatch warning during tenant creation:', syncErr?.message || syncErr);
    }

    // Write SMTP notification log
    await prisma.notificationLog.create({
      data: {
        tenantId: createdTenant.id,
        recipient: adminEmailToUse,
        channel: 'EMAIL',
        title: 'Company Registration & Account Credentials',
        message: `Welcome ${companyName}! Your company is registered on RAGCP. Credentials: Username: ${adminEmailToUse}, Password: ${rawAdminPassword}. Please complete your profile wizard upon login.`,
        status: 'SENT'
      }
    }).catch(() => {});

    // Log Super Admin Audit Trail
    await logAudit({
      userId: req.user!.id,
      action: 'CREATE',
      module: 'TENANTS',
      newValue: { ...createdTenant, adminEmail: adminEmailToUse, syncResult },
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `Company Tenant onboarded successfully. All collections and baseline data initialized.${syncResult?.domainSyncResult?.success ? ' Synced to domain URL database.' : ''}`,
      data: {
        tenant: createdTenant,
        adminUser: {
          id: createdAdminUser.id,
          email: createdAdminUser.email,
          firstName: createdAdminUser.firstName,
          lastName: createdAdminUser.lastName,
          mobile: createdAdminUser.mobile,
          role: 'ADMIN',
          tempPassword: rawAdminPassword,
          generatedPassword: rawAdminPassword,
          tenantApiKey: generatedApiKey
        },
        syncResult
      }
    });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create company tenant: ' + error.message,
      errors: [error.message]
    });
  }
};

export const getTenantDocumentHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const history = await prisma.tenantDocumentHistory.findMany({
      where: { tenantId: id },
      orderBy: { uploadedAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getTenants = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: tenants });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const toggleTenantStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // ACTIVE, SUSPENDED

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const oldTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!oldTenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { status }
    });

    // Update ALL users of this tenant and revoke all active JWT sessions
    await prisma.user.updateMany({
      where: { tenantId: id },
      data: {
        status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        tokenVersion: { increment: 1 },
        currentSessionId: null
      }
    });

    // Auto-sync status change to remote domainUrl API and dedicated MongoDB in background
    syncTenantToRemote(id, { reason: 'STATUS_CHANGE' }).catch(syncErr => {
      console.warn('Auto-sync status change warning:', syncErr);
    });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Company status changed to ${status}. Panel access has been ${status === 'SUSPENDED' ? 'disabled immediately' : 'reactivated'}. Changes dispatched to domain database.`,
      data: updatedTenant
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const deleteTenant = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const oldTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!oldTenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    // Save the current status before deleting so we can restore it later
    const statusBeforeDelete = oldTenant.status !== 'DELETED' ? oldTenant.status : (oldTenant.previousStatus || 'ACTIVE');

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date(), previousStatus: statusBeforeDelete }
    });

    // Mark ALL users of this tenant as DELETED
    await prisma.user.updateMany({
      where: { tenantId: id },
      data: { status: 'DELETED', deletedAt: new Date() }
    });

    // Auto-sync soft delete to remote domainUrl API and dedicated MongoDB in background
    syncTenantToRemote(id, { reason: 'DELETE' }).catch(syncErr => {
      console.warn('Auto-sync soft-delete warning:', syncErr);
    });

    await logAudit({
      userId: req.user!.id,
      action: 'SOFT_DELETE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Company successfully deleted (soft delete). Status dispatched to domain database.',
      data: updatedTenant
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const restoreTenant = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const oldTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!oldTenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    // Restore to the status the company had BEFORE it was deleted
    const restoreToStatus = oldTenant.previousStatus || 'ACTIVE';

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { status: restoreToStatus, deletedAt: null, previousStatus: null }
    });

    // Restore users: if company restores to SUSPENDED, only restore admin/staff (not to ACTIVE);
    // if restoring to ACTIVE, restore everyone to ACTIVE
    if (restoreToStatus === 'SUSPENDED') {
      await prisma.user.updateMany({
        where: { tenantId: id, deletedAt: { not: null } },
        data: { status: 'ACTIVE', deletedAt: null }
      });
    } else {
      await prisma.user.updateMany({
        where: { tenantId: id },
        data: { status: 'ACTIVE', deletedAt: null }
      });
    }

    // Auto-sync restore to remote domainUrl API and dedicated MongoDB in background
    syncTenantToRemote(id, { reason: 'RESTORE' }).catch(syncErr => {
      console.warn('Auto-sync restore warning:', syncErr);
    });

    await logAudit({
      userId: req.user!.id,
      action: 'RESTORE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Company successfully restored to ${restoreToStatus} status. Changes dispatched to domain database.`,
      data: updatedTenant
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const permanentDeleteTenant = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to confirm permanent deletion' });
    }

    const superAdmin = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!superAdmin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const isMatch = await bcrypt.compare(password, superAdmin.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    const oldTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!oldTenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    // This will cascade delete everything linked to this tenant
    await prisma.tenant.delete({
      where: { id }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'HARD_DELETE',
      module: 'TENANTS',
      oldValue: oldTenant,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Company permanently deleted'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const impersonateTenant = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // tenantId

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Find the Admin user for this tenant
    const adminUser = await prisma.user.findFirst({
      where: { tenantId: id, role: { name: 'ADMIN' } },
      include: { role: true }
    });

    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found for this tenant' });
    }

    // Generate token with isImpersonated flag
    const accessToken = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role.name,
        tenantId: adminUser.tenantId,
        isImpersonated: true
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await logAudit({
      userId: req.user!.id,
      action: 'IMPERSONATE',
      module: 'TENANTS',
      newValue: { impersonatedUserId: adminUser.id, tenantId: id },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Impersonating Admin of ${tenant.companyName}`,
      data: {
        accessToken,
        user: {
          id: adminUser.id,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          email: adminUser.email,
          role: adminUser.role.name,
          tenantId: adminUser.tenantId,
          tenantStatus: tenant.status,
          isImpersonated: true
        }
      }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getGlobalTelemetry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allTenants = await prisma.tenant.findMany({
      select: { id: true, companyName: true, status: true, deletedAt: true }
    });
    const validTenants = allTenants.filter(t => !t.deletedAt && t.status !== 'DELETED');
    const tenantIds = validTenants.map(t => t.id);

    const totalCompanies = validTenants.length;
    const activeCompanies = validTenants.filter(t => t.status === 'ACTIVE').length;
    const suspendedCompanies = validTenants.filter(t => t.status === 'SUSPENDED').length;
    const pendingCompanies = validTenants.filter(t => t.status === 'PENDING_PROFILE').length;

    // Fetch all clients across active/non-deleted tenants
    const allClients = await prisma.client.findMany({
      include: {
        user: {
          select: { id: true, status: true, deletedAt: true, tenantId: true }
        }
      }
    });

    const validClients = allClients.filter(c => c.user && !c.user.deletedAt && c.user.tenantId && tenantIds.includes(c.user.tenantId));
    const totalClients = validClients.length;
    const activeClients = validClients.filter(c => c.status === 'ACTIVE').length;
    const pendingClients = validClients.filter(c => c.status !== 'ACTIVE').length;

    // Fetch all staff across active/non-deleted tenants
    const allStaff = await prisma.staff.findMany({
      include: {
        user: {
          select: { id: true, status: true, deletedAt: true, tenantId: true }
        }
      }
    });
    const validStaff = allStaff.filter(s => s.user && !s.user.deletedAt && s.user.tenantId && tenantIds.includes(s.user.tenantId));
    const totalStaff = validStaff.length;
    const activeStaff = validStaff.filter(s => s.status === 'ACTIVE').length;

    // Fetch alerts count
    const activeAlerts = await prisma.complianceAlert.count({
      where: { tenantId: { in: tenantIds }, status: 'OPEN' }
    });
    const totalAlerts = await prisma.complianceAlert.count({
      where: { tenantId: { in: tenantIds } }
    });
    const resolvedAlerts = await prisma.complianceAlert.count({
      where: { tenantId: { in: tenantIds }, status: 'RESOLVED' }
    });

    // Audit logs count
    const auditLogsCount = await prisma.auditLog.count();

    // Compliance audits count
    const totalAudits = await prisma.complianceAudit.count({
      where: { tenantId: { in: tenantIds } }
    });
    const pendingAudits = await prisma.complianceAudit.count({
      where: { tenantId: { in: tenantIds }, status: { in: ['PENDING', 'OVERDUE'] } }
    });
    const completedAudits = await prisma.complianceAudit.count({
      where: { tenantId: { in: tenantIds }, status: 'COMPLETED' }
    });

    // Plans count
    const allPlans = await prisma.plan.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { id: true, status: true, deletedAt: true }
    });
    const validPlans = allPlans.filter(p => !p.deletedAt);
    const totalPlans = validPlans.length;
    const activePlans = validPlans.filter(p => p.status === 'ACTIVE').length;

    return res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        pendingCompanies,
        totalUsers: totalClients + totalStaff + totalCompanies,
        totalClients,
        activeClients,
        pendingClients,
        totalStaff,
        activeStaff,
        activeAlerts,
        totalAlerts,
        resolvedAlerts,
        auditLogsCount,
        totalAudits,
        pendingAudits,
        completedAudits,
        totalPlans,
        activePlans
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getTenantDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          include: { role: true, staff: { include: { personAssociated: true } } }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const admin = tenant.users.find(u => u.role?.name === 'ADMIN');
    const officers = tenant.users.filter(u => ['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER'].includes(u.role?.name));
    const allStaff = tenant.users.filter(u => u.role?.name !== 'CLIENT').map(u => ({
      id: u.staff?.id || u.id,
      userId: u.id,
      name: u.staff?.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff Member',
      email: u.staff?.email || u.email,
      mobile: u.staff?.mobile || u.mobile,
      role: u.role?.name || 'STAFF',
      status: u.staff?.status || u.status || 'ACTIVE'
    }));

    return res.status(200).json({
      success: true,
      data: {
        tenant,
        admin,
        officers,
        allStaff
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateTenantDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    companyName,
    panelName,
    domainUrl,
    mongoDbUrl,
    dbName,
    certificateValidity,
    status,
    address,
    gst,
    supportMobile,
    adminName,
    adminMobile,
    adminEmail,
    adminPassword,
    adminStatus,
    nismValidity,
    companyType,
    sebiRegistration,
    bseEnrollment,
    pan,
    website,
    depositAmount,
    raType,
    state
  } = req.body;

  try {
    const oldTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!oldTenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let newSebiUrl = oldTenant.certificateUrl;
    let newNismUrl = oldTenant.nismCertificateUrl;

    if (files && files.sebiCertificate && files.sebiCertificate[0]) {
      newSebiUrl = `/uploads/policies/${files.sebiCertificate[0].filename}`;
    }
    if (files && files.nismCertificate && files.nismCertificate[0]) {
      newNismUrl = `/uploads/policies/${files.nismCertificate[0].filename}`;
    }

    // Safe Date Parsing
    let parsedCertificateValidity: Date | null | undefined = undefined;
    if (certificateValidity !== undefined) {
      if (certificateValidity && !isNaN(new Date(certificateValidity).getTime())) {
        parsedCertificateValidity = new Date(certificateValidity);
      } else {
        parsedCertificateValidity = null;
      }
    }

    let parsedNismValidity: Date | null | undefined = undefined;
    if (nismValidity !== undefined) {
      if (nismValidity && !isNaN(new Date(nismValidity).getTime())) {
        parsedNismValidity = new Date(nismValidity);
      } else {
        parsedNismValidity = null;
      }
    }

    // Safe Deposit Amount Parsing
    let parsedDepositAmount: number | undefined = undefined;
    if (depositAmount !== undefined && depositAmount !== null && depositAmount !== '') {
      const parsed = parseFloat(depositAmount);
      if (!isNaN(parsed)) {
        parsedDepositAmount = parsed;
      }
    }

    // Build update payload
    const tenantUpdateData: any = {};
    if (companyName !== undefined && companyName !== '') tenantUpdateData.companyName = String(companyName).trim();
    if (panelName !== undefined) tenantUpdateData.panelName = String(panelName).trim() || null;
    if (domainUrl !== undefined) tenantUpdateData.domainUrl = String(domainUrl).trim() || null;
    if (mongoDbUrl !== undefined) tenantUpdateData.mongoDbUrl = String(mongoDbUrl).trim() || null;
    if (dbName !== undefined) tenantUpdateData.dbName = String(dbName).trim() || null;
    if (companyType !== undefined && companyType !== '') tenantUpdateData.companyType = companyType;
    if (raType !== undefined && raType !== '') tenantUpdateData.raType = raType;
    if (sebiRegistration !== undefined && sebiRegistration !== '') tenantUpdateData.sebiRegistration = String(sebiRegistration).trim().toUpperCase();
    if (bseEnrollment !== undefined) tenantUpdateData.bseEnrollment = String(bseEnrollment).trim().toUpperCase() || null;
    if (pan !== undefined && pan !== '') tenantUpdateData.pan = String(pan).trim().toUpperCase();
    if (website !== undefined) tenantUpdateData.website = String(website).trim() || null;
    if (address !== undefined && address !== '') tenantUpdateData.address = String(address).trim();
    if (gst !== undefined) tenantUpdateData.gst = String(gst).trim().toUpperCase() || null;
    if (state !== undefined) tenantUpdateData.state = state ? String(state).trim() : null;
    if (status !== undefined && status !== '') tenantUpdateData.status = status;

    const incomingMobile = supportMobile || req.body.tenantMobile || req.body.mobile;
    if (incomingMobile !== undefined && incomingMobile !== '') {
      tenantUpdateData.mobile = String(incomingMobile).trim();
    }

    if (parsedCertificateValidity !== undefined) {
      tenantUpdateData.certificateValidity = parsedCertificateValidity;
    }
    if (parsedNismValidity !== undefined) {
      tenantUpdateData.nismValidity = parsedNismValidity;
    }
    if (parsedDepositAmount !== undefined) {
      tenantUpdateData.depositAmount = parsedDepositAmount;
    }
    if (newSebiUrl) {
      tenantUpdateData.certificateUrl = newSebiUrl;
    }
    if (newNismUrl) {
      tenantUpdateData.nismCertificateUrl = newNismUrl;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: tenantUpdateData
    });

    if (files && files.sebiCertificate && files.sebiCertificate[0] && newSebiUrl) {
      await prisma.tenantDocumentHistory.create({
        data: {
          tenantId: id,
          docType: 'SEBI_CERTIFICATE',
          fileUrl: newSebiUrl,
          fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
        }
      });
    }
    if (files && files.nismCertificate && files.nismCertificate[0] && newNismUrl) {
      await prisma.tenantDocumentHistory.create({
        data: {
          tenantId: id,
          docType: 'NISM_CERTIFICATE',
          fileUrl: newNismUrl,
          fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
        }
      });
    }

    // Ensure tenantApiKey exists
    let apiKey = updatedTenant.tenantApiKey;
    if (!apiKey) {
      apiKey = 'ragcp_' + crypto.randomBytes(16).toString('hex');
      await prisma.tenant.update({
        where: { id: updatedTenant.id },
        data: { tenantApiKey: apiKey }
      });
      updatedTenant.tenantApiKey = apiKey;
    }

    // Admin user update
    let adminUser = await prisma.user.findFirst({
      where: { tenantId: id, role: { name: 'ADMIN' } }
    });
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        where: { tenantId: id }
      });
    }

    if (adminUser) {
      const updateData: any = {};

      if (adminName !== undefined && String(adminName).trim() !== '') {
        const parts = String(adminName).trim().split(' ');
        updateData.firstName = parts[0] || adminUser.firstName;
        updateData.lastName = parts.slice(1).join(' ') || '';
      }

      if (adminMobile !== undefined && String(adminMobile).trim() !== '') {
        updateData.mobile = String(adminMobile).trim();
      }

      if (adminEmail !== undefined && String(adminEmail).trim() !== '') {
        const newEmail = String(adminEmail).toLowerCase().trim();
        if (newEmail !== adminUser.email) {
          const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
          if (existingUser && existingUser.id !== adminUser.id) {
            return res.status(400).json({
              success: false,
              message: `Admin email '${newEmail}' is already registered to another user.`
            });
          }
          updateData.email = newEmail;
        }
      }

      if (adminStatus !== undefined && String(adminStatus).trim() !== '') {
        updateData.status = String(adminStatus).trim();
      }

      if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim().length > 0) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(adminPassword.trim(), salt);
        updateData.tempPassword = adminPassword.trim();
      }

      if (Object.keys(updateData).length > 0) {
        const updatedAdmin = await prisma.user.update({
          where: { id: adminUser.id },
          data: updateData
        });
        adminUser = updatedAdmin;
      }
    }

    // Auto-sync company & admin updates to remote domainUrl API and dedicated MongoDB in background
    syncTenantToRemote(id, {
      reason: 'UPDATE',
      adminPassword
    }).catch(syncErr => {
      console.warn('Auto-sync dispatch warning during tenant edit:', syncErr);
    });

    // Write audit log safely
    if (req.user && req.user.id) {
      await logAudit({
        userId: req.user.id,
        action: 'UPDATE',
        module: 'TENANTS',
        oldValue: oldTenant,
        newValue: updatedTenant,
        ipAddress: req.ip
      }).catch(err => console.error('Audit log failed:', err));
    }

    return res.status(200).json({
      success: true,
      message: 'Company and Admin details updated and dispatched to domain database successfully.',
      data: updatedTenant
    });
  } catch (error: any) {
    console.error('Error updating tenant details:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update tenant details', errors: [error.message] });
  }
};

export const updateSuperAdminPassword = async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Super admin user not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const parseSebiCertificate = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No SEBI certificate provided' });

    // Extract text using OCR-enabled utility (tries native first, then OCR fallback)
    const text = await extractTextFromPdf(file.path);



    // If still no readable text after OCR, return graceful fallback
    if (!text || text.trim().length < 20) {
      // Prevent NISM being uploaded as SEBI
      if (file.originalname.toLowerCase().includes('nism')) {
        return res.status(200).json({
          success: false,
          data: null,
          message: 'Document Mismatch: You uploaded a NISM certificate in the SEBI field.'
        });
      }
      // Graceful fallback — return empty data so user can fill manually
      return res.status(200).json({
        success: false,
        data: null,
        message: 'Could not automatically read this PDF (scanned image). Please fill in SEBI details manually.'
      });
    }

    // Registration Regex
    const regMatch = text.match(/IN[A-Z]\d{8,9}/i);
    const sebiRegistration = regMatch ? regMatch[0].toUpperCase() : '';

    if (!sebiRegistration) {
      if (text.match(/NISM-\d{10,15}/i) || text.toLowerCase().includes('nism') || text.toLowerCase().includes('national institute of securities markets')) {
        return res.status(200).json({
          success: false,
          data: null,
          message: 'Document Mismatch: You uploaded a NISM certificate in the SEBI field.'
        });
      }
    }

    // Date Regex
    const dateMatch = text.match(/(?:valid\s+from\s+|dated\s+)(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?[a-zA-Z]+\s*,?\s*\d{4})/i)
      || text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    let certificateValidity = '';
    if (dateMatch && dateMatch[1]) {
      try {
        const rawDateStr = dateMatch[1].replace(/(st|nd|rd|th)/, '').replace('day of', '').trim();
        const d = new Date(rawDateStr);
        if (!isNaN(d.getTime())) {
          d.setFullYear(d.getFullYear() + 5);
          certificateValidity = d.toISOString().split('T')[0];
        }
      } catch (e) { }
    }

    // Company Name Heuristic
    const lines = String(text).split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    let companyName = '';
    const nameLineIdx = lines.findIndex(l => l.toLowerCase().includes('grants a certificate of registration to'));
    if (nameLineIdx !== -1 && nameLineIdx + 1 < lines.length) {
      companyName = lines[nameLineIdx + 1];
      if (companyName.length < 3 && nameLineIdx + 2 < lines.length) companyName += ' ' + lines[nameLineIdx + 2];
    }

    // Corporate Office Address
    let address = '';
    const regIdx = lines.findIndex(l => l.toLowerCase().includes('registration number'));
    const addrStartIdx = lines.findIndex((l, i) => i > regIdx && l.length > 10 && !l.toLowerCase().includes('address') && !l.toLowerCase().includes('subject to'));
    if (addrStartIdx !== -1) {
      const addrEndIdx = lines.findIndex((l, i) => i > addrStartIdx && (l.toLowerCase().includes('subject to') || l.toLowerCase().includes('conditions')));
      if (addrEndIdx !== -1) {
        address = lines.slice(addrStartIdx, addrEndIdx).join(', ');
      }
    }

    // Auto-detect state from address or text
    const detectedState = detectStateFromText(address) || detectStateFromText(text) || '';

    return res.status(200).json({
      success: true,
      data: {
        sebiRegistration,
        certificateValidity,
        companyName,
        address,
        state: detectedState
      },
      message: 'SEBI certificate read successfully.'
    });
  } catch (error: any) {
    console.error('Error parsing SEBI certificate:', error);
    return res.status(500).json({ success: false, message: 'Failed to parse SEBI certificate', errors: [error.message] });
  }
};

export const parseNismCertificate = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No NISM certificate provided' });

    // Extract text using OCR-enabled utility (tries native first, then OCR fallback)
    const text = await extractTextFromPdf(file.path);



    // If still no readable text after OCR, return graceful fallback
    if (!text || text.trim().length < 20) {
      if (file.originalname.toLowerCase().includes('sebi') || file.originalname.toLowerCase() === 'certificate.pdf') {
        return res.status(200).json({
          success: false,
          data: null,
          message: 'Document Mismatch: You uploaded a SEBI certificate in the NISM field.'
        });
      }
      // Graceful fallback — return empty data so user can fill manually
      return res.status(200).json({
        success: false,
        data: null,
        message: 'Could not automatically read this PDF (scanned image). Please fill in NISM details manually.'
      });
    }

    // Registration Regex — supports "Registration Number : NISM-XXXX" and bare "NISM-XXXX"
    const regMatch = text.match(/Registration\s+Number\s*[:\-]\s*(NISM-\d{10,15})/i)
      || text.match(/(NISM-\d{10,15})/i);
    const nismRegistration = regMatch ? regMatch[1].toUpperCase() : '';

    if (!nismRegistration) {
      if (text.match(/IN[A-Z]\d{8,9}/i) || text.toLowerCase().includes('securities and exchange board')) {
        return res.status(200).json({
          success: false,
          data: null,
          message: 'Document Mismatch: You uploaded a SEBI certificate in the NISM field.'
        });
      }
    }

    // Validity Regex — handles "Valid Till : January 26, 2029" and variations
    const dateMatch = text.match(/Valid\s*Till\s*[:\-]?\s*([a-zA-Z]+\s+\d{1,2},?\s*\d{4})/i)
      || text.match(/Validity\s*[:\-]?\s*([a-zA-Z]+\s+\d{1,2},?\s*\d{4})/i)
      || text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
      || text.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    let nismValidity = '';
    if (dateMatch && dateMatch[1]) {
      try {
        const d = new Date(dateMatch[1].replace(',', ''));
        if (!isNaN(d.getTime())) {
          nismValidity = d.toISOString().split('T')[0];
        }
      } catch (e) { }
    }

    // Name extraction — handles NISM format: "Mr. / Ms. FIRSTNAME LASTNAME"
    const lines = String(text).split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    let name = '';

    // Strategy 1: Look for "Mr. / Ms. NAME" pattern directly in text
    const mrMsMatch = text.match(/(?:Mr\.|Ms\.|Mrs\.)\s*\/?\s*(?:Mr\.|Ms\.|Mrs\.)?\s+([A-Z][A-Z\s]{2,50})/);
    if (mrMsMatch && mrMsMatch[1]) {
      name = mrMsMatch[1].trim();
    }

    // Strategy 2: Line after "certify that"
    if (!name) {
      const certifyIdx = lines.findIndex(l => l.toLowerCase().includes('this is to certify that') || l.toLowerCase().includes('certify that'));
      if (certifyIdx !== -1 && certifyIdx + 1 < lines.length) {
        name = lines[certifyIdx + 1].replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*\/?\s*(Mr\.|Mrs\.|Ms\.|Dr\.)?\s*/i, '').trim();
      }
    }

    // Strategy 3: Line before "has successfully"
    if (!name) {
      const passedIdx = lines.findIndex(l => l.toLowerCase().includes('has successfully passed') || l.toLowerCase().includes('successfully passed') || l.toLowerCase().includes('successfully completed'));
      if (passedIdx > 0) {
        name = lines[passedIdx - 1].replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*\/?\s*(Mr\.|Mrs\.|Ms\.|Dr\.)?\s*/i, '').trim();
      }
    }


    return res.status(200).json({
      success: true,
      data: {
        name,
        nismRegistration,
        nismValidity
      },
      message: nismRegistration ? 'NISM certificate read successfully.' : 'Partial data extracted. Please verify and fill remaining fields.'
    });
  } catch (error: any) {
    console.error('Error parsing NISM certificate:', error);
    return res.status(500).json({ success: false, message: 'Failed to parse NISM certificate', errors: [error.message] });
  }
};

export const getComplianceRules = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = await prisma.complianceRequirement.findMany({
      orderBy: { serialNo: 'asc' }
    });
    return res.status(200).json({ success: true, data: rules });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateComplianceRule = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    requirement,
    frequency,
    frequencyType,
    severityLevel,
    penaltyAmount,
    isActive
  } = req.body;

  try {
    const oldRule = await prisma.complianceRequirement.findUnique({ where: { id } });
    if (!oldRule) {
      return res.status(404).json({ success: false, message: 'Compliance rule not found' });
    }

    const updatedRule = await prisma.complianceRequirement.update({
      where: { id },
      data: {
        requirement: requirement !== undefined ? requirement : oldRule.requirement,
        frequency: frequency !== undefined ? frequency : oldRule.frequency,
        frequencyType: frequencyType !== undefined ? frequencyType : oldRule.frequencyType,
        severityLevel: severityLevel !== undefined ? severityLevel : oldRule.severityLevel,
        penaltyAmount: penaltyAmount !== undefined ? penaltyAmount : oldRule.penaltyAmount,
        isActive: typeof isActive === 'boolean' ? isActive : oldRule.isActive
      }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'COMPLIANCE',
      oldValue: oldRule,
      newValue: updatedRule,
      ipAddress: req.ip
    }).catch(() => {});

    // Broadcast compliance rule update across all active company domains and databases
    let syncResult = null;
    try {
      syncResult = await syncAllTenantsToRemote({ reason: 'COMPLIANCE_RULE_UPDATE' });
    } catch (err: any) {
      console.warn('Sync dispatch note for compliance rule update:', err.message);
    }

    const syncMsg = syncResult
      ? ` (${syncResult.successCount}/${syncResult.total} company domains synced)`
      : '';

    return res.status(200).json({
      success: true,
      message: `Compliance Rule #${updatedRule.serialNo} updated and propagated across all company databases successfully${syncMsg}.`,
      data: updatedRule,
      syncResult
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const provisionTenantDb = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    if (!tenant.mongoDbUrl || !tenant.mongoDbUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No MongoDB Connection URL configured for this company. Please set MongoDB Connection URL first in Edit Company.'
      });
    }

    const adminUser = await prisma.user.findFirst({
      where: { tenantId: id, role: { name: 'ADMIN' } }
    });

    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'No Admin user found for this company.' });
    }

    const result = await provisionTenantDatabase(tenant.mongoDbUrl.trim(), tenant, {
      id: adminUser.id,
      email: adminUser.email,
      passwordHash: adminUser.passwordHash,
      tempPassword: adminUser.tempPassword,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      mobile: adminUser.mobile,
      status: adminUser.status || (tenant.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE')
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'TENANTS',
      newValue: { ...tenant, dbProvisionedAt: new Date() },
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to provision tenant database: ' + error.message,
      errors: [error.message]
    });
  }
};

export const syncTenantApi = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { targetUrl } = req.body;

  try {
    const result = await syncTenantToRemote(id, {
      targetUrl,
      reason: 'MANUAL_SYNC'
    });

    if (result.success || result.domainSyncResult?.success) {
      await logAudit({
        userId: req.user!.id,
        action: 'UPDATE',
        module: 'TENANTS',
        newValue: { tenantId: id, manualSyncResult: result },
        ipAddress: req.ip
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: result.message || 'Tenant successfully synchronized to domain database via API!',
        data: result
      });
    }

    return res.status(200).json({
      success: false,
      isRemoteUnreachable: true,
      message: result.message || `Remote server at ${targetUrl || 'configured domain'} could not be reached. Local database is ready!`,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to sync via API: ${error.message}`,
      errors: [error.message]
    });
  }
};

export const syncAllTenantsApi = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await syncAllTenantsToRemote({ reason: 'SUPER_ADMIN_MANUAL_BULK_SYNC' });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'TENANTS',
      newValue: { bulkSyncResult: result },
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Bulk synchronization completed across ${result.total} companies (${result.successCount} synced, ${result.failedCount} offline/failed).`,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to bulk sync tenants: ${error.message}`,
      errors: [error.message]
    });
  }
};

export const verifyDomainUrl = async (req: AuthenticatedRequest, res: Response) => {
  const { domainUrl } = req.body;
  if (!domainUrl || typeof domainUrl !== 'string' || !domainUrl.trim()) {
    return res.status(400).json({
      success: false,
      reachable: false,
      message: 'Domain URL is required.'
    });
  }

  let normalizedUrl = domainUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  normalizedUrl = normalizedUrl.replace(/\/+$/, '');

  try {
    const parsed = new URL(normalizedUrl);
    if (!parsed.hostname || parsed.hostname.length < 3 || !parsed.hostname.includes('.')) {
      return res.status(400).json({
        success: false,
        reachable: false,
        normalizedUrl,
        message: 'Invalid domain hostname format. (e.g. portal.thinkupresearch.com)'
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const startTime = Date.now();
    let isReachable = false;
    let statusCode = 0;
    let statusText = '';

    try {
      const resp = await fetch(normalizedUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'RAGCP-SEBI-Platform/1.0' }
      });
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      statusCode = resp.status;
      statusText = resp.statusText;
      isReachable = true;

      return res.status(200).json({
        success: true,
        reachable: true,
        normalizedUrl,
        statusCode,
        statusText,
        responseTimeMs,
        message: `Domain is live & verified (${statusCode} ${statusText} in ${responseTimeMs}ms)! Ready for sync.`
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return res.status(200).json({
          success: false,
          reachable: false,
          normalizedUrl,
          message: 'Connection timed out (6s). Domain server did not respond.',
          error: 'TIMEOUT'
        });
      }

      return res.status(200).json({
        success: false,
        reachable: false,
        normalizedUrl,
        message: `Domain could not be reached: ${fetchErr.message || 'Host not found or SSL connection error'}`,
        error: fetchErr.message
      });
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      reachable: false,
      normalizedUrl,
      message: 'Invalid URL syntax: ' + err.message
    });
  }
};

export const testMongoConnection = async (req: AuthenticatedRequest, res: Response) => {
  const { mongoDbUrl } = req.body;
  if (!mongoDbUrl || typeof mongoDbUrl !== 'string' || (!mongoDbUrl.startsWith('mongodb://') && !mongoDbUrl.startsWith('mongodb+srv://'))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid MongoDB connection URL. Must start with mongodb:// or mongodb+srv://'
    });
  }

  const client = new MongoClient(mongoDbUrl.trim(), { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    await client.close();
    return res.status(200).json({
      success: true,
      message: `Successfully connected to database '${db.databaseName}'! Found ${collections.length} existing collections.`,
      databaseName: db.databaseName,
      collectionsCount: collections.length
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: `Failed to connect to MongoDB: ${err.message}`,
      error: err.message
    });
  }
};

/**
 * Dynamic Company Clients Endpoint for Super Admin.
 * Concatenates the company's domainUrl to fetch 3rd party clients from the company's own software,
 * with fast fallback to local platform DB if unreachable or domain not configured.
 * GET /api/v1/super-admin/tenants/:id/clients
 */
export const getCompanyClients = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    const rawDomain = (tenant.domainUrl || tenant.website || '').trim();

    // 1. Try remote domain API if domainUrl is configured
    if (rawDomain) {
      let targetOrigin = rawDomain;
      if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
        targetOrigin = 'https://' + targetOrigin;
      }
      try {
        const parsed = new URL(targetOrigin);
        targetOrigin = parsed.origin;
      } catch (e) {
        targetOrigin = targetOrigin.replace(/\/+$/, '');
      }

      const candidateEndpoints = [
        `${targetOrigin}/backend/api/v1/third-party-api/clients`,
        `${targetOrigin}/backend/api/v1/third-party-api/${tenant.id}/clients`,
        `${targetOrigin}/backend/api/v1/clients`,
        `${targetOrigin}/backend/third-party-api/clients`,
        `${targetOrigin}/backend/clients`,
        `${targetOrigin}/api/v1/third-party-api/clients`,
        `${targetOrigin}/api/v1/third-party-api/${tenant.id}/clients`,
        `${targetOrigin}/third-party-api/clients`,
        `${targetOrigin}/api/v1/clients`,
        `${targetOrigin}/clients`
      ];

      for (const endpoint of candidateEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant.id
          };
          if (tenant.tenantApiKey) {
            headers['x-tenant-api-key'] = tenant.tenantApiKey;
          }

          const remoteRes = await fetch(endpoint, {
            method: 'GET',
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (remoteRes.ok) {
            const remoteData: any = await remoteRes.json().catch(() => null);
            if (remoteData && (Array.isArray(remoteData.data) || Array.isArray(remoteData))) {
              const clientsArray = Array.isArray(remoteData.data) ? remoteData.data : remoteData;
              return res.status(200).json({
                success: true,
                source: 'REMOTE_DOMAIN_API',
                domainUrl: targetOrigin,
                endpointUsed: endpoint,
                company: {
                  id: tenant.id,
                  companyName: tenant.companyName,
                  sebiRegistration: tenant.sebiRegistration,
                  domainUrl: tenant.domainUrl,
                  website: tenant.website
                },
                count: clientsArray.length,
                data: clientsArray
              });
            }
          }
        } catch (remoteErr) {
          // Continue to next candidate or fallback to local DB
        }
      }
    }

    // 2. Fallback to Local Platform Database
    const localClients = await prisma.client.findMany({
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

    const sanitizedClients = localClients.map(c => ({
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
      source: 'LOCAL_DATABASE',
      domainUrl: rawDomain || null,
      company: {
        id: tenant.id,
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration,
        domainUrl: tenant.domainUrl,
        website: tenant.website
      },
      count: sanitizedClients.length,
      data: sanitizedClients
    });
  } catch (error: any) {
    console.error('Error fetching company clients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company clients: ' + error.message,
      errors: [error.message]
    });
  }
};

/**
 * Dynamic Company Staff Endpoint for Super Admin.
 * Checks remote company domainUrl to fetch 3rd party staff records from the company's own software,
 * with fast fallback to local platform DB if unreachable or domain not configured.
 * GET /api/v1/super-admin/tenants/:id/staff
 */
export const getCompanyStaff = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant company not found' });
    }

    const rawDomain = (tenant.domainUrl || tenant.website || '').trim();

    // 1. Try remote domain API if domainUrl is configured
    if (rawDomain) {
      let targetOrigin = rawDomain;
      if (!targetOrigin.startsWith('http://') && !targetOrigin.startsWith('https://')) {
        targetOrigin = 'https://' + targetOrigin;
      }
      try {
        const parsed = new URL(targetOrigin);
        targetOrigin = parsed.origin;
      } catch (e) {
        targetOrigin = targetOrigin.replace(/\/+$/, '');
      }

      const candidateEndpoints = [
        `${targetOrigin}/backend/api/v1/third-party-api/staff`,
        `${targetOrigin}/backend/api/v1/third-party-api/${tenant.id}/staff`,
        `${targetOrigin}/backend/api/v1/staff`,
        `${targetOrigin}/backend/third-party-api/staff`,
        `${targetOrigin}/backend/staff`,
        `${targetOrigin}/api/v1/third-party-api/staff`,
        `${targetOrigin}/api/v1/third-party-api/${tenant.id}/staff`,
        `${targetOrigin}/third-party-api/staff`,
        `${targetOrigin}/api/v1/staff`,
        `${targetOrigin}/staff`
      ];

      for (const endpoint of candidateEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant.id
          };
          if (tenant.tenantApiKey) {
            headers['x-tenant-api-key'] = tenant.tenantApiKey;
          }

          const remoteRes = await fetch(endpoint, {
            method: 'GET',
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (remoteRes.ok) {
            const remoteData: any = await remoteRes.json().catch(() => null);
            if (remoteData && (Array.isArray(remoteData.data) || Array.isArray(remoteData))) {
              const staffArray = Array.isArray(remoteData.data) ? remoteData.data : remoteData;
              return res.status(200).json({
                success: true,
                source: 'REMOTE_DOMAIN_API',
                domainUrl: targetOrigin,
                endpointUsed: endpoint,
                company: {
                  id: tenant.id,
                  companyName: tenant.companyName,
                  sebiRegistration: tenant.sebiRegistration,
                  domainUrl: tenant.domainUrl,
                  website: tenant.website
                },
                count: staffArray.length,
                data: staffArray
              });
            }
          }
        } catch (remoteErr) {
          // Continue to next candidate or fallback to local DB
        }
      }
    }

    // 2. Fallback to Local Platform Database
    // Fetch all non-client users associated with this tenant
    const localStaffUsers = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        role: {
          name: { not: 'CLIENT' }
        }
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        staff: {
          include: {
            personAssociated: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const sanitizedStaff = localStaffUsers.map(u => {
      const staffRecord = u.staff;
      const personAssoc = staffRecord?.personAssociated;
      const roleName = u.role?.name || 'STAFF';

      return {
        id: staffRecord?.id || u.id,
        userId: u.id,
        employeeId: staffRecord?.employeeId || u.employeeCode || `EMP-${u.id.slice(-4).toUpperCase()}`,
        name: staffRecord?.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff Member',
        email: staffRecord?.email || u.email,
        mobile: staffRecord?.mobile || u.mobile,
        role: roleName,
        roleDescription: u.role?.description || null,
        personAssociatedType: personAssoc?.roleType || null,
        customRole: personAssoc?.customRole || null,
        dob: staffRecord?.dob || null,
        joiningDate: staffRecord?.joiningDate || u.createdAt,
        nismNumber: staffRecord?.nismNumber || null,
        nismValidity: staffRecord?.nismValidity || null,
        nismUpload: staffRecord?.nismUpload || null,
        status: staffRecord?.status || u.status || 'ACTIVE',
        lastLogin: u.lastLogin,
        createdAt: u.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      source: 'LOCAL_DATABASE',
      domainUrl: rawDomain || null,
      company: {
        id: tenant.id,
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration,
        domainUrl: tenant.domainUrl,
        website: tenant.website
      },
      count: sanitizedStaff.length,
      data: sanitizedStaff
    });
  } catch (error: any) {
    console.error('Error fetching company staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company staff: ' + error.message,
      errors: [error.message]
    });
  }
};


