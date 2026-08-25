const fs = require('fs');
const lines = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8').split('\n');

const start = lines.findIndex(l => l.includes('PLAN MANAGEMENT TAB')) - 1; // get the {/* comment as well
const secondStart = lines.findIndex((l, i) => i > start + 2 && l.includes('PLAN MANAGEMENT TAB')) - 1;

console.log('Removing lines', start, 'to', secondStart - 1);
lines.splice(start, secondStart - start);
fs.writeFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', lines.join('\n'));
console.log('Done');
