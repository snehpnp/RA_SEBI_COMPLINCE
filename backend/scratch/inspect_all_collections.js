const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL + (process.env.DB_NAME || 'sebi-compliance') + '?authSource=admin';

async function main() {
  await mongoose.connect(uri);

  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();

  for (const dbInfo of dbs.databases) {
    if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
    const db = mongoose.connection.client.db(dbInfo.name);
    const cols = await db.listCollections().toArray();
    console.log(`\nDB: ${dbInfo.name}, collections:`, cols.map(c => c.name));

    for (const col of cols) {
      if (col.name.toLowerCase().includes('user') || col.name.toLowerCase().includes('client')) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  - ${col.name} count:`, count);
        if (count > 0) {
          const sample = await db.collection(col.name).find({}).limit(3).toArray();
          console.log(`    sample emails:`, sample.map(s => s.email || s.username || s.name || s._id));
        }
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
