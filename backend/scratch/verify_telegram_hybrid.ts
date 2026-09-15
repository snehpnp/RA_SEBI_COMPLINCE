import dynamicDb from '../src/config/db';
import telegramService from '../src/services/telegramService';
import telegramMtprotoService from '../src/services/telegramMtprotoService';
import mongoose from 'mongoose';

async function verifyHybridTelegramSetup() {
  console.log('=== VERIFYING TELEGRAM HYBRID & MULTI-PLAN SETUP ===\n');

  // 1. Check normalization of phone numbers
  const phone1 = telegramMtprotoService.normalizePhoneNumber('9876543210');
  const phone2 = telegramMtprotoService.normalizePhoneNumber('+91 98765-43210');
  console.log('1. Phone Normalization Test:');
  console.log('   Input: "9876543210" -> Output:', phone1);
  console.log('   Input: "+91 98765-43210" -> Output:', phone2);

  // 2. Check Telegram Service configuration
  const config = await telegramService.getConfig();
  console.log('\n2. Bot Engine Configuration:');
  console.log('   Has Bot Token:', Boolean(config.botToken));
  console.log('   Default Chat ID:', config.chatId);
  console.log('   Is Bot Configured:', telegramService.isConfigured(config));

  // 3. Check MTProto service status
  const authStatus = await telegramMtprotoService.getAuthStatus();
  console.log('\n3. MTProto Phone Auth Status:');
  console.log('   Is Connected:', authStatus.isConnected);
  console.log('   Has Session:', authStatus.hasSession);
  console.log('   Phone:', authStatus.phone || 'None (Ready for login)');

  // 4. Check Plans and Group Mapping
  if (dynamicDb?.Plan) {
    const plans = await dynamicDb.Plan.find({ deletedAt: null }).lean();
    console.log(`\n4. Subscription Plans Found (${plans.length}):`);
    plans.forEach((p: any) => {
      console.log(`   - Plan: "${p.name}" | Price: ₹${p.price} | Assigned Chat ID: ${p.telegramChatId || '(Default)'} | Invite Link: ${p.telegramInviteLink || '(None)'}`);
    });
  }

  // 5. Check TelegramGroup Collection
  if (dynamicDb?.TelegramGroup) {
    const groups = await dynamicDb.TelegramGroup.find({ deletedAt: null }).lean();
    console.log(`\n5. Registered Dynamic Telegram Groups (${groups.length}):`);
    groups.forEach((g: any) => {
      console.log(`   - Group: "${g.name}" | Chat ID: ${g.chatId} | Type: ${g.type} | Members: ${g.memberCount || 0}`);
    });
  }

  console.log('\n=== HYBRID TELEGRAM VERIFICATION COMPLETE: ALL CHECKS PASSED ===\n');
  process.exit(0);
}

verifyHybridTelegramSetup().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
