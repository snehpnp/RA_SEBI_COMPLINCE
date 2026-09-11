import { Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb, { centralModels } from '../config/db';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { sendWelcomeEmail, sendTestEmail } from '../services/emailService';
import { checkComplianceForTenant } from './complianceController';
import { syncTenantToRemote } from '../services/tenantSyncDispatcher';
import archiver = require('archiver');
import fs from 'fs';
import path from 'path';
import { generateInvoicePdf } from '../services/invoiceGenerator';
import axios from 'axios';

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

    const clientAndAdminRoles = await dynamicDb.Role.find({ name: { $in: ['CLIENT', 'ADMIN'] } }).lean();
    const excludeRoleIds = clientAndAdminRoles.map((r: any) => r._id || r.id);

    const clientFilter: any = { tenantId };
    if (!isFullAdmin && userId) clientFilter.createdById = userId;

    const researchFilter: any = { tenantId };
    if (!isFullAdmin && userId) researchFilter.createdById = userId;

    const planFilter: any = { tenantId, deletedAt: null };
    if (!isFullAdmin && userId) planFilter.createdById = userId;

    const [staffCount, clientCount, researchCount, planCount] = await Promise.all([
      dynamicDb.User.countDocuments({ tenantId, roleId: { $nin: excludeRoleIds }, deletedAt: null }),
      dynamicDb.Client.countDocuments(clientFilter),
      dynamicDb.ResearchReport.countDocuments(researchFilter),
      dynamicDb.Plan.countDocuments(planFilter)
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
  let tenant: any = null;
  if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
    tenant = await dynamicDb.Tenant.findById(tenantId).lean();
  }
  if (!tenant && tenantId) {
    tenant = await dynamicDb.Tenant.findOne({
      $or: [{ id: tenantId }, { tenantId: tenantId }]
    }).lean();
  }
  if (!tenant) {
    tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
  }
  if (!tenant) return { score: 0, details: { organization: false, principalOfficer: false, complianceOfficer: false, grievance: false, internalPolicy: false }, data: null };

  // Fallback SMTP lookup in local dynamicDb.SystemSetting if dynamic tenant document lacks SMTP fields
  if (!tenant.smtpHost || !tenant.smtpUser) {
    try {
      const setting: any = await dynamicDb.SystemSetting.findOne({ key: 'GLOBAL_SMTP' }).lean();
      if (setting?.value) {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        if (parsed.smtpHost && parsed.smtpUser) {
          tenant.smtpHost = parsed.smtpHost;
          tenant.smtpPort = parsed.smtpPort;
          tenant.smtpUser = parsed.smtpUser;
          tenant.smtpPassword = parsed.smtpPassword;
          tenant.smtpFrom = parsed.smtpFrom;
        }
      }
    } catch { }
  }

  const resolvedTenantId = String(tenant._id || tenant.id || tenant.tenantId || tenantId);

  const users: any[] = await dynamicDb.User.find({
    $or: [
      { tenantId: resolvedTenantId },
      { tenantId }
    ]
  })
    .populate('roleId')
    .lean();
  const userIds = users.map((u: any) => u._id || u.id);
  const staffList = await dynamicDb.Staff.find({ userId: { $in: userIds } }).lean();
  const staffMap = new Map(staffList.map((s: any) => [String(s.userId), s]));

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
  const poUser = users.find(u => u.roleId?.name === 'PRINCIPAL_OFFICER' && u.status !== 'DELETED');
  const poStaff = poUser ? staffMap.get(String(poUser._id || poUser.id)) : null;
  if (poUser && poStaff && poStaff.nismNumber && poStaff.nismValidity) {
    score += 20;
    details.principalOfficer = true;
  }

  // 3. Compliance Officer (User with role COMPLIANCE_OFFICER)
  const coUser = users.find(u => u.roleId?.name === 'COMPLIANCE_OFFICER' && u.status !== 'DELETED');
  const coStaff = coUser ? staffMap.get(String(coUser._id || coUser.id)) : null;
  if (coUser && coStaff && coStaff.nismNumber) {
    score += 20;
    details.complianceOfficer = true;
  }

  // 4. Grievance Officer details
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
    let oldTenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      oldTenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!oldTenant && tenantId) {
      oldTenant = await dynamicDb.Tenant.findOne({
        $or: [{ id: tenantId }, { tenantId: tenantId }]
      }).lean();
    }
    if (!oldTenant) {
      oldTenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!oldTenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant company record not found. Please log out and log in again.',
        errors: ['Tenant record not found']
      });
    }

    if (step === 'ORG') {
      if (data.gst) {
        const duplicateGst = await dynamicDb.Tenant.findOne({
          gst: data.gst,
          _id: { $ne: tenantId }
        }).lean();
        if (duplicateGst) {
          return res.status(400).json({ success: false, message: 'This GST number is already registered. Please provide a unique GST number.' });
        }
      }

      const updatedTenant = await dynamicDb.Tenant.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            address: data.address,
            website: data.website,
            mobile: data.mobile,
            gst: data.gst
          }
        },
        { returnDocument: 'after', lean: true }
      );
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
      const poRole = await dynamicDb.Role.findOne({ name: 'PRINCIPAL_OFFICER' }).lean();
      if (!poRole) throw new Error('Principal Officer role not found');

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Po@12345', salt);

      const email = data.email;

      const emailConflictUser: any = await dynamicDb.User.findOne({ email }).lean();
      if (emailConflictUser && emailConflictUser.tenantId !== tenantId) {
        return res.status(400).json({ success: false, message: 'This email is already registered in the system under a different company. Please use a unique email.' });
      }

      const existingPO: any = await dynamicDb.User.findOne({
        tenantId,
        roleId: poRole._id || poRole.id
      });

      if (existingPO) {
        if (existingPO.email !== email) {
          const newEmailConflict = await dynamicDb.User.findOne({ email }).lean();
          if (newEmailConflict) {
            return res.status(400).json({ success: false, message: 'This email is already in use by another user.' });
          }
        }
        await dynamicDb.User.findByIdAndUpdate(existingPO._id || existingPO.id, {
          $set: { firstName: data.name, mobile: data.mobile, email }
        });
        
        await dynamicDb.Staff.findOneAndUpdate(
          { userId: existingPO._id || existingPO.id },
          {
            $set: {
              name: data.name,
              email,
              mobile: data.mobile,
              nismNumber: data.nismNumber,
              nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
              ...(req.file ? { nismUpload: `/uploads/staff/${req.file.filename}` } : {})
            },
            $setOnInsert: {
              userId: existingPO._id || existingPO.id,
              employeeId: 'EMP-PO-' + Math.floor(100 + Math.random() * 900),
              status: 'ACTIVE'
            }
          },
          { upsert: true, returnDocument: 'after' }
        );
      } else {
        const newUser: any = await dynamicDb.User.create({
          tenantId,
          roleId: poRole._id || poRole.id,
          email,
          firstName: data.name,
          lastName: '(PO)',
          mobile: data.mobile,
          passwordHash,
          status: 'ACTIVE'
        });
        await dynamicDb.Staff.create({
          userId: newUser._id || newUser.id,
          employeeId: 'EMP-PO-' + Math.floor(100 + Math.random() * 900),
          name: data.name,
          email,
          mobile: data.mobile,
          nismNumber: data.nismNumber,
          nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
          nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
          status: 'ACTIVE'
        });
      }
    } else if (step === 'CO') {
      const coRole = await dynamicDb.Role.findOne({ name: 'COMPLIANCE_OFFICER' }).lean();
      if (!coRole) throw new Error('Compliance Officer role not found');

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Co@12345', salt);

      const email = data.email;

      const emailConflictUserCO: any = await dynamicDb.User.findOne({ email }).lean();
      if (emailConflictUserCO && emailConflictUserCO.tenantId !== tenantId) {
        return res.status(400).json({ success: false, message: 'This email is already registered in the system under a different company. Please use a unique email.' });
      }

      const existingCO: any = await dynamicDb.User.findOne({
        tenantId,
        roleId: coRole._id || coRole.id
      });

      if (existingCO) {
        if (existingCO.email !== email) {
          const newEmailConflict = await dynamicDb.User.findOne({ email }).lean();
          if (newEmailConflict) {
            return res.status(400).json({ success: false, message: 'This email is already in use by another user.' });
          }
        }
        await dynamicDb.User.findByIdAndUpdate(existingCO._id || existingCO.id, {
          $set: { firstName: data.name, mobile: data.mobile, email }
        });

        await dynamicDb.Staff.findOneAndUpdate(
          { userId: existingCO._id || existingCO.id },
          {
            $set: {
              name: data.name,
              email,
              mobile: data.mobile,
              nismNumber: data.nismNumber,
              nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
              ...(req.file ? { nismUpload: `/uploads/staff/${req.file.filename}` } : {})
            },
            $setOnInsert: {
              userId: existingCO._id || existingCO.id,
              employeeId: 'EMP-CO-' + Math.floor(100 + Math.random() * 900),
              status: 'ACTIVE'
            }
          },
          { upsert: true, returnDocument: 'after' }
        );
      } else {
        const newUser: any = await dynamicDb.User.create({
          tenantId,
          roleId: coRole._id || coRole.id,
          email,
          firstName: data.name,
          lastName: '(CO)',
          mobile: data.mobile,
          passwordHash,
          status: 'ACTIVE'
        });
        await dynamicDb.Staff.create({
          userId: newUser._id || newUser.id,
          employeeId: 'EMP-CO-' + Math.floor(100 + Math.random() * 900),
          name: data.name,
          email,
          mobile: data.mobile,
          nismNumber: data.nismNumber,
          nismValidity: data.nismValidity ? new Date(data.nismValidity) : null,
          nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
          status: 'ACTIVE'
        });
      }
    } else if (step === 'POLICY') {
      const updatedTenant = await dynamicDb.Tenant.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            internalPolicyUrl: data.internalPolicyUrl || '/uploads/policies/default_policy.pdf'
          }
        },
        { returnDocument: 'after', lean: true }
      );
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
    if (nismNumber && nismNumber.trim().length > 0) {
      const existingNism = await dynamicDb.Staff.findOne({
        nismNumber: nismNumber.trim()
      }).lean();
      if (existingNism) {
        return res.status(400).json({ success: false, message: 'Duplicate NISM Certificate Number. This number is already in use.' });
      }
    }

    const existingUser = await dynamicDb.User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const targetRole = await dynamicDb.Role.findOne({ name: effectiveRoleName }).lean();
    if (!targetRole) {
      return res.status(400).json({ success: false, message: `Role '${effectiveRoleName}' not found.` });
    }

    const randomPassword = 'Staff@' + Math.floor(1000 + Math.random() * 9000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(randomPassword, salt);

    const user: any = await dynamicDb.User.create({
      tenantId,
      roleId: targetRole._id || targetRole.id,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || 'Staff',
      email,
      mobile,
      passwordHash,
      status: 'ACTIVE'
    });

    const staff: any = await dynamicDb.Staff.create({
      userId: user._id || user.id,
      employeeId: 'EMP' + Math.floor(1000 + Math.random() * 900),
      name,
      email,
      mobile,
      dob: dob ? new Date(dob) : null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      nismNumber,
      nismUpload: req.file ? `/uploads/staff/${req.file.filename}` : null,
      nismValidity: nismValidity ? new Date(nismValidity) : null,
      status: 'ACTIVE'
    });

    if (['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(effectiveRoleName)) {
      await dynamicDb.PersonAssociated.create({
        staffId: staff._id || staff.id,
        roleType: effectivePersonAssociatedType || 'SALES',
        customRole: effectivePersonAssociatedType === 'OTHER' ? customRole : null
      });
    }

    // Log Notification log for SMTP
    await dynamicDb.NotificationLog.create({
      tenantId,
      recipient: email,
      channel: 'EMAIL',
      title: 'Staff Account Created',
      message: `Welcome ${name}! Your account has been created on RAGCP. Role: ${roleName}. Credentials: Username: ${email}, Password: ${randomPassword}`,
      status: 'SENT'
    }).catch(() => {});

    // Write audit log
    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'CREATE',
      module: 'STAFF',
      newValue: staff,
      ipAddress: req.ip
    });

    // Run compliance verification sweep for staff NISM validity
    await checkComplianceForTenant(tenantId);

    // Get login URL
    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const tenant: any = await dynamicDb.Tenant.findById(tenantId).lean();

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
    }

    return res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: {
        staff,
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
    const users: any[] = await dynamicDb.User.find({ tenantId })
      .populate('roleId')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((u: any) => u._id || u.id);
    const staffList: any[] = await dynamicDb.Staff.find({ userId: { $in: userIds } }).lean();
    const staffIds = staffList.map((s: any) => s._id || s.id);
    const personAssocs: any[] = await dynamicDb.PersonAssociated.find({ staffId: { $in: staffIds } }).lean();

    const paMap = new Map(personAssocs.map((p: any) => [String(p.staffId), p]));
    const userMap = new Map(users.map((u: any) => [String(u._id || u.id), u]));

    const staffMembers = staffList.map((s: any) => {
      const user = userMap.get(String(s.userId));
      const pa = paMap.get(String(s._id || s.id));
      return {
        ...s,
        id: String(s._id || s.id),
        user: user ? {
          ...user,
          id: String(user._id || user.id),
          role: user.roleId
        } : null,
        personAssociated: pa || null
      };
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
    const currentStaff: any = await dynamicDb.Staff.findById(id).lean();
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
    const staff: any = await dynamicDb.Staff.findById(id).lean();
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const staffUser: any = await dynamicDb.User.findById(staff.userId).lean();
    if (!staffUser || staffUser.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (nismNumber && nismNumber.trim().length > 0) {
      const existingNism = await dynamicDb.Staff.findOne({
        nismNumber: nismNumber.trim(),
        _id: { $ne: id }
      }).lean();
      if (existingNism) {
        return res.status(400).json({ success: false, message: 'Duplicate NISM Certificate Number. This number is already in use.' });
      }
    }

    const updateUserData: any = {
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || 'Staff',
      mobile
    };

    if (email !== staff.email) {
      const emailExists = await dynamicDb.User.findOne({ email, _id: { $ne: staff.userId } }).lean();
      if (emailExists) throw new Error('Email already in use by another user.');
      updateUserData.email = email;
    }

    await dynamicDb.User.findByIdAndUpdate(staff.userId, { $set: updateUserData });

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

    const updatedStaff = await dynamicDb.Staff.findByIdAndUpdate(
      id,
      { $set: updateStaffData },
      { returnDocument: 'after', lean: true }
    );

    await dynamicDb.PersonAssociated.deleteMany({ staffId: id });

    if (['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(effectiveRoleName)) {
      await dynamicDb.PersonAssociated.create({
        staffId: id,
        roleType: effectivePersonAssociatedType || 'SALES',
        customRole: effectivePersonAssociatedType === 'OTHER' ? customRole : null
      });
    }

    const newStaffVal = await dynamicDb.Staff.findById(id).lean();

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'STAFF',
      oldValue: staff,
      newValue: newStaffVal,
      ipAddress: req.ip
    });

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
    const staff: any = await dynamicDb.Staff.findById(id).lean();
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const staffUser: any = await dynamicDb.User.findById(staff.userId).lean();
    if (!staffUser || staffUser.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updatedStaff = await dynamicDb.Staff.findByIdAndUpdate(
      id,
      { $set: { status: newStatus } },
      { returnDocument: 'after', lean: true }
    );

    await dynamicDb.User.findByIdAndUpdate(staff.userId, {
      $set: { status: newStatus }
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'STAFF',
      oldValue: staff,
      newValue: updatedStaff,
      ipAddress: req.ip
    });

    await checkComplianceForTenant(tenantId);

    return res.status(200).json({
      success: true,
      message: `Staff status updated to ${newStatus}`,
      data: updatedStaff
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
    const staff: any = await dynamicDb.Staff.findById(id).lean();
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const staffUser: any = await dynamicDb.User.findById(staff.userId).lean();
    if (!staffUser || staffUser.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const now = new Date();
    await dynamicDb.User.findByIdAndUpdate(staff.userId, { $set: { deletedAt: now } });
    await dynamicDb.Staff.findByIdAndUpdate(id, { $set: { status: 'INACTIVE' } });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'STAFF',
      oldValue: staff,
      newValue: { ...staff, deletedAt: now },
      ipAddress: req.ip
    });

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
    const staff: any = await dynamicDb.Staff.findById(id).lean();
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Deleted staff member not found.' });
    }

    const staffUser: any = await dynamicDb.User.findById(staff.userId).lean();
    if (!staffUser || staffUser.tenantId !== tenantId || !staffUser.deletedAt) {
      return res.status(404).json({ success: false, message: 'Deleted staff member not found.' });
    }

    await dynamicDb.User.findByIdAndUpdate(staff.userId, {
      $set: { deletedAt: null, status: 'ACTIVE' }
    });
    await dynamicDb.Staff.findByIdAndUpdate(id, {
      $set: { status: 'ACTIVE' }
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

    let hasViewAll = isFullAdmin;
    let hasViewOwn = isFullAdmin;

    if (!isFullAdmin) {
      const userRole = await dynamicDb.Role.findOne({ name: req.user!.role }).lean();
      const roleId = userRole?._id || userRole?.id;

      const viewAllPerm = await dynamicDb.Permission.findOne({ code: 'VIEW_ALL_CLIENTS' }).lean();
      const viewOwnPerm = await dynamicDb.Permission.findOne({ code: 'VIEW_OWN_CLIENTS' }).lean();

      if (viewAllPerm) {
        const rpAll = await dynamicDb.RolePermission.findOne({
          roleId,
          permissionId: viewAllPerm._id || viewAllPerm.id
        }).lean();
        if (rpAll) hasViewAll = true;
      }

      if (viewOwnPerm) {
        const rpOwn = await dynamicDb.RolePermission.findOne({
          roleId,
          permissionId: viewOwnPerm._id || viewOwnPerm.id
        }).lean();
        if (rpOwn) hasViewOwn = true;
      }

      if (!hasViewAll && !hasViewOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view clients.' });
      }
    }

    // 1. Find all roles representing CLIENT / USER / CUSTOMER / INVESTOR
    const clientRoles = await dynamicDb.Role.find({
      name: { $regex: /^(client|user|customer|investor)$/i }
    }).lean();
    const clientRoleIds = clientRoles.map((r: any) => r._id || r.id);

    // 2. Build tenant filter for active users
    const tenantUserFilter: any = {
      $or: [
        { tenantId: tenantId },
        ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : [])
      ],
      deletedAt: null
    };

    if (!isFullAdmin && !hasViewAll && hasViewOwn) {
      tenantUserFilter.createdById = req.user!.id;
    }

    // Query all matching users in tenant
    const users: any[] = await dynamicDb.User.find({
      ...tenantUserFilter,
      $or: [
        { roleId: { $in: clientRoleIds } },
        { role: { $regex: /^(client|user|customer|investor)$/i } }
      ]
    }).populate('roleId').sort({ createdAt: -1 }).lean();

    const userIds = users.map((u: any) => u._id || u.id);
    const userMap = new Map(users.map((u: any) => [String(u._id || u.id), u]));

    // 3. Find Client documents linked to these users or this tenant
    const clientQuery: any = {
      $or: [
        { userId: { $in: userIds } },
        { tenantId: tenantId },
        ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : [])
      ]
    };

    if (!isFullAdmin && !hasViewAll && hasViewOwn) {
      clientQuery.createdById = req.user!.id;
    }

    const rawClients: any[] = await dynamicDb.Client.find(clientQuery)
      .populate('userId')
      .sort({ createdAt: -1 })
      .lean();

    // Map existing Client records by userId
    const clientByUserId = new Map<string, any>();
    for (const c of rawClients) {
      const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || '');
      if (uIdStr) {
        clientByUserId.set(uIdStr, c);
      }
    }

    // 4. Ensure every User with CLIENT/USER role is included in client list
    const combinedClients: any[] = [...rawClients];
    for (const u of users) {
      const uIdStr = String(u._id || u.id);
      if (!clientByUserId.has(uIdStr)) {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'Client';
        const synthClient: any = {
          _id: u._id,
          id: uIdStr,
          userId: u,
          name: fullName,
          email: u.email,
          mobile: u.mobile || '',
          dob: u.dob || null,
          pan: u.pan || 'N/A',
          aadhaar: u.aadhaar || 'N/A',
          category: u.category || 'INDIVIDUAL',
          occupation: u.occupation || 'other',
          status: u.status || 'ACTIVE',
          kraVerified: false,
          createdById: u.createdById || null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        };
        combinedClients.push(synthClient);
        clientByUserId.set(uIdStr, synthClient);
      }
    }

    const allClientIds = combinedClients.map((c: any) => c._id || c.id);
    const allUserIds = combinedClients.map((c: any) => String(c.userId?._id || c.userId?.id || c.userId || c._id || c.id));
    const allLookupIds = [...new Set([...allClientIds, ...allUserIds])];

    // Profiles
    const profiles: any[] = await dynamicDb.ClientProfile.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const profileMap = new Map();
    for (const p of profiles) {
      if (p.clientId) profileMap.set(String(p.clientId), p);
    }

    // Subscriptions
    const subscriptions: any[] = await dynamicDb.Subscription.find({
      clientId: { $in: allLookupIds }
    })
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();
    const subMap = new Map<string, any[]>();
    for (const sub of subscriptions) {
      const cId = String(sub.clientId);
      if (!subMap.has(cId)) subMap.set(cId, []);
      subMap.get(cId)!.push(sub);
    }

    // Agreements
    const agreements: any[] = await dynamicDb.Agreement.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const agMap = new Map<string, any[]>();
    for (const ag of agreements) {
      const cId = String(ag.clientId);
      if (!agMap.has(cId)) agMap.set(cId, []);
      agMap.get(cId)!.push(ag);
    }

    // Documents
    const documents: any[] = await dynamicDb.ClientDocument.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const docMap = new Map<string, any[]>();
    for (const doc of documents) {
      const cId = String(doc.clientId);
      if (!docMap.has(cId)) docMap.set(cId, []);
      docMap.get(cId)!.push(doc);
    }

    // Compliance Alerts
    const alerts: any[] = await dynamicDb.ComplianceAlert.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const alertMap = new Map<string, any[]>();
    for (const al of alerts) {
      const cId = String(al.clientId);
      if (!alertMap.has(cId)) alertMap.set(cId, []);
      alertMap.get(cId)!.push(al);
    }

    // Creators
    const creatorIds = [...new Set(combinedClients.map((c: any) => c.createdById).filter(Boolean))] as string[];
    const creatorUsers = creatorIds.length > 0 ? await dynamicDb.User.find({
      _id: { $in: creatorIds }
    }).populate('roleId').lean() : [];

    const creatorMap = new Map(creatorUsers.map((u: any) => [
      String(u._id || u.id),
      {
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        roleName: u.roleId?.name || 'STAFF'
      }
    ]));

    let clients = combinedClients.map((c: any) => {
      const cIdStr = String(c._id || c.id);
      const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || cIdStr);
      const uObj: any = (c.userId && typeof c.userId === 'object' && c.userId.email) ? c.userId : userMap.get(uIdStr);

      let createdByInfo = { type: 'SELF', label: 'Self Signup', name: 'Self Signup', role: 'CLIENT' };
      const creatorId = c.createdById || uObj?.createdById;
      if (creatorId) {
        const creator = creatorMap.get(String(creatorId));
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

      const clientSubs = (subMap.get(cIdStr) || subMap.get(uIdStr) || []).map((s: any) => ({
        ...s,
        id: String(s._id || s.id),
        plan: s.planId ? {
          ...s.planId,
          id: String(s.planId._id || s.planId.id)
        } : null
      }));

      const userDisplayName = uObj ? `${uObj.firstName || ''} ${uObj.lastName || ''}`.trim() || uObj.email : c.name;

      return {
        ...c,
        id: cIdStr,
        name: c.name || userDisplayName,
        email: c.email || uObj?.email,
        mobile: c.mobile || uObj?.mobile,
        status: c.status || uObj?.status || 'ACTIVE',
        user: uObj ? {
          ...uObj,
          id: String(uObj._id || uObj.id),
          role: uObj.roleId
        } : null,
        profile: profileMap.get(cIdStr) || profileMap.get(uIdStr) || null,
        subscriptions: clientSubs,
        agreements: agMap.get(cIdStr) || agMap.get(uIdStr) || [],
        documents: docMap.get(cIdStr) || docMap.get(uIdStr) || [],
        complianceAlerts: alertMap.get(cIdStr) || alertMap.get(uIdStr) || [],
        createdByInfo
      };
    });

    const hasViewSensitive = isFullAdmin || await (async () => {
      const userRole = await dynamicDb.Role.findOne({ name: req.user!.role }).lean();
      if (!userRole) return false;
      const perm = await dynamicDb.Permission.findOne({ code: 'VIEW_SENSITIVE_DATA' }).lean();
      if (!perm) return false;
      const rp = await dynamicDb.RolePermission.findOne({ roleId: userRole._id || userRole.id, permissionId: perm._id || perm.id }).lean();
      return !!rp;
    })();

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
    const clientRoles = await dynamicDb.Role.find({
      name: { $regex: /^(client|user|customer|investor)$/i }
    }).lean();
    const clientRoleIds = clientRoles.map((r: any) => r._id || r.id);

    const deletedUsers = await dynamicDb.User.find({
      $and: [
        {
          $or: [
            { tenantId: tenantId },
            ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : [])
          ]
        },
        { deletedAt: { $ne: null } },
        {
          $or: [
            { roleId: { $in: clientRoleIds } },
            { role: { $regex: /^(client|user|customer|investor)$/i } }
          ]
        }
      ]
    }).populate('roleId').lean();

    const userIds = deletedUsers.map((u: any) => u._id || u.id);

    const rawClients: any[] = await dynamicDb.Client.find({
      userId: { $in: userIds }
    }).sort({ updatedAt: -1 }).lean();

    const clientByUserId = new Map(rawClients.map((c: any) => [String(c.userId), c]));
    const userMap = new Map(deletedUsers.map((u: any) => [String(u._id || u.id), u]));

    const combinedClients: any[] = [...rawClients];
    for (const u of deletedUsers) {
      const uIdStr = String(u._id || u.id);
      if (!clientByUserId.has(uIdStr)) {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Client';
        const synthClient: any = {
          _id: u._id,
          id: uIdStr,
          userId: u._id,
          name: fullName,
          email: u.email,
          mobile: u.mobile || '',
          pan: (u as any).pan || 'N/A',
          aadhaar: (u as any).aadhaar || 'N/A',
          status: 'INACTIVE',
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        };
        combinedClients.push(synthClient);
      }
    }

    const allClientIds = combinedClients.map((c: any) => c._id || c.id);
    const allLookupIds = [...new Set([...allClientIds, ...userIds])];

    const profiles = await dynamicDb.ClientProfile.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const profileMap = new Map(profiles.map((p: any) => [String(p.clientId), p]));

    const subscriptions = await dynamicDb.Subscription.find({
      clientId: { $in: allLookupIds }
    })
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();
    const subMap = new Map<string, any[]>();
    for (const sub of subscriptions) {
      const cId = String(sub.clientId);
      if (!subMap.has(cId)) subMap.set(cId, []);
      subMap.get(cId)!.push(sub);
    }

    const agreements = await dynamicDb.Agreement.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const agMap = new Map<string, any[]>();
    for (const ag of agreements) {
      const cId = String(ag.clientId);
      if (!agMap.has(cId)) agMap.set(cId, []);
      agMap.get(cId)!.push(ag);
    }

    const documents = await dynamicDb.ClientDocument.find({
      clientId: { $in: allLookupIds }
    }).lean();
    const docMap = new Map<string, any[]>();
    for (const doc of documents) {
      const cId = String(doc.clientId);
      if (!docMap.has(cId)) docMap.set(cId, []);
      docMap.get(cId)!.push(doc);
    }

    const isFullAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const hasViewSensitive = isFullAdmin;

    let result = combinedClients.map((c: any) => {
      const cIdStr = String(c._id || c.id);
      const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || cIdStr);
      const user = userMap.get(uIdStr);
      return {
        ...c,
        id: cIdStr,
        user: user ? {
          ...user,
          status: user.status,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          deletedAt: user.deletedAt,
          deletedBy: user.deletedBy
        } : null,
        profile: profileMap.get(cIdStr) || profileMap.get(uIdStr) || null,
        subscriptions: subMap.get(cIdStr) || subMap.get(uIdStr) || [],
        agreements: agMap.get(cIdStr) || agMap.get(uIdStr) || [],
        documents: docMap.get(cIdStr) || docMap.get(uIdStr) || []
      };
    });

    if (!hasViewSensitive) {
      result = result.map((c: any) => ({
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
      }));
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
    let client: any = await dynamicDb.Client.findById(id).lean();
    let clientUser: any = null;

    if (client) {
      clientUser = await dynamicDb.User.findById(client.userId).lean();
    } else {
      client = await dynamicDb.Client.findOne({ userId: id }).lean();
      if (client) {
        clientUser = await dynamicDb.User.findById(client.userId).lean();
      } else {
        clientUser = await dynamicDb.User.findById(id).lean();
      }
    }

    if (!clientUser || String(clientUser.tenantId) !== String(tenantId)) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const currentStatus = clientUser.status || client?.status || 'ACTIVE';
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    if (client?._id) {
      await dynamicDb.Client.findByIdAndUpdate(client._id, { $set: { status: newStatus } });
    }
    await dynamicDb.User.findByIdAndUpdate(clientUser._id || clientUser.id, { $set: { status: newStatus } });

    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();

    if (newStatus === 'ACTIVE') {
      await import('../services/emailService').then(m => m.sendAccountActivatedEmail({
        toEmail: client?.email || clientUser.email,
        name: client?.name || `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim(),
        companyName: tenantObj?.companyName || 'RAGCP Platform'
      })).catch(e => console.error('[EMAIL] Failed:', e));
    } else {
      await import('../services/emailService').then(m => m.sendAccountDeactivatedEmail({
        toEmail: client?.email || clientUser.email,
        name: client?.name || `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim(),
        companyName: tenantObj?.companyName || 'RAGCP Platform'
      })).catch(e => console.error('[EMAIL] Failed:', e));
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
    let client: any = await dynamicDb.Client.findById(id).lean();
    let clientUser: any = null;
    let actualClientId = id;

    if (client) {
      clientUser = await dynamicDb.User.findById(client.userId).lean();
    } else {
      client = await dynamicDb.Client.findOne({ userId: id }).lean();
      if (client) {
        clientUser = await dynamicDb.User.findById(client.userId).lean();
        actualClientId = client._id || client.id;
      } else {
        clientUser = await dynamicDb.User.findById(id).lean();
        if (clientUser) {
          const newC = await dynamicDb.Client.create({
            tenantId,
            userId: clientUser._id || clientUser.id,
            name: `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() || clientUser.name || clientUser.email,
            email: clientUser.email,
            mobile: clientUser.mobile,
            pan: pan || 'N/A',
            aadhaar: aadhaar || 'N/A',
            category: category || 'INDIVIDUAL',
            status: clientUser.status || 'ACTIVE'
          });
          client = newC.toObject ? newC.toObject() : newC;
          actualClientId = client._id || client.id;
        }
      }
    }

    if (!clientUser || String(clientUser.tenantId) !== String(tenantId)) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    let finalEmail = email;
    let finalMobile = mobile;
    let finalPan = pan;
    let finalAadhaar = aadhaar;

    if (finalEmail && finalEmail.includes('*')) finalEmail = clientUser.email;
    if (finalMobile && finalMobile.includes('*')) finalMobile = clientUser.mobile;
    if (finalPan && finalPan.includes('XXXX')) finalPan = client?.pan || '';
    if (finalAadhaar && finalAadhaar.includes('XXXX')) finalAadhaar = client?.aadhaar || '';

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
    if (finalPan && finalPan !== 'N/A' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(finalPan)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-character PAN.' });
    }
    if (finalAadhaar && finalAadhaar !== 'N/A' && !/^[0-9]{12}$/.test(finalAadhaar)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit Aadhaar number.' });
    }

    const existingEmail = await dynamicDb.User.findOne({ email: finalEmail, _id: { $ne: clientUser._id } }).lean();
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already in use by another user.' });
    }

    const existingMobile = await dynamicDb.User.findOne({ mobile: finalMobile, _id: { $ne: clientUser._id } }).lean();
    if (existingMobile) {
      return res.status(400).json({ success: false, message: 'Mobile number already in use by another user.' });
    }

    if (finalPan && finalPan !== 'N/A') {
      const existingPan = await dynamicDb.Client.findOne({ pan: finalPan, _id: { $ne: actualClientId } }).lean();
      if (existingPan) {
        return res.status(400).json({ success: false, message: 'PAN already in use by another client.' });
      }
    }

    if (finalAadhaar && finalAadhaar !== 'N/A') {
      const existingAadhaar = await dynamicDb.Client.findOne({ aadhaar: finalAadhaar, _id: { $ne: actualClientId } }).lean();
      if (existingAadhaar) {
        return res.status(400).json({ success: false, message: 'Aadhaar number already in use by another client.' });
      }
    }

    await dynamicDb.User.findByIdAndUpdate(clientUser._id, {
      $set: {
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || 'Client',
        email: finalEmail,
        mobile: finalMobile
      }
    });

    if (client && finalPan !== client.pan) {
      await dynamicDb.ClientIdentityHistory.create({
        clientId: actualClientId,
        fieldName: 'PAN',
        oldValue: client.pan || '',
        newValue: finalPan,
        changedBy: 'ADMIN',
        remarks: 'Updated by Admin / Compliance Officer'
      });
    }

    if (client && finalAadhaar !== client.aadhaar) {
      await dynamicDb.ClientIdentityHistory.create({
        clientId: actualClientId,
        fieldName: 'AADHAAR',
        oldValue: client.aadhaar || '',
        newValue: finalAadhaar || '',
        changedBy: 'ADMIN',
        remarks: 'Updated by Admin / Compliance Officer'
      });
    }

    const updatedClient = await dynamicDb.Client.findByIdAndUpdate(
      actualClientId,
      {
        $set: {
          name,
          email: finalEmail,
          mobile: finalMobile,
          pan: finalPan,
          aadhaar: finalAadhaar,
          category: category || 'INDIVIDUAL',
          occupation
        }
      },
      { returnDocument: 'after', lean: true }
    );

    await dynamicDb.ClientProfile.findOneAndUpdate(
      { clientId: actualClientId },
      {
        $set: { addressLine1, city, state, zipCode },
        $setOnInsert: { clientId: actualClientId, country: 'India' }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const newClientVal: any = await dynamicDb.Client.findById(actualClientId).lean();
    const newClientProfile = await dynamicDb.ClientProfile.findOne({ clientId: actualClientId }).lean();

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'CLIENTS',
      oldValue: client,
      newValue: { ...newClientVal, profile: newClientProfile },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: { ...newClientVal, profile: newClientProfile }
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
    let client: any = await dynamicDb.Client.findById(id).lean();
    let clientUser: any = null;
    let actualClientId = id;

    if (client) {
      clientUser = await dynamicDb.User.findById(client.userId).lean();
    } else {
      client = await dynamicDb.Client.findOne({ userId: id }).lean();
      if (client) {
        clientUser = await dynamicDb.User.findById(client.userId).lean();
        actualClientId = client._id || client.id;
      } else {
        clientUser = await dynamicDb.User.findById(id).lean();
      }
    }

    if (!clientUser || String(clientUser.tenantId) !== String(tenantId) || clientUser.status !== 'PENDING_APPROVAL') {
      return res.status(404).json({ success: false, message: 'Client not found or not pending approval.' });
    }

    await dynamicDb.User.findByIdAndUpdate(clientUser._id || clientUser.id, {
      $set: { status: 'ACTIVE', tempPassword: null }
    });

    if (client?._id) {
      await dynamicDb.Client.findByIdAndUpdate(client._id, {
        $set: { status: 'KYC_PENDING' }
      });
    }

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
    const tenant: any = await dynamicDb.Tenant.findById(tenantId).lean();

    await import('../services/emailService').then(m => m.sendWelcomeEmail({
      tenantId,
      toEmail: clientUser.email,
      name: client?.name || `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim(),
      password: clientUser.tempPassword || 'Reset using Forgot Password',
      role: 'CLIENT',
      loginUrl,
      companyName: tenant?.companyName || 'RAGCP Platform'
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
    let client: any = await dynamicDb.Client.findById(id).lean();
    let clientUser: any = null;
    let actualClientId = id;

    if (client) {
      clientUser = await dynamicDb.User.findById(client.userId).lean();
    } else {
      client = await dynamicDb.Client.findOne({ userId: id }).lean();
      if (client) {
        clientUser = await dynamicDb.User.findById(client.userId).lean();
        actualClientId = client._id || client.id;
      } else {
        clientUser = await dynamicDb.User.findById(id).lean();
      }
    }

    if (!clientUser || String(clientUser.tenantId) !== String(tenantId) || clientUser.deletedAt !== null) {
      return res.status(404).json({ success: false, message: 'Active client not found.' });
    }

    const now = new Date();
    const deleteSuffix = `_deleted_${actualClientId}`;
    
    await dynamicDb.User.findByIdAndUpdate(clientUser._id || clientUser.id, {
      $set: {
        deletedAt: now,
        deletedBy: 'ADMIN',
        email: `${clientUser.email}${deleteSuffix}`,
        mobile: `${clientUser.mobile}${deleteSuffix}`
      }
    });

    if (client?._id) {
      await dynamicDb.Client.findByIdAndUpdate(client._id, {
        $set: {
          status: 'INACTIVE',
          email: `${client.email}${deleteSuffix}`,
          mobile: `${client.mobile}${deleteSuffix}`,
          pan: `${client.pan}${deleteSuffix}`,
          aadhaar: `${client.aadhaar}${deleteSuffix}`
        }
      });
    }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'CLIENTS',
      oldValue: client || clientUser,
      newValue: { ...(client || clientUser), deletedAt: now, status: 'INACTIVE' },
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
    let client: any = await dynamicDb.Client.findById(id).lean();
    let clientUser: any = null;
    let actualClientId = id;

    if (client) {
      clientUser = await dynamicDb.User.findById(client.userId).lean();
    } else {
      client = await dynamicDb.Client.findOne({ userId: id }).lean();
      if (client) {
        clientUser = await dynamicDb.User.findById(client.userId).lean();
        actualClientId = client._id || client.id;
      } else {
        clientUser = await dynamicDb.User.findById(id).lean();
      }
    }

    if (!clientUser || String(clientUser.tenantId) !== String(tenantId) || clientUser.deletedAt === null) {
      return res.status(404).json({ success: false, message: 'Deleted client not found.' });
    }

    const deleteSuffix = `_deleted_${actualClientId}`;
    const origEmail = clientUser.email.replace(deleteSuffix, '');
    const origMobile = clientUser.mobile.replace(deleteSuffix, '');
    const origPan = (client?.pan || '').replace(deleteSuffix, '');
    const origAadhaar = (client?.aadhaar || '').replace(deleteSuffix, '');

    const dupEmail = await dynamicDb.User.findOne({ email: origEmail, deletedAt: null }).lean();
    if (dupEmail) return res.status(400).json({ success: false, message: 'Cannot restore: Email is already in use by another active account.' });

    const dupMobile = await dynamicDb.User.findOne({ mobile: origMobile, deletedAt: null }).lean();
    if (dupMobile) return res.status(400).json({ success: false, message: 'Cannot restore: Mobile is already in use by another active account.' });

    if (origPan && origPan !== 'N/A') {
      const dupPan = await dynamicDb.Client.findOne({ pan: origPan }).populate('userId').lean();
      if (dupPan && (dupPan as any).userId?.deletedAt === null) return res.status(400).json({ success: false, message: 'Cannot restore: PAN is already in use by another active account.' });
    }

    await dynamicDb.User.findByIdAndUpdate(clientUser._id || clientUser.id, {
      $set: {
        deletedAt: null,
        deletedBy: null,
        status: 'ACTIVE',
        email: origEmail,
        mobile: origMobile
      }
    });

    if (client?._id) {
      await dynamicDb.Client.findByIdAndUpdate(client._id, {
        $set: {
          status: 'ACTIVE',
          email: origEmail,
          mobile: origMobile,
          pan: origPan,
          aadhaar: origAadhaar
        }
      });
    }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'RESTORE',
      module: 'CLIENTS',
      oldValue: { deletedAt: clientUser.deletedAt },
      newValue: { deletedAt: null, status: 'ACTIVE' },
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
    const rawCategories = await dynamicDb.PlanCategory.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = (rawCategories as any[]).map(c => ({
      ...c,
      id: String(c._id || c.id),
      _id: c._id
    }));

    return res.status(200).json({ success: true, data: formatted });
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
    const existing = await dynamicDb.PlanCategory.findOne({
      tenantId,
      name: name.trim().toUpperCase()
    }).lean();
    if (existing) return res.status(400).json({ success: false, message: 'Category already exists.' });

    const category = await dynamicDb.PlanCategory.create({
      tenantId,
      name: name.trim().toUpperCase(),
      segments: segments.trim()
    });
    syncTenantToRemote(tenantId, { reason: 'CATEGORY_UPDATE' }).catch(() => {});
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
    const category = await dynamicDb.PlanCategory.findOne({ _id: id, tenantId });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

    const updated = await dynamicDb.PlanCategory.findByIdAndUpdate(
      id,
      { $set: { name: name.trim().toUpperCase() } },
      { returnDocument: 'after', lean: true }
    );
    syncTenantToRemote(tenantId, { reason: 'CATEGORY_UPDATE' }).catch(() => {});
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
    const category: any = await dynamicDb.PlanCategory.findOne({ _id: id, tenantId }).lean();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

    const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const updated = await dynamicDb.PlanCategory.findByIdAndUpdate(
      id,
      { $set: { status: newStatus } },
      { returnDocument: 'after', lean: true }
    );
    
    await dynamicDb.Plan.updateMany(
      { categoryId: id },
      { $set: { status: newStatus } }
    );

    syncTenantToRemote(tenantId, { reason: 'CATEGORY_UPDATE' }).catch(() => {});
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
    let filterQuery: any = { tenantId, deletedAt: null };

    if (!isFullAdmin) {
      const userRole = await dynamicDb.Role.findOne({ name: req.user!.role }).lean();
      const roleId = userRole?._id || userRole?.id;

      const hasViewAll = await dynamicDb.RolePermission.findOne({
        roleId,
        permissionId: { $in: (await dynamicDb.Permission.find({ code: 'VIEW_ALL_PLANS' }).lean()).map((p: any) => p._id || p.id) }
      }).lean();

      const hasResearchAccess = await dynamicDb.RolePermission.findOne({
        roleId,
        permissionId: { $in: (await dynamicDb.Permission.find({ code: { $in: ['ADD_RESEARCH', 'OWN_RESEARCH'] } }).lean()).map((p: any) => p._id || p.id) }
      }).lean();

      if (!hasViewAll && !hasResearchAccess) {
        filterQuery.createdById = req.user!.id;
      }
    }

    const plans = await dynamicDb.Plan.find(filterQuery)
      .populate('categoryId')
      .sort({ createdAt: -1 })
      .lean();

    const formattedPlans = plans.map((p: any) => {
      const catObj = p.categoryId && typeof p.categoryId === 'object' ? p.categoryId : null;
      const catIdStr = catObj ? String(catObj._id || catObj.id) : (p.categoryId ? String(p.categoryId) : '');
      return {
        ...p,
        id: String(p._id || p.id),
        categoryId: catIdStr,
        category: catObj ? {
          ...catObj,
          id: String(catObj._id || catObj.id)
        } : (p.category ? p.category : null)
      };
    });

    return res.status(200).json({ success: true, data: formattedPlans });
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
    let category: any = null;
    const catIdStr = String(categoryId).trim();
    const isCatObjectId = mongoose.Types.ObjectId.isValid(catIdStr);

    if (isCatObjectId) {
      category = await dynamicDb.PlanCategory.findOne({
        _id: catIdStr,
        $or: [{ tenantId }, { tenantId: null }]
      }).lean();
    }

    if (!category) {
      const cleanCatName = catIdStr.replace(/\s*\([^)]*\)\s*$/, '').trim();
      category = await dynamicDb.PlanCategory.findOne({
        tenantId,
        $or: [
          { name: { $regex: new RegExp(`^${cleanCatName}$`, 'i') } },
          { name: catIdStr },
          { segments: { $regex: new RegExp(cleanCatName, 'i') } }
        ]
      }).lean();
    }

    if (!category) {
      category = await dynamicDb.PlanCategory.findOne({ tenantId }).lean();
      if (!category) {
        const cleanName = catIdStr.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Standard Advisory Category';
        category = await dynamicDb.PlanCategory.create({
          tenantId,
          name: cleanName,
          segments: 'EQUITY,DERIVATIVE',
          status: 'ACTIVE'
        });
      }
    }

    const plan = await dynamicDb.Plan.create({
      tenantId,
      categoryId: category._id || category.id,
      name: name.trim().toUpperCase(),
      description: description || '',
      price: parseFloat(price),
      durationMonths: parseInt(durationMonths),
      researchSegments: researchSegments || category.segments || 'EQUITY',
      notificationsAllowed: notificationsAllowed || 'EMAIL,INAPP',
      clientLimit: parseInt(clientLimit) || 100,
      createdById: req.user!.id,
      deletedAt: null
    });

    await logAudit({ tenantId, userId: req.user!.id, action: 'CREATE', module: 'TENANTS', newValue: plan, ipAddress: req.ip });
    syncTenantToRemote(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => {});
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
    const existing: any = await dynamicDb.Plan.findOne({ _id: id, tenantId }).lean();
    if (!existing || existing.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found.' });

    let newCategoryId = existing.categoryId;
    let newSegments = existing.researchSegments;

    if (categoryId) {
      const catIdStr = String(categoryId).trim();
      const isCatObjectId = mongoose.Types.ObjectId.isValid(catIdStr);
      let category: any = null;

      if (isCatObjectId) {
        category = await dynamicDb.PlanCategory.findOne({
          _id: catIdStr,
          $or: [{ tenantId }, { tenantId: null }]
        }).lean();
      }

      if (!category) {
        const cleanCatName = catIdStr.replace(/\s*\([^)]*\)\s*$/, '').trim();
        category = await dynamicDb.PlanCategory.findOne({
          tenantId,
          $or: [
            { name: { $regex: new RegExp(`^${cleanCatName}$`, 'i') } },
            { name: catIdStr }
          ]
        }).lean();
      }

      if (category) {
        newCategoryId = category._id || category.id;
        newSegments = category.segments;
      }
    }

    const updated = await dynamicDb.Plan.findByIdAndUpdate(
      id,
      {
        $set: {
          categoryId: newCategoryId,
          name: name.trim().toUpperCase(),
          description: description || '',
          price: parseFloat(price),
          durationMonths: parseInt(durationMonths) || existing.durationMonths,
          researchSegments: newSegments,
          notificationsAllowed: notificationsAllowed || existing.notificationsAllowed,
          clientLimit: parseInt(clientLimit) || existing.clientLimit
        }
      },
      { returnDocument: 'after', lean: true }
    );

    await logAudit({ tenantId, userId: req.user!.id, action: 'UPDATE', module: 'TENANTS', oldValue: existing, newValue: updated, ipAddress: req.ip });
    syncTenantToRemote(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => {});
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
    const existing: any = await dynamicDb.Plan.findOne({ _id: id, tenantId }).lean();
    if (!existing || existing.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found.' });

    await dynamicDb.Plan.findByIdAndUpdate(id, {
      $set: { deletedAt: new Date(), status: 'INACTIVE' }
    });

    await logAudit({ tenantId, userId: req.user!.id, action: 'DELETE', module: 'TENANTS', oldValue: existing, ipAddress: req.ip });
    syncTenantToRemote(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => {});
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
    const existing: any = await dynamicDb.Plan.findOne({ _id: id, tenantId }).lean();
    if (!existing || existing.deletedAt === null) return res.status(404).json({ success: false, message: 'Deleted plan not found.' });

    const updated = await dynamicDb.Plan.findByIdAndUpdate(
      id,
      { $set: { deletedAt: null, status: 'ACTIVE' } },
      { returnDocument: 'after', lean: true }
    );

    await logAudit({ tenantId, userId: req.user!.id, action: 'UPDATE', module: 'TENANTS', oldValue: existing, newValue: updated, ipAddress: req.ip });
    syncTenantToRemote(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => {});
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
    const existing: any = await dynamicDb.Plan.findOne({ _id: id, tenantId }).lean();
    if (!existing || existing.deletedAt !== null) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await dynamicDb.Plan.findByIdAndUpdate(id, { $set: { status: newStatus } });
    syncTenantToRemote(tenantId, { reason: 'PLAN_UPDATE' }).catch(() => {});
    return res.status(200).json({ success: true, message: `Plan status updated to ${newStatus}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateTenantSettings = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  const {
    themeColor, companyName, companyEmail, gstCalculationType, state, gst, smtpHost, smtpPort,
    smtpUser, smtpPassword, smtpFrom, bankAccountName, bankAccountNo, bankAccountType, bankIfsc,
    bankName, bankBranch, socialMediaLinks, digioClientId, digioClientSecret, digioKycTemplateName,
    agreementContent, kycFirst, welcomeEmailText, reportDisclaimer, kraProvider, kraApiKey, kraApiSecret,
    activePaymentGateway, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey,
    ccavenueMerchantId, ccavenueAccessCode, ccavenueWorkingKey, stripePublishableKey, stripeSecretKey,
    address, website, mobile
  } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    let oldTenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      oldTenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!oldTenant && tenantId) {
      oldTenant = await dynamicDb.Tenant.findOne({
        $or: [{ id: tenantId }, { tenantId: tenantId }]
      }).lean();
    }
    if (!oldTenant) {
      oldTenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
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
    if (smtpHost !== undefined) dataToUpdate.smtpHost = smtpHost ? smtpHost.trim() : null;
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
    if (smtpPort !== undefined) dataToUpdate.smtpPort = smtpPort ? (parseInt(smtpPort, 10) || 587) : null;
    if (smtpUser !== undefined) dataToUpdate.smtpUser = smtpUser ? smtpUser.trim() : null;
    if (smtpPassword !== undefined && smtpPassword.trim() !== '') {
      dataToUpdate.smtpPassword = smtpPassword.trim();
    }
    if (smtpFrom !== undefined) {
      dataToUpdate.smtpFrom = smtpFrom ? smtpFrom.trim() : null;
    } else if (dataToUpdate.smtpUser || oldTenant?.smtpUser) {
      dataToUpdate.smtpFrom = dataToUpdate.smtpUser || oldTenant?.smtpUser;
    }
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

    const targetTenantDocId = oldTenant?._id || oldTenant?.id || tenantId;
    let updated: any = null;
    if (targetTenantDocId && mongoose.Types.ObjectId.isValid(targetTenantDocId)) {
      updated = await dynamicDb.Tenant.findByIdAndUpdate(
        targetTenantDocId,
        { $set: dataToUpdate },
        { returnDocument: 'after', lean: true, new: true }
      );
    }

    if (!updated && tenantId) {
      updated = await dynamicDb.Tenant.findOneAndUpdate(
        { $or: [{ id: tenantId }, { tenantId }, ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ _id: tenantId }] : [])] },
        { $set: dataToUpdate },
        { returnDocument: 'after', lean: true, new: true }
      );
    }

    if (!updated) {
      updated = await dynamicDb.Tenant.findOneAndUpdate(
        { deletedAt: null },
        { $set: dataToUpdate },
        { returnDocument: 'after', lean: true, new: true }
      );
    }

    // Save/Sync to local dynamicDb.SystemSetting GLOBAL_SMTP so any service on this tenant can resolve it immediately
    if (dataToUpdate.smtpHost || dataToUpdate.smtpUser || (oldTenant?.smtpHost && dataToUpdate.smtpPassword)) {
      const finalSmtpConfig = {
        smtpHost: dataToUpdate.smtpHost !== undefined ? dataToUpdate.smtpHost : oldTenant?.smtpHost,
        smtpPort: dataToUpdate.smtpPort !== undefined ? dataToUpdate.smtpPort : (oldTenant?.smtpPort || 587),
        smtpUser: dataToUpdate.smtpUser !== undefined ? dataToUpdate.smtpUser : oldTenant?.smtpUser,
        smtpPassword: dataToUpdate.smtpPassword || oldTenant?.smtpPassword,
        smtpFrom: dataToUpdate.smtpFrom || dataToUpdate.smtpUser || oldTenant?.smtpFrom || oldTenant?.smtpUser
      };
      await dynamicDb.SystemSetting.findOneAndUpdate(
        { key: 'GLOBAL_SMTP' },
        { $set: { value: JSON.stringify(finalSmtpConfig) }, $setOnInsert: { key: 'GLOBAL_SMTP' } },
        { upsert: true }
      ).catch(() => {});
    }

    // Sync local Branding setting in dynamicDb.SystemSetting if applicable
    if (dataToUpdate.logoUrl) {
      try {
        const existingSetting: any = await dynamicDb.SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean();
        let brandingData: any = {};
        if (existingSetting?.value) {
          try { brandingData = JSON.parse(existingSetting.value); } catch {}
        }
        brandingData.logoUrl = dataToUpdate.logoUrl;
        if (dataToUpdate.companyName) brandingData.appName = dataToUpdate.companyName;
        await dynamicDb.SystemSetting.findOneAndUpdate(
          { key: 'GLOBAL_BRANDING' },
          { key: 'GLOBAL_BRANDING', value: JSON.stringify(brandingData) },
          { upsert: true }
        ).catch(() => {});
      } catch {}
    }

    await logAudit({ 
      tenantId: String(tenantId), 
      userId: req.user!.id, 
      action: 'UPDATE', 
      module: 'TENANTS', 
      oldValue: oldTenant,
      newValue: updated, 
      ipAddress: req.ip 
    }).catch(() => {});

    syncTenantToRemote(String(tenantId), { reason: 'SETTINGS_UPDATE' }).catch((err: any) => {
      console.warn('Background sync for tenant settings update error:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Settings and logo updated successfully',
      data: updated || { ...oldTenant, ...dataToUpdate }
    });
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

export const verifyPaymentGateway = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      gateway,
      razorpayKeyId,
      razorpayKeySecret,
      cashfreeAppId,
      cashfreeSecretKey,
      ccavenueMerchantId,
      ccavenueAccessCode,
      ccavenueWorkingKey,
      stripePublishableKey,
      stripeSecretKey
    } = req.body;

    const selectedGateway = (gateway || 'RAZORPAY').toUpperCase();

    if (selectedGateway === 'RAZORPAY') {
      if (!razorpayKeyId || !razorpayKeySecret) {
        return res.status(400).json({
          success: false,
          gateway: 'RAZORPAY',
          message: 'Razorpay Key ID and Key Secret are both required for verification.'
        });
      }

      try {
        const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId.trim()}:${razorpayKeySecret.trim()}`).toString('base64');
        await axios.get('https://api.razorpay.com/v1/orders?count=1', {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        });

        const isLive = razorpayKeyId.trim().startsWith('rzp_live');
        return res.status(200).json({
          success: true,
          gateway: 'RAZORPAY',
          mode: isLive ? 'LIVE' : 'TEST',
          message: `Razorpay credentials verified successfully! (${isLive ? 'Live Mode' : 'Test Mode'} active)`
        });
      } catch (err: any) {
        const errMsg = err.response?.data?.error?.description || err.response?.data?.message || err.message;
        return res.status(400).json({
          success: false,
          gateway: 'RAZORPAY',
          message: `Razorpay Verification Failed: ${errMsg}`
        });
      }
    } else if (selectedGateway === 'CASHFREE') {
      if (!cashfreeAppId || !cashfreeSecretKey) {
        return res.status(400).json({
          success: false,
          gateway: 'CASHFREE',
          message: 'Cashfree App ID and Secret Key are both required for verification.'
        });
      }

      try {
        const isSandbox = cashfreeAppId.toLowerCase().includes('test') || cashfreeSecretKey.toLowerCase().includes('test');
        const url = isSandbox ? 'https://sandbox.cashfree.com/pg/orders' : 'https://api.cashfree.com/pg/orders';
        await axios.get(url, {
          headers: {
            'x-client-id': cashfreeAppId.trim(),
            'x-client-secret': cashfreeSecretKey.trim(),
            'x-api-version': '2022-09-01'
          },
          timeout: 8000
        });

        return res.status(200).json({
          success: true,
          gateway: 'CASHFREE',
          mode: isSandbox ? 'TEST' : 'LIVE',
          message: `Cashfree credentials verified successfully! (${isSandbox ? 'Sandbox Mode' : 'Live Mode'} active)`
        });
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        if (err.response?.status === 401 || err.response?.status === 403) {
          return res.status(400).json({
            success: false,
            gateway: 'CASHFREE',
            message: `Cashfree Authentication Failed: ${errMsg}`
          });
        }
        return res.status(200).json({
          success: true,
          gateway: 'CASHFREE',
          message: 'Cashfree credentials validated successfully.'
        });
      }
    } else if (selectedGateway === 'STRIPE') {
      if (!stripeSecretKey) {
        return res.status(400).json({
          success: false,
          gateway: 'STRIPE',
          message: 'Stripe Secret Key is required for verification.'
        });
      }

      try {
        await axios.get('https://api.stripe.com/v1/balance', {
          headers: {
            Authorization: `Bearer ${stripeSecretKey.trim()}`
          },
          timeout: 8000
        });

        const isLive = stripeSecretKey.trim().startsWith('sk_live');
        return res.status(200).json({
          success: true,
          gateway: 'STRIPE',
          mode: isLive ? 'LIVE' : 'TEST',
          message: `Stripe credentials verified successfully! (${isLive ? 'Live Mode' : 'Test Mode'} active)`
        });
      } catch (err: any) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return res.status(400).json({
          success: false,
          gateway: 'STRIPE',
          message: `Stripe Verification Failed: ${errMsg}`
        });
      }
    } else if (selectedGateway === 'CCAVENUE') {
      if (!ccavenueMerchantId || !ccavenueAccessCode || !ccavenueWorkingKey) {
        return res.status(400).json({
          success: false,
          gateway: 'CCAVENUE',
          message: 'CCAvenue Merchant ID, Access Code, and Working Key are all required.'
        });
      }

      if (ccavenueWorkingKey.trim().length < 16) {
        return res.status(400).json({
          success: false,
          gateway: 'CCAVENUE',
          message: 'Invalid CCAvenue Working Key. It must be at least 16 characters.'
        });
      }

      return res.status(200).json({
        success: true,
        gateway: 'CCAVENUE',
        message: 'CCAvenue credentials format validated successfully.'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unknown payment gateway selected.'
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment gateway verification failed.'
    });
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
    
    const search = req.query.search as string;
    let whereClause: any = { tenantId };
    
    if (search) {
      whereClause.transactionRef = { $regex: search, $options: 'i' };
    }

    const total = await dynamicDb.Payment.countDocuments(whereClause);
    const payments = await dynamicDb.Payment.find(whereClause)
      .populate('couponId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const clientIds = [...new Set(payments.map((p: any) => p.clientId))];
    const planIds = [...new Set(payments.map((p: any) => p.planId).filter(Boolean))];

    const clients = await dynamicDb.Client.find({ _id: { $in: clientIds } })
      .populate('userId')
      .lean();
    const profiles = await dynamicDb.ClientProfile.find({ clientId: { $in: clientIds } }).lean();
    const profileMap = new Map(profiles.map((p: any) => [String(p.clientId), p]));

    const plans = await dynamicDb.Plan.find({ _id: { $in: planIds } }).lean();

    const clientMap = new Map(clients.map((c: any) => [
      String(c._id || c.id),
      {
        ...c,
        id: String(c._id || c.id),
        profile: profileMap.get(String(c._id || c.id)) || null,
        user: c.userId ? {
          ...c.userId,
          id: String(c.userId._id || c.userId.id)
        } : null
      }
    ]));
    const planMap = new Map(plans.map((p: any) => [String(p._id || p.id), { ...p, id: String(p._id || p.id) }]));

    const isFullAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const hasViewSensitive = isFullAdmin;

    const enrichedPayments = payments.map((p: any) => {
      let clientObj = clientMap.get(String(p.clientId));
      if (clientObj && !hasViewSensitive) {
        clientObj = {
          ...clientObj,
          email: maskEmail(clientObj.email) as string,
          mobile: maskMobile(clientObj.mobile) as string,
          pan: maskDocument(clientObj.pan),
          aadhaar: maskDocument(clientObj.aadhaar),
          user: clientObj.user ? { ...clientObj.user, email: maskEmail(clientObj.user.email) } : clientObj.user,
          profile: clientObj.profile ? {
            ...clientObj.profile,
            panNumber: maskDocument(clientObj.profile.panNumber),
            aadharNumber: maskDocument(clientObj.profile.aadharNumber)
          } : clientObj.profile
        } as any;
      }

      return {
        ...p,
        id: String(p._id || p.id),
        coupon: p.couponId || null,
        client: clientObj,
        plan: p.planId ? planMap.get(String(p.planId)) : null
      };
    });

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
    const logs = await dynamicDb.AuditLog.find({ tenantId })
      .populate({
        path: 'userId',
        select: 'firstName lastName email roleId',
        populate: { path: 'roleId', select: 'name' }
      })
      .sort({ timestamp: -1 })
      .lean();

    const formatted = logs.map((l: any) => ({
      ...l,
      id: String(l._id || l.id),
      user: l.userId ? {
        firstName: l.userId.firstName,
        lastName: l.userId.lastName,
        email: l.userId.email,
        role: l.userId.roleId ? { name: l.userId.roleId.name } : null
      } : null
    }));

    return res.status(200).json({ success: true, data: formatted });
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
    let client: any = null;
    if (mongoose.Types.ObjectId.isValid(clientId)) {
      client = await dynamicDb.Client.findById(clientId).lean();
    }
    if (!client) {
      client = await dynamicDb.Client.findOne({ $or: [{ _id: clientId }, { userId: clientId }, { id: clientId }] }).lean();
    }
    if (!client && (centralModels as any)?.Client) {
      if (mongoose.Types.ObjectId.isValid(clientId)) {
        client = await (centralModels as any).Client.findById(clientId).lean();
      }
      if (!client) {
        client = await (centralModels as any).Client.findOne({ $or: [{ _id: clientId }, { userId: clientId }, { id: clientId }] }).lean();
      }
    }
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const actualClientId = client._id || client.id;
    const clientProfile = await dynamicDb.ClientProfile.findOne({ $or: [{ clientId: actualClientId }, { clientId: client.userId }] }).lean();

    let plan: any = null;
    if (mongoose.Types.ObjectId.isValid(planId)) {
      plan = await dynamicDb.Plan.findById(planId).lean();
    }
    if (!plan) {
      plan = await dynamicDb.Plan.findOne({ $or: [{ _id: planId }, { id: planId }] }).lean();
    }

    if (!plan || plan.deletedAt !== null) {
      return res.status(404).json({ success: false, message: 'Plan not found or inactive.' });
    }

    const assigner: any = await dynamicDb.User.findById(req.user!.id).populate('roleId').lean();
    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();

    const isAdmin = assigner?.roleId?.name === 'SUPER_ADMIN' || assigner?.roleId?.name === 'ADMIN';
    const assignerName = `${assigner?.firstName || ''} ${assigner?.lastName || ''}`.trim();

    let discountAmount = 0;
    let appliedCouponId: any = null;

    if (couponCode) {
      const coupon: any = await dynamicDb.Coupon.findOne({
        code: couponCode,
        tenantId,
        status: 'ACTIVE'
      }).lean();

      if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });

      if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
        return res.status(400).json({ success: false, message: 'Coupon code has expired.' });
      }

      if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
        return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
      }

      if (coupon.clientId && String(coupon.clientId) !== String(actualClientId) && String(coupon.clientId) !== String(clientId)) {
        return res.status(400).json({ success: false, message: 'Coupon is not applicable to this client.' });
      }

      if (coupon.planId && String(coupon.planId) !== String(plan._id || plan.id)) {
        return res.status(400).json({ success: false, message: 'Coupon is not applicable to this plan.' });
      }

      if (coupon.categoryId && String(coupon.categoryId) !== String(plan.categoryId)) {
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
      appliedCouponId = coupon._id || coupon.id;
    }

    const discountedBasePrice = plan.price - discountAmount;
    let totalAmount = discountedBasePrice;
    
    if (tenantObj?.gstCalculationType === 'EXCLUSIVE') {
      totalAmount = discountedBasePrice * 1.18;
    }

    let finalBasePrice = discountedBasePrice;
    let finalGstAmount = totalAmount - discountedBasePrice;
    let finalTotalAmount = totalAmount;

    if (customAmount !== undefined && customAmount !== null) {
      finalTotalAmount = customAmount;
      if (tenantObj?.gstCalculationType === 'EXCLUSIVE') {
        finalBasePrice = finalTotalAmount / 1.18;
        finalGstAmount = finalTotalAmount - finalBasePrice;
      } else {
        finalBasePrice = finalTotalAmount;
        finalGstAmount = 0;
      }
    }

    const adminRemark = remarks?.trim()
      ? `Assigned by Admin - ${remarks.trim()}`
      : 'Assigned by Admin';

    const isCustomAssignment = customAmount !== undefined || customDays !== undefined;
    const finalRemark = isCustomAssignment ? `[PRO-RATA] ${adminRemark}` : adminRemark;
    const paymentMode = isCustomAssignment ? 'CUSTOM_PRO_RATA' : 'ADMIN_ASSIGNED';

    const existingSub: any = await dynamicDb.Subscription.findOne({
      $or: [{ clientId: actualClientId }, { clientId: client.userId }],
      planId: plan._id || plan.id,
      status: 'ACTIVE',
      endDate: { $gt: new Date() }
    }).sort({ endDate: -1 }).lean();

    let startDate = new Date();
    if (existingSub) {
      startDate = new Date(existingSub.endDate);
    }

    const planValidityDays = customDays !== undefined ? customDays : plan.durationMonths * 30;
    const endDate = new Date(startDate.getTime() + planValidityDays * 24 * 60 * 60 * 1000);

    const subscription = await dynamicDb.Subscription.create({
      clientId: actualClientId,
      planId: plan._id || plan.id,
      startDate,
      endDate,
      status: 'ACTIVE',
      amountBase: finalBasePrice,
      amountGst: finalGstAmount,
      amountTotal: parseFloat(finalTotalAmount.toFixed(2)),
      isGstInclusive: tenantObj?.gstCalculationType !== 'EXCLUSIVE'
    });

    const payment = await dynamicDb.Payment.create({
      tenantId: tenantId || client.tenantId,
      clientId: actualClientId,
      planId: plan._id || plan.id,
      amount: parseFloat(finalTotalAmount.toFixed(2)),
      paymentMode,
      transactionRef: paymentRefId,
      paymentDate: new Date(paymentDate),
      status: 'SUCCESS',
      remarks: finalRemark,
      verifiedByStaffId: req.user!.id,
      assignedByAdminName: isAdmin ? assignerName : null,
      assignedByStaffName: !isAdmin ? assignerName : null,
      clientCity: (clientProfile as any)?.city || null,
      clientState: (clientProfile as any)?.state || null,
      tenantState: tenantObj?.state || null,
      planValidityDays,
      paymentGatewayId: null,
      couponId: appliedCouponId,
      discountApplied: discountAmount > 0 ? parseFloat(discountAmount.toFixed(2)) : null
    });

    await dynamicDb.Client.findByIdAndUpdate(actualClientId, {
      $set: { status: 'ACTIVE' }
    });
    if (client.userId) {
      await dynamicDb.User.findByIdAndUpdate(client.userId, {
        $set: { status: 'ACTIVE' }
      });
    }

    if (appliedCouponId) {
      await dynamicDb.Coupon.findByIdAndUpdate(appliedCouponId, {
        $inc: { usedCount: 1 }
      });
    }

    const assignedDays = customDays !== undefined ? customDays : plan.durationMonths * 30;
    await dynamicDb.NotificationLog.create({
      tenantId,
      recipient: client.email,
      channel: 'INAPP',
      title: 'New Plan Assigned',
      message: `Your account has been assigned the "${plan.name}" plan by your advisor. The plan is now active and valid until ${new Date(Date.now() + assignedDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}.`,
      status: 'SENT'
    }).catch(() => {});

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
        subscription,
        payment
      }
    });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.transactionRef) {
      return res.status(400).json({ success: false, message: 'This Payment Reference ID has already been used. Please provide a unique Payment Ref ID.' });
    }
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getEmailTemplates = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const templates = await dynamicDb.EmailTemplate.find({ tenantId }).lean();
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
    const updated = await dynamicDb.EmailTemplate.findOneAndUpdate(
      { tenantId, type },
      {
        $set: { subject, body },
        $setOnInsert: { tenantId, type }
      },
      { upsert: true, returnDocument: 'after', lean: true }
    );
    syncTenantToRemote(tenantId, { reason: 'EMAIL_TEMPLATE_UPDATE' }).catch(() => {});
    return res.status(200).json({ success: true, data: updated, message: 'Template updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, errors: [err.message] });
  }
};

export const uploadSignature = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId) throw new Error('Tenant ID required');
    if (!req.file) throw new Error('No signature file uploaded');

    const updated = await dynamicDb.Tenant.findByIdAndUpdate(
      tenantId,
      { $set: { coSignatureUrl: `/uploads/branding/${req.file.filename}` } },
      { returnDocument: 'after', lean: true }
    );

    syncTenantToRemote(tenantId, { reason: 'SIGNATURE_UPDATE' }).catch(() => {});

    res.status(200).json({ success: true, message: 'Signature updated successfully', data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Helper for date filter
const getDateFilter = (req: AuthenticatedRequest) => {
  const { range, startDate, endDate } = req.query;
  if (range === 'date' && startDate && endDate) {
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    return {
      $gte: new Date(startDate as string),
      $lte: end
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
    const filterQuery: any = { tenantId, status: 'SUCCESS' };
    if (dateFilter) filterQuery.createdAt = dateFilter;

    const payments: any[] = await dynamicDb.Payment.find(filterQuery).lean();
    const clientIds = payments.map(p => p.clientId);
    const clients: any[] = await dynamicDb.Client.find({ _id: { $in: clientIds } }).lean();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Invoices.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const payment of payments) {
      try {
        const client = clients.find(c => String(c._id || c.id) === String(payment.clientId));
        const pan = client?.pan || 'UNKNOWN_PAN';
        const dateStr = new Date(payment.createdAt).toISOString().split('T')[0];
        const pdfBuffer = await generateInvoicePdf(String(payment._id || payment.id));
        archive.append(pdfBuffer, { name: `${pan}_Invoice_${dateStr}.pdf` });
      } catch (err) {
        console.error(`Failed to generate invoice for payment ${payment._id || payment.id}`, err);
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
    const clients: any[] = await dynamicDb.Client.find({ tenantId }).lean();
    const clientIds = clients.map((c: any) => c._id || c.id);

    const agQuery: any = { clientId: { $in: clientIds } };
    if (dateFilter) agQuery.signedAt = dateFilter;

    const agreements: any[] = await dynamicDb.Agreement.find(agQuery).lean();
    const clientMap = new Map(clients.map((c: any) => [String(c._id || c.id), c]));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Agreements.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const agreement of agreements) {
      const client = clientMap.get(String(agreement.clientId));
      if (agreement.agreementUrl) {
        const filePath = path.join(__dirname, '../../public', agreement.agreementUrl);
        if (fs.existsSync(filePath)) {
          const dateStr = new Date(agreement.signedAt || agreement.createdAt).toISOString().split('T')[0];
          archive.file(filePath, { name: `${client?.pan || 'CLIENT'}_Agreement_${dateStr}.pdf` });
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
    const clients: any[] = await dynamicDb.Client.find({ tenantId }).lean();
    const clientIds = clients.map((c: any) => c._id || c.id);

    const docQuery: any = { clientId: { $in: clientIds } };
    if (dateFilter) docQuery.uploadedAt = dateFilter;

    const documents: any[] = await dynamicDb.ClientDocument.find(docQuery).lean();
    const clientMap = new Map(clients.map((c: any) => [String(c._id || c.id), c]));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="KRA_Documents.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const doc of documents) {
      const client = clientMap.get(String(doc.clientId));
      if (doc.fileUrl) {
        const filePath = path.join(__dirname, '../../public', doc.fileUrl);
        if (fs.existsSync(filePath)) {
          const ext = path.extname(doc.fileUrl) || '.pdf';
          const dateStr = new Date(doc.uploadedAt || doc.createdAt).toISOString().split('T')[0];
          archive.file(filePath, { name: `${client?.pan || 'CLIENT'}_${doc.docType}_${dateStr}${ext}` });
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

    // 1. Find client roles
    const clientRoles = await dynamicDb.Role.find({
      name: { $regex: /^(client|user|customer|investor)$/i }
    }).lean();
    const clientRoleIds = clientRoles.map((r: any) => r._id || r.id);

    const userFilter: any = {
      $and: [
        {
          $or: [
            { tenantId: tenantId },
            ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : [])
          ]
        },
        { deletedAt: null },
        {
          $or: [
            { roleId: { $in: clientRoleIds } },
            { role: { $regex: /^(client|user|customer|investor)$/i } }
          ]
        }
      ]
    };
    if (dateFilter) userFilter.createdAt = dateFilter;

    const users: any[] = await dynamicDb.User.find(userFilter).populate('roleId').sort({ createdAt: -1 }).lean();
    const userIds = users.map((u: any) => u._id || u.id);
    const userMap = new Map(users.map((u: any) => [String(u._id || u.id), u]));

    const rawClients: any[] = await dynamicDb.Client.find({
      $or: [
        { userId: { $in: userIds } },
        { tenantId: tenantId },
        ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : [])
      ]
    }).populate('userId').sort({ createdAt: -1 }).lean();

    const clientByUserId = new Map(rawClients.map((c: any) => [String(c.userId?._id || c.userId?.id || c.userId || ''), c]));

    const combinedClients: any[] = [...rawClients];
    for (const u of users) {
      const uIdStr = String(u._id || u.id);
      if (!clientByUserId.has(uIdStr)) {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Client';
        const synthClient: any = {
          _id: u._id,
          id: uIdStr,
          userId: u,
          name: fullName,
          email: u.email,
          mobile: u.mobile || '',
          pan: (u as any).pan || 'N/A',
          aadhaar: (u as any).aadhaar || 'N/A',
          category: u.category || 'INDIVIDUAL',
          occupation: u.occupation || 'other',
          status: u.status || 'ACTIVE',
          kraVerified: false,
          createdById: u.createdById || null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        };
        combinedClients.push(synthClient);
      }
    }

    const allClientIds = combinedClients.map((c: any) => c._id || c.id);
    const allLookupIds = [...new Set([...allClientIds, ...userIds])];

    const profiles: any[] = await dynamicDb.ClientProfile.find({ clientId: { $in: allLookupIds } }).lean();
    const profileMap = new Map(profiles.map((p: any) => [String(p.clientId || p.userId), p]));

    const subscriptions: any[] = await dynamicDb.Subscription.find({ clientId: { $in: allLookupIds }, status: 'ACTIVE' })
      .populate('planId')
      .lean();
    const subMap = new Map<string, any[]>();
    for (const sub of subscriptions) {
      const cId = String(sub.clientId);
      if (!subMap.has(cId)) subMap.set(cId, []);
      subMap.get(cId)!.push(sub);
    }

    const agreements: any[] = await dynamicDb.Agreement.find({ clientId: { $in: allLookupIds } }).lean();
    const agMap = new Map<string, any[]>();
    for (const ag of agreements) {
      const cId = String(ag.clientId);
      if (!agMap.has(cId)) agMap.set(cId, []);
      agMap.get(cId)!.push(ag);
    }

    const alerts: any[] = await dynamicDb.ComplianceAlert.find({ clientId: { $in: allLookupIds } }).lean();
    const alertMap = new Map<string, any[]>();
    for (const al of alerts) {
      const cId = String(al.clientId);
      if (!alertMap.has(cId)) alertMap.set(cId, []);
      alertMap.get(cId)!.push(al);
    }

    const creatorIds = [...new Set(combinedClients.map((c: any) => c.createdById).filter(Boolean))] as string[];
    const creatorUsers = creatorIds.length > 0 ? await dynamicDb.User.find({
      _id: { $in: creatorIds }
    }).populate('roleId').lean() : [];

    const creatorMap = new Map(creatorUsers.map((u: any) => [
      String(u._id || u.id),
      `${u.firstName || ''} ${u.lastName || ''}`.trim() + ` (${u.roleId?.name || 'Staff'})`
    ]));

    const csvData = combinedClients.map((c: any) => {
      const cIdStr = String(c._id || c.id);
      const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || cIdStr);
      const user: any = (c.userId && typeof c.userId === 'object' && c.userId.email) ? c.userId : (userMap.get(uIdStr) || {});
      const clientAlerts = alertMap.get(cIdStr) || alertMap.get(uIdStr) || [];
      const isKraFailed = clientAlerts.some((a: any) => a.alertType === 'KYC_FAILED');
      const kraStatus = isKraFailed ? 'FAILED' : (c.status && c.status !== 'PENDING_ONBOARDING' && c.status !== 'KYC_PENDING' && c.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
      const isEsignSigned = (agMap.get(cIdStr) || agMap.get(uIdStr) || []).some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE');

      let sourceStr = 'Self Signup';
      const creatorId = c.createdById || user.createdById;
      if (creatorId) {
        sourceStr = creatorMap.get(String(creatorId)) || 'Added by Staff/Admin';
      }

      const prof = profileMap.get(cIdStr) || profileMap.get(uIdStr);
      const clientSubs = subMap.get(cIdStr) || subMap.get(uIdStr) || [];

      return {
        'Client ID': cIdStr,
        'Name': c.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        'Email': c.email || user.email,
        'Mobile': c.mobile || user.mobile,
        'PAN': c.pan || user.pan || 'N/A',
        'Aadhaar': c.aadhaar || user.aadhaar || 'N/A',
        'Category': c.category || 'INDIVIDUAL',
        'Occupation': c.occupation || 'N/A',
        'City': prof?.city || 'N/A',
        'State': prof?.state || 'N/A',
        'Joined Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A',
        'Status': user.status || c.status,
        'KRA Status': kraStatus,
        'eSign Status': isEsignSigned ? 'SIGNED' : 'PENDING',
        'Added By / Source': sourceStr,
        'Active Plan': clientSubs.length > 0 && clientSubs[0].planId ? clientSubs[0].planId.name : 'None'
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
    const clientRoles = await dynamicDb.Role.find({
      name: { $regex: /^(client|user|customer|investor)$/i }
    }).lean();
    const clientRoleIds = clientRoles.map((r: any) => r._id || r.id);

    const userFilter: any = {
      $and: [
        {
          $or: [
            { tenantId: tenantId },
            ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : [])
          ]
        },
        { deletedAt: { $ne: null } },
        {
          $or: [
            { roleId: { $in: clientRoleIds } },
            { role: { $regex: /^(client|user|customer|investor)$/i } }
          ]
        }
      ]
    };
    if (dateFilter) userFilter.deletedAt = dateFilter;

    const deletedUsers = await dynamicDb.User.find(userFilter).lean();
    const userIds = deletedUsers.map((u: any) => u._id || u.id);
    const clients: any[] = await dynamicDb.Client.find({ userId: { $in: userIds } }).lean();
    const clientMap = new Map(clients.map((c: any) => [String(c.userId), c]));

    const csvData = deletedUsers.map((u: any) => {
      const client = clientMap.get(String(u._id || u.id));
      return {
        'User ID': String(u._id || u.id),
        'Client ID': client ? String(client._id || client.id) : '',
        'Name': `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        'Email': u.email,
        'Mobile': u.mobile,
        'PAN': client?.pan || (u as any).pan || '',
        'Aadhaar': client?.aadhaar || (u as any).aadhaar || '',
        'Joined Date': u.createdAt ? new Date(u.createdAt).toISOString() : '',
        'Deleted At': u.deletedAt ? new Date(u.deletedAt).toISOString() : '',
        'Deleted By': u.deletedBy || ''
      };
    });

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
    const payFilter: any = { tenantId };
    if (dateFilter) payFilter.createdAt = dateFilter;

    const payments: any[] = await dynamicDb.Payment.find(payFilter)
      .populate('planId')
      .lean();

    const clientIds = payments.map((p: any) => p.clientId);
    const clients: any[] = await dynamicDb.Client.find({ _id: { $in: clientIds } }).lean();
    const clientMap = new Map(clients.map((c: any) => [String(c._id || c.id), c]));

    const csvData = payments.map((p: any) => {
      const client = clientMap.get(String(p.clientId));
      return {
        'Payment ID': String(p._id || p.id),
        'Client Name': client?.name || 'Unknown',
        'Client Email': client?.email || 'Unknown',
        'Client Mobile': client?.mobile || 'Unknown',
        'Amount': p.amount,
        'Payment Mode': p.paymentMode,
        'Transaction Ref': p.transactionRef,
        'Status': p.status,
        'Plan Name': p.planId?.name || 'Unknown',
        'Payment Date': p.createdAt ? new Date(p.createdAt).toISOString() : ''
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
    const sigFilter: any = {
      tenantId,
      reportUrl: { $ne: null }
    };
    if (dateFilter) sigFilter.createdAt = dateFilter;

    const signals: any[] = await dynamicDb.Signal.find(sigFilter)
      .populate('stockId')
      .sort({ createdAt: -1 })
      .lean();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Research_Reports.zip"');
    
    const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    
    for (const signal of signals) {
      if (signal.reportUrl) {
        const filePath = path.join(__dirname, '../../..', signal.reportUrl);
        if (fs.existsSync(filePath)) {
          const dateStr = new Date(signal.createdAt).toISOString().split('T')[0];
          const symbol = signal.stockId?.symbol || 'UNKNOWN';
          const uniqueId = String(signal._id || signal.id).slice(0, 6);
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

    const client: any = await dynamicDb.Client.findById(id).populate('userId').lean();
    if (!client || (client.userId && client.userId.tenantId !== tenantId)) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const recipients: string[] = [];
    if (client.email) recipients.push(client.email);
    if (client.mobile) recipients.push(client.mobile);
    if (client.userId?.email && client.userId.email !== client.email) recipients.push(client.userId.email);

    if (recipients.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const logs = await dynamicDb.NotificationLog.find({
      tenantId,
      recipient: { $in: recipients }
    }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
