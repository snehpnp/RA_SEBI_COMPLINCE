import prisma from './config/db';

async function main() {
  const staff = await prisma.staff.findMany({
    include: {
      user: {
        include: { role: true }
      }
    }
  });
  console.log('Staff details:', JSON.stringify(staff, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
