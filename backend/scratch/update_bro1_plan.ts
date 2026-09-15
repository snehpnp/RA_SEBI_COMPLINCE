import dynamicDb from '../src/config/db';

async function updateBro1() {
  await new Promise(res => setTimeout(res, 1500));

  const plan = await dynamicDb.Plan.findOne({ name: 'BRO1' });
  if (plan) {
    plan.telegramChatId = '-5455721319';
    plan.telegramInviteLink = 'https://t.me/+v_BRO1_Signals';
    await plan.save();
    console.log('Updated BRO1 plan with Telegram Chat ID -5455721319 and invite link!');
  } else {
    console.log('BRO1 plan not found');
  }
  process.exit(0);
}

updateBro1().catch(console.error);
