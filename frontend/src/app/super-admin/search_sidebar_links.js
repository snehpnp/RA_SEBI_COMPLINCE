const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/super-admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for activeTab sidebar links...");
lines.forEach((line, index) => {
  if (line.includes('activeTab') && (line.includes('button') || line.includes('nav') || line.includes('span') || line.includes('flex'))) {
    if (line.trim().length < 150) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
