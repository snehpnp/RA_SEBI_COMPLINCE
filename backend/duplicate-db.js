const { MongoClient } = require('mongodb');

async function copyDatabase() {
    // Database connection URI from your .env
    const uri = "mongodb://sebi:Sebi%40123@192.168.1.203:27017/?authSource=sebi-compliance&replicaSet=rs0";
    
    const sourceDbName = "sebi-compliance";
    const targetDbName = "sebi-compliance_1"; // New database name

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log(`Connected to MongoDB.\nCloning from '${sourceDbName}' to '${targetDbName}'...`);
        console.log(`Using server-side aggregation ($out) for maximum performance.`);

        const sourceDb = client.db(sourceDbName);
        const targetDb = client.db(targetDbName);

        // Fetch all collections in the source database
        const collections = await sourceDb.listCollections().toArray();

        for (let coll of collections) {
            const collectionName = coll.name;
            
            // Skip views and system collections
            if (coll.type === 'view' || collectionName.startsWith('system.')) {
                console.log(`Skipping ${coll.type} / system collection: ${collectionName}`);
                continue;
            }

            console.log(`\n--- Cloning collection: ${collectionName} ---`);
            
            // Using $out aggregation pipeline to copy the collection natively on the MongoDB Server
            // This is drastically faster and doesn't load data into the Node.js memory.
            try {
                await sourceDb.collection(collectionName).aggregate([
                    { $match: {} },
                    { $out: { db: targetDbName, coll: collectionName } }
                ]).toArray();
                console.log(`Successfully cloned collection data.`);
            } catch (err) {
                console.error(`Error cloning collection ${collectionName}:`, err.message);
            }

            // Copy indexes from source collection to target collection
            console.log(`Cloning indexes for ${collectionName}...`);
            try {
                const indexes = await sourceDb.collection(collectionName).indexes();
                for (let index of indexes) {
                    // Skip the default _id index as MongoDB creates it automatically
                    if (index.name !== '_id_') {
                        const { v, key, name, ns, ...options } = index;
                        try {
                            await targetDb.collection(collectionName).createIndex(key, options);
                        } catch (idxErr) {
                            console.warn(`Warning: Could not copy index '${name}' for ${collectionName} -> ${idxErr.message}`);
                        }
                    }
                }
            } catch (idxError) {
                console.log(`No indexes to copy for ${collectionName} or collection doesn't exist yet.`);
            }
        }

        console.log("\n✅ Database duplication complete!");
        console.log(`Your new database is ready: ${targetDbName}`);
    } catch (err) {
        console.error("❌ Error duplicating database:", err);
    } finally {
        await client.close();
    }
}

copyDatabase();
