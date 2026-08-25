const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const msgs = await prisma.ticketMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent 5 Ticket Messages:");
  console.dir(msgs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
