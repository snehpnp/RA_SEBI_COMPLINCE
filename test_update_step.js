const mongoose = require('./backend/node_modules/mongoose');
require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { dynamicDb } = require('./backend/dist/config/db');

async function test() {
  await mongoose.connect(process.env.DATABASE_URL);
  const tenantId = '6aa52df51dff9283d4e0af37';
  const oldTenant = await dynamicDb.Tenant.findById(tenantId).lean();
  console.log('Old tenant gstEnabled:', oldTenant?.gstEnabled);
  const updated = await dynamicDb.Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { gstEnabled: false } },
    { returnDocument: 'after', lean: true, new: true }
  );
  console.log('Updated tenant gstEnabled:', updated?.gstEnabled);
  process.exit(0);
}
test().catch(console.error);
