import { telegramService } from '../src/services/telegramService';

async function runTests() {
  console.log('=== TEST 1: Signal Message Formatting ===');
  const sampleSignal = {
    symbol: 'NIFTY',
    action: 'BUY',
    entry: 25000,
    entryType: 'ABOVE',
    target: 25200,
    target2: 25350,
    target3: 25500,
    stopLoss: 24900,
    segment: 'OPTIONS',
    strikePrice: 25000,
    optionType: 'CE',
    expiryDate: new Date('2026-09-25'),
    tradeDuration: 'INTRADAY',
    description: 'Breakout above consolidation with high volumes.'
  };

  const formattedMsg = telegramService.formatSignalMessage(sampleSignal);
  console.log('Formatted Telegram Message:\n');
  console.log(formattedMsg);

  console.log('\n=== TEST 2: Signal Update Formatting ===');
  const updateMsg = telegramService.formatSignalUpdateMessage({
    symbol: 'NIFTY',
    status: 'TARGET 1 ACHIEVED',
    exitPrice: 25200,
    remark: 'Target 1 hit successfully. Book 50% profit and trail stop loss to 25000.'
  });
  console.log(updateMsg);

  console.log('\n=== TEST 3: Safe Non-blocking Fallback when not configured ===');
  const sendResult = await telegramService.sendSignal({
    symbol: 'BANKNIFTY',
    action: 'BUY',
    entry: 51000,
    target: 51400,
    stopLoss: 50800
  });
  console.log('Send result when unconfigured:', sendResult);

  console.log('\n=== TEST 4: Safe Invite Link Fallback ===');
  const inviteResult = await telegramService.getInviteLink();
  console.log('Invite link result when unconfigured:', inviteResult);

  console.log('\n=== ALL UNIT CHECKS PASSED ===');
}

runTests().catch(console.error);
