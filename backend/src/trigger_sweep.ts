import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { checkComplianceForTenant } from './controllers/complianceController';

async function main() {
  const tenantId = '6a70726d073dc9cc7a24edfe';
  
  // Set internalPolicyUrl to unblock completeness score
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { internalPolicyUrl: '/uploads/policies/dummy.pdf' }
  });
  console.log("Updated internalPolicyUrl to unblock sweep.");

  console.log(`Running compliance sweep for tenant ${tenantId}...`);
  try {
    const alerts = await checkComplianceForTenant(tenantId);
    console.log(`Sweep completed! Generated/updated ${alerts.length} alerts.`);
  } catch (err) {
    console.error("ERROR IN SWEEP:", err);
  }
  
  const openAlerts = await prisma.complianceAlert.findMany({
    where: { tenantId, status: 'OPEN' }
  });
  console.log(`Current OPEN alerts: ${openAlerts.length}`);
  openAlerts.forEach(a => console.log(` - ${a.alertType}: ${a.description}`));
}

main().finally(async () => {
  await prisma.$disconnect();
});
