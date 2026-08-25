const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching compliance state variables...");
lines.forEach((line, index) => {
  if (line.includes('const [') && (line.toLowerCase().includes('alert') || line.toLowerCase().includes('penalty') || line.toLowerCase().includes('audit') || line.toLowerCase().includes('close') || line.toLowerCase().includes('resolve'))) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
