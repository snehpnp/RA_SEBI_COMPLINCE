import { calculateCompleteness } from './controllers/adminController';
import prisma from './config/db';

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    const result = await calculateCompleteness(tenant.id);
    console.log(`Tenant ${tenant.companyName} (${tenant.id}):`, JSON.stringify(result, null, 2));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
  });
