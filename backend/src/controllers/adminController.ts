import { Response } from 'express';
import prisma from '../config/db';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { sendWelcomeEmail, sendTestEmail } from '../services/emailService';
import { checkComplianceForTenant } from './complianceController';
import archiver = require('archiver');
import fs from 'fs';
import path from 'path';
import { generateInvoicePdf } from '../services/invoiceGenerator';

const maskEmail = (email: string | null | undefined) => {
  if (!email) return email;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name + '*';
  return `${maskedName}@${parts[1]}`;
};

const maskMobile = (mobile: string | null | undefined) => {
  if (!mobile) return mobile;
  return mobile.length > 4 ? mobile.substring(0, 2) + '*'.repeat(mobile.length - 4) + mobile.substring(mobile.length - 2) : '**********';
};

const maskDocument = (doc: string | null | undefined) => {
  if (!doc) return doc;
  return 'XXXX-XXXX';
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'No tenant ID' });

    const isFullAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const userId = req.user?.id;

    const [staffCount, clientCount, researchCount, planCount] = await Promise.all([
      prisma.user.count({ where: { tenantId, role: { name: { notIn: ['CLIENT', 'ADMIN'] } }, deletedAt: null } }),
      prisma.client.count({ where: { user: { tenantId }, ...(isFullAdmin ? {} : { createdById: userId }) } }),
      prisma.researchReport.count({ where: { tenantId, ...(isFullAdmin ? {} : { createdById: userId }) } }),
      prisma.plan.count({ where: { tenantId, deletedAt: null, ...(isFullAdmin ? {} : { createdById: userId }) } })
    ]);

    res.json({
      success: true,
      data: {
        staffCount,
        clientCount,
        researchCount,
        planCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to calculate profile completeness score
export const calculateCompleteness = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        include: { role: true, staff: true }
      }
    }
  });

  if (!tenant) return 0;

  let score = 0;
  const details = {
    organization: false,
    principalOfficer: false,
    complianceOfficer: false,
    grievance: false,
    internalPolicy: false
  };

  // 1. Organization details (Company Name, Address, Website, GST, Support Mobile)
  if (tenant.companyName && tenant.address && tenant.website && tenant.mobile) {
    score += 20;
    details.organization = true;
  }

  // 2. Principal Officer (User with role PRINCIPAL_OFFICER)
  const poUser = tenant.users.find(u => u.role.name === 'PRINCIPAL_OFFICER' && u.status !== 'DELETED');
  if (poUser && poUser.staff && poUser.staff.nismNumber && poUser.staff.nismValidity) {
    score += 20;
    details.principalOfficer = true;
  }

  // 3. Compliance Officer (User with role COMPLIANCE_OFFICER)
  const coUser = tenant.users.find(u => u.role.name === 'COMPLIANCE_OFFICER' && u.status !== 'DELETED');
  if (coUser && coUser.staff && coUser.staff.nismNumber) {
    score += 20;
    details.complianceOfficer = true;
  }

  // 4. Grievance Officer details (Can be simulated as stored in a policy config or checking if grievance email/name exists in tenant settings or stored database columns)
  // Let's assume it is filled if we have a Grievance Officer config (we store this in settings or check a mock configuration flag in Tenant settings)
  // To keep it simple, we check if the tenant has website and support email configured
  if (tenant.email && tenant.mobile && tenant.website) {
    score += 20;
    details.grievance = true;
  }

  // 5. Internal Policies uploaded (Check if internalPolicyUrl is present)
  if (tenant.internalPolicyUrl) {
    score += 20;
    details.internalPolicy = true;
  }

  return { score, details, data: tenant };
};

export const getProfileCompleteness = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const data = await calculateCompleteness(tenantId);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const saveProfileStep = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  let { step, data } = req.body; // step: ORG, PO, CO, GRIEVANCE, POLICY

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }
  }

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  // VALIDATIONS
  if (step === 'ORG') {
    if (!data.address || data.address.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Address must be at least 5 characters long.' });
    }
    const websiteRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/;
    if (!data.website || !websiteRegex.test(data.website)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid website URL.' });
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!data.mobile || !mobileRegex.test(data.mobile)) {
      return res.status(400).json({ success: false, message: 'Support mobile number must be a valid 10-digit number.' });
    }
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!data.gst || !gstRegex.test(data.gst)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 15-character Indian GSTIN.' });
    }
  } else if (step === 'PO') {
    if (!data.name || data.name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
      return res.status(400).json({ success: false, message: 'Principal Officer name must contain only letters and spaces (min 2 chars).' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!data.mobile || !mobileRegex.test(data.mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
    }
    if (!data.nismNumber || data.nismNumber.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'NISM Registration Number is required (min 5 chars).' });
    }
    if (!data.nismValidity || new Date(data.nismValidity) <= new Date()) {
      return res.status(400).json({ success: false, message: 'NISM validity expiry date must be in the future.' });
    }
  } else if (step === 'CO') {
    if (!data.name || data.name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
      return res.status(400).json({ success: false, message: 'Compliance Officer name must contain only letters and spaces (min 2 chars).' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!data.mobile || !mobileRegex.test(data.mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
    }
    if (!data.nismNumber || data.nismNumber.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'NISM Registration Number is required (min 5 chars).' });
    }
  }

  try {
    const oldTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (step === 'ORG') {
      if (data.gst) {
        const duplicateGst = await prisma.tenant.findFirst({
          where: { gst: data.gst, id: { not: tenantId } }
        });
        if (duplicateGst) {
          return res.status(400).json({ success: false, message: 'This GST number is already registered. Please provide a unique GST number.' });
        }
      }

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          address: data.address,
          website: data.website,
          mobile: data.mobile,
          gst: data.gst
        }
      });
      await logAudit({
        tenantId,
        userId: req.user!.id,
        action: 'UPDATE',
        module: 'TENANTS',
        oldValue: oldTenant,
        newValue: updatedTenant,
        ipAddress: req.ip
      });
    } else if (step === 'PO') {
      // Find or create Principal Officer User/Staff
      const poRole = await prisma.role.findUnique({ where: { name: 'PRINCIPAL_OFFICER' } });
      if (!poRole) throw new Error('Principal Officer role not found');

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Po@12345', salt);

      const email = data.email;

      // Check if email already used by a user in a DIFFERENT tenant
      const emailConflictUser = await prisma.user.findUnique({ where: { email } });
      if (emailConflictUser && emailConflictUser.tenantId !== tenantId) {
        return res.status(400).json({ success: false, message: 'This email is already registered in the system under a different company. Please use a unique email.' });
      }

      // Check if current tenant already has a Principal Officer
      const existingPO = await prisma.user.findFirst({
        where: { tenantId, roleId: poRole.id },
        include: { staff: true }
      });

      if (existingPO) {
        // Update existing PO - handle email change if different
        if (existingPO.email !== email) {
          const newEmailConflict = await prisma.user.findUnique({ where: { email } });
          if (newEmailConflict) {
            return res.status(400).json({ success: false, message: 'This email is already in use by another user.' });
          }
        }
        await prisma.user.update({
          where: { id: existingPO.id },
          data: { firstName: data.name, mobile: data.mobile, email }
        });
        if (existingPO.staff) {
          await prisma.staff.update({
            where: { userId: existingPO.id },
            data: {
              name: data.name, email, mobile: data.mobile,
              nismNumber: data.nismNumber,
              nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
              nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : undefined
            }
          });
        } else {
          await prisma.staff.create({
            data: {
              userId: existingPO.id,
              employeeId: 'EMP-PO-' + Math.floor(100 + Math.random() * 900),
              name: data.name, email, mobile: data.mobile,
              nismNumber: data.nismNumber,
              nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
              nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : undefined,
              status: 'ACTIVE'
            }
          });
        }
      } else {
        // No existing PO – create new user (email conflict already checked above)
        const newUser = await prisma.user.create({
          data: {
            tenantId, roleId: poRole.id, email,
            firstName: data.name, lastName: '(PO)',
            mobile: data.mobile, passwordHash, status: 'ACTIVE'
          }
        });
        await prisma.staff.create({
          data: {
            userId: newUser.id,
            employeeId: 'EMP-PO-' + Math.floor(100 + Math.random() * 900),
            name: data.name, email, mobile: data.mobile,
            nismNumber: data.nismNumber,
            nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
            nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : undefined,
            status: 'ACTIVE'
          }
        });
      }
    } else if (step === 'CO') {
      // Compliance Officer
      const coRole = await prisma.role.findUnique({ where: { name: 'COMPLIANCE_OFFICER' } });
      if (!coRole) throw new Error('Compliance Officer role not found');

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Co@12345', salt);

      const email = data.email;

      // Check if email already used by a user in a DIFFERENT tenant
      const emailConflictUserCO = await prisma.user.findUnique({ where: { email } });
      if (emailConflictUserCO && emailConflictUserCO.tenantId !== tenantId) {
        return res.status(400).json({ success: false, message: 'This email is already registered in the system under a different company. Please use a unique email.' });
      }

      // Check if current tenant already has a Compliance Officer
      const existingCO = await prisma.user.findFirst({
        where: { tenantId, roleId: coRole.id },
        include: { staff: true }
      });

      if (existingCO) {
        // Update existing CO
        if (existingCO.email !== email) {
          const newEmailConflict = await prisma.user.findUnique({ where: { email } });
          if (newEmailConflict) {
            return res.status(400).json({ success: false, message: 'This email is already in use by another user.' });
          }
        }
        await prisma.user.update({
          where: { id: existingCO.id },
          data: { firstName: data.name, mobile: data.mobile, email }
        });
        if (existingCO.staff) {
          await prisma.staff.update({
            where: { userId: existingCO.id },
            data: {
              name: data.name, email, mobile: data.mobile,
              nismNumber: data.nismNumber,
              nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
              nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : undefined
            }
          });
        } else {
          await prisma.staff.create({
            data: {
              userId: existingCO.id,
              employeeId: 'EMP-CO-' + Math.floor(100 + Math.random() * 900),
              name: data.name, email, mobile: data.mobile,
              nismNumber: data.nismNumber,
              nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
              nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : undefined,
              status: 'ACTIVE'
            }
          });
        }
      } else {
        // No existing CO – create new user
        const newUser = await prisma.user.create({
          data: {
            tenantId, roleId: coRole.id, email,
            firstName: data.name, lastName: '(CO)',
            mobile: data.mobile, passwordHash, status: 'ACTIVE'
          }
        });
        await prisma.staff.create({
          data: {
            userId: newUser.id,
            employeeId: 'EMP-CO-' + Math.floor(100 + Math.random() * 900),
            name: data.name, email, mobile: data.mobile,
            nismNumber: data.nismNumber,
            nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
            nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : undefined,
            status: 'ACTIVE'
          }
        });
      }
    } else if (step === 'POLICY') {
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          internalPolicyUrl: data.internalPolicyUrl || '/uploads/policies/default_policy.pdf'
        }
      });
      await logAudit({
        tenantId,
        userId: req.user!.id,
        action: 'UPDATE',
        module: 'TENANTS',
        oldValue: oldTenant,
        newValue: updatedTenant,
        ipAddress: req.ip
      });
    }

    const completeness = await calculateCompleteness(tenantId);
    return res.status(200).json({
      success: true,
      message: 'Profile step saved successfully',
      data: completeness
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const createStaff = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { name, email, mobile, dob, joiningDate, nismNumber, nismValidity, roleName, personAssociatedType, customRole } = req.body;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  // VALIDATIONS
  if (!name || name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(name)) {
    return res.status(400).json({ success: false, message: 'Staff name must contain only letters and spaces (min 2 chars).' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobile || !mobileRegex.test(mobile)) {
    return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
  }
  // If role is OTHER (selected directly), treat it as PERSON_ASSOCIATED internally
  const effectivePersonAssociatedType = roleName === 'OTHER' ? 'OTHER' : personAssociatedType;
  let effectiveRoleName = roleName === 'OTHER' ? 'PERSON_ASSOCIATED' : roleName;

  if (effectiveRoleName === 'PERSON_ASSOCIATED') {
    if (effectivePersonAssociatedType === 'SALES') effectiveRoleName = 'SALES';
    else if (effectivePersonAssociatedType === 'MARKETING') effectiveRoleName = 'MARKETING';
  }

  const isOther = effectivePersonAssociatedType === 'OTHER';

  if (!isOther) {
    if (!nismNumber || nismNumber.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'NISM Registration Number is required and must be at least 5 characters.' });
    }
    if (!nismValidity || new Date(nismValidity) <= new Date()) {
      return res.status(400).json({ success: false, message: 'NISM validity expiry date is required and must be in the future.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'NISM Certificate document upload is mandatory.' });
    }
  } else {
    if (nismNumber && nismNumber.trim().length > 0) {
      if (nismNumber.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'NISM Registration Number must be at least 5 characters.' });
      }
      if (!nismValidity || new Date(nismValidity) <= new Date()) {
        return res.status(400).json({ success: false, message: 'NISM validity expiry date must be in the future.' });
      }
    }
  }

  try {
    // Check NISM uniqueness
    if (nismNumber && nismNumber.trim().length > 0) {
      const existingNism = await prisma.staff.findFirst({
        where: { nismNumber: nismNumber.trim() }
      });
      if (existingNism) {
        return res.status(400).json({ success: false, message: 'Duplicate NISM Certificate Number. This number is already in use.' });
      }
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const targetRole = await prisma.role.findUnique({ where: { name: effectiveRoleName } });
    if (!targetRole) {
      return res.status(400).json({ success: false, message: `Role '${effectiveRoleName}' not found.` });
    }

    const randomPassword = 'Staff@' + Math.floor(1000 + Math.random() * 9000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(randomPassword, salt);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          roleId: targetRole.id,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' ') || 'Staff',
          email,
          mobile,
          passwordHash,
          status: 'ACTIVE'
        }
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          employeeId: 'EMP' + Math.floor(1000 + Math.random() * 9000),
          name,
          email,
          mobile,
          dob: dob ? new Date(dob) : null,
          joiningDate: joiningDate ? new Date(joiningDate) : null,
          nismNumber,
          nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
          nismValidity: nismValidity ? new Date(nismValidity) : null,
          status: 'ACTIVE'
        }
      });

      if (['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(effectiveRoleName)) {
        await tx.personAssociated.create({
          data: {
            staffId: staff.id,
            roleType: effectivePersonAssociatedType || 'SALES',
            customRole: effectivePersonAssociatedType === 'OTHER' ? customRole : null
          }
        });
      }

      return { user, staff };
    });

    // Log Notification log for SMTP
    await prisma.notificationLog.create({
      data: {
        tenantId,
        recipient: email,
        channel: 'EMAIL',
        title: 'Staff Account Created',
        message: `Welcome ${name}! Your account has been created on RAGCP. Role: ${roleName}. Credentials: Username: ${email}, Password: ${randomPassword}`,
        status: 'SENT'
      }
    });

    // Write audit log
    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'CREATE',
      module: 'STAFF',
      newValue: result.staff,
      ipAddress: req.ip
    });

    // Run compliance verification sweep for staff NISM validity
    await checkComplianceForTenant(tenantId);

    // Get login URL
    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    
    // Fetch tenant name
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    // Send Welcome Email
    try {
      await sendWelcomeEmail({
        tenantId,
        toEmail: email,
        name,
        password: randomPassword,
        role: roleName,
        loginUrl,
        companyName: tenant?.companyName || 'RAGCP Platform'
      });
    } catch (emailError: any) {
      console.error('Failed to send welcome email:', emailError.message);
      // We don't throw here because the user is already created in the DB successfully
    }

    return res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: {
        staff: result.staff,
        generatedPassword: randomPassword
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getStaff = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const staffMembers = await prisma.staff.findMany({
      where: {
        user: { tenantId } // Fetch all staff including active, inactive, and soft-deleted
      },
      include: {
        user: {
          include: { role: true }
        },
        personAssociated: true
      },
      orderBy: {
        user: {
          createdAt: 'desc'
        }
      }
    });
    return res.status(200).json({ success: true, data: staffMembers });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateStaff = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { name, email, mobile, dob, joiningDate, nismNumber, nismValidity, roleName, personAssociatedType, customRole } = req.body;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  // VALIDATIONS
  if (!name || name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(name)) {
    return res.status(400).json({ success: false, message: 'Staff name must contain only letters and spaces (min 2 chars).' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobile || !mobileRegex.test(mobile)) {
    return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
  }
  // If role is OTHER (selected directly), treat it as PERSON_ASSOCIATED internally
  const effectivePersonAssociatedType = roleName === 'OTHER' ? 'OTHER' : personAssociatedType;
  let effectiveRoleName = roleName === 'OTHER' ? 'PERSON_ASSOCIATED' : roleName;

  if (effectiveRoleName === 'PERSON_ASSOCIATED') {
    if (effectivePersonAssociatedType === 'SALES') effectiveRoleName = 'SALES';
    else if (effectivePersonAssociatedType === 'MARKETING') effectiveRoleName = 'MARKETING';
  }

  const isOther = effectivePersonAssociatedType === 'OTHER';

  if (!isOther) {
    if (!nismNumber || nismNumber.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'NISM Registration Number is required and must be at least 5 characters.' });
    }
    if (!nismValidity || new Date(nismValidity) <= new Date()) {
      return res.status(400).json({ success: false, message: 'NISM validity expiry date is required and must be in the future.' });
    }
    const currentStaff = await prisma.staff.findUnique({ where: { id } });
    if (!currentStaff?.nismUpload && !req.file) {
      return res.status(400).json({ success: false, message: 'NISM Certificate document upload is mandatory.' });
    }
  } else {
    if (nismNumber && nismNumber.trim().length > 0) {
      if (nismNumber.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'NISM Registration Number must be at least 5 characters.' });
      }
      if (!nismValidity || new Date(nismValidity) <= new Date()) {
        return res.status(400).json({ success: false, message: 'NISM validity expiry date must be in the future.' });
      }
    }
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { id, user: { tenantId } },
      include: { user: true }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Check NISM uniqueness
    if (nismNumber && nismNumber.trim().length > 0) {
      const existingNism = await prisma.staff.findFirst({
        where: {
          nismNumber: nismNumber.trim(),
          NOT: { id }
        }
      });
      if (existingNism) {
        return res.status(400).json({ success: false, message: 'Duplicate NISM Certificate Number. This number is already in use.' });
      }
    }

    const oldStaffVal = await prisma.staff.findUnique({
      where: { id },
      include: { user: { include: { role: true } }, personAssociated: true }
    });

    // Update staff and user in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update user details
      const updateUserData: any = {
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || 'Staff',
        mobile
      };

      // Check if email changed and is unique
      if (email !== staff.email) {
        const emailExists = await tx.user.findFirst({ where: { email, NOT: { id: staff.userId } } });
        if (emailExists) throw new Error('Email already in use by another user.');
        updateUserData.email = email;
      }

      // Check if role changed
      if (effectiveRoleName) {
        const role = await tx.role.findUnique({ where: { name: effectiveRoleName } });
        if (!role) throw new Error(`Role '${effectiveRoleName}' not found.`);
        if (role.id !== staff.user.roleId) {
          throw new Error('Changing staff role is not allowed.');
        }
        updateUserData.roleId = role.id;
      }

      const user = await tx.user.update({
        where: { id: staff.userId },
        data: updateUserData
      });

      // 2. Update staff details
      const updateStaffData: any = {
        name,
        email: updateUserData.email || staff.email,
        mobile,
        dob: dob ? new Date(dob) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        nismNumber,
        nismValidity: nismValidity ? new Date(nismValidity) : null
      };

      if (req.file) {
        updateStaffData.nismUpload = `/uploads/staff/${req.file.filename}`;
      }

      const updatedStaff = await tx.staff.update({
        where: { id },
        data: updateStaffData
      });

      // 3. Handle role-specific associations
      // Delete existing personAssociated if role changed from PERSON_ASSOCIATED or was updated
      await tx.personAssociated.deleteMany({ where: { staffId: staff.id } });

      if (['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(effectiveRoleName)) {
        await tx.personAssociated.create({
          data: {
            staffId: staff.id,
            roleType: effectivePersonAssociatedType || 'SALES',
            customRole: effectivePersonAssociatedType === 'OTHER' ? customRole : null
          }
        });
      }

      return updatedStaff;
    });

    const newStaffVal = await prisma.staff.findUnique({
      where: { id },
      include: { user: { include: { role: true } }, personAssociated: true }
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'STAFF',
      oldValue: oldStaffVal,
      newValue: newStaffVal,
      ipAddress: req.ip
    });

    // Run compliance verification sweep for staff NISM validity
    await checkComplianceForTenant(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: newStaffVal
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, errors: [error.message] });
  }
};

export const toggleStaffStatus = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { id, user: { tenantId } }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const result = await prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.staff.update({
        where: { id },
        data: { status: newStatus }
      });

      await tx.user.update({
        where: { id: staff.userId },
        data: { status: newStatus }
      });

      return updatedStaff;
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'STAFF',
      oldValue: staff,
      newValue: result,
      ipAddress: req.ip
    });

    // Run compliance verification sweep for staff NISM validity
    await checkComplianceForTenant(tenantId);

    return res.status(200).json({
      success: true,
      message: `Staff status updated to ${newStatus}`,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const deleteStaff = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { id, user: { tenantId } }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId },
        data: { deletedAt: now }
      });
      await tx.staff.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'STAFF',
      oldValue: staff,
      newValue: { ...staff, deletedAt: now },
      ipAddress: req.ip
    });

    // Run compliance verification sweep for staff NISM validity
    await checkComplianceForTenant(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Staff member soft-deleted successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const restoreStaff = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { id, user: { tenantId, NOT: { deletedAt: null } } }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Deleted staff member not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId },
        data: { deletedAt: null, status: 'ACTIVE' }
      });
      await tx.staff.update({
        where: { id },
        data: { status: 'ACTIVE' }
      });
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'STAFF',
      oldValue: staff,
      newValue: { ...staff, deletedAt: null },
      ipAddress: req.ip
    });

    // Run compliance verification sweep for staff NISM validity
    await checkComplianceForTenant(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Staff member restored successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

// =====================================================
// CLIENT MANAGEMENT (Admin View)
// =====================================================

export const getAdminClients = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    let clients;

    if (isFullAdmin) {
      clients = await prisma.client.findMany({
        where: { user: { tenantId } },
        include: {
          user: { include: { role: true } },
          profile: true,
          subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' },  },
          agreements: true,
          documents: true,
          complianceAlerts: true
        },
        orderBy: { user: { createdAt: 'desc' } }
      });
    } else {
      // Check permissions
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_CLIENTS' } }
      });
      const hasViewOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_OWN_CLIENTS' } }
      });

      if (!hasViewAll && !hasViewOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view clients.' });
      }

      const rawClients = await prisma.client.findMany({
        where: {
          user: { tenantId },
          ...(hasViewAll ? {} : { createdById: req.user!.id })
        },
        include: {
          user: { include: { role: true } },
          profile: true,
          subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
          agreements: true,
          documents: true,
          complianceAlerts: true
        },
        orderBy: { user: { createdAt: 'desc' } }
      });

      const creatorIds = [...new Set(rawClients.map(c => c.createdById).filter(Boolean))] as string[];
      const creatorUsers = creatorIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } }
      }) : [];

      const creatorMap = new Map(creatorUsers.map(u => [
        u.id, 
        {
          name: `${u.firstName} ${u.lastName}`.trim(),
          roleName: u.role?.name || 'STAFF'
        }
      ]));

      clients = rawClients.map(c => {
        let createdByInfo = { type: 'SELF', label: 'Self Signup', name: 'Self Signup', role: 'CLIENT' };
        if (c.createdById) {
          const creator = creatorMap.get(c.createdById);
          if (creator) {
            const rName = (creator.roleName || '').toUpperCase();
            const isRoleAdmin = rName === 'ADMIN' || rName === 'SUPER_ADMIN' || rName === 'SUPER ADMIN';
            createdByInfo = {
              type: isRoleAdmin ? 'ADMIN' : 'STAFF',
              label: isRoleAdmin ? `Admin (${creator.name})` : `Staff (${creator.name})`,
              name: creator.name,
              role: creator.roleName
            };
          } else {
            createdByInfo = { type: 'STAFF', label: 'Admin/Staff', name: 'Admin/Staff', role: 'STAFF' };
          }
        }
        return {
          ...c,
          createdByInfo
        };
      });
    }

    const hasViewSensitive = isFullAdmin || await prisma.rolePermission.findFirst({
      where: { role: { name: req.user!.role }, permission: { code: 'VIEW_SENSITIVE_DATA' } }
    });

    if (!hasViewSensitive) {
      clients = clients.map((c: any) => ({
        ...c,
        email: maskEmail(c.email),
        mobile: maskMobile(c.mobile),
        pan: maskDocument(c.pan),
        aadhaar: maskDocument(c.aadhaar),
        user: c.user ? { ...c.user, email: maskEmail(c.user.email) } : c.user,
        profile: c.profile ? {
          ...c.profile,
          panNumber: maskDocument(c.profile.panNumber),
          aadharNumber: maskDocument(c.profile.aadharNumber)
        } : c.profile
      }));
    }

    return res.status(200).json({ success: true, data: clients });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getAdminDeletedClients = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const clients = await prisma.client.findMany({
      where: { user: { tenantId, deletedAt: { not: null } } },
      include: {
        user: { select: { status: true, lastLogin: true, createdAt: true, deletedAt: true, deletedBy: true } },
        profile: true,
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
        agreements: true,
        documents: true
      },
      orderBy: { user: { deletedAt: 'desc' } }
    });
    const isFullAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const hasViewSensitive = isFullAdmin || await prisma.rolePermission.findFirst({
      where: { role: { name: req.user!.role }, permission: { code: 'VIEW_SENSITIVE_DATA' } }
    });

    let result = clients;
    if (!hasViewSensitive) {
      result = clients.map((c: any) => ({
        ...c,
        email: maskEmail(c.email),
        mobile: maskMobile(c.mobile),
        pan: maskDocument(c.pan),
        aadhaar: maskDocument(c.aadhaar),
        profile: c.profile ? {
          ...c.profile,
          panNumber: maskDocument(c.profile.panNumber),
          aadharNumber: maskDocument(c.profile.aadharNumber)
        } : c.profile
      })) as any;
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const toggleClientStatus = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const client = await prisma.client.findFirst({
      where: { id, user: { tenantId } },
      include: { user: true }
    });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasUpdate = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'EDIT_CLIENTS' } }
      });
      if (!hasUpdate) {
        return res.status(403).json({ success: false, message: 'You do not have permission to edit clients.' });
      }
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_CLIENTS' } }
      });
      if (!hasViewAll) {
        if (client.createdById !== req.user!.id) {
          return res.status(403).json({ success: false, message: 'You can only edit clients registered by you.' });
        }
      }
    }

    const newStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await prisma.$transaction(async (tx) => {
      await tx.client.update({ where: { id }, data: { status: newStatus } });
      await tx.user.update({ where: { id: client.userId }, data: { status: newStatus } });
    });

    // Send Status Change Email
    const clientWithTenant = await prisma.client.findUnique({
      where: { id },
      include: { user: { include: { tenant: true } } }
    });
    if (clientWithTenant) {
      if (newStatus === 'ACTIVE') {
        await import('../services/emailService').then(m => m.sendAccountActivatedEmail({
          toEmail: client.user.email,
          name: client.name,
          companyName: clientWithTenant.user.tenant?.companyName || 'RAGCP Platform'
        })).catch(e => console.error('[EMAIL] Failed:', e));
      } else {
        await import('../services/emailService').then(m => m.sendAccountDeactivatedEmail({
          toEmail: client.user.email,
          name: client.name,
          companyName: clientWithTenant.user.tenant?.companyName || 'RAGCP Platform'
        })).catch(e => console.error('[EMAIL] Failed:', e));
      }
    }

    return res.status(200).json({ success: true, message: `Client status updated to ${newStatus}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateClient = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const {
    name,
    email,
    mobile,
    pan,
    aadhaar,
    category,
    occupation,
    addressLine1,
    city,
    state,
    zipCode
  } = req.body;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id, user: { tenantId } },
      include: { user: true, profile: true }
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Handle Masked Data Submissions
    let finalEmail = email;
    let finalMobile = mobile;
    let finalPan = pan;
    let finalAadhaar = aadhaar;

    if (finalEmail && finalEmail.includes('*')) finalEmail = client.user.email;
    if (finalMobile && finalMobile.includes('*')) finalMobile = client.user.mobile;
    if (finalPan && finalPan.includes('XXXX')) finalPan = client.pan;
    if (finalAadhaar && finalAadhaar.includes('XXXX')) finalAadhaar = client.aadhaar;

    // VALIDATIONS
    if (!name || name.trim().length < 2 || !/^[a-zA-Z\s\.]+$/.test(name)) {
      return res.status(400).json({ success: false, message: 'Client name must contain only letters, dots, and spaces (min 2 chars).' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!finalEmail || !emailRegex.test(finalEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!finalMobile || !mobileRegex.test(finalMobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number.' });
    }
    if (!finalPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(finalPan)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-character PAN.' });
    }
    if (!finalAadhaar || !/^[0-9]{12}$/.test(finalAadhaar)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit Aadhaar number.' });
    }

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasUpdate = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'EDIT_CLIENTS' } }
      });
      if (!hasUpdate) {
        return res.status(403).json({ success: false, message: 'You do not have permission to update clients.' });
      }
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_CLIENTS' } }
      });
      if (!hasViewAll) {
        if (client.createdById !== req.user!.id) {
          return res.status(403).json({ success: false, message: 'You can only update clients registered by you.' });
        }
      }
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: finalEmail, NOT: { id: client.userId } }
    });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already in use by another user.' });
    }

    const existingMobile = await prisma.user.findFirst({
      where: { mobile: finalMobile, NOT: { id: client.userId } }
    });
    if (existingMobile) {
      return res.status(400).json({ success: false, message: 'Mobile number already in use by another user.' });
    }

    const existingPan = await prisma.client.findFirst({
      where: { pan: finalPan, NOT: { id } }
    });
    if (existingPan) {
      return res.status(400).json({ success: false, message: 'PAN already in use by another client.' });
    }

    const existingAadhaar = await prisma.client.findFirst({
      where: { aadhaar: finalAadhaar, NOT: { id } }
    });
    if (existingAadhaar) {
      return res.status(400).json({ success: false, message: 'Aadhaar number already in use by another client.' });
    }

    const oldClientVal = await prisma.client.findUnique({
      where: { id },
      include: { user: { include: { role: true } }, profile: true }
    });

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update user details
      await tx.user.update({
        where: { id: client.userId },
        data: {
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' ') || 'Client',
          email: finalEmail,
          mobile: finalMobile
        }
      });

      // Log PAN change if different
      if (finalPan !== client.pan) {
        await tx.clientIdentityHistory.create({
          data: {
            clientId: client.id,
            fieldName: 'PAN',
            oldValue: client.pan,
            newValue: finalPan,
            changedBy: 'ADMIN',
            remarks: 'Updated by Admin / Compliance Officer'
          }
        });
      }

      // Log Aadhaar change if different
      const oldAadhaar = client.aadhaar;
      if (finalAadhaar !== oldAadhaar) {
        await tx.clientIdentityHistory.create({
          data: {
            clientId: client.id,
            fieldName: 'AADHAAR',
            oldValue: oldAadhaar || '',
            newValue: finalAadhaar || '',
            changedBy: 'ADMIN',
            remarks: 'Updated by Admin / Compliance Officer'
          }
        });
      }

      // 2. Update client details
      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          name,
          email: finalEmail,
          mobile: finalMobile,
          pan: finalPan,
          aadhaar: finalAadhaar,
          category: category || 'INDIVIDUAL',
          occupation
        }
      });

      // 3. Update or Create client profile
      if (client.profile) {
        await tx.clientProfile.update({
          where: { clientId: id },
          data: {
            addressLine1,
            city,
            state,
            zipCode
          }
        });
      } else {
        await tx.clientProfile.create({
          data: {
            clientId: id,
            addressLine1,
            city,
            state,
            country: 'India',
            zipCode
          }
        });
      }

      return updatedClient;
    });

    const newClientVal = await prisma.client.findUnique({
      where: { id },
      include: { user: { include: { role: true } }, profile: true }
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'CLIENTS',
      oldValue: oldClientVal,
      newValue: newClientVal,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: newClientVal
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const approveClient = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id, user: { tenantId } },
      include: { user: { include: { tenant: true } } }
    });

    if (!client || client.user.status !== 'PENDING_APPROVAL') {
      return res.status(404).json({ success: false, message: 'Client not found or not pending approval.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: client.userId },
        data: { status: 'ACTIVE', tempPassword: null }
      });
      await tx.client.update({
        where: { id },
        data: { status: 'KYC_PENDING' }
      });
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'APPROVE',
      module: 'CLIENTS',
      oldValue: { status: 'PENDING_APPROVAL' },
      newValue: { status: 'ACTIVE' },
      ipAddress: req.ip
    });

    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    
    // Send Welcome Email
    await import('../services/emailService').then(m => m.sendWelcomeEmail({
      tenantId,
      toEmail: client.user.email,
      name: client.name,
      password: client.user.tempPassword || 'Reset using Forgot Password',
      role: 'CLIENT',
      loginUrl,
      companyName: client.user.tenant?.companyName || 'RAGCP Platform'
    })).catch(e => console.error('[EMAIL] Failed to send welcome email:', e));

    return res.status(200).json({
      success: true,
      message: 'Client approved successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const deleteClient = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id, user: { tenantId } },
      include: { user: true }
    });

    // JS-level check: ensure user is not already soft-deleted (MongoDB null filter workaround)
    if (!client || client.user.deletedAt !== null) {
      return res.status(404).json({ success: false, message: 'Active client not found.' });
    }

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasDelete = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'DELETE_CLIENTS' } }
      });
      if (!hasDelete) {
        return res.status(403).json({ success: false, message: 'You do not have permission to delete clients.' });
      }
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_CLIENTS' } }
      });
      if (!hasViewAll) {
        if (client.createdById !== req.user!.id) {
          return res.status(403).json({ success: false, message: 'You can only delete clients registered by you.' });
        }
      }
    }

    const now = new Date();
    const deleteSuffix = `_deleted_${client.id}`;
    
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: client.userId },
        data: { 
          deletedAt: now, 
          deletedBy: 'ADMIN',
          email: `${client.user.email}${deleteSuffix}`,
          mobile: `${client.user.mobile}${deleteSuffix}`
        }
      });
      await tx.client.update({
        where: { id },
        data: { 
          status: 'INACTIVE',
          email: `${client.email}${deleteSuffix}`,
          mobile: `${client.mobile}${deleteSuffix}`,
          pan: `${client.pan}${deleteSuffix}`,
          aadhaar: `${client.aadhaar}${deleteSuffix}`
        }
      });
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'CLIENTS',
      oldValue: client,
      newValue: { ...client, deletedAt: now, status: 'INACTIVE' },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Client soft-deleted successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const restoreClient = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id, user: { tenantId } },
      include: { user: true }
    });

    // JS-level check: must be a deleted client (user.deletedAt should be non-null)
    if (!client || client.user.deletedAt === null) {
      return res.status(404).json({ success: false, message: 'Deleted client not found.' });
    }

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasDelete = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'DELETE_CLIENTS' } }
      });
      if (!hasDelete) {
        return res.status(403).json({ success: false, message: 'You do not have permission to restore clients.' });
      }
    }

    const deleteSuffix = `_deleted_${client.id}`;
    const origEmail = client.user.email.replace(deleteSuffix, '');
    const origMobile = client.user.mobile.replace(deleteSuffix, '');
    const origPan = client.pan.replace(deleteSuffix, '');
    const origAadhaar = client.aadhaar.replace(deleteSuffix, '');

    // Check duplicates against ACTIVE users
    const dupEmail = await prisma.user.findFirst({ where: { email: origEmail } });
    if (dupEmail && dupEmail.deletedAt === null) return res.status(400).json({ success: false, message: 'Cannot restore: Email is already in use by another active account.' });

    const dupMobile = await prisma.user.findFirst({ where: { mobile: origMobile } });
    if (dupMobile && dupMobile.deletedAt === null) return res.status(400).json({ success: false, message: 'Cannot restore: Mobile is already in use by another active account.' });

    const dupPan = await prisma.client.findFirst({ where: { pan: origPan }, include: { user: { select: { deletedAt: true } } } });
    if (dupPan && dupPan.user.deletedAt === null) return res.status(400).json({ success: false, message: 'Cannot restore: PAN is already in use by another active account.' });

    const dupAadhaar = await prisma.client.findFirst({ where: { aadhaar: origAadhaar }, include: { user: { select: { deletedAt: true } } } });
    if (dupAadhaar && dupAadhaar.user.deletedAt === null) return res.status(400).json({ success: false, message: 'Cannot restore: Aadhaar is already in use by another active account.' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: client.userId },
        data: { 
          deletedAt: null, 
          deletedBy: null, 
          status: 'ACTIVE',
          email: origEmail,
          mobile: origMobile
        }
      });
      await tx.client.update({
        where: { id },
        data: { 
          status: 'ACTIVE',
          email: origEmail,
          mobile: origMobile,
          pan: origPan,
          aadhaar: origAadhaar
        }
      });
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'CLIENTS',
      oldValue: client,
      newValue: { ...client, deletedAt: null, status: 'ACTIVE' },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Client restored successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

// =====================================================
// PLAN CATEGORY MANAGEMENT
// =====================================================

export const getAdminCategories = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const categories = await prisma.planCategory.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const { name, segments } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });
  if (!segments || !segments.trim()) return res.status(400).json({ success: false, message: 'Segments are required.' });

  try {
    const existing = await prisma.planCategory.findFirst({ where: { tenantId, name: name.trim().toUpperCase() } });
    if (existing) return res.status(400).json({ success: false, message: 'Category already exists.' });

    const category = await prisma.planCategory.create({
      data: { tenantId, name: name.trim().toUpperCase(), segments: segments.trim() }
    });
    return res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });

  try {
    const category = await prisma.planCategory.findFirst({ where: { id, tenantId } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

    const updated = await prisma.planCategory.update({
      where: { id },
      data: { name: name.trim().toUpperCase() }
    });
    return res.status(200).json({ success: true, message: 'Category updated successfully', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const toggleCategoryStatus = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const category = await prisma.planCategory.findFirst({ where: { id, tenantId } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

    const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.planCategory.update({
        where: { id },
        data: { status: newStatus }
      });
      
      // Update all associated plans to match the category's new status
      await tx.plan.updateMany({
        where: { categoryId: id },
        data: { status: newStatus }
      });

      return cat;
    });

    return res.status(200).json({ success: true, message: `Category status updated to ${newStatus}`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

// =====================================================
// PLAN MANAGEMENT (Admin View)
// =====================================================

export const getAdminPlans = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN' || req.user!.role === 'RESEARCHER';
    let plans;

    if (isFullAdmin) {
      plans = await prisma.plan.findMany({
        where: { tenantId },
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Check permissions
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_PLANS' } }
      });
      const hasViewOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_OWN_PLANS' } }
      });
      const hasResearchAccess = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'ADD_RESEARCH' } }
      }) || await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'OWN_RESEARCH' } }
      });

      if (!hasViewAll && !hasViewOwn && !hasResearchAccess) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view plans.' });
      }

      const showAllPlans = hasViewAll || hasResearchAccess;

      plans = await prisma.plan.findMany({
        where: {
          tenantId,
          ...(showAllPlans ? {} : { createdById: req.user!.id })
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({ success: true, data: plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const createPlan = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const { categoryId, name, description, price, durationMonths, researchSegments, notificationsAllowed, clientLimit } = req.body;

  if (!categoryId) return res.status(400).json({ success: false, message: 'Category is required.' });
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Plan name is required.' });
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({ success: false, message: 'Plan price must be a positive number.' });
  }
  if (!durationMonths || isNaN(parseInt(durationMonths)) || parseInt(durationMonths) < 1) {
    return res.status(400).json({ success: false, message: 'Duration must be at least 1 month.' });
  }

  try {
    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasCreate = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'CREATE_PLANS' } }
      });
      if (!hasCreate) {
        return res.status(403).json({ success: false, message: 'You do not have permission to create plans.' });
      }
    }

    const category = await prisma.planCategory.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

    const plan = await prisma.plan.create({
      data: {
        tenantId,
        categoryId,
        name: name.trim().toUpperCase(),
        description: description || '',
        price: parseFloat(price),
        durationMonths: parseInt(durationMonths),
        researchSegments: category.segments, // Inherit segments from category, or override if needed
        notificationsAllowed: notificationsAllowed || 'EMAIL,INAPP',
        clientLimit: parseInt(clientLimit) || 100,
        createdById: req.user!.id,
        deletedAt: null
      }
    });
    await logAudit({ tenantId, userId: req.user!.id, action: 'CREATE', module: 'TENANTS', newValue: plan, ipAddress: req.ip });
    return res.status(201).json({ success: true, message: 'Plan created successfully', data: plan });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updatePlan = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const { categoryId, name, description, price, durationMonths, notificationsAllowed, clientLimit } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Plan name is required.' });
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({ success: false, message: 'Plan price must be a positive number.' });
  }

  try {
    const existing = await prisma.plan.findFirst({ where: { id, tenantId } });
    if (!existing || existing.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasUpdate = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'EDIT_PLANS' } }
      });
      if (!hasUpdate) {
        return res.status(403).json({ success: false, message: 'You do not have permission to edit plans.' });
      }
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_PLANS' } }
      });
      if (!hasViewAll) {
        if (existing.createdById !== req.user!.id) {
          return res.status(403).json({ success: false, message: 'You can only edit plans created by you.' });
        }
      }
    }

    let newSegments = existing.researchSegments;
    if (categoryId) {
        const category = await prisma.planCategory.findFirst({ where: { id: categoryId, tenantId } });
        if (category) {
            newSegments = category.segments;
        }
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        categoryId: categoryId || existing.categoryId,
        name: name.trim().toUpperCase(),
        description: description || '',
        price: parseFloat(price),
        durationMonths: parseInt(durationMonths) || existing.durationMonths,
        researchSegments: newSegments,
        notificationsAllowed: notificationsAllowed || existing.notificationsAllowed,
        clientLimit: parseInt(clientLimit) || existing.clientLimit
      }
    });
    await logAudit({ tenantId, userId: req.user!.id, action: 'UPDATE', module: 'TENANTS', oldValue: existing, newValue: updated, ipAddress: req.ip });
    return res.status(200).json({ success: true, message: 'Plan updated successfully', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const deletePlan = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const existing = await prisma.plan.findFirst({ where: { id, tenantId } });
    if (!existing || existing.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasDelete = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'DELETE_PLANS' } }
      });
      if (!hasDelete) {
        return res.status(403).json({ success: false, message: 'You do not have permission to delete plans.' });
      }
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_PLANS' } }
      });
      if (!hasViewAll) {
        if (existing.createdById !== req.user!.id) {
          return res.status(403).json({ success: false, message: 'You can only delete plans created by you.' });
        }
      }
    }

    await prisma.plan.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
    await logAudit({ tenantId, userId: req.user!.id, action: 'DELETE', module: 'TENANTS', oldValue: existing, ipAddress: req.ip });
    return res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const restorePlan = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const existing = await prisma.plan.findFirst({ where: { id, tenantId } });
    if (!existing || existing.deletedAt === null) return res.status(404).json({ success: false, message: 'Deleted plan not found.' });

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasDelete = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'DELETE_PLANS' } }
      });
      if (!hasDelete) {
        return res.status(403).json({ success: false, message: 'You do not have permission to restore plans.' });
      }
    }

    const updated = await prisma.plan.update({ where: { id }, data: { deletedAt: null, status: 'ACTIVE' } });
    await logAudit({ tenantId, userId: req.user!.id, action: 'UPDATE', module: 'TENANTS', oldValue: existing, newValue: updated, ipAddress: req.ip });
    return res.status(200).json({ success: true, message: 'Plan restored successfully.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const togglePlanStatus = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const existing = await prisma.plan.findFirst({ where: { id, tenantId } });
    if (!existing || existing.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isFullAdmin) {
      const hasUpdate = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'EDIT_PLANS' } }
      });
      if (!hasUpdate) {
        return res.status(403).json({ success: false, message: 'You do not have permission to edit plans.' });
      }
      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: req.user!.role }, permission: { code: 'VIEW_ALL_PLANS' } }
      });
      if (!hasViewAll) {
        if (existing.createdById !== req.user!.id) {
          return res.status(403).json({ success: false, message: 'You can only edit plans created by you.' });
        }
      }
    }

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await prisma.plan.update({ where: { id }, data: { status: newStatus } });
    return res.status(200).json({ success: true, message: `Plan status updated to ${newStatus}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateTenantSettings = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const { themeColor, companyName, companyEmail, gstCalculationType, state, gst, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, bankAccountName, bankAccountNo, bankAccountType, bankIfsc, bankName, bankBranch, socialMediaLinks, digioClientId, digioClientSecret, digioKycTemplateName, agreementContent, kycFirst, welcomeEmailText, reportDisclaimer, kraProvider, kraApiKey, kraApiSecret, activePaymentGateway, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey, ccavenueMerchantId, ccavenueAccessCode, ccavenueWorkingKey, stripePublishableKey, stripeSecretKey, address, website, mobile } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  console.log('[DEBUG] updateTenantSettings req.body:', req.body);


  try {
    const oldTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!oldTenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const dataToUpdate: any = {};
    if (themeColor) dataToUpdate.themeColor = themeColor;
    if (companyName) dataToUpdate.companyName = companyName;
    if (companyEmail) dataToUpdate.email = companyEmail;
    if (gstCalculationType) dataToUpdate.gstCalculationType = gstCalculationType;
    if (gst !== undefined) dataToUpdate.gst = gst;
    if (state !== undefined) dataToUpdate.state = state;
    if (address !== undefined) dataToUpdate.address = address;
    if (website !== undefined) dataToUpdate.website = website;
    if (mobile !== undefined) dataToUpdate.mobile = mobile;
    if (smtpHost !== undefined) dataToUpdate.smtpHost = smtpHost;
    if (bankAccountName !== undefined) dataToUpdate.bankAccountName = bankAccountName;
    if (bankAccountNo !== undefined) dataToUpdate.bankAccountNo = bankAccountNo;
    if (bankAccountType !== undefined) dataToUpdate.bankAccountType = bankAccountType;
    if (bankIfsc !== undefined) dataToUpdate.bankIfsc = bankIfsc;
    if (bankName !== undefined) dataToUpdate.bankName = bankName;
    if (bankBranch !== undefined) dataToUpdate.bankBranch = bankBranch;
    if (socialMediaLinks !== undefined) dataToUpdate.socialMediaLinks = socialMediaLinks;
    if (digioClientId !== undefined) dataToUpdate.digioClientId = digioClientId;
    if (digioClientSecret !== undefined) dataToUpdate.digioClientSecret = digioClientSecret;
    if (digioKycTemplateName !== undefined) dataToUpdate.digioKycTemplateName = digioKycTemplateName;
    if (agreementContent !== undefined) dataToUpdate.agreementContent = agreementContent;
    if (kraProvider !== undefined) dataToUpdate.kraProvider = kraProvider;
    if (kraApiKey !== undefined) dataToUpdate.kraApiKey = kraApiKey;
    if (kraApiSecret !== undefined) dataToUpdate.kraApiSecret = kraApiSecret;
    if (activePaymentGateway !== undefined) dataToUpdate.activePaymentGateway = activePaymentGateway;
    if (razorpayKeyId !== undefined) dataToUpdate.razorpayKeyId = razorpayKeyId;
    if (razorpayKeySecret !== undefined) dataToUpdate.razorpayKeySecret = razorpayKeySecret;
    if (cashfreeAppId !== undefined) dataToUpdate.cashfreeAppId = cashfreeAppId;
    if (cashfreeSecretKey !== undefined) dataToUpdate.cashfreeSecretKey = cashfreeSecretKey;
    if (ccavenueMerchantId !== undefined) dataToUpdate.ccavenueMerchantId = ccavenueMerchantId;
    if (ccavenueAccessCode !== undefined) dataToUpdate.ccavenueAccessCode = ccavenueAccessCode;
    if (ccavenueWorkingKey !== undefined) dataToUpdate.ccavenueWorkingKey = ccavenueWorkingKey;
    if (stripePublishableKey !== undefined) dataToUpdate.stripePublishableKey = stripePublishableKey;
    if (stripeSecretKey !== undefined) dataToUpdate.stripeSecretKey = stripeSecretKey;
    if (smtpPort !== undefined) dataToUpdate.smtpPort = parseInt(smtpPort, 10) || null;
    if (smtpUser !== undefined) dataToUpdate.smtpUser = smtpUser;
    if (smtpPassword !== undefined) dataToUpdate.smtpPassword = smtpPassword;
    if (smtpFrom !== undefined) dataToUpdate.smtpFrom = smtpFrom;
    if (kycFirst !== undefined) dataToUpdate.kycFirst = kycFirst === 'true' || kycFirst === true;
    if (welcomeEmailText !== undefined) dataToUpdate.welcomeEmailText = welcomeEmailText;
    if (reportDisclaimer !== undefined) dataToUpdate.reportDisclaimer = reportDisclaimer;
    if (files?.logo && files.logo.length > 0) {
      dataToUpdate.logoUrl = `/uploads/branding/${files.logo[0].filename}`;
    }
    if (files?.favicon && files.favicon.length > 0) {
      dataToUpdate.faviconUrl = `/uploads/branding/${files.favicon[0].filename}`;
    }
    if (files?.termsPdf && files.termsPdf.length > 0) {
      dataToUpdate.termsPdfUrl = `/uploads/branding/${files.termsPdf[0].filename}`;
    }
    if (files?.privacyPdf && files.privacyPdf.length > 0) {
      dataToUpdate.privacyPdfUrl = `/uploads/branding/${files.privacyPdf[0].filename}`;
    }
    if (files?.coSignature && files.coSignature.length > 0) {
      dataToUpdate.coSignatureUrl = `/uploads/branding/${files.coSignature[0].filename}`;
    }
    if (files?.internalPolicyPdf && files.internalPolicyPdf.length > 0) {
      dataToUpdate.internalPolicyUrl = `/uploads/branding/${files.internalPolicyPdf[0].filename}`;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: dataToUpdate
    });

    await logAudit({ 
      tenantId, 
      userId: req.user!.id, 
      action: 'UPDATE', 
      module: 'TENANTS', 
      oldValue: oldTenant,
      newValue: updated, 
      ipAddress: req.ip 
    });
    return res.status(200).json({ success: true, message: 'Settings updated successfully', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const testSmtp = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { toEmail } = req.body;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  if (!toEmail) return res.status(400).json({ success: false, message: 'Email address is required' });

  try {
    const result = await sendTestEmail(tenantId, toEmail);
    return res.status(result.success ? 200 : 400).json({ success: result.success, message: result.message });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Test failed', errors: [error.message] });
  }
};

// ----------------------------------------------------
// PAYMENT MANAGEMENT
// ----------------------------------------------------
export const getAdminPayments = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;
    
    // Allow basic searching if needed in the future
    const search = req.query.search as string;
    let whereClause: any = { tenantId };
    
    if (search) {
      whereClause = {
        ...whereClause,
        OR: [
          { transactionRef: { contains: search } }
        ]
      }
    }

    const total = await prisma.payment.count({ where: whereClause });
    const payments = await prisma.payment.findMany({
      include: { coupon: true },
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const clientIds = [...new Set(payments.map(p => p.clientId))];
    const planIds = [...new Set(payments.map(p => p.planId).filter(Boolean))] as string[];

    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      include: { user: true, profile: true }
    });

    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } }
    });

    const clientMap = new Map(clients.map(c => [c.id, c]));
    const planMap = new Map(plans.map(p => [p.id, p]));

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const hasViewSensitive = isFullAdmin || await prisma.rolePermission.findFirst({
      where: { role: { name: req.user!.role }, permission: { code: 'VIEW_SENSITIVE_DATA' } }
    });

    const enrichedPayments = payments.map(p => {
      let clientObj = clientMap.get(p.clientId);
      if (clientObj && !hasViewSensitive) {
        clientObj = {
          ...clientObj,
          email: maskEmail(clientObj.email) as string,
          mobile: maskMobile(clientObj.mobile) as string,
          pan: maskDocument((clientObj as any).pan),
          aadhaar: maskDocument((clientObj as any).aadhaar),
          user: clientObj.user ? { ...clientObj.user, email: maskEmail((clientObj.user as any).email) } : clientObj.user,
          profile: clientObj.profile ? {
            ...clientObj.profile,
            panNumber: maskDocument((clientObj.profile as any).panNumber),
            aadharNumber: maskDocument((clientObj.profile as any).aadharNumber)
          } : clientObj.profile
        } as any;
      }

      return {
        ...p,
        client: clientObj,
        plan: p.planId ? planMap.get(p.planId) : null
      };
    });

    // Sort by paymentDate if exists, else createdAt descending
    enrichedPayments.sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.createdAt).getTime();
      const dateB = new Date(b.paymentDate || b.createdAt).getTime();
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      data: enrichedPayments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getTenantAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, role: { select: { name: true } } }
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN: Assign Plan to Client directly (bypasses payment flow)
// ─────────────────────────────────────────────────────────────
export const assignPlanByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const clientId = req.params.id || req.params.clientId;
  const { planId, remarks, paymentRefId, paymentDate, couponCode, customAmount, customDays } = req.body;

  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  if (!planId)   return res.status(400).json({ success: false, message: 'planId is required.' });
  if (!paymentRefId) return res.status(400).json({ success: false, message: 'Payment Ref ID is required.' });
  if (!paymentDate) return res.status(400).json({ success: false, message: 'Payment Date is required.' });

  try {
    // Validate client belongs to this tenant
    const client = await prisma.client.findFirst({
      where: { id: clientId, user: { tenantId } },
      include: { user: true, profile: true }
    });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found in this tenant.' });

    // Validate plan belongs to this tenant
    // Note: deletedAt: null removed from Prisma query due to MongoDB null filter issue; JS-level check used instead
    const plan = await prisma.plan.findFirst({
      where: { id: planId, tenantId, status: 'ACTIVE' }
    });
    if (!plan || plan.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found or inactive.' });

    const assigner = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true, tenant: true }
    });
    const isAdmin = assigner?.role?.name === 'SUPER_ADMIN' || assigner?.role?.name === 'ADMIN';
    const assignerName = `${assigner?.firstName || ''} ${assigner?.lastName || ''}`.trim();

    let discountAmount = 0;
    let appliedCouponId = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode, tenantId, status: 'ACTIVE' }
      });

      if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });

      if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
        return res.status(400).json({ success: false, message: 'Coupon code has expired.' });
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
      }

      if (coupon.clientId && coupon.clientId !== clientId) {
        return res.status(400).json({ success: false, message: 'Coupon is not applicable to this client.' });
      }

      if (coupon.planId && coupon.planId !== planId) {
        return res.status(400).json({ success: false, message: 'Coupon is not applicable to this plan.' });
      }

      if (coupon.categoryId && coupon.categoryId !== plan.categoryId) {
        return res.status(400).json({ success: false, message: 'Coupon is not applicable to this category.' });
      }

      if (coupon.minPurchaseValue && plan.price < coupon.minPurchaseValue) {
        return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchaseValue} required.` });
      }

      if (coupon.discountType === 'FLAT') {
        discountAmount = coupon.discountValue;
      } else if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (plan.price * coupon.discountValue) / 100;
        if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
          discountAmount = coupon.maxDiscountValue;
        }
      }

      if (discountAmount > plan.price) discountAmount = plan.price;
      appliedCouponId = coupon.id;
    }

    const discountedBasePrice = plan.price - discountAmount;
    let totalAmount = discountedBasePrice;
    
    if (assigner?.tenant?.gstCalculationType === 'EXCLUSIVE') {
      totalAmount = discountedBasePrice * 1.18;
    }

    // Handle Custom Amount logic
    let finalBasePrice = discountedBasePrice;
    let finalGstAmount = totalAmount - discountedBasePrice;
    let finalTotalAmount = totalAmount;

    if (customAmount !== undefined && customAmount !== null) {
      finalTotalAmount = customAmount;
      if (assigner?.tenant?.gstCalculationType === 'EXCLUSIVE') {
        // If exclusive, the custom amount includes GST. So Base = customAmount / 1.18
        finalBasePrice = finalTotalAmount / 1.18;
        finalGstAmount = finalTotalAmount - finalBasePrice;
      } else {
        // If inclusive, the custom amount IS the base price (technically it includes GST within it)
        finalBasePrice = finalTotalAmount;
        finalGstAmount = 0; // Or whatever inclusive calculation logic is standard
      }
    }

    const adminRemark = remarks?.trim()
      ? `Assigned by Admin - ${remarks.trim()}`
      : 'Assigned by Admin';

    const isCustomAssignment = customAmount !== undefined || customDays !== undefined;
    const finalRemark = isCustomAssignment ? `[PRO-RATA] ${adminRemark}` : adminRemark;
    const paymentMode = isCustomAssignment ? 'CUSTOM_PRO_RATA' : 'ADMIN_ASSIGNED';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate active dates (stack if same plan already exists)
      const existingSub = await tx.subscription.findFirst({
        where: { clientId, planId, status: 'ACTIVE', endDate: { gt: new Date() } },
        orderBy: { endDate: 'desc' }
      });

      let startDate = new Date();
      if (existingSub) {
        startDate = new Date(existingSub.endDate);
      }

      const planValidityDays = customDays !== undefined ? customDays : plan.durationMonths * 30;
      const endDate = new Date(startDate.getTime() + planValidityDays * 24 * 60 * 60 * 1000);

      // 2. Create new subscription
      const subscription = await tx.subscription.create({
        data: {
          clientId,
          planId,
          startDate,
          endDate,
          status: 'ACTIVE',
          amountBase: finalBasePrice,
          amountGst: finalGstAmount,
          amountTotal: parseFloat(finalTotalAmount.toFixed(2)),
          isGstInclusive: assigner?.tenant?.gstCalculationType !== 'EXCLUSIVE'
        }
      });

      // 3. Create payment record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          clientId,
          planId,
          amount: parseFloat(finalTotalAmount.toFixed(2)),
          paymentMode: paymentMode,
          transactionRef: paymentRefId,
          paymentDate: new Date(paymentDate),
          status: 'SUCCESS',
          remarks: finalRemark,
          verifiedByStaffId: req.user!.id,
          assignedByAdminName: isAdmin ? assignerName : null,
          assignedByStaffName: !isAdmin ? assignerName : null,
          clientCity: client.profile?.city || null,
          clientState: client.profile?.state || null,
          tenantState: assigner?.tenant?.state || null,
          planValidityDays: planValidityDays,
          paymentGatewayId: null,
          couponId: appliedCouponId,
          discountApplied: discountAmount > 0 ? parseFloat(discountAmount.toFixed(2)) : null
        }
      });

      if (appliedCouponId) {
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: { usedCount: { increment: 1 } }
        });
      }

      return { subscription, payment };
    });

    // 6. Create notification log for client
    const assignedDays = customDays !== undefined ? customDays : plan.durationMonths * 30;
    await prisma.notificationLog.create({
      data: {
        tenantId,
        recipient: client.email,
        channel: 'INAPP',
        title: 'New Plan Assigned',
        message: `Your account has been assigned the "${plan.name}" plan by your advisor. The plan is now active and valid until ${new Date(Date.now() + assignedDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}.`,
        status: 'SENT'
      }
    });

    // 7. Audit log
    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'CREATE',
      module: 'PAYMENTS',
      newValue: { action: 'ADMIN_PLAN_ASSIGNMENT', clientId, planId, planName: plan.name, remark: adminRemark },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Plan "${plan.name}" successfully assigned to client. Subscription is now active.`,
      data: {
        subscription: result.subscription,
        payment: result.payment
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('transactionRef')) {
      return res.status(400).json({ success: false, message: 'This Payment Reference ID has already been used. Please provide a unique Payment Ref ID.' });
    }
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getEmailTemplates = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const templates = await prisma.emailTemplate.findMany({ where: { tenantId } });
    return res.status(200).json({ success: true, data: templates });
  } catch (err: any) {
    return res.status(500).json({ success: false, errors: [err.message] });
  }
};

export const updateEmailTemplate = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const { type } = req.params;
  const { subject, body } = req.body;

  try {
    const updated = await prisma.emailTemplate.upsert({
      where: { tenantId_type: { tenantId, type } },
      update: { subject, body },
      create: { tenantId, type, subject, body }
    });
    return res.status(200).json({ success: true, data: updated, message: 'Template updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, errors: [err.message] });
  }
};


export const uploadSignature = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) throw new Error('Tenant ID required');
    if (!req.file) throw new Error('No signature file uploaded');

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        coSignatureUrl: `/uploads/branding/${req.file.filename}`
      }
    });

    res.status(200).json({ success: true, message: 'Signature updated successfully', data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Helper for date filter
const getDateFilter = (req: AuthenticatedRequest) => {
  const { range, startDate, endDate } = req.query;
  if (range === 'date' && startDate && endDate) {
    // Add 23:59:59 to endDate to include the entire day
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    return {
      gte: new Date(startDate as string),
      lte: end
    };
  }
  return undefined;
};

const arrayToCsv = (data: any[]) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : row[header].toString();
      cell = cell.replace(/"/g, '""');
      if (cell.search(/("|,|\n)/g) >= 0) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

export const exportInvoicesZip = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        status: 'SUCCESS',
        ...(dateFilter ? { createdAt: dateFilter } : {})
      }
    });

    const clientIds = payments.map(p => p.clientId);
    const clients = await prisma.client.findMany({ where: { id: { in: clientIds } } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Invoices.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const payment of payments) {
      try {
        const client = clients.find(c => c.id === payment.clientId);
        const pan = client?.pan || 'UNKNOWN_PAN';
        const dateStr = payment.createdAt.toISOString().split('T')[0];
        const pdfBuffer = await generateInvoicePdf(payment.id);
        archive.append(pdfBuffer, { name: `${pan}_Invoice_${dateStr}.pdf` });
      } catch (err) {
        console.error(`Failed to generate invoice for payment ${payment.id}`, err);
      }
    }
    
    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const exportAgreementsZip = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const clients = await prisma.client.findMany({
      where: { user: { tenantId } },
      include: {
        agreements: {
          where: dateFilter ? { signedAt: dateFilter } : {}
        },
        user: true
      }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Agreements.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const client of clients) {
      for (const agreement of client.agreements) {
        if (agreement.agreementUrl) {
          const filePath = path.join(__dirname, '../../public', agreement.agreementUrl);
          if (fs.existsSync(filePath)) {
            const dateStr = agreement.signedAt.toISOString().split('T')[0];
            archive.file(filePath, { name: `${client.pan}_Agreement_${dateStr}.pdf` });
          }
        }
      }
    }
    
    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const exportKRAZip = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const clients = await prisma.client.findMany({
      where: { user: { tenantId } },
      include: {
        documents: {
          where: dateFilter ? { uploadedAt: dateFilter } : {}
        }
      }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="KRA_Documents.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const client of clients) {
      for (const doc of client.documents) {
        if (doc.fileUrl) {
          const filePath = path.join(__dirname, '../../public', doc.fileUrl);
          if (fs.existsSync(filePath)) {
            const ext = path.extname(doc.fileUrl) || '.pdf';
            const dateStr = doc.uploadedAt.toISOString().split('T')[0];
            archive.file(filePath, { name: `${client.pan}_${doc.docType}_${dateStr}${ext}` });
          }
        }
      }
    }
    
    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const exportClientsCSV = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const clients = await prisma.client.findMany({
      where: { 
        user: { 
          tenantId,
          deletedAt: null 
        },
        ...(dateFilter ? { user: { tenantId, deletedAt: null, createdAt: dateFilter } } : {})
      },
      include: { 
        user: true, 
        profile: true,
        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } },
        agreements: true,
        complianceAlerts: true
      },
      orderBy: { user: { createdAt: 'desc' } }
    });

    const creatorIds = [...new Set(clients.map(c => c.createdById).filter(Boolean))] as string[];
    const creatorUsers = creatorIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } }
    }) : [];

    const creatorMap = new Map(creatorUsers.map(u => [
      u.id, 
      `${u.firstName} ${u.lastName}`.trim() + ` (${u.role?.name || 'Staff'})`
    ]));

    const csvData = clients.map(c => {
      const isKraFailed = c.complianceAlerts?.some((a: any) => a.alertType === 'KYC_FAILED');
      const kraStatus = isKraFailed ? 'FAILED' : (c.status && c.status !== 'PENDING_ONBOARDING' && c.status !== 'KYC_PENDING' && c.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
      const isEsignSigned = c.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE');

      let sourceStr = 'Self Signup';
      if (c.createdById) {
        sourceStr = creatorMap.get(c.createdById) || 'Added by Staff/Admin';
      }

      return {
        'Client ID': c.id,
        'Name': c.name,
        'Email': c.email,
        'Mobile': c.mobile,
        'PAN': c.pan,
        'Aadhaar': c.aadhaar,
        'Category': c.category,
        'Occupation': c.occupation || 'N/A',
        'City': c.profile?.city || 'N/A',
        'State': c.profile?.state || 'N/A',
        'Joined Date': c.user.createdAt ? new Date(c.user.createdAt).toLocaleDateString('en-IN') : 'N/A',
        'Status': c.user.status || c.status,
        'KRA Status': kraStatus,
        'eSign Status': isEsignSigned ? 'SIGNED' : 'PENDING',
        'Added By / Source': sourceStr,
        'Active Plan': c.subscriptions.length > 0 ? c.subscriptions[0].plan.name : 'None'
      };
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="All_Clients_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(arrayToCsv(csvData));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportDeletedClientsCSV = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const deletedUsers = await prisma.user.findMany({
      where: { 
        tenantId, 
        role: { name: 'CLIENT' },
        deletedAt: { not: null },
        ...(dateFilter ? { deletedAt: dateFilter } : {})
      },
      include: { client: true }
    });

    const csvData = deletedUsers.map(u => ({
      'User ID': u.id,
      'Client ID': u.client?.id || '',
      'Name': `${u.firstName} ${u.lastName}`,
      'Email': u.email,
      'Mobile': u.mobile,
      'PAN': u.client?.pan || '',
      'Aadhaar': u.client?.aadhaar || '',
      'Joined Date': u.createdAt.toISOString(),
      'Deleted At': u.deletedAt?.toISOString() || '',
      'Deleted By': u.deletedBy || ''
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Deleted_Clients.csv"');
    res.send(arrayToCsv(csvData));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportPaymentsCSV = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const payments = await prisma.payment.findMany({
      where: { 
        tenantId,
        ...(dateFilter ? { createdAt: dateFilter } : {})
      },
      include: { 
        tenant: { include: { plans: true } }
      }
    });

    const clientIds = payments.map(p => p.clientId);
    const clients = await prisma.client.findMany({ where: { id: { in: clientIds } } });

    const csvData = payments.map(p => {
      const plan = p.tenant.plans.find((pl: any) => pl.id === p.planId);
      const client = clients.find(c => c.id === p.clientId);
      return {
        'Payment ID': p.id,
        'Client Name': client?.name || 'Unknown',
        'Client Email': client?.email || 'Unknown',
        'Client Mobile': client?.mobile || 'Unknown',
        'Amount': p.amount,
        'Payment Mode': p.paymentMode,
        'Transaction Ref': p.transactionRef,
        'Status': p.status,
        'Plan Name': plan ? plan.name : 'Unknown',
        'Payment Date': p.createdAt.toISOString()
      };
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Payments_Report.csv"');
    res.send(arrayToCsv(csvData));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportResearchReportsZip = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant' });
  
  try {
    const dateFilter = getDateFilter(req);
    const signals = await prisma.signal.findMany({
      where: { 
        tenantId,
        reportUrl: { not: null },
        ...(dateFilter ? { createdAt: dateFilter } : {})
      },
      include: { stock: true },
      orderBy: { createdAt: 'desc' }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Research_Reports.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const signal of signals) {
      if (signal.reportUrl) {
        // reportUrl is typically "/uploads/research/..."
        const filePath = path.join(__dirname, '../../..', signal.reportUrl);
        if (fs.existsSync(filePath)) {
          const dateStr = signal.createdAt.toISOString().split('T')[0];
          const symbol = signal.stock?.symbol || 'UNKNOWN';
          const uniqueId = signal.id.slice(0, 6);
          const ext = path.extname(signal.reportUrl) || '.pdf';
          archive.file(filePath, { name: `${dateStr}_${symbol}_${uniqueId}_Research${ext}` });
        }
      }
    }
    
    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const getClientCommunications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'No tenant' });

    // Fetch the client and their user relation to check tenantId
    const client = await prisma.client.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!client || client.user.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Collect possible recipients
    const recipients: string[] = [];
    if (client.email) recipients.push(client.email);
    if (client.mobile) recipients.push(client.mobile);
    if (client.user?.email && client.user.email !== client.email) recipients.push(client.user.email);

    if (recipients.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const logs = await prisma.notificationLog.findMany({
      where: {
        tenantId,
        recipient: { in: recipients }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
