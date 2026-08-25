const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/super-admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for activeTab state...");
lines.forEach((line, index) => {
  if (line.includes('activeTab') && line.includes('useState')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
