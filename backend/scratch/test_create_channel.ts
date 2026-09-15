import telegramMtprotoService from '../src/services/telegramMtprotoService';
import dynamicDb from '../src/config/db';

async function testCreate() {
  await new Promise(r => setTimeout(r, 1000));

  const auth = await telegramMtprotoService.getAuthStatus();
  console.log('Auth status:', auth);

  if (!auth.isConnected) {
    console.log('No connected session found');
    process.exit(0);
  }

  console.log('Attempting to create channel via MTProto on account...');
  const res = await telegramMtprotoService.createChannelOnAccount({
    tenantId: auth.phone || 'default',
    title: 'Test Auto Channel 1',
    about: 'Created via SEBI Portal Test',
    isBroadcast: true
  });

  console.log('Create Channel Result:', res);
  process.exit(0);
}

testCreate().catch(console.error);
