import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, createdById: true }
  });
  const userIds = clients.map(c => c.createdById).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { role: true }
  });

  console.log('Clients count:', clients.length);
  console.log('Clients:', clients);
  console.log('Creators list:', users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, roleName: u.role?.name })));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
