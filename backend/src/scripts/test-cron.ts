import prisma from '../config/db';
import { checkComplianceForTenant } from '../controllers/complianceController';
import { getAlertThresholdsForFrequency } from '../utils/complianceDateHelper';

async function testCron() {
  console.log('Testing Cron Logic...');
  const tenants = await prisma.tenant.findMany();
  
  if (tenants.length === 0) {
    console.log('No tenants found.');
    return;
  }
  const tenantId = tenants[0].id;
  
  console.log(`Running sweep for tenant ${tenantId}...`);
  await checkComplianceForTenant(tenantId);
  
  console.log('Sweep complete. Checking pending audits...');
  const pendingAudits = await prisma.complianceAudit.findMany({
    where: { status: 'PENDING', dueDate: { not: null } },
    include: { requirement: true }
  });
  
  console.log(`Found ${pendingAudits.length} pending audits with due dates.`);
  const now = new Date();
  
  for (const audit of pendingAudits) {
    const timeDiff = audit.dueDate!.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const thresholds = getAlertThresholdsForFrequency(audit.requirement.frequency);
    
    let severity = 'NONE';
    if (daysRemaining <= thresholds.high) severity = 'HIGH';
    else if (daysRemaining <= thresholds.moderate) severity = 'MODERATE';
    else if (daysRemaining <= thresholds.low) severity = 'LOW';
    
    console.log(`- Rule ${audit.requirement.serialNo} (${audit.requirement.frequency}): Due in ${daysRemaining} days. Thresholds: L=${thresholds.low}, M=${thresholds.moderate}, H=${thresholds.high}. Action: ${severity}`);
  }
  console.log('Done.');
}

testCron().then(() => prisma.$disconnect());
