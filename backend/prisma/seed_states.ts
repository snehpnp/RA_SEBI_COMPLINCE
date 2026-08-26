import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const states = [
  { name: 'Andaman and Nicobar Islands', gstCode: '35' },
  { name: 'Andhra Pradesh', gstCode: '37' },
  { name: 'Arunachal Pradesh', gstCode: '12' },
  { name: 'Assam', gstCode: '18' },
  { name: 'Bihar', gstCode: '10' },
  { name: 'Chandigarh', gstCode: '04' },
  { name: 'Chhattisgarh', gstCode: '22' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', gstCode: '26' },
  { name: 'Delhi', gstCode: '07' },
  { name: 'Goa', gstCode: '32' },
  { name: 'Gujarat', gstCode: '24' },
  { name: 'Haryana', gstCode: '06' },
  { name: 'Himachal Pradesh', gstCode: '02' },
  { name: 'Jammu and Kashmir', gstCode: '01' },
  { name: 'Jharkhand', gstCode: '20' },
  { name: 'Karnataka', gstCode: '29' },
  { name: 'Kerala', gstCode: '32' },
  { name: 'Ladakh', gstCode: '38' },
  { name: 'Lakshadweep', gstCode: '31' },
  { name: 'Madhya Pradesh', gstCode: '23' },
  { name: 'Maharashtra', gstCode: '27' },
  { name: 'Manipur', gstCode: '14' },
  { name: 'Meghalaya', gstCode: '17' },
  { name: 'Mizoram', gstCode: '15' },
  { name: 'Nagaland', gstCode: '13' },
  { name: 'Odisha', gstCode: '21' },
  { name: 'Puducherry', gstCode: '34' },
  { name: 'Punjab', gstCode: '03' },
  { name: 'Rajasthan', gstCode: '08' },
  { name: 'Sikkim', gstCode: '11' },
  { name: 'Tamil Nadu', gstCode: '33' },
  { name: 'Telangana', gstCode: '36' },
  { name: 'Tripura', gstCode: '16' },
  { name: 'Uttar Pradesh', gstCode: '09' },
  { name: 'Uttarakhand', gstCode: '05' },
  { name: 'West Bengal', gstCode: '19' },
];

async function main() {
 
  for (const state of states) {
    await prisma.state.upsert({
      where: { name: state.name },
      update: { gstCode: state.gstCode },
      create: { name: state.name, gstCode: state.gstCode },
    });
  }
  console.log('States seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
 
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
