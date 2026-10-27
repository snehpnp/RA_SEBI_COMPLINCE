const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 17030; i <= 17045; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
