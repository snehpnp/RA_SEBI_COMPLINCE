import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.complianceRequirement.findFirst({ where: { serialNo: 12 } });
  console.log('Requirement serialNo 12:', JSON.stringify(req, null, 2));

  const allReqs = await prisma.complianceRequirement.findMany({ select: { id: true, serialNo: true, requirement: true }, orderBy: { serialNo: 'asc' } });
  console.log('All requirements:', JSON.stringify(allReqs, null, 2));

  const tenant = await prisma.tenant.findFirst({ select: { id: true, raType: true, depositAmount: true } });
  console.log('Tenant raType & deposit:', JSON.stringify(tenant, null, 2));

  const openPtAlert = await prisma.complianceAlert.findFirst({ where: { alertType: 'PART_TIME_LIMIT_EXCEEDED', status: 'OPEN' } });
  console.log('Open PART_TIME alert:', JSON.stringify(openPtAlert, null, 2));

  const penalties = await prisma.penalty.findMany({ orderBy: { auditId: 'asc' } });
  console.log('All penalties:', JSON.stringify(penalties, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
