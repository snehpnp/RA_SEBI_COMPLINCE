import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all tenants...');
  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    const alerts = await prisma.complianceAlert.findMany({
      where: {
        tenantId: tenant.id,
        alertType: 'CERTIFICATE_EXPIRY',
        status: 'OPEN'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (alerts.length > 1) {
      console.log(`Found ${alerts.length} open CERTIFICATE_EXPIRY alerts for tenant ${tenant.id}. Keeping the newest one and deleting the rest...`);
      const [newest, ...rest] = alerts;
      
      const idsToDelete = rest.map(a => a.id);
      await prisma.complianceAlert.deleteMany({
        where: { id: { in: idsToDelete } }
      });
      console.log(`Deleted ${idsToDelete.length} duplicates.`);
    }
  }

  console.log('Cleanup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
