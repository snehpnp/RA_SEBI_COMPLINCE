const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL + (process.env.DB_NAME || 'sebi-compliance') + '?authSource=admin';

async function verifyKyc() {
  await mongoose.connect(uri);
  const db = mongoose.connection.client.db('sebi-compliance');

  const email = 'telegram@gmail.com';
  console.log('Verifying KYC for:', email);

  // 1. Find User
  const user = await db.collection('User').findOne({ email });
  if (!user) {
    console.error('User not found for:', email);
    process.exit(1);
  }

  // Update User
  await db.collection('User').updateOne(
    { _id: user._id },
    {
      $set: {
        status: 'ACTIVE',
        isVerified: true,
        updatedAt: new Date()
      }
    }
  );
  console.log('✅ User updated to ACTIVE & Verified:', user._id.toString());

  // 2. Find Client
  const client = await db.collection('Client').findOne({ userId: user._id });
  if (!client) {
    console.error('Client not found for userId:', user._id);
    process.exit(1);
  }

  // Update Client
  await db.collection('Client').updateOne(
    { _id: client._id },
    {
      $set: {
        status: 'ACTIVE',
        kraVerified: true,
        kycStatus: 'VERIFIED',
        riskProfileStatus: 'ACTIVE',
        agreementSigned: true,
        updatedAt: new Date()
      }
    }
  );
  console.log('✅ Client updated: kraVerified=true, status=ACTIVE, kycStatus=VERIFIED');

  // 3. Client Profile
  await db.collection('ClientProfile').updateOne(
    { clientId: client._id },
    {
      $set: {
        riskProfile: 'MODERATE',
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log('✅ ClientProfile updated with riskProfile=MODERATE');

  // 4. Documents (PAN & Aadhaar)
  const existingDocs = await db.collection('ClientDocument').find({ clientId: client._id }).toArray();
  const hasPan = existingDocs.some(d => d.docType === 'PAN');
  const hasAadhaar = existingDocs.some(d => d.docType === 'AADHAAR');

  if (!hasPan) {
    await db.collection('ClientDocument').insertOne({
      clientId: client._id,
      docType: 'PAN',
      fileName: `PAN_${client.pan || 'VERIFIED'}.pdf`,
      fileUrl: '/uploads/documents/pan_verified.pdf',
      status: 'VERIFIED',
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ PAN Document added (VERIFIED)');
  } else {
    await db.collection('ClientDocument').updateMany(
      { clientId: client._id, docType: 'PAN' },
      { $set: { status: 'VERIFIED', updatedAt: new Date() } }
    );
    console.log('✅ Existing PAN Document marked VERIFIED');
  }

  if (!hasAadhaar) {
    await db.collection('ClientDocument').insertOne({
      clientId: client._id,
      docType: 'AADHAAR',
      fileName: `AADHAAR_${client.aadhaar || 'VERIFIED'}.pdf`,
      fileUrl: '/uploads/documents/aadhaar_verified.pdf',
      status: 'VERIFIED',
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Aadhaar Document added (VERIFIED)');
  } else {
    await db.collection('ClientDocument').updateMany(
      { clientId: client._id, docType: 'AADHAAR' },
      { $set: { status: 'VERIFIED', updatedAt: new Date() } }
    );
    console.log('✅ Existing Aadhaar Document marked VERIFIED');
  }

  // 5. Agreement
  const existingAgreements = await db.collection('Agreement').find({ clientId: client._id }).toArray();
  if (existingAgreements.length === 0) {
    const agreementInsert = await db.collection('Agreement').insertOne({
      clientId: client._id,
      agreementUrl: `/uploads/agreements/${client._id.toString()}_signed_agreement.pdf`,
      esignMode: 'AADHAAR_ESIGN',
      status: 'SIGNED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.collection('AgreementHistory').insertOne({
      agreementId: agreementInsert.insertedId,
      action: 'SIGNED',
      performedBy: client.name || 'telegram',
      createdAt: new Date()
    });
    console.log('✅ Signed Advisory Agreement created');
  } else {
    await db.collection('Agreement').updateMany(
      { clientId: client._id },
      { $set: { status: 'SIGNED', updatedAt: new Date() } }
    );
    console.log('✅ Existing Agreements marked SIGNED');
  }

  // 6. Consent
  const existingConsents = await db.collection('Consent').find({ clientId: client._id }).toArray();
  if (existingConsents.length === 0) {
    const consentInsert = await db.collection('Consent').insertOne({
      clientId: client._id,
      tncAccept: true,
      policyAccept: true,
      researchAccept: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.collection('ConsentHistory').insertOne({
      consentId: consentInsert.insertedId,
      action: 'ACCEPTED',
      createdAt: new Date()
    });
    console.log('✅ Consents created & accepted');
  }

  console.log('\n🎉 SUCCESS: telegram@gmail.com account is now FULLY KYC VERIFIED & ACTIVE!');
  process.exit(0);
}

verifyKyc().catch(err => {
  console.error('Error verifying KYC:', err);
  process.exit(1);
});
