import mongoose from 'mongoose';
import dynamicDb from '../src/config/db';
import telegramService from '../src/services/telegramService';

async function verifyClientTelegram() {
  await new Promise(res => setTimeout(res, 1500));

  console.log('--- 1. Fetching all plans with Telegram settings ---');
  const plans = await dynamicDb.Plan.find({ deletedAt: null }).lean();
  console.log('Plans found:', plans.map((p: any) => ({
    id: p._id,
    name: p.name,
    price: p.price,
    telegramChatId: p.telegramChatId,
    telegramInviteLink: p.telegramInviteLink
  })));

  console.log('\n--- 2. Fetching client subscriptions for testing user ---');
  const user = await dynamicDb.User.findOne({ $or: [{ email: /testing/i }, { firstName: /testing/i }] }).lean();
  console.log('User:', user ? { id: user._id, email: user.email, name: `${user.firstName} ${user.lastName}` } : 'Not found');

  if (user) {
    const client = await dynamicDb.Client.findOne({ userId: user._id }).lean();
    const clientId = client?._id || user._id;

    const subs = await dynamicDb.Subscription.find({
      $or: [{ clientId }, { clientId: user._id }]
    }).populate('planId').lean();

    console.log('Subscriptions for testing client:', subs.map((s: any) => ({
      id: s._id,
      status: s.status,
      plan: s.planId ? { name: s.planId.name, telegramChatId: s.planId.telegramChatId } : null
    })));
  }

  process.exit(0);
}

verifyClientTelegram().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
