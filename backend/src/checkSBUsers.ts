import prisma from './config/db';

async function main() {
  const users = await prisma.user.findMany({
    where: { tenantId: '3713a35a-dde8-49b2-99e9-42c76cd432a2' },
    include: {
      role: true,
      staff: true
    }
  });
  console.log('Users for SB tenant:', JSON.stringify(users, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
  });
