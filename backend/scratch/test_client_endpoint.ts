import axios from 'axios';
import dynamicDb from '../src/config/db';
import jwt from 'jsonwebtoken';

async function testClientEndpoint() {
  await new Promise(res => setTimeout(res, 1500));

  const user: any = await dynamicDb.User.findOne({ email: 'testing@gmail.com' }).lean();
  if (!user) {
    console.log('User testing@gmail.com not found');
    process.exit(1);
  }

  const token = jwt.sign(
    { id: String(user._id || user.id), role: user.role || 'CLIENT', tenantId: String(user.tenantId) },
    process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  try {
    const res = await axios.get('http://127.0.0.1:5000/api/v1/client/telegram/groups', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n--- CLIENT TELEGRAM GROUPS API RESPONSE ---');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('API Error:', err.response?.data || err.message);
  }

  process.exit(0);
}

testClientEndpoint().catch(console.error);
