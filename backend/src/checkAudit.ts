import prisma from './config/db';

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20
  });
  console.log('Recent Audit Logs:', JSON.stringify(logs, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
