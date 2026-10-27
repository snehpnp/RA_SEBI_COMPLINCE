const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 17030; i <= 17042; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

let openDiv = 0;
let openParen = 0;
for (let i = 6238; i <= 17039; i++) {
  const line = lines[i];
  openDiv += (line.match(/<div\b/g) || []).length;
  openDiv -= (line.match(/<\/div>/g) || []).length;
}
console.log('Balance of div between 6239 and 17039:', openDiv);
