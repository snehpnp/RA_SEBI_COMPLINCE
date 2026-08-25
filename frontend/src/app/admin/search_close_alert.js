const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching close/resolve alert modal...");
lines.forEach((line, index) => {
  if (line.includes('closeAlert') || line.includes('resolveAlert') || line.includes('selectedAlert') || line.includes('Resolve Alert') || line.includes('depositAmount')) {
    if (line.includes('function') || line.includes('const ') || line.includes('<div') || line.includes('h3') || line.includes('dialog') || line.includes('modal') || line.includes('Modal')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
