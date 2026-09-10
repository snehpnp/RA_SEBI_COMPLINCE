import fs from 'fs';
import path from 'path';
import { centralModels } from '../services/tenantConnectionManager';

export async function seedCompliance() {
  console.log('Seeding Compliance Requirements into Central DB...');
  
  const rulesPath = path.join(__dirname, 'rules.json');
  const rulesData = fs.readFileSync(rulesPath, 'utf8');
  const rules = JSON.parse(rulesData);

  for (const rule of rules) {
    await centralModels.ComplianceRequirement.findOneAndUpdate(
      { serialNo: rule.serialNo },
      { $set: rule },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`Synced Compliance Rule Sr No: ${rule.serialNo}`);
  }

  console.log('Compliance requirements seeding completed.');
}

if (require.main === module) {
  seedCompliance()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
