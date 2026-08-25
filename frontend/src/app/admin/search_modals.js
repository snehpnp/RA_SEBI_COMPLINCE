const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching state variables for modals...");
lines.forEach((line, index) => {
  if (line.includes('const [') && (line.toLowerCase().includes('modal') || line.toLowerCase().includes('dialog') || line.toLowerCase().includes('show') || line.toLowerCase().includes('active') || line.toLowerCase().includes('selected'))) {
    if (index > 400 && index < 800) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
