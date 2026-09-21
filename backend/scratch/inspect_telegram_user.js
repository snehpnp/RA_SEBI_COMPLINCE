const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL + (process.env.DB_NAME || 'sebi-compliance') + '?authSource=admin';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.client.db('sebi-compliance');

  const user = await db.collection('User').findOne({ email: 'telegram@gmail.com' });
  console.log('--- USER ---');
  console.log(user);

  if (user) {
    const client = await db.collection('Client').findOne({ userId: user._id });
    console.log('--- CLIENT ---');
    console.log(client);

    if (client) {
      const profile = await db.collection('ClientProfile').findOne({ clientId: client._id });
      console.log('--- PROFILE ---');
      console.log(profile);

      const docs = await db.collection('ClientDocument').find({ clientId: client._id }).toArray();
      console.log('--- DOCUMENTS ---');
      console.log(docs);

      const agreements = await db.collection('Agreement').find({ clientId: client._id }).toArray();
      console.log('--- AGREEMENTS ---');
      console.log(agreements);

      const consents = await db.collection('Consent').find({ clientId: client._id }).toArray();
      console.log('--- CONSENTS ---');
      console.log(consents);

      const subs = await db.collection('Subscription').find({ clientId: client._id }).toArray();
      console.log('--- SUBSCRIPTIONS ---');
      console.log(subs);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
