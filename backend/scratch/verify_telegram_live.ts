import { telegramService } from '../src/services/telegramService';

async function verifyLive() {
  const botToken = '8495264463:AAFDKQS1wV_nZQU68HYybxa3JtTrkcqdvyg';
  const chatId = '-5455721319';

  console.log('=== TEST 1: telegramService.getChatInfo ===');
  const chatInfo = await telegramService.getChatInfo({ botToken, chatId });
  console.log('Chat Info Result:', JSON.stringify(chatInfo, null, 2));

  console.log('\n=== TEST 2: telegramService.testConnection ===');
  const testConn = await telegramService.testConnection(botToken, chatId);
  console.log('Test Connection Result:', JSON.stringify(testConn, null, 2));

  console.log('\n=== TEST 3: telegramService.sendSignal ===');
  const signalRes = await telegramService.sendSignal({
    symbol: 'NIFTY',
    action: 'BUY',
    entry: 25000,
    entryType: 'ABOVE',
    target: 25200,
    target2: 25350,
    stopLoss: 24900,
    segment: 'OPTIONS',
    tradeDuration: 'INTRADAY',
    description: 'Breakout above consolidation with high volumes.'
  }, { botToken, chatId });
  console.log('Signal Broadcast Result:', JSON.stringify(signalRes, null, 2));
}

verifyLive().catch(console.error);
