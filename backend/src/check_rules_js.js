const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.complianceRequirement.count();
  console.log('Total rules in DB:', count);
  const rules = await prisma.complianceRequirement.findMany({
    orderBy: { serialNo: 'asc' }
  });
  rules.forEach(r => {
    console.log(`${r.serialNo}: ${r.requirement} | Freq: ${r.frequency} | Type: ${r.frequencyType} | Penalty: ${r.penaltyAmount}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
