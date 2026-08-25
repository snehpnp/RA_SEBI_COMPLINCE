const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/super-admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for raType in super-admin/page.tsx...");
lines.forEach((line, index) => {
  if (line.includes('raType')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
