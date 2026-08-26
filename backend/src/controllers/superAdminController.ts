import { Response } from 'express';
import prisma from '../config/db';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import * as jwt from 'jsonwebtoken';
import fs from 'fs';
const pdfParse = require('pdf-parse');
import { extractTextFromPdf } from '../utils/pdfOcr';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export const createTenant = async (req: AuthenticatedRequest, res: Response) => {
  const {
    companyName,
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
    depositAmount
  } = req.body;

  if (!companyName || !ownerName || !sebiRegistration || !email || !mobile || !pan || !address) {
    return res.status(400).json({
      success: false,
      message: 'All fields are mandatory: Company Name, Owner Name, SEBI Registration, Email, Mobile, PAN, and Address.'
    });
  }

  try {
    // Check duplicates
    const existingTenants = await prisma.tenant.findMany({
      where: {
        OR: [
          { email },
          { sebiRegistration },
          { pan },
          { mobile },
          ...(gst ? [{ gst }] : []),
          ...(bseEnrollment ? [{ bseEnrollment }] : [])
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
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with the same Email already exists in the system.',
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
    
  
    // Generate credentials
    const randomPassword = 'Temp@' + Math.floor(1000 + Math.random() * 9000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(randomPassword, salt);

    // Get ADMIN role id
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      return res.status(500).json({ success: false, message: 'Admin role is not seeded yet.' });
    }

    // DB Transaction to create tenant and initial user
    const result = await prisma.$transaction(async (tx) => {
      const tenantObj = await tx.tenant.create({
        data: {
          companyName,
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
          status: 'PENDING_PROFILE'
        }
      });

      const userObj = await tx.user.create({
        data: {
          tenantId: tenantObj.id,
          roleId: adminRole.id,
          firstName: companyName,
          lastName: 'Admin',
          email,
          mobile,
          passwordHash,
          tempPassword: randomPassword
        }
      });

      // Automatically create the 6 mandatory pages for the new tenant
      const defaultPages = [
        { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '', isSystem: true },
        { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '', isSystem: true },
        { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '', isSystem: true },
        { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '', isSystem: true },
        { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '', isSystem: true },
        { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '', isSystem: true }
      ];

      await tx.customPage.createMany({
        data: defaultPages.map(page => ({
          ...page,
          tenantId: tenantObj.id
        }))
      });

      if (certificateUrl && files.sebiCertificate && files.sebiCertificate[0]) {
        await tx.tenantDocumentHistory.create({
          data: {
            tenantId: tenantObj.id,
            docType: 'SEBI_CERTIFICATE',
            fileUrl: certificateUrl,
            fileName: files.sebiCertificate[0].originalname || files.sebiCertificate[0].filename
          }
        });
      }
      if (nismCertificateUrl && files.nismCertificate && files.nismCertificate[0]) {
        await tx.tenantDocumentHistory.create({
          data: {
            tenantId: tenantObj.id,
            docType: 'NISM_CERTIFICATE',
            fileUrl: nismCertificateUrl,
            fileName: files.nismCertificate[0].originalname || files.nismCertificate[0].filename
          }
        });
      }

      return { tenantObj, userObj };
    });

    // Write SMTP notification log
    await prisma.notificationLog.create({
      data: {
        tenantId: result.tenantObj.id,
        recipient: email,
        channel: 'EMAIL',
        title: 'Company Registration & Account Credentials',
        message: `Welcome ${companyName}! Your company is registered on RAGCP. Credentials: Username: ${email}, Password: ${randomPassword}. Please complete your profile wizard upon login.`,
        status: 'SENT'
      }
    });

    // Log Super Admin Audit Trail
    await logAudit({
      userId: req.user!.id,
      action: 'CREATE',
      module: 'TENANTS',
      newValue: result.tenantObj,
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Company registration successful. Credentials sent via Email.',
      data: {
        company: result.tenantObj,
        adminUser: {
          id: result.userObj.id,
          email: result.userObj.email,
          generatedPassword: randomPassword // Returning for local testing ease
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create company tenant',
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

    // Suspend only admin/staff users of this tenant (exclude clients)
    const rolesToSuspend = await prisma.role.findMany({
      where: { name: { not: 'CLIENT' } }
    });
    const roleIds = rolesToSuspend.map((r: any) => r.id);

    await prisma.user.updateMany({
      where: { tenantId: id, roleId: { in: roleIds } },
      data: { status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Company status changed to ${status}`,
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

    await logAudit({
      userId: req.user!.id,
      action: 'SOFT_DELETE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Company successfully deleted (soft delete)',
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
      // Restore users to ACTIVE status but company is SUSPENDED (they can't login anyway due to middleware)
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

    await logAudit({
      userId: req.user!.id,
      action: 'RESTORE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Company successfully restored to ${restoreToStatus} status`,
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
    const totalCompanies = await prisma.tenant.count({ where: { deletedAt: null } });
    const activeCompanies = await prisma.tenant.count({ where: { deletedAt: null, status: 'ACTIVE' } });
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
    const auditLogsCount = await prisma.auditLog.count();

    // Fetch alerts count
    const activeAlerts = await prisma.complianceAlert.count({ where: { status: 'OPEN' } });

    return res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        totalUsers,
        auditLogsCount,
        activeAlerts
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

    const admin = tenant.users.find(u => u.role.name === 'ADMIN');
    const officers = tenant.users.filter(u => ['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER'].includes(u.role.name));

    return res.status(200).json({
      success: true,
      data: {
        tenant,
        admin,
        officers
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
    raType
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

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        companyName,
        certificateValidity: certificateValidity ? new Date(certificateValidity) : null,
        status,
        address,
        gst,
        mobile: supportMobile || req.body.tenantMobile,
        nismValidity: nismValidity ? new Date(nismValidity) : null,
        companyType,
        sebiRegistration,
        bseEnrollment,
        pan,
        website,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        certificateUrl: newSebiUrl,
        nismCertificateUrl: newNismUrl,
        raType: raType || undefined
      }
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

    const adminUser = await prisma.user.findFirst({
      where: { tenantId: id, role: { name: 'ADMIN' } }
    });

    if (adminUser) {
      const parts = (adminName || '').split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const updateData: any = {
        firstName: firstName || adminUser.firstName,
        lastName: lastName || adminUser.lastName,
        mobile: adminMobile || adminUser.mobile,
        email: adminEmail || adminUser.email,
        status: adminStatus || adminUser.status
      };

      if (adminPassword) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(adminPassword, salt);
      }

      await prisma.user.update({
        where: { id: adminUser.id },
        data: updateData
      });
    }

    // Write audit log
    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'TENANTS',
      oldValue: oldTenant,
      newValue: updatedTenant,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Company and Admin details updated successfully',
      data: updatedTenant
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
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
      } catch(e) {}
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

    return res.status(200).json({
      success: true,
      data: {
        sebiRegistration,
        certificateValidity,
        companyName,
        address
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
      } catch(e) {}
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
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    const updatedRule = await prisma.complianceRequirement.update({
      where: { id },
      data: {
        requirement,
        frequency,
        frequencyType,
        severityLevel,
        penaltyAmount,
        isActive: typeof isActive === 'boolean' ? isActive : undefined
      }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'COMPLIANCE',
      oldValue: oldRule,
      newValue: updatedRule,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Compliance Rule updated successfully',
      data: updatedRule
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
