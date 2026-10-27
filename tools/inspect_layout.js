const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log('--- Lines 6235 to 6245 ---');
for (let i = 6234; i <= 6244; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}

console.log('\n--- Lines 17030 to 17050 ---');
for (let i = 17029; i <= 17049; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}

console.log('\n--- Lines 18065 to 18080 ---');
for (let i = 18064; i < lines.length; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
