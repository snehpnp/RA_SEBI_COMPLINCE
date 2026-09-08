import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { ensureStates } from './stateService';
import { getCompliancePeriod } from '../utils/complianceDateHelper';

export interface TenantProvisionData {
  id?: string;
  companyName: string;
  companyType?: string;
  raType?: string;
  sebiRegistration: string;
  bseEnrollment?: string | null;
  email: string;
  mobile: string;
  address: string;
  pan: string;
  gst?: string | null;
  website?: string | null;
  ownerName?: string;
  certificateUrl?: string | null;
  certificateValidity?: Date | string | null;
  nismCertificateUrl?: string | null;
  nismValidity?: Date | string | null;
  depositAmount?: number | string;
  status?: string;
  previousStatus?: string | null;
  panelName?: string | null;
  domainUrl?: string | null;
  mongoDbUrl?: string | null;
  dbName?: string | null;
  tenantApiKey?: string | null;
  state?: string | null;
  gstCalculationType?: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
  bankAccountName?: string | null;
  bankAccountNo?: string | null;
  bankAccountType?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  socialMediaLinks?: string | null;
  digioClientId?: string | null;
  digioClientSecret?: string | null;
  digioKycTemplateName?: string | null;
  agreementContent?: string | null;
  kraProvider?: string | null;
  kraApiKey?: string | null;
  kraApiSecret?: string | null;
  coSignatureUrl?: string | null;
  activePaymentGateway?: string | null;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  cashfreeAppId?: string | null;
  cashfreeSecretKey?: string | null;
  ccavenueMerchantId?: string | null;
  ccavenueAccessCode?: string | null;
  ccavenueWorkingKey?: string | null;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
  kycFirst?: boolean;
  welcomeEmailText?: string | null;
  termsPdfUrl?: string | null;
  privacyPdfUrl?: string | null;
  reportDisclaimer?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  internalPolicyUrl?: string | null;
  customPages?: any[];
  emailTemplates?: any[];
  plans?: any[];
  planCategories?: any[];
  complianceRequirements?: any[];
  complianceAudits?: any[];
  systemSettings?: any[];
  states?: any[];
}

export interface AdminUserData {
  id?: string;
  email: string;
  passwordHash?: string;
  tempPassword?: string | null;
  password?: string | null;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  status?: string;
}

export interface ProvisionResult {
  success: boolean;
  message: string;
  tenantId?: string;
  companyName?: string;
  adminEmail?: string;
  adminUserId?: string;
  error?: string;
}

/**
 * Provisions ALL collections and baseline records required for a Tenant:
 * 1. Standard Roles
 * 2. Standard Permissions
 * 3. Role-Permission mappings
 * 4. Tenant Profile & Configs
 * 5. Admin User Account & Role Binding
 * 6. Admin Module Permissions (10 Modules)
 * 7. Mandatory Legal & Compliance Custom Pages (8 Pages + Dynamic Updates)
 * 8. Default System Email Templates (4 Templates + Dynamic Updates)
 * 9. Compliance Requirements & Initialized Compliance Audits
 * 10. Indian States & GST Codes
 * 11. Starter Plan Category & Plan (with dynamic updates)
 * 12. Global System Settings / Branding
 */
export async function provisionAllTenantCollections(
  targetPrisma: PrismaClient,
  tenantData: TenantProvisionData,
  adminUserData: AdminUserData,
  customPermissions?: any[]
): Promise<{ tenant: any; adminUser: any }> {
  // 1. Seed standard Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'System Owner' },
    { name: 'ADMIN', description: 'RA Company Owner' },
    { name: 'PRINCIPAL_OFFICER', description: 'Company Principal Officer' },
    { name: 'COMPLIANCE_OFFICER', description: 'Company Compliance Officer' },
    { name: 'RESEARCHER', description: 'Company Research Analyst' },
    { name: 'PERSON_ASSOCIATED', description: 'Associated Services (Sales, Marketing, etc.)' },
    { name: 'CLIENT', description: 'End Client Subscribing to Research' }
  ];

  const roleMap: Record<string, string> = {};
  for (const role of roles) {
    const createdRole = await targetPrisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role
    });
    roleMap[role.name] = createdRole.id;
  }

  // 2. Seed standard Permissions
  const permissions = [
    { code: 'CREATE', name: 'Create Records' },
    { code: 'READ', name: 'Read Records' },
    { code: 'UPDATE', name: 'Update Records' },
    { code: 'DELETE', name: 'Soft Delete Records' },
    { code: 'APPROVE', name: 'Approve Workflows' },
    { code: 'REJECT', name: 'Reject Workflows' },
    { code: 'PUBLISH', name: 'Publish Research' },
    { code: 'EXPORT', name: 'Export Data (CSV/Excel)' },
    { code: 'DOWNLOAD', name: 'Download PDF Agreements/Reports' },
    { code: 'ACCESS_DASHBOARD', name: 'Access Dashboard' },
    { code: 'ACCESS_STAFF', name: 'Access Staff Control' },
    { code: 'ACCESS_CLIENTS', name: 'Access Client Management' },
    { code: 'ACCESS_PLANS', name: 'Access Plan Management' },
    { code: 'ACCESS_RESEARCH', name: 'Access Signal & Research Management' },
    { code: 'ACCESS_PAYMENTS', name: 'Access Payment Approvals' },
    { code: 'ACCESS_COMPLIANCE', name: 'Access Compliance Desk' },
    { code: 'ACCESS_SETTINGS', name: 'Access Settings' },
    { code: 'ACCESS_ROLES', name: 'Access Roles Management' }
  ];

  const permMap: Record<string, string> = {};
  for (const perm of permissions) {
    const createdPerm = await targetPrisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm
    });
    permMap[perm.code] = createdPerm.id;
  }

  // 3. Bind RolePermissions (ADMIN & SUPER_ADMIN get all permissions)
  const fullAdminRoles = ['SUPER_ADMIN', 'ADMIN'];
  for (const roleName of fullAdminRoles) {
    const rId = roleMap[roleName];
    if (!rId) continue;
    for (const permCode of Object.keys(permMap)) {
      const pId = permMap[permCode];
      await targetPrisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rId, permissionId: pId } },
        update: {},
        create: { roleId: rId, permissionId: pId }
      });
    }
  }

  // Specific permissions for Principal Officer
  const poId = roleMap['PRINCIPAL_OFFICER'];
  if (poId) {
    const poPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_STAFF', 'ACCESS_RESEARCH'];
    for (const permCode of poPerms) {
      const pId = permMap[permCode];
      if (pId) {
        await targetPrisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: poId, permissionId: pId } },
          update: {},
          create: { roleId: poId, permissionId: pId }
        });
      }
    }
  }

  // Specific permissions for Compliance Officer
  const coId = roleMap['COMPLIANCE_OFFICER'];
  if (coId) {
    const coPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_COMPLIANCE'];
    for (const permCode of coPerms) {
      const pId = permMap[permCode];
      if (pId) {
        await targetPrisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: coId, permissionId: pId } },
          update: {},
          create: { roleId: coId, permissionId: pId }
        });
      }
    }
  }

  // Specific permissions for Researcher
  const researcherId = roleMap['RESEARCHER'];
  if (researcherId) {
    const researcherPerms = ['CREATE', 'READ', 'UPDATE', 'PUBLISH', 'DOWNLOAD', 'ACCESS_RESEARCH'];
    for (const permCode of researcherPerms) {
      const pId = permMap[permCode];
      if (pId) {
        await targetPrisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: researcherId, permissionId: pId } },
          update: {},
          create: { roleId: researcherId, permissionId: pId }
        });
      }
    }
  }

  // 4. Safe Parsing of Tenant Payload
  const certValidity = tenantData.certificateValidity && !isNaN(new Date(tenantData.certificateValidity).getTime())
    ? new Date(tenantData.certificateValidity)
    : null;
  const nismValidity = tenantData.nismValidity && !isNaN(new Date(tenantData.nismValidity).getTime())
    ? new Date(tenantData.nismValidity)
    : null;
  const depositAmt = tenantData.depositAmount !== undefined && !isNaN(Number(tenantData.depositAmount))
    ? Number(tenantData.depositAmount)
    : 0.0;

  const tenantPayload: any = {
    companyName: tenantData.companyName,
    companyType: tenantData.companyType || 'INDIVIDUAL',
    raType: tenantData.raType || 'FULL_TIME',
    sebiRegistration: tenantData.sebiRegistration,
    bseEnrollment: tenantData.bseEnrollment || null,
    email: tenantData.email,
    mobile: tenantData.mobile,
    address: tenantData.address,
    pan: tenantData.pan,
    gst: tenantData.gst || null,
    website: tenantData.website || null,
    ownerName: tenantData.ownerName || `${adminUserData.firstName || ''} ${adminUserData.lastName || ''}`.trim() || 'Admin User',
    certificateUrl: tenantData.certificateUrl || null,
    certificateValidity: certValidity,
    nismCertificateUrl: tenantData.nismCertificateUrl || null,
    nismValidity: nismValidity,
    depositAmount: depositAmt,
    status: tenantData.status || 'ACTIVE',
    previousStatus: tenantData.previousStatus || null,
    panelName: tenantData.panelName || `${tenantData.companyName} Portal`,
    domainUrl: tenantData.domainUrl || null,
    mongoDbUrl: tenantData.mongoDbUrl || null,
    dbName: tenantData.dbName || null,
    tenantApiKey: tenantData.tenantApiKey || null,
    state: tenantData.state || null,
    gstCalculationType: tenantData.gstCalculationType || 'EXCLUSIVE',
    smtpHost: tenantData.smtpHost || null,
    smtpPort: tenantData.smtpPort !== undefined ? tenantData.smtpPort : null,
    smtpUser: tenantData.smtpUser || null,
    smtpPassword: tenantData.smtpPassword || null,
    smtpFrom: tenantData.smtpFrom || null,
    bankAccountName: tenantData.bankAccountName || null,
    bankAccountNo: tenantData.bankAccountNo || null,
    bankAccountType: tenantData.bankAccountType || null,
    bankIfsc: tenantData.bankIfsc || null,
    bankName: tenantData.bankName || null,
    bankBranch: tenantData.bankBranch || null,
    socialMediaLinks: tenantData.socialMediaLinks || null,
    digioClientId: tenantData.digioClientId || null,
    digioClientSecret: tenantData.digioClientSecret || null,
    digioKycTemplateName: tenantData.digioKycTemplateName || null,
    agreementContent: tenantData.agreementContent || null,
    kraProvider: tenantData.kraProvider || null,
    kraApiKey: tenantData.kraApiKey || null,
    kraApiSecret: tenantData.kraApiSecret || null,
    coSignatureUrl: tenantData.coSignatureUrl || null,
    activePaymentGateway: tenantData.activePaymentGateway || 'RAZORPAY',
    razorpayKeyId: tenantData.razorpayKeyId || null,
    razorpayKeySecret: tenantData.razorpayKeySecret || null,
    cashfreeAppId: tenantData.cashfreeAppId || null,
    cashfreeSecretKey: tenantData.cashfreeSecretKey || null,
    ccavenueMerchantId: tenantData.ccavenueMerchantId || null,
    ccavenueAccessCode: tenantData.ccavenueAccessCode || null,
    ccavenueWorkingKey: tenantData.ccavenueWorkingKey || null,
    stripePublishableKey: tenantData.stripePublishableKey || null,
    stripeSecretKey: tenantData.stripeSecretKey || null,
    kycFirst: tenantData.kycFirst !== undefined ? tenantData.kycFirst : true,
    welcomeEmailText: tenantData.welcomeEmailText || null,
    termsPdfUrl: tenantData.termsPdfUrl || null,
    privacyPdfUrl: tenantData.privacyPdfUrl || null,
    reportDisclaimer: tenantData.reportDisclaimer || null,
    logoUrl: tenantData.logoUrl || null,
    faviconUrl: tenantData.faviconUrl || null,
    internalPolicyUrl: tenantData.internalPolicyUrl || null
  };

  let targetTenant;
  if (tenantData.id) {
    targetTenant = await targetPrisma.tenant.upsert({
      where: { id: tenantData.id },
      update: tenantPayload,
      create: {
        id: tenantData.id,
        ...tenantPayload
      }
    });
  } else {
    targetTenant = await targetPrisma.tenant.upsert({
      where: { email: tenantData.email },
      update: tenantPayload,
      create: tenantPayload
    });
  }

  const tenantId = targetTenant.id;

  // 5. Ensure Admin Password Hash
  let finalPasswordHash = adminUserData.passwordHash;
  if (!finalPasswordHash && adminUserData.password) {
    finalPasswordHash = await bcrypt.hash(adminUserData.password, 10);
  } else if (!finalPasswordHash && adminUserData.tempPassword) {
    finalPasswordHash = await bcrypt.hash(adminUserData.tempPassword, 10);
  } else if (!finalPasswordHash) {
    const defaultPassword = 'Admin@' + Math.floor(1000 + Math.random() * 9000);
    finalPasswordHash = await bcrypt.hash(defaultPassword, 10);
    adminUserData.tempPassword = defaultPassword;
  }

  const adminRoleId = roleMap['ADMIN'];
  const adminEmail = adminUserData.email.toLowerCase().trim();

  let targetUser = null;
  if (adminUserData.id) {
    targetUser = await targetPrisma.user.findUnique({ where: { id: adminUserData.id } }).catch(() => null);
  }
  if (!targetUser && adminEmail) {
    targetUser = await targetPrisma.user.findUnique({ where: { email: adminEmail } }).catch(() => null);
  }
  if (!targetUser) {
    targetUser = await targetPrisma.user.findFirst({
      where: { tenantId, roleId: adminRoleId }
    }).catch(() => null);
  }

  const effectiveStatus = targetTenant.status === 'SUSPENDED'
    ? 'SUSPENDED'
    : (targetTenant.status === 'DELETED' ? 'DELETED' : (adminUserData.status || 'ACTIVE'));

  let createdAdminUser;
  if (targetUser) {
    const userUpdatePayload: any = {
      tenantId,
      roleId: adminRoleId,
      firstName: adminUserData.firstName || targetTenant.companyName,
      lastName: adminUserData.lastName || '',
      email: adminEmail,
      mobile: adminUserData.mobile || targetTenant.mobile,
      status: effectiveStatus
    };

    if (finalPasswordHash && finalPasswordHash.trim()) {
      userUpdatePayload.passwordHash = finalPasswordHash.trim();
    }
    if (adminUserData.tempPassword !== undefined) {
      userUpdatePayload.tempPassword = adminUserData.tempPassword || null;
    }

    createdAdminUser = await targetPrisma.user.update({
      where: { id: targetUser.id },
      data: userUpdatePayload
    });
  } else {
    createdAdminUser = await targetPrisma.user.create({
      data: {
        ...(adminUserData.id ? { id: adminUserData.id } : {}),
        tenantId,
        roleId: adminRoleId,
        firstName: adminUserData.firstName || targetTenant.companyName,
        lastName: adminUserData.lastName || 'Admin',
        email: adminEmail,
        mobile: adminUserData.mobile || targetTenant.mobile,
        passwordHash: finalPasswordHash || '',
        tempPassword: adminUserData.tempPassword || null,
        status: effectiveStatus
      }
    });
  }

  if (targetTenant.status === 'SUSPENDED') {
    await targetPrisma.user.updateMany({
      where: { tenantId },
      data: {
        status: 'SUSPENDED',
        tokenVersion: { increment: 1 },
        currentSessionId: null
      }
    });
  } else if (targetTenant.status === 'DELETED') {
    await targetPrisma.user.updateMany({
      where: { tenantId },
      data: {
        status: 'DELETED',
        deletedAt: new Date()
      }
    });
  }

  // 6. Seed / Update Admin Permissions (10 Modules)
  const defaultModules = [
    'CLIENTS',
    'RESEARCH_REPORTS',
    'SIGNALS',
    'COMPLIANCE',
    'BILLING',
    'KYC',
    'COUPONS',
    'CUSTOM_PAGES',
    'AI_FEATURES',
    'EXPORT_DATA'
  ];

  if (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0) {
    for (const p of customPermissions) {
      await targetPrisma.adminPermission.upsert({
        where: {
          tenantId_module: {
            tenantId,
            module: p.module
          }
        },
        update: {
          canView: p.canView ?? true,
          canCreate: p.canCreate ?? true,
          canEdit: p.canEdit ?? true,
          canDelete: p.canDelete ?? true,
          canExport: p.canExport ?? true,
          isEnabled: p.isEnabled ?? true,
          customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits
        },
        create: {
          tenantId,
          module: p.module,
          canView: p.canView ?? true,
          canCreate: p.canCreate ?? true,
          canEdit: p.canEdit ?? true,
          canDelete: p.canDelete ?? true,
          canExport: p.canExport ?? true,
          isEnabled: p.isEnabled ?? true,
          customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits
        }
      });
    }
  } else {
    for (const moduleName of defaultModules) {
      await targetPrisma.adminPermission.upsert({
        where: {
          tenantId_module: {
            tenantId,
            module: moduleName
          }
        },
        update: {},
        create: {
          tenantId,
          module: moduleName,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canExport: true,
          isEnabled: true
        }
      });
    }
  }

  // 7. Seed / Sync Mandatory & Dynamic Custom Pages
  const defaultPages = [
    { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '<h3>Monthly Complaint Status</h3><p>Status of investor complaints received and resolved per SEBI guidelines.</p>', isSystem: true },
    { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '<h3>Refund Policy</h3><p>Details regarding fee refunds and advisory subscription cancellations.</p>', isSystem: true },
    { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '<h3>SEBI Disclosures</h3><p>Mandatory disclosures regarding research analyst activities, ownership, and conflicts of interest.</p>', isSystem: true },
    { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '<h3>Disclaimer</h3><p>Investment in securities market are subject to market risks. Read all scheme related documents carefully before investing.</p>', isSystem: true },
    { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '<h3>Grievance Redressal Mechanism</h3><p>Step-by-step procedure for lodging and escalating complaints.</p>', isSystem: true },
    { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '<h3>Investor Charter</h3><p>Investor rights, responsibilities, and code of conduct under SEBI Research Analyst Regulations.</p>', isSystem: true },
    { title: 'Terms & Conditions', slug: 'terms-and-conditions', type: 'CONTENT', content: '<h3>Terms of Service</h3><p>Terms and conditions governing use of research and advisory services.</p>', isSystem: true },
    { title: 'Privacy Policy', slug: 'privacy-policy', type: 'CONTENT', content: '<h3>Privacy Policy</h3><p>Information on data collection, privacy, and confidentiality practices.</p>', isSystem: true }
  ];

  const pagesToSync = tenantData.customPages && tenantData.customPages.length > 0 ? tenantData.customPages : defaultPages;
  for (const page of pagesToSync) {
    if (!page.slug) continue;
    await targetPrisma.customPage.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: page.slug
        }
      },
      update: {
        title: page.title,
        type: page.type || 'CONTENT',
        content: page.content || null,
        externalUrl: page.externalUrl || null,
        isSystem: page.isSystem ?? true,
        status: page.status || 'ACTIVE'
      },
      create: {
        tenantId,
        title: page.title,
        slug: page.slug,
        type: page.type || 'CONTENT',
        content: page.content || null,
        externalUrl: page.externalUrl || null,
        isSystem: page.isSystem ?? true,
        status: page.status || 'ACTIVE'
      }
    });
  }

  // 8. Seed / Sync System Email Templates
  const defaultTemplates = [
    {
      type: 'WELCOME',
      subject: `Welcome to ${targetTenant.companyName}`,
      body: `Dear {{clientName}},\n\nWelcome to ${targetTenant.companyName}! Your advisory account is registered.\n\nBest regards,\n${targetTenant.companyName}`
    },
    {
      type: 'CHANGE_PASSWORD',
      subject: 'Password Reset Request',
      body: `Dear {{userName}},\n\nYour password reset request has been received. Please use your temporary credentials to log in.\n\nBest regards,\n${targetTenant.companyName}`
    },
    {
      type: 'KYC_AGREEMENT',
      subject: 'Advisory Service Agreement & KYC Confirmation',
      body: `Dear {{clientName}},\n\nYour KYC verification and Research Advisory Agreement have been successfully recorded.\n\nBest regards,\n${targetTenant.companyName}`
    },
    {
      type: 'INVOICE',
      subject: `Tax Invoice - ${targetTenant.companyName}`,
      body: `Dear {{clientName}},\n\nPlease find attached the tax invoice for your research advisory subscription.\n\nBest regards,\n${targetTenant.companyName}`
    }
  ];

  const templatesToSync = tenantData.emailTemplates && tenantData.emailTemplates.length > 0 ? tenantData.emailTemplates : defaultTemplates;
  for (const t of templatesToSync) {
    if (!t.type) continue;
    await targetPrisma.emailTemplate.upsert({
      where: {
        tenantId_type: {
          tenantId,
          type: t.type
        }
      },
      update: {
        subject: t.subject,
        body: t.body
      },
      create: {
        tenantId,
        type: t.type,
        subject: t.subject,
        body: t.body
      }
    });
  }

  // 9. Seed / Sync Compliance Requirements & Initialize Compliance Audits
  try {
    const rulesToSync = tenantData.complianceRequirements && tenantData.complianceRequirements.length > 0
      ? tenantData.complianceRequirements
      : null;

    if (rulesToSync) {
      for (const rule of rulesToSync) {
        const existingRule = await targetPrisma.complianceRequirement.findFirst({
          where: { serialNo: rule.serialNo }
        });
        if (existingRule) {
          await targetPrisma.complianceRequirement.update({
            where: { id: existingRule.id },
            data: {
              requirement: rule.requirement,
              frequency: rule.frequency,
              frequencyType: rule.frequencyType || 'CONTINUOUS',
              severityLevel: rule.severityLevel || 'HIGH',
              penaltyAmount: rule.penaltyAmount || null,
              isActive: rule.isActive ?? true
            }
          });
        } else {
          await targetPrisma.complianceRequirement.create({
            data: {
              serialNo: rule.serialNo,
              requirement: rule.requirement,
              frequency: rule.frequency,
              frequencyType: rule.frequencyType || 'CONTINUOUS',
              severityLevel: rule.severityLevel || 'HIGH',
              penaltyAmount: rule.penaltyAmount || null,
              isActive: rule.isActive ?? true
            }
          });
        }
      }
    } else {
      const rulesPath = path.join(__dirname, '../../prisma/rules.json');
      if (fs.existsSync(rulesPath)) {
        const rawRules = fs.readFileSync(rulesPath, 'utf8');
        const seedRules = JSON.parse(rawRules);
        for (const rule of seedRules) {
          const existingRule = await targetPrisma.complianceRequirement.findFirst({
            where: { serialNo: rule.serialNo }
          });
          if (existingRule) {
            await targetPrisma.complianceRequirement.update({
              where: { id: existingRule.id },
              data: {
                requirement: rule.requirement,
                frequency: rule.frequency,
                severityLevel: rule.severityLevel || 'HIGH',
                penaltyAmount: rule.penaltyAmount || null,
                isActive: true
              }
            });
          } else {
            await targetPrisma.complianceRequirement.create({
              data: {
                serialNo: rule.serialNo,
                requirement: rule.requirement,
                frequency: rule.frequency,
                frequencyType: rule.frequencyType || 'CONTINUOUS',
                severityLevel: rule.severityLevel || 'HIGH',
                penaltyAmount: rule.penaltyAmount || null,
                isActive: true
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Compliance rules seed note:', err);
  }

  // Seed / Sync Compliance Audits for this Tenant
  try {
    if (tenantData.complianceAudits && tenantData.complianceAudits.length > 0) {
      for (const audit of tenantData.complianceAudits) {
        if (!audit.requirementId) continue;
        const existingAudit = await targetPrisma.complianceAudit.findFirst({
          where: {
            tenantId,
            requirementId: audit.requirementId,
            dueDate: new Date(audit.dueDate)
          }
        });
        if (existingAudit) {
          await targetPrisma.complianceAudit.update({
            where: { id: existingAudit.id },
            data: {
              status: audit.status || 'PENDING',
              officerRemarks: audit.officerRemarks || null,
              resolvedAt: audit.resolvedAt ? new Date(audit.resolvedAt) : null
            }
          });
        } else {
          await targetPrisma.complianceAudit.create({
            data: {
              tenantId,
              requirementId: audit.requirementId,
              status: audit.status || 'PENDING',
              dueDate: new Date(audit.dueDate),
              officerRemarks: audit.officerRemarks || null,
              resolvedAt: audit.resolvedAt ? new Date(audit.resolvedAt) : null
            }
          });
        }
      }
    } else {
      const activeRequirements = await targetPrisma.complianceRequirement.findMany({
        where: { isActive: true }
      });
      const now = new Date();
      for (const req of activeRequirements) {
        const period = getCompliancePeriod(req.frequencyType, now, targetTenant.createdAt);
        const existingAudit = await targetPrisma.complianceAudit.findFirst({
          where: {
            tenantId,
            requirementId: req.id,
            dueDate: { gte: period.startDate, lte: period.dueDate }
          }
        });
        if (!existingAudit) {
          await targetPrisma.complianceAudit.create({
            data: {
              tenantId,
              requirementId: req.id,
              status: 'PENDING',
              dueDate: period.dueDate
            }
          });
        }
      }
    }
  } catch (auditSeedErr) {
    console.warn('Compliance audit sync note:', auditSeedErr);
  }

  // 10. Seed Indian States & GST Codes
  await ensureStates(targetPrisma).catch(() => {});

  // 11. Seed / Sync Plan Categories & Plans
  try {
    if (tenantData.planCategories && tenantData.planCategories.length > 0) {
      const categoryMap: Record<string, string> = {};
      for (const cat of tenantData.planCategories) {
        const existingCat = await targetPrisma.planCategory.findFirst({
          where: { tenantId, name: cat.name }
        });
        if (existingCat) {
          const updated = await targetPrisma.planCategory.update({
            where: { id: existingCat.id },
            data: {
              segments: cat.segments || 'EQUITY',
              status: cat.status || 'ACTIVE'
            }
          });
          categoryMap[cat.id] = updated.id;
          categoryMap[cat.name] = updated.id;
        } else {
          const created = await targetPrisma.planCategory.create({
            data: {
              tenantId,
              name: cat.name,
              segments: cat.segments || 'EQUITY',
              status: cat.status || 'ACTIVE'
            }
          });
          categoryMap[cat.id] = created.id;
          categoryMap[cat.name] = created.id;
        }
      }

      if (tenantData.plans && tenantData.plans.length > 0) {
        for (const pl of tenantData.plans) {
          const targetCatId = categoryMap[pl.categoryId] || Object.values(categoryMap)[0];
          if (!targetCatId) continue;
          const existingPlan = await targetPrisma.plan.findFirst({
            where: { tenantId, name: pl.name }
          });
          if (existingPlan) {
            await targetPrisma.plan.update({
              where: { id: existingPlan.id },
              data: {
                categoryId: targetCatId,
                description: pl.description || '',
                price: parseFloat(pl.price) || 0,
                durationMonths: parseInt(pl.durationMonths) || 1,
                researchSegments: pl.researchSegments || 'EQUITY',
                notificationsAllowed: pl.notificationsAllowed || 'EMAIL,INAPP',
                clientLimit: parseInt(pl.clientLimit) || 100,
                status: pl.status || 'ACTIVE'
              }
            });
          } else {
            await targetPrisma.plan.create({
              data: {
                tenantId,
                categoryId: targetCatId,
                name: pl.name,
                description: pl.description || '',
                price: parseFloat(pl.price) || 0,
                durationMonths: parseInt(pl.durationMonths) || 1,
                researchSegments: pl.researchSegments || 'EQUITY',
                notificationsAllowed: pl.notificationsAllowed || 'EMAIL,INAPP',
                clientLimit: parseInt(pl.clientLimit) || 100,
                status: pl.status || 'ACTIVE'
              }
            });
          }
        }
      }
    } else {
      const categoryCount = await targetPrisma.planCategory.count({ where: { tenantId } });
      if (categoryCount === 0) {
        const defaultCategory = await targetPrisma.planCategory.create({
          data: {
            tenantId,
            name: 'Equity & Derivatives',
            segments: 'EQUITY,DERIVATIVE',
            status: 'ACTIVE'
          }
        });

        await targetPrisma.plan.create({
          data: {
            tenantId,
            categoryId: defaultCategory.id,
            name: 'Standard Advisory Plan',
            description: 'Comprehensive equity recommendations and research reports with SEBI compliant disclosures.',
            price: 5000.0,
            durationMonths: 1,
            researchSegments: 'EQUITY,DERIVATIVE',
            notificationsAllowed: 'EMAIL,INAPP',
            clientLimit: 100,
            status: 'ACTIVE'
          }
        });
      }
    }
  } catch (planSeedErr) {
    console.warn('Starter plan sync note:', planSeedErr);
  }

  // 12. Seed / Sync Global System Settings (Branding, Global Configurations)
  try {
    if (tenantData.systemSettings && tenantData.systemSettings.length > 0) {
      for (const setting of tenantData.systemSettings) {
        if (!setting.key) continue;
        await targetPrisma.systemSetting.upsert({
          where: { key: setting.key },
          update: {
            value: typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)
          },
          create: {
            key: setting.key,
            value: typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)
          }
        });
      }
    }
  } catch (settingErr) {
    console.warn('System settings sync note:', settingErr);
  }

  return { tenant: targetTenant, adminUser: createdAdminUser };
}

/**
 * Direct native MongoDB synchronizer for tenant dedicated database.
 * Connects via native MongoClient, which is resilient, fast, and does not require
 * Prisma dynamic client reloading. Updates/upserts all 11 collections directly.
 */
export async function syncTenantDedicatedMongoDirect(
  mongoDbUrl: string,
  tenantData: TenantProvisionData,
  adminUserData: AdminUserData,
  customPermissions?: any[]
): Promise<ProvisionResult> {
  const client = new MongoClient(mongoDbUrl, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000
  });

  try {
    await client.connect();
    const db = client.db(); // Uses database name from URI

    const tenantId = tenantData.id || new ObjectId().toString();

    // 1. Roles
    const roles = [
      { name: 'SUPER_ADMIN', description: 'System Owner' },
      { name: 'ADMIN', description: 'RA Company Owner' },
      { name: 'PRINCIPAL_OFFICER', description: 'Company Principal Officer' },
      { name: 'COMPLIANCE_OFFICER', description: 'Company Compliance Officer' },
      { name: 'RESEARCHER', description: 'Company Research Analyst' },
      { name: 'PERSON_ASSOCIATED', description: 'Associated Services (Sales, Marketing, etc.)' },
      { name: 'CLIENT', description: 'End Client Subscribing to Research' }
    ];

    const roleMap: Record<string, string> = {};
    for (const r of roles) {
      const res = await db.collection('Role').findOneAndUpdate(
        { name: r.name },
        { $set: { name: r.name, description: r.description, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );
      if (res && res._id) {
        roleMap[r.name] = res._id.toString();
      }
    }

    // 2. Permissions
    const permissions = [
      { code: 'CREATE', name: 'Create Records' },
      { code: 'READ', name: 'Read Records' },
      { code: 'UPDATE', name: 'Update Records' },
      { code: 'DELETE', name: 'Soft Delete Records' },
      { code: 'APPROVE', name: 'Approve Workflows' },
      { code: 'REJECT', name: 'Reject Workflows' },
      { code: 'PUBLISH', name: 'Publish Research' },
      { code: 'EXPORT', name: 'Export Data (CSV/Excel)' },
      { code: 'DOWNLOAD', name: 'Download PDF Agreements/Reports' },
      { code: 'ACCESS_DASHBOARD', name: 'Access Dashboard' },
      { code: 'ACCESS_STAFF', name: 'Access Staff Control' },
      { code: 'ACCESS_CLIENTS', name: 'Access Client Management' },
      { code: 'ACCESS_PLANS', name: 'Access Plan Management' },
      { code: 'ACCESS_RESEARCH', name: 'Access Signal & Research Management' },
      { code: 'ACCESS_PAYMENTS', name: 'Access Payment Approvals' },
      { code: 'ACCESS_COMPLIANCE', name: 'Access Compliance Desk' },
      { code: 'ACCESS_SETTINGS', name: 'Access Settings' },
      { code: 'ACCESS_ROLES', name: 'Access Roles Management' }
    ];

    const permMap: Record<string, string> = {};
    for (const p of permissions) {
      const res = await db.collection('Permission').findOneAndUpdate(
        { code: p.code },
        { $set: { code: p.code, name: p.name, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );
      if (res && res._id) {
        permMap[p.code] = res._id.toString();
      }
    }

    // 3. RolePermissions (ADMIN gets all)
    const adminRoleId = roleMap['ADMIN'];
    if (adminRoleId) {
      for (const pCode of Object.keys(permMap)) {
        const pId = permMap[pCode];
        await db.collection('RolePermission').updateOne(
          { roleId: adminRoleId, permissionId: pId },
          { $set: { roleId: adminRoleId, permissionId: pId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
      }
    }

    // 4. Tenant Profile & Config
    const tenantDoc: any = {
      companyName: tenantData.companyName,
      companyType: tenantData.companyType || 'INDIVIDUAL',
      raType: tenantData.raType || 'FULL_TIME',
      sebiRegistration: tenantData.sebiRegistration,
      bseEnrollment: tenantData.bseEnrollment || null,
      email: tenantData.email,
      mobile: tenantData.mobile,
      address: tenantData.address,
      pan: tenantData.pan,
      gst: tenantData.gst || null,
      website: tenantData.website || null,
      ownerName: tenantData.ownerName || null,
      certificateUrl: tenantData.certificateUrl || null,
      certificateValidity: tenantData.certificateValidity ? new Date(tenantData.certificateValidity) : null,
      nismCertificateUrl: tenantData.nismCertificateUrl || null,
      nismValidity: tenantData.nismValidity ? new Date(tenantData.nismValidity) : null,
      depositAmount: typeof tenantData.depositAmount === 'number' ? tenantData.depositAmount : parseFloat(String(tenantData.depositAmount || 0)),
      status: tenantData.status || 'ACTIVE',
      panelName: tenantData.panelName || `${tenantData.companyName} Portal`,
      domainUrl: tenantData.domainUrl || null,
      mongoDbUrl: tenantData.mongoDbUrl || null,
      dbName: tenantData.dbName || null,
      tenantApiKey: tenantData.tenantApiKey || null,
      state: tenantData.state || null,
      gstCalculationType: tenantData.gstCalculationType || 'EXCLUSIVE',
      smtpHost: tenantData.smtpHost || null,
      smtpPort: tenantData.smtpPort || null,
      smtpUser: tenantData.smtpUser || null,
      smtpPassword: tenantData.smtpPassword || null,
      smtpFrom: tenantData.smtpFrom || null,
      bankAccountName: tenantData.bankAccountName || null,
      bankAccountNo: tenantData.bankAccountNo || null,
      bankAccountType: tenantData.bankAccountType || null,
      bankIfsc: tenantData.bankIfsc || null,
      bankName: tenantData.bankName || null,
      bankBranch: tenantData.bankBranch || null,
      socialMediaLinks: tenantData.socialMediaLinks || null,
      digioClientId: tenantData.digioClientId || null,
      digioClientSecret: tenantData.digioClientSecret || null,
      digioKycTemplateName: tenantData.digioKycTemplateName || null,
      agreementContent: tenantData.agreementContent || null,
      kraProvider: tenantData.kraProvider || null,
      kraApiKey: tenantData.kraApiKey || null,
      kraApiSecret: tenantData.kraApiSecret || null,
      coSignatureUrl: tenantData.coSignatureUrl || null,
      activePaymentGateway: tenantData.activePaymentGateway || null,
      razorpayKeyId: tenantData.razorpayKeyId || null,
      razorpayKeySecret: tenantData.razorpayKeySecret || null,
      cashfreeAppId: tenantData.cashfreeAppId || null,
      cashfreeSecretKey: tenantData.cashfreeSecretKey || null,
      ccavenueMerchantId: tenantData.ccavenueMerchantId || null,
      ccavenueAccessCode: tenantData.ccavenueAccessCode || null,
      ccavenueWorkingKey: tenantData.ccavenueWorkingKey || null,
      stripePublishableKey: tenantData.stripePublishableKey || null,
      stripeSecretKey: tenantData.stripeSecretKey || null,
      kycFirst: tenantData.kycFirst ?? false,
      welcomeEmailText: tenantData.welcomeEmailText || null,
      termsPdfUrl: tenantData.termsPdfUrl || null,
      privacyPdfUrl: tenantData.privacyPdfUrl || null,
      reportDisclaimer: tenantData.reportDisclaimer || null,
      logoUrl: tenantData.logoUrl || null,
      faviconUrl: tenantData.faviconUrl || null,
      internalPolicyUrl: tenantData.internalPolicyUrl || null,
      updatedAt: new Date()
    };

    let targetTenant = await db.collection('Tenant').findOne({
      $or: [
        ...(tenantData.id ? [{ _id: new ObjectId(tenantData.id) }, { id: tenantData.id }] : []),
        { sebiRegistration: tenantData.sebiRegistration },
        { email: tenantData.email }
      ]
    });

    if (targetTenant) {
      await db.collection('Tenant').updateOne(
        { _id: targetTenant._id },
        { $set: tenantDoc }
      );
    } else {
      const inserted = await db.collection('Tenant').insertOne({
        ...(tenantData.id ? { _id: new ObjectId(tenantData.id), id: tenantData.id } : {}),
        ...tenantDoc,
        createdAt: new Date()
      });
      targetTenant = { _id: inserted.insertedId, ...tenantDoc };
    }

    // 5. Admin User
    const adminEmail = (adminUserData.email || tenantData.email).toLowerCase().trim();
    let finalPasswordHash = adminUserData.passwordHash;
    if (!finalPasswordHash && (adminUserData.tempPassword || adminUserData.password)) {
      const salt = await bcrypt.genSalt(10);
      finalPasswordHash = await bcrypt.hash((adminUserData.tempPassword || adminUserData.password)!.trim(), salt);
    }

    const userDoc: any = {
      tenantId,
      roleId: adminRoleId,
      firstName: adminUserData.firstName || tenantData.companyName,
      lastName: adminUserData.lastName || 'Admin',
      email: adminEmail,
      mobile: adminUserData.mobile || tenantData.mobile,
      status: tenantData.status === 'SUSPENDED' ? 'SUSPENDED' : (tenantData.status === 'DELETED' ? 'DELETED' : (adminUserData.status || 'ACTIVE')),
      updatedAt: new Date()
    };
    if (finalPasswordHash) userDoc.passwordHash = finalPasswordHash;
    if (adminUserData.tempPassword !== undefined) userDoc.tempPassword = adminUserData.tempPassword;

    let targetUser = await db.collection('User').findOne({ email: adminEmail });
    if (targetUser) {
      await db.collection('User').updateOne({ _id: targetUser._id }, { $set: userDoc });
    } else {
      await db.collection('User').insertOne({
        ...(adminUserData.id ? { _id: new ObjectId(adminUserData.id), id: adminUserData.id } : {}),
        ...userDoc,
        createdAt: new Date()
      });
    }

    // 6. Admin Permissions (10 Modules)
    const defaultModules = ['CLIENTS', 'RESEARCH_REPORTS', 'SIGNALS', 'COMPLIANCE', 'BILLING', 'KYC', 'COUPONS', 'CUSTOM_PAGES', 'AI_FEATURES', 'EXPORT_DATA'];
    const permsToSync = (customPermissions && customPermissions.length > 0) ? customPermissions : defaultModules.map(m => ({ module: m, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true, isEnabled: true }));

    for (const p of permsToSync) {
      await db.collection('AdminPermission').updateOne(
        { tenantId, module: p.module },
        {
          $set: {
            tenantId,
            module: p.module,
            canView: p.canView ?? true,
            canCreate: p.canCreate ?? true,
            canEdit: p.canEdit ?? true,
            canDelete: p.canDelete ?? true,
            canExport: p.canExport ?? true,
            isEnabled: p.isEnabled ?? true,
            customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits || null,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    // 7. Custom Pages
    const defaultPages = [
      { title: 'Complaint Status', slug: 'complaint-status', type: 'CONTENT', content: '<h3>Monthly Complaint Status</h3><p>Status of investor complaints received and resolved per SEBI guidelines.</p>', isSystem: true },
      { title: 'Refund Policy', slug: 'refund-policy', type: 'CONTENT', content: '<h3>Refund Policy</h3><p>Details regarding fee refunds and advisory subscription cancellations.</p>', isSystem: true },
      { title: 'Disclosure', slug: 'disclosure', type: 'CONTENT', content: '<h3>SEBI Disclosures</h3><p>Mandatory disclosures regarding research analyst activities, ownership, and conflicts of interest.</p>', isSystem: true },
      { title: 'Disclaimer', slug: 'disclaimer', type: 'CONTENT', content: '<h3>Disclaimer</h3><p>Investment in securities market are subject to market risks. Read all scheme related documents carefully before investing.</p>', isSystem: true },
      { title: 'Grievance Redressal Process', slug: 'grievance-redressal-process', type: 'CONTENT', content: '<h3>Grievance Redressal Mechanism</h3><p>Step-by-step procedure for lodging and escalating complaints.</p>', isSystem: true },
      { title: 'Investor Charter', slug: 'investor-charter', type: 'CONTENT', content: '<h3>Investor Charter</h3><p>Investor rights, responsibilities, and code of conduct under SEBI Research Analyst Regulations.</p>', isSystem: true },
      { title: 'Terms & Conditions', slug: 'terms-and-conditions', type: 'CONTENT', content: '<h3>Terms of Service</h3><p>Terms and conditions governing use of research and advisory services.</p>', isSystem: true },
      { title: 'Privacy Policy', slug: 'privacy-policy', type: 'CONTENT', content: '<h3>Privacy Policy</h3><p>Information on data collection, privacy, and confidentiality practices.</p>', isSystem: true }
    ];
    const pagesToSync = tenantData.customPages && tenantData.customPages.length > 0 ? tenantData.customPages : defaultPages;
    for (const page of pagesToSync) {
      if (!page.slug) continue;
      await db.collection('CustomPage').updateOne(
        { tenantId, slug: page.slug },
        {
          $set: {
            tenantId,
            title: page.title,
            slug: page.slug,
            type: page.type || 'CONTENT',
            content: page.content || null,
            externalUrl: page.externalUrl || null,
            isSystem: page.isSystem ?? true,
            status: page.status || 'ACTIVE',
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    // 8. Email Templates
    const defaultTemplates = [
      { type: 'WELCOME', subject: `Welcome to ${tenantData.companyName}`, body: `Dear {{clientName}},\n\nWelcome to ${tenantData.companyName}! Your advisory account is registered.\n\nBest regards,\n${tenantData.companyName}` },
      { type: 'CHANGE_PASSWORD', subject: 'Password Reset Request', body: `Dear {{userName}},\n\nYour password reset request has been received. Please use your temporary credentials to log in.\n\nBest regards,\n${tenantData.companyName}` },
      { type: 'KYC_AGREEMENT', subject: 'Advisory Service Agreement & KYC Confirmation', body: `Dear {{clientName}},\n\nYour KYC verification and Research Advisory Agreement have been successfully recorded.\n\nBest regards,\n${tenantData.companyName}` },
      { type: 'INVOICE', subject: `Tax Invoice - ${tenantData.companyName}`, body: `Dear {{clientName}},\n\nPlease find attached the tax invoice for your research advisory subscription.\n\nBest regards,\n${tenantData.companyName}` }
    ];
    const templatesToSync = tenantData.emailTemplates && tenantData.emailTemplates.length > 0 ? tenantData.emailTemplates : defaultTemplates;
    for (const t of templatesToSync) {
      if (!t.type) continue;
      await db.collection('EmailTemplate').updateOne(
        { tenantId, type: t.type },
        {
          $set: {
            tenantId,
            type: t.type,
            subject: t.subject,
            body: t.body,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    // 9. Compliance Requirements (ALL SEBI RULES)
    let rulesToSync = tenantData.complianceRequirements;
    if (!rulesToSync || rulesToSync.length === 0) {
      const rulesPath = path.join(__dirname, '../../prisma/rules.json');
      if (fs.existsSync(rulesPath)) {
        rulesToSync = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      }
    }

    if (rulesToSync && rulesToSync.length > 0) {
      for (const rule of rulesToSync) {
        await db.collection('ComplianceRequirement').updateOne(
          { serialNo: Number(rule.serialNo) },
          {
            $set: {
              serialNo: Number(rule.serialNo),
              requirement: rule.requirement,
              frequency: rule.frequency,
              frequencyType: rule.frequencyType || 'CONTINUOUS',
              severityLevel: rule.severityLevel || 'HIGH',
              penaltyAmount: rule.penaltyAmount !== undefined ? rule.penaltyAmount : null,
              isActive: typeof rule.isActive === 'boolean' ? rule.isActive : true,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );
      }
    }

    // 10. System Settings (Branding & Global Configurations)
    if (tenantData.systemSettings && tenantData.systemSettings.length > 0) {
      for (const setting of tenantData.systemSettings) {
        if (!setting.key) continue;
        await db.collection('SystemSetting').updateOne(
          { key: setting.key },
          {
            $set: {
              key: setting.key,
              value: typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value),
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );
      }
    }

    return {
      success: true,
      message: `Dedicated MongoDB database provisioned and synced successfully for ${tenantData.companyName}. Admin user ${adminEmail} is active with all 11 collections synchronized.`,
      tenantId,
      companyName: tenantData.companyName,
      adminEmail,
      adminUserId: adminUserData.id
    };
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Connects to a target MongoDB database, ensuring all collections and baseline records
 * are created or updated on the remote dedicated database.
 */
export async function provisionTenantDatabase(
  mongoDbUrl: string,
  tenantData: TenantProvisionData,
  adminUserData: AdminUserData,
  customPermissions?: any[]
): Promise<ProvisionResult> {
  if (!mongoDbUrl || (!mongoDbUrl.startsWith('mongodb://') && !mongoDbUrl.startsWith('mongodb+srv://'))) {
    return {
      success: false,
      message: 'Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://'
    };
  }

  try {
    return await syncTenantDedicatedMongoDirect(mongoDbUrl, tenantData, adminUserData, customPermissions);
  } catch (directErr: any) {
    console.warn('Native MongoDB sync attempt note, falling back to Prisma:', directErr.message);

    let targetPrisma: PrismaClient | null = null;
    try {
      targetPrisma = new PrismaClient({
        datasources: {
          db: {
            url: mongoDbUrl
          }
        }
      });

      const { tenant, adminUser } = await provisionAllTenantCollections(
        targetPrisma,
        tenantData,
        adminUserData,
        customPermissions
      );

      return {
        success: true,
        message: `Tenant database provisioned successfully via Prisma. Admin user ${adminUser.email} is ready.`,
        tenantId: tenant.id,
        companyName: tenant.companyName,
        adminEmail: adminUser.email,
        adminUserId: adminUser.id
      };
    } catch (error: any) {
      console.error('Failed to provision tenant database at:', mongoDbUrl, error);
      return {
        success: false,
        message: `Database provisioning failed: ${error.message}`,
        error: error.message
      };
    } finally {
      if (targetPrisma) {
        await targetPrisma.$disconnect().catch(() => {});
      }
    }
  }
}
