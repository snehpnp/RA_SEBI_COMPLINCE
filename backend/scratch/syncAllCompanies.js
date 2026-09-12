const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.DATABASE_URL 

async function syncAllCompanies() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sebi-compliance');
  
  const tenants = await db.collection('Tenant').find({}).toArray();
  for (const t of tenants) {
    const existing = await db.collection('all_companies').findOne({ tenantId: t._id });
    const fullPayload = {
      tenantId: t._id,
      companyName: t.companyName,
      companyType: t.companyType || 'INDIVIDUAL',
      raType: t.raType || 'FULL_TIME',
      sebiRegistration: t.sebiRegistration,
      bseEnrollment: t.bseEnrollment || null,
      email: t.email,
      mobile: t.mobile,
      address: t.address || null,
      pan: t.pan || null,
      gst: t.gst || null,
      website: t.website || null,
      ownerName: t.ownerName || 'Admin User',
      certificateUrl: t.certificateUrl || null,
      certificateValidity: t.certificateValidity || null,
      nismCertificateUrl: t.nismCertificateUrl || null,
      nismValidity: t.nismValidity || null,
      status: t.status || 'ACTIVE',
      depositAmount: t.depositAmount || 0,
      state: t.state || null,
      panelName: t.panelName || (t.companyName + ' Portal'),
      domainUrl: t.domainUrl || null,
      mongoDbUrl: t.mongoDbUrl  + (t.dbName || 'sebi_tenant_' + t._id) + '?authSource=sebi-compliance&replicaSet=rs0',
      dbName: t.dbName || ('sebi_tenant_' + t._id),
      tenantApiKey: t.tenantApiKey || null,
      createdById: t.createdById || null,
      createdAt: t.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    if (existing) {
      await db.collection('all_companies').updateOne({ _id: existing._id }, { $set: fullPayload });
      console.log('Updated all_companies record for:', t.companyName);
    } else {
      await db.collection('all_companies').insertOne(fullPayload);
      console.log('Inserted all_companies record for:', t.companyName);
    }
  }

  const allComps = await db.collection('all_companies').find({}).toArray();
  console.log('Final all_companies count:', allComps.length);
  await client.close();
}

syncAllCompanies().catch(console.error);
