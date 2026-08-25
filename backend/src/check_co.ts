import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = '6a70726d073dc9cc7a24edfe'; // From previous script
  
  const staffMembers = await prisma.staff.findMany({
    where: {
      user: {
        tenantId,
        deletedAt: null
      },
      status: 'ACTIVE'
    },
    include: {
      user: {
        include: { role: true }
      }
    }
  });

  console.log(`Found ${staffMembers.length} active staff members for tenant ${tenantId}.`);
  staffMembers.forEach(staff => {
    console.log(`- Staff ID: ${staff.id}, Name: ${staff.name}, User ID: ${staff.user?.id}, Role: ${staff.user?.role?.name}`);
  });
  
  const roles = await prisma.role.findMany();
  console.log('\nAll Roles in DB:');
  roles.forEach(r => console.log(`- ${r.name}`));
}

main().finally(async () => {
  await prisma.$disconnect();
});
