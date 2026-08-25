import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alerts = await prisma.complianceAlert.findMany({
    where: { status: 'OPEN' }
  });

  const summary: Record<string, number> = {};
  alerts.forEach(a => {
    const key = `${a.tenantId} - ${a.alertType}`;
    summary[key] = (summary[key] || 0) + 1;
  });

  console.log('Open Alerts Summary:', summary);
  console.log('Total Open Alerts:', alerts.length);
}

main().finally(async () => {
  await prisma.$disconnect();
});
