import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
      where: {
        user: {
          tenantId: '6a70726d073dc9cc7a24edfe'
        },
        status: 'ACTIVE'
      },
      include: { user: true }
  });
  console.log("Filtered without deletedAt:", staff.length);
  
  const staff2 = await prisma.staff.findMany({
      where: {
        user: {
          tenantId: '6a70726d073dc9cc7a24edfe'
        }
      }
  });
  console.log("Filtered without status:", staff2.length);
}

main().finally(async () => {
  await prisma.$disconnect();
});
