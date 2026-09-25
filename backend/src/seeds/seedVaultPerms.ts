import { centralConnection, centralModels } from '../services/tenantConnectionManager';

async function seed() {
  await new Promise(r => setTimeout(r, 1000));
  const newPerms = [
    { code: 'ACCESS_VAULTS', name: 'Access Client Digital Vaults' },
    { code: 'ACCESS_VAULTS_VIEW', name: 'View Only Vaults (No Downloads)' },
    { code: 'ACCESS_VAULTS_FULL', name: 'Full Access Vaults (View & Download)' },
    { code: 'MASK_VAULT_DATA', name: 'Mask Sensitive Data in Vaults' }
  ];

  for (const p of newPerms) {
    const doc = await centralModels.Permission.findOneAndUpdate(
      { code: p.code },
      { $set: p },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('Upserted permission:', doc.code, doc._id);

    const adminRoles = await centralModels.Role.find({ name: { $in: ['SUPER_ADMIN', 'ADMIN'] } });
    for (const r of adminRoles) {
      await centralModels.RolePermission.findOneAndUpdate(
        { roleId: r._id, permissionId: doc._id },
        { $setOnInsert: { roleId: r._id, permissionId: doc._id } },
        { upsert: true }
      );
      console.log('Bound to', r.name);
    }
  }
  console.log('Permissions seeded successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
