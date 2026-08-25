import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants`);
  
  for (const tenant of tenants) {
    const staff = await prisma.staff.findMany({
      where: {
        user: {
          tenantId: tenant.id,
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
    console.log(`\nTenant: ${tenant.id} (${tenant.companyName})`);
    console.log(`Staff count: ${staff.length}`);
    staff.forEach(s => {
       console.log(` - ${s.name} | Role: ${s.user?.role?.name}`);
    });
    
    const coAlerts = await prisma.complianceAlert.findMany({
      where: { tenantId: tenant.id, alertType: 'MISSING_COMPLIANCE_OFFICER' }
    });
    console.log(` CO Alerts: ${coAlerts.map(a => `${a.status} (${a.severity})`).join(', ')}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
