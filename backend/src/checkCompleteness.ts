import { calculateCompleteness } from './controllers/adminController';

async function main() {
  const result = await calculateCompleteness('329572f7-5e7b-439b-bca6-345791e2f2f3');
  console.log('Completeness Details:', JSON.stringify(result, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
  });
