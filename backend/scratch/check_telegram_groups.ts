import dynamicDb from '../src/config/db';
import telegramService from '../src/services/telegramService';
import axios from 'axios';

async function checkGroups() {
  await new Promise(r => setTimeout(r, 1000));

  const config = await telegramService.getConfig();
  console.log('--- Telegram Bot Config ---');
  console.log('Bot Token:', config.botToken ? `${config.botToken.slice(0, 10)}...` : 'NONE');
  console.log('Default Chat ID:', config.chatId);

  // Check bot info
  if (config.botToken) {
    try {
      const botRes = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`);
      console.log('Bot @getMe:', botRes.data?.result?.username, 'id:', botRes.data?.result?.id);
    } catch (e: any) {
      console.log('Bot @getMe error:', e.response?.data || e.message);
    }
  }

  // Check groups in DB
  const groups = await dynamicDb.TelegramGroup.find({ deletedAt: null }).lean();
  console.log('--- DB Telegram Groups ---', groups.length);
  for (const g of groups) {
    console.log(`ID: ${g._id} | Name: "${g.name}" | ChatID: "${g.chatId}" | Type: ${g.type} | Link: ${g.inviteLink}`);

    if (config.botToken && g.chatId) {
      try {
        const testRes = await axios.post(`https://api.telegram.org/bot${config.botToken}/getChat`, { chat_id: g.chatId });
        console.log(`  -> getChat OK:`, testRes.data?.result?.title || testRes.data?.result?.username);
      } catch (err: any) {
        console.log(`  -> getChat FAILED:`, err.response?.data?.description || err.message);
      }
    }
  }

  process.exit(0);
}

checkGroups().catch(console.error);
