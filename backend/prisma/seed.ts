import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding roles & permissions...');

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
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role
    });
    roleMap[role.name] = createdRole.id;
  }

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
    const createdPerm = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm
    });
    permMap[perm.code] = createdPerm.id;
  }

  // Bind all permissions to SUPER_ADMIN, ADMIN
  const fullAdminRoles = ['SUPER_ADMIN', 'ADMIN'];
  for (const roleName of fullAdminRoles) {
    const rId = roleMap[roleName];
    for (const permCode of Object.keys(permMap)) {
      const pId = permMap[permCode];
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rId, permissionId: pId } },
        update: {},
        create: { roleId: rId, permissionId: pId }
      });
    }
  }

  // Bind specific permissions to PRINCIPAL_OFFICER
  const poId = roleMap['PRINCIPAL_OFFICER'];
  const poPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_STAFF', 'ACCESS_RESEARCH'];
  for (const permCode of poPerms) {
    const pId = permMap[permCode];
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: poId, permissionId: pId } },
      update: {},
      create: { roleId: poId, permissionId: pId }
    });
  }

  // Bind specific permissions to COMPLIANCE_OFFICER
  const coId = roleMap['COMPLIANCE_OFFICER'];
  const coPerms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'EXPORT', 'DOWNLOAD', 'ACCESS_DASHBOARD', 'ACCESS_COMPLIANCE'];
  for (const permCode of coPerms) {
    const pId = permMap[permCode];
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: coId, permissionId: pId } },
      update: {},
      create: { roleId: coId, permissionId: pId }
    });
  }

  // Bind READ and PUBLISH to RESEARCHER
  const researcherId = roleMap['RESEARCHER'];
  const researcherPerms = ['CREATE', 'READ', 'UPDATE', 'PUBLISH', 'DOWNLOAD', 'ACCESS_RESEARCH'];
  for (const permCode of researcherPerms) {
    const pId = permMap[permCode];
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: researcherId, permissionId: pId } },
      update: {},
      create: { roleId: researcherId, permissionId: pId }
    });
  }

  // Bind READ to PERSON_ASSOCIATED
  const associateId = roleMap['PERSON_ASSOCIATED'];
  const associatePerms = ['READ', 'CREATE', 'UPDATE']; // e.g. operational access
  for (const permCode of associatePerms) {
    const pId = permMap[permCode];
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: associateId, permissionId: pId } },
      update: {},
      create: { roleId: associateId, permissionId: pId }
    });
  }

  // Bind READ, DOWNLOAD to CLIENT
  const clientId = roleMap['CLIENT'];
  const clientPerms = ['READ', 'DOWNLOAD', 'CREATE']; // client creates kyc, consent, payments
  for (const permCode of clientPerms) {
    const pId = permMap[permCode];
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: clientId, permissionId: pId } },
      update: {},
      create: { roleId: clientId, permissionId: pId }
    });
  }

  // Create Super Admin User
  console.log('Seeding default Super Admin...');
  const salt = await bcrypt.genSalt(10);
  const superAdminPasswordHash = await bcrypt.hash('Admin@987', salt);
  const adminPasswordHash = await bcrypt.hash('Admin@12345', salt);

  await prisma.user.upsert({
    where: { email: 'superadmin@gmail.com' },
    update: {},
    create: {
      email: 'superadmin@gmail.com',
      firstName: 'Super',
      lastName: 'Admin',
      mobile: '9999999999',
      passwordHash: superAdminPasswordHash,
      roleId: roleMap['SUPER_ADMIN'],
      status: 'ACTIVE'
    }
  });

  // Create Tenant (RA Company)
  console.log('Seeding default Tenant (RA Company)...');
  const tenant = await prisma.tenant.upsert({
    where: { email: 'admin@alpharesearch.com' },
    update: {},
    create: {
      companyName: 'Alpha Research Partners',
      sebiRegistration: 'INH000001234',
      bseEnrollment: 'BSE998877',
      email: 'admin@alpharesearch.com',
      mobile: '9876543210',
      address: '101, Finance Towers, BKC, Mumbai, Maharashtra 400051',
      pan: 'ABCDE1234F',
      gst: '27ABCDE1234F1Z5',
      website: 'www.alpharesearch.com',
      certificateValidity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year
      status: 'ACTIVE',
      depositAmount: 120000, // INR 1.2 Lakh (Enough for >100 clients limit)
      aiUsage: true
    }
  });

  // Create RA Admin User
  await prisma.user.upsert({
    where: { email: 'admin@alpharesearch.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@alpharesearch.com',
      firstName: 'Alpha',
      lastName: 'Admin',
      mobile: '9876543210',
      passwordHash: adminPasswordHash,
      roleId: roleMap['ADMIN'],
      status: 'ACTIVE'
    }
  });

  // Create Support Staff User (Compliance / Principal Officer)
  console.log('Seeding compliance & researcher staff...');
  const complianceUser = await prisma.user.upsert({
    where: { email: 'compliance@alpharesearch.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'compliance@alpharesearch.com',
      firstName: 'Rahul',
      lastName: 'Sharma',
      mobile: '9811122233',
      passwordHash: adminPasswordHash,
      roleId: roleMap['COMPLIANCE_OFFICER'],
      status: 'ACTIVE'
    }
  });

  const staffCompliance = await prisma.staff.upsert({
    where: { userId: complianceUser.id },
    update: {},
    create: {
      userId: complianceUser.id,
      employeeId: 'EMP001',
      name: 'Rahul Sharma',
      email: 'compliance@alpharesearch.com',
      mobile: '9811122233',
      nismNumber: 'NISM-2024-8899',
      nismValidity: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    }
  });

  const researcherUser = await prisma.user.upsert({
    where: { email: 'researcher@alpharesearch.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'researcher@alpharesearch.com',
      firstName: 'Amit',
      lastName: 'Verma',
      mobile: '9822233344',
      passwordHash: adminPasswordHash,
      roleId: roleMap['RESEARCHER'],
      status: 'ACTIVE'
    }
  });

  const staffResearcher = await prisma.staff.upsert({
    where: { userId: researcherUser.id },
    update: {},
    create: {
      userId: researcherUser.id,
      employeeId: 'EMP002',
      name: 'Amit Verma',
      email: 'researcher@alpharesearch.com',
      mobile: '9822233344',
      nismNumber: 'NISM-2024-5544',
      nismValidity: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    }
  });

  // Seed plans for Alpha Research Partners
  console.log('Seeding plans...');
  const plans = [
    {
      tenantId: tenant.id,
      name: 'BASIC',
      description: 'Equity research segments only.',
      price: 1500,
      durationMonths: 1,
      researchSegments: 'EQUITY',
      notificationsAllowed: 'EMAIL,INAPP',
      clientLimit: 100
    },
    {
      tenantId: tenant.id,
      name: 'PREMIUM',
      description: 'Equity & Derivative calls plus model portfolios.',
      price: 4500,
      durationMonths: 3,
      researchSegments: 'EQUITY,DERIVATIVE',
      notificationsAllowed: 'EMAIL,INAPP,PUSH',
      clientLimit: 500
    },
    {
      tenantId: tenant.id,
      name: 'VIP',
      description: 'Full segment access, high frequency calls, direct alerts.',
      price: 15000,
      durationMonths: 12,
      researchSegments: 'EQUITY,DERIVATIVE,COMMODITY,CURRENCY,IPO,ETF',
      notificationsAllowed: 'EMAIL,INAPP,PUSH',
      clientLimit: 1000
    }
  ];

  for (const plan of plans) {
    const existingPlan = await prisma.plan.findFirst({
      where: { tenantId: plan.tenantId, name: plan.name }
    });
    if (!existingPlan) {
      await prisma.plan.create({ data: plan });
    }
  }

  console.log('Database Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
  
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
