import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Compliance Requirements...');
  
  const rulesPath = path.join(__dirname, 'rules.json');
  const rulesData = fs.readFileSync(rulesPath, 'utf8');
  const rules = JSON.parse(rulesData);

  for (const rule of rules) {
    const existing = await prisma.complianceRequirement.findFirst({
      where: { serialNo: rule.serialNo }
    });

    if (existing) {
      await prisma.complianceRequirement.update({
        where: { id: existing.id },
        data: rule
      });
      console.log(`Updated rule Sr No: ${rule.serialNo}`);
    } else {
      await prisma.complianceRequirement.create({
        data: rule
      });
      console.log(`Created rule Sr No: ${rule.serialNo}`);
    }
  }

  console.log('Compliance seeding completed.');
}

main()
  .catch(e => {
    console.error(e);
 
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
