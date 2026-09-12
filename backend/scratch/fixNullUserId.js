const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function fixNullUserId() {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db();
    const superAdmin = await db.collection('User').findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) {
      console.error('Super Admin user not found');
      return;
    }

    const res = await db.collection('AuditLog').updateMany(
      { $or: [{ userId: null }, { userId: { $exists: false } }] },
      { $set: { userId: superAdmin._id.toString() } }
    );
    console.log('Updated null userId audit logs to super admin ID:', res.modifiedCount);
  } finally {
    await client.close();
  }
}

fixNullUserId();
