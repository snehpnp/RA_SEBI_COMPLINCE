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
  const associatePerms = ['READ', 'CREATE', 'UPDATE'];
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
  const clientPerms = ['READ', 'DOWNLOAD', 'CREATE'];
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

  // Use env variables for Super Admin credentials to allow dynamic setup for new clients
  const superAdminEmail = 'superadmin@gmail.com';
  const superAdminPassword = 'Admin@987';
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, salt);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      passwordHash: superAdminPasswordHash // Update password if it already exists
    },
    create: {
      email: superAdminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      mobile: '9999999999',
      passwordHash: superAdminPasswordHash,
      roleId: roleMap['SUPER_ADMIN'],
      status: 'ACTIVE'
    }
  });

  console.log(`✅ Super Admin created: ${superAdminEmail}`);

  // Create Admin User
  console.log('Seeding default Admin...');
  const adminEmail = 'admin@gmail.com';
  const adminPassword = '123456';
  const adminPasswordHash = await bcrypt.hash(adminPassword, salt);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash
    },
    create: {
      email: adminEmail,
      firstName: 'System',
      lastName: 'Admin',
      mobile: '9999999998',
      passwordHash: adminPasswordHash,
      roleId: roleMap['ADMIN'],
      status: 'ACTIVE'
    }
  });

  console.log(`✅ Admin created: ${adminEmail}`);
  console.log('Database Seeding Completed Successfully. Ready for fresh deployment!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
