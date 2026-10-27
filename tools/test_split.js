const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

const topLines = lines.slice(5535, 6240);
// 6240 was '<div className="space-y-8">'

const bottomLines = lines.slice(17036, 18077);
// 17036 was '</div>'

console.log('Last 3 of topLines:');
topLines.slice(-3).forEach(l => console.log(l));

console.log('\nFirst 5 of bottomLines:');
bottomLines.slice(0, 5).forEach(l => console.log(l));
