const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrate() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(); 
    
    // Check if tenants collection exists
    const collections = await db.listCollections({ name: 'tenants' }).toArray();
    
    if (collections.length === 0) {
      console.log('Collection "tenants" does not exist. Nothing to migrate.');
    } else {
      console.log('Renaming collection "tenants" to "all_companies"...');
      await db.collection('tenants').rename('all_companies', { dropTarget: true });
      console.log('Successfully renamed "tenants" to "all_companies".');
    }

    // Check if AllCompany collection exists (the one we created by mistake previously)
    const allCompanyCollections = await db.listCollections({ name: 'AllCompany' }).toArray();
    if (allCompanyCollections.length > 0) {
      console.log('Found duplicate "AllCompany" collection. Dropping it to avoid confusion...');
      await db.collection('AllCompany').drop();
      console.log('Successfully dropped "AllCompany" collection.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

migrate();
