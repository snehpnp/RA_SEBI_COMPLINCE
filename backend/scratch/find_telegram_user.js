const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL + (process.env.DB_NAME || 'sebi-compliance') + '?authSource=admin';

async function main() {
  await mongoose.connect(uri);
  const email = 'telegram@gmail.com';
  console.log('Searching for:', email);

  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('All DBs:', dbs.databases.map(d => d.name));

  for (const dbInfo of dbs.databases) {
    if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
    const db = mongoose.connection.client.db(dbInfo.name);

    const users = await db.collection('users').find({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).toArray();
    const clients = await db.collection('clients').find({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).toArray();

    if (users.length > 0 || clients.length > 0) {
      console.log(`\n=== Database: ${dbInfo.name} ===`);
      console.log('Users:', JSON.stringify(users, null, 2));
      console.log('Clients:', JSON.stringify(clients, null, 2));

      // Also check client profiles and documents
      if (clients.length > 0) {
        const clientIds = clients.map(c => c._id);
        const profiles = await db.collection('clientprofiles').find({ clientId: { $in: clientIds } }).toArray();
        const documents = await db.collection('clientdocuments').find({ clientId: { $in: clientIds } }).toArray();
        console.log('Client Profiles:', JSON.stringify(profiles, null, 2));
        console.log('Client Documents:', JSON.stringify(documents, null, 2));
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
