import { MongoClient, ObjectId } from 'mongodb';

async function main() {
  const uri = process.env.DATABASE_URL || "mongodb://sebi:Sebi%40123@192.168.1.203:27017/sebi-compliance?authSource=sebi-compliance&replicaSet=rs0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const strId = "6a70726d073dc9cc7a24edfe";

  const users = await db.collection('User').find({
    tenantId: new ObjectId(strId)
  }).toArray();

  console.log("Raw User docs from MongoDB:");
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`  deletedAt: ${u.deletedAt} (type: ${typeof u.deletedAt})`);
    if (u.deletedAt === undefined) console.log("  deletedAt is undefined (missing field)");
    if (u.deletedAt === null) console.log("  deletedAt is explicitly null");
  });

  await client.close();
}

main().catch(console.error);
