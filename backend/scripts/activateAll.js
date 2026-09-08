const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.updateMany({
    where: { status: 'PENDING_APPROVAL' },
    data: { status: 'ACTIVE', tempPassword: null }
  });
  const c = await prisma.client.updateMany({
    where: { status: 'PENDING_APPROVAL' },
    data: { status: 'ACTIVE' }
  });
  console.log(`ACTIVATED: ${u.count} users, ${c.count} clients`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
