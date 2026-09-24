import { centralModels, centralConnection } from '../src/services/tenantConnectionManager';

async function main() {
  const u = await centralModels.User.updateMany(
    { status: 'PENDING_APPROVAL' },
    { $set: { status: 'ACTIVE', tempPassword: null } }
  );
  const c = await centralModels.Client.updateMany(
    { status: 'PENDING_APPROVAL' },
    { $set: { status: 'ACTIVE' } }
  );
  console.log(`ACTIVATED: ${u.modifiedCount} users, ${c.modifiedCount} clients`);
  await centralConnection.close();
}

main().catch(console.error);
