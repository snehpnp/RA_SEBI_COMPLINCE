const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL + (process.env.DB_NAME || 'sebi-compliance') + '?authSource=admin';

async function main() {
  await mongoose.connect(uri);

  const targetDbs = ['sebi-compliance', 'sebi-compliance-local', 'thinkup-compliance'];

  for (const dbName of targetDbs) {
    const db = mongoose.connection.client.db(dbName);
    console.log(`\n================= DB: ${dbName} =================`);
    
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log('--- RECENT USERS ---');
    users.forEach(u => console.log(u._id, u.email, u.role, u.isVerified, u.status));

    const clients = await db.collection('clients').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log('--- RECENT CLIENTS ---');
    clients.forEach(c => console.log(c._id, c.email, c.name, c.kycStatus, c.riskProfileStatus, c.telegramChatId, c.telegramUsername));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
