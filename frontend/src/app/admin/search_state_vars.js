const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for compliance state definitions...");
lines.forEach((line, index) => {
  if (line.includes('const [checklist') || line.includes('const [alerts') || line.includes('const [penalties')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
