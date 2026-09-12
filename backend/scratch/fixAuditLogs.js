const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function fixAuditLogs() {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db();
    const logs = await db.collection('AuditLog').find({}).toArray();
    let fixed = 0;
    for (const l of logs) {
      if (l.userId) {
        let isValid = false;
        try {
          const u = await db.collection('User').findOne({ _id: new ObjectId(l.userId) });
          if (u) isValid = true;
        } catch {}
        if (!isValid) {
          await db.collection('AuditLog').updateOne({ _id: l._id }, { $set: { userId: null } });
          fixed++;
        }
      }
    }
    console.log('Fixed orphaned audit logs count:', fixed);
  } finally {
    await client.close();
  }
}

fixAuditLogs();
