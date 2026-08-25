import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.complianceAlert.deleteMany({
    where: { alertType: 'DEADLINE_UPCOMING' }
  });

  console.log(`Deleted ${result.count} DEADLINE_UPCOMING alerts.`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
