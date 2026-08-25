const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'himanshu12345@gmail.com' },
    include: { role: true }
  });
  if (!user) {
    console.log("User himanshu12345@gmail.com not found!");
    return;
  }
  console.log("Logged in user:", user.id, user.role.name, user.tenantId);

  const role = user.role.name;
  const userId = user.id;
  const tenantId = user.tenantId;

  const hasAccess = await prisma.rolePermission.findFirst({
    where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
  });
  console.log("hasAccess:", hasAccess ? "YES" : "NO");

  const hasViewAll = await prisma.rolePermission.findFirst({
    where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
  });
  console.log("hasViewAll:", hasViewAll ? "YES" : "NO");

  const hasViewOwn = await prisma.rolePermission.findFirst({
    where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
  });
  console.log("hasViewOwn:", hasViewOwn ? "YES" : "NO");

  let whereClause = { tenantId };
  if (!hasViewAll && hasViewOwn) {
    whereClause.client = { createdById: userId };
  }
  console.log("whereClause:", JSON.stringify(whereClause));

  const tickets = await prisma.supportTicket.findMany({
    where: whereClause,
    include: {
      client: true
    }
  });
  console.log("tickets found:", tickets.length);
  tickets.forEach(t => console.log(t.id, t.subject, t.status));
}

main().finally(() => prisma.$disconnect());
