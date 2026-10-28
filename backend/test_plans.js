const mongoose = require('mongoose');
const { centralConnection, centralModels } = require('./dist/services/tenantConnectionManager');

async function getRelatedTenantIds(tenantId, userId) {
  const ids = new Set();
  if (tenantId) ids.add(String(tenantId));

  const allTenants = await centralModels.Tenant.find({
    deletedAt: null
  }).lean();

  const allCompanies = await centralModels.AllCompany.find({
    deletedAt: null
  }).lean();

  let currentCompany = allCompanies.find(c => String(c._id) === String(tenantId) || String(c.tenantId) === String(tenantId));
  let currentTenant = allTenants.find(t => String(t._id) === String(tenantId) || String(t.tenantId) === String(tenantId));

  if (currentCompany) {
    ids.add(String(currentCompany._id));
    if (currentCompany.tenantId) ids.add(String(currentCompany.tenantId));
    allTenants.filter(t => t.companyName && t.companyName.toLowerCase() === currentCompany.companyName.toLowerCase()).forEach(t => ids.add(String(t._id)));
  }

  if (currentTenant) {
    ids.add(String(currentTenant._id));
    if (currentTenant.tenantId) ids.add(String(currentTenant.tenantId));
    allCompanies.filter(c => c.companyName && c.companyName.toLowerCase() === currentTenant.companyName.toLowerCase()).forEach(c => ids.add(String(c._id)));
  }

  // Include all tenants/companies in single-tenant/local setup so plans created by admin are always available
  allTenants.forEach(t => ids.add(String(t._id)));
  allCompanies.forEach(c => ids.add(String(c._id)));

  return Array.from(ids).map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
}

async function test() {
  await new Promise(resolve => {
    if (centralConnection.readyState === 1) return resolve();
    centralConnection.once('open', resolve);
  });

  const idsForClient = await getRelatedTenantIds('6aa27d24f38736cfc423c796');
  console.log('Related IDs for client testing@gmail.com:', idsForClient);

  const plans = await centralModels.Plan.find({
    tenantId: { $in: idsForClient },
    deletedAt: null,
    status: 'ACTIVE'
  }).lean();

  console.log('Total Plans found for client:', plans.length);
  console.log(plans.map(p => ({ name: p.name, price: p.price, tenantId: p.tenantId })));

  process.exit(0);
}
test();
