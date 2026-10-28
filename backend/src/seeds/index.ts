import 'dotenv/config';
import { seedInitial } from './seedInitial';
import { seedCompliance } from './seedCompliance';
import { seedStates } from './seedStates';
import { centralConnection } from '../services/tenantConnectionManager';

export async function runAllSeeds() {
  console.log('--- Starting Complete Mongoose Database Seeding ---');
  try {
    await seedInitial();
    await seedCompliance();
    await seedStates();
    console.log('--- All Seeders Completed Successfully ---');
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
}

if (require.main === module) {
  runAllSeeds()
    .then(async () => {
      await centralConnection.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await centralConnection.close();
      process.exit(1);
    });
}
