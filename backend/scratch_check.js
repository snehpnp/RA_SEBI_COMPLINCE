require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;

  const roles = await db.collection('Role').find().toArray();
  for (const r of roles) {
    const rps = await db.collection('RolePermission').find({ roleId: r._id }).toArray();
    const permIds = rps.map(rp => rp.permissionId);
    const perms = await db.collection('Permission').find({ _id: { $in: permIds } }).toArray();
    const codes = perms.map(p => p.code).sort();
    console.log(`\nRole: ${r.name}`);
    console.log(`Permissions (${codes.length}): ${codes.join(', ')}`);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
