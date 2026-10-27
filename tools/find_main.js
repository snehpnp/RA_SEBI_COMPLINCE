const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('<main')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
