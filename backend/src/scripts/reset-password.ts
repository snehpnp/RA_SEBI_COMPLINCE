import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin123@gmail.com';
  const newPassword = '12345678';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User with email ${email} not found.`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { email },
    data: { passwordHash }
  });

  console.log(`Successfully updated password for ${email}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
