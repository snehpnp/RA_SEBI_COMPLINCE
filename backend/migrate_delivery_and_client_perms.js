require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;

  console.log("Connected to MongoDB.");

  // 1. Ensure permissions exist
  const permDefs = [
    { code: 'ACCESS_DELIVERY_REPORTS', name: 'Access Delivery Reports Desk' },
    { code: 'VIEW_ALL_DELIVERIES', name: 'View Delivery Reports' }
  ];

  for (const pd of permDefs) {
    const existing = await db.collection('Permission').findOne({ code: pd.code });
    if (!existing) {
      const now = new Date();
      await db.collection('Permission').insertOne({
        code: pd.code,
        name: pd.name,
        createdAt: now,
        updatedAt: now
      });
      console.log(`Created permission: ${pd.code}`);
    } else {
      console.log(`Permission already exists: ${pd.code}`);
    }
  }

  const pDelivery = await db.collection('Permission').findOne({ code: 'ACCESS_DELIVERY_REPORTS' });
  const pViewDeliv = await db.collection('Permission').findOne({ code: 'VIEW_ALL_DELIVERIES' });
  const pAccessClients = await db.collection('Permission').findOne({ code: 'ACCESS_CLIENTS' });

  // 2. Add to SUPER_ADMIN and ADMIN
  const adminRoles = await db.collection('Role').find({ name: { $in: ['SUPER_ADMIN', 'ADMIN'] } }).toArray();
  for (const ar of adminRoles) {
    for (const p of [pDelivery, pViewDeliv]) {
      if (!p) continue;
      const hasRp = await db.collection('RolePermission').findOne({ roleId: ar._id, permissionId: p._id });
      if (!hasRp) {
        await db.collection('RolePermission').insertOne({
          roleId: ar._id,
          permissionId: p._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Assigned ${p.code} to ${ar.name}`);
      }
    }
  }

  // 3. For RESEARCHER: Remove ACCESS_CLIENTS and ACCESS_DELIVERY_REPORTS
  const researcherRole = await db.collection('Role').findOne({ name: 'RESEARCHER' });
  if (researcherRole && pAccessClients) {
    const deletedClients = await db.collection('RolePermission').deleteMany({
      roleId: researcherRole._id,
      permissionId: pAccessClients._id
    });
    console.log(`Removed ACCESS_CLIENTS from RESEARCHER: ${deletedClients.deletedCount} records deleted`);
  }
  if (researcherRole && pDelivery) {
    const deletedDeliv = await db.collection('RolePermission').deleteMany({
      roleId: researcherRole._id,
      permissionId: pDelivery._id
    });
    console.log(`Removed ACCESS_DELIVERY_REPORTS from RESEARCHER: ${deletedDeliv.deletedCount} records deleted`);
  }

  // Print updated permissions for all roles
  const roles = await db.collection('Role').find().toArray();
  for (const r of roles) {
    const rps = await db.collection('RolePermission').find({ roleId: r._id }).toArray();
    const permIds = rps.map(rp => rp.permissionId);
    const perms = await db.collection('Permission').find({ _id: { $in: permIds } }).toArray();
    const codes = perms.map(p => p.code).sort();
    console.log(`Role: ${r.name} -> ${codes.length} perms`);
    if (r.name === 'RESEARCHER') {
      console.log(`  RESEARCHER Perms: ${codes.join(', ')}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
