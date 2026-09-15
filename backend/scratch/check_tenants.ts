import dynamicDb, { centralModels } from '../src/config/db';

async function checkTenants() {
  await new Promise(r => setTimeout(r, 1000));

  const tenants: any[] = await dynamicDb.Tenant.find().lean();
  console.log('--- Tenants in dynamicDb ---', tenants.length);
  for (const t of tenants) {
    console.log(`Tenant _id: ${t._id} | company: ${t.companyName || t.name} | phone: ${t.telegramPhone} | hasSession: ${Boolean(t.telegramSession)} | defaultChat: ${t.telegramChatId}`);
  }

  process.exit(0);
}

checkTenants().catch(console.error);
