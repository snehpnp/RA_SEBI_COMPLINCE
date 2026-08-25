import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.complianceRequirement.count();
  console.log('Total rules in DB:', count);
  const rules = await prisma.complianceRequirement.findMany();
  console.log(rules);
}

check().then(() => prisma.$disconnect());
