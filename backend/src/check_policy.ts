import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = '6a70726d073dc9cc7a24edfe'; // From previous script
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  console.log(`Tenant Internal Policy URL: ${tenant?.internalPolicyUrl}`);

  const openAlerts = await prisma.complianceAlert.findMany({
    where: {
      tenantId,
      alertType: 'MISSING_INTERNAL_POLICY',
      status: 'OPEN'
    }
  });

  console.log(`Open MISSING_INTERNAL_POLICY Alerts: ${openAlerts.length}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
