const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function cleanMasterUsers() {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db();

    // Find SUPER_ADMIN role ID
    const superAdminRole = await db.collection('Role').findOne({ name: 'SUPER_ADMIN' });
    const superAdminRoleId = superAdminRole ? superAdminRole._id : null;

    // Delete users with tenantId (company admins that belong to company DBs)
    const result = await db.collection('User').deleteMany({
      $or: [
        { tenantId: { $ne: null } },
        ...(superAdminRoleId ? [{ roleId: { $ne: superAdminRoleId } }] : [])
      ]
    });

    console.log('Removed company admin users from Super Admin DB:', result.deletedCount);
    const remainingUsers = await db.collection('User').find({}).project({ email: 1, firstName: 1 }).toArray();
    console.log('Remaining users in Super Admin DB (Only Super Admins):', remainingUsers);
  } finally {
    await client.close();
  }
}

cleanMasterUsers();
