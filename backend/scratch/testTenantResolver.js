const { tenantConnectionManager } = require('../dist/services/tenantConnectionManager');

async function testResolver() {
  const tests = [
    'portal.thinkupresearch.com',
    'https://portal.thinkupresearch.com',
    'https://portal.thinkupresearch.com/login',
    'compliance.pnpuniverse.in',
    '6aa25430d756741fcc355092',
    'thinkupresearch@gmail.com'
  ];

  for (const testId of tests) {
    console.log('\n--- Testing resolution for:', testId);
    try {
      const meta = await tenantConnectionManager.resolveTenantMeta(testId);
      console.log('Resolved Meta:', meta ? {
        id: meta.id,
        companyName: meta.companyName,
        domainUrl: meta.domainUrl,
        dbName: meta.dbName,
        mongoDbUrl: meta.mongoDbUrl
      } : 'NOT FOUND');
    } catch (err) {
      console.error('ERROR resolving:', testId, err);
    }
  }
}

testResolver().then(() => {
  console.log('\nAll resolver tests completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
