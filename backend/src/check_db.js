const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- Roles ---");
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  roles.forEach(r => {
    console.log(`Role: ${r.name} (${r.description})`);
    console.log("Permissions:", r.permissions.map(p => p.permission.code).join(", "));
  });

  console.log("\n--- Users ---");
  const users = await prisma.user.findMany({
    include: { role: true }
  });
  users.forEach(u => {
    console.log(`User: ${u.firstName} ${u.lastName} | Email: ${u.email} | Role: ${u.role?.name} | TenantId: ${u.tenantId}`);
  });

  console.log("\n--- Clients ---");
  const clients = await prisma.client.findMany();
  clients.forEach(c => {
    console.log(`Client: ${c.name} | Email: ${c.email} | CreatedById: ${c.createdById}`);
  });

  console.log("\n--- Support Tickets ---");
  const tickets = await prisma.supportTicket.findMany({
    include: { client: true }
  });
  console.log(`Total Tickets: ${tickets.length}`);
  tickets.forEach(t => {
    console.log(`Ticket: ${t.subject} | Status: ${t.status} | TenantId: ${t.tenantId} | ClientName: ${t.client?.name} | ClientCreatedById: ${t.client?.createdById}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
