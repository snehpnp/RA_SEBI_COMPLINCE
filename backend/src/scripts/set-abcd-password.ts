import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'abcd@gmail.com';
  const newPassword = '12345678';

  let user = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } },
    include: { role: true }
  });

  if (!user) {
    console.log(`User ${targetEmail} not found in database!`);
    const existing = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, role: { select: { name: true } } },
      take: 20
    });
    console.log('Existing users in DB:', JSON.stringify(existing, null, 2));
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  console.log(`SUCCESS: Password for ${user.email} (Role: ${user.role.name}) has been set to "${newPassword}"`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
