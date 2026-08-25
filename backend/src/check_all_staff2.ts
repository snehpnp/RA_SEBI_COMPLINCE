import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    include: {
      user: {
        include: { role: true }
      }
    }
  });
  console.log(`Total staff in DB (unfiltered): ${staff.length}`);
  staff.forEach(s => {
       console.log(` - ${s.name} | Role: ${s.user?.role?.name} | Status: ${s.status} | UserDeletedAt: ${s.user?.deletedAt}`);
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
