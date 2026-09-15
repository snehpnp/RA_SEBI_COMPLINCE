const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL + (process.env.DB_NAME || 'sebi-compliance') + '?authSource=admin';

async function main() {
  await mongoose.connect(uri);

  const targetDbs = ['sebi-compliance-local', 'sebi-compliance', 'thinkup-compliance'];

  for (const dbName of targetDbs) {
    const db = mongoose.connection.client.db(dbName);
    console.log(`\n================= DB: ${dbName} =================`);

    const users = await db.collection('User').find({}).toArray();
    console.log(`--- USERS in ${dbName} (${users.length}) ---`);
    users.forEach(u => console.log(u._id.toString(), u.email, u.firstName, u.lastName, u.role, u.isVerified, u.status));

    const clients = await db.collection('Client').find({}).toArray();
    console.log(`--- CLIENTS in ${dbName} (${clients.length}) ---`);
    clients.forEach(c => console.log(c._id.toString(), c.email, c.name, 'kycStatus:', c.kycStatus, 'riskProfileStatus:', c.riskProfileStatus, 'tgChatId:', c.telegramChatId, 'tgUsername:', c.telegramUsername));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
