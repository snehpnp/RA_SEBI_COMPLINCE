const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/super-admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching in super-admin/page.tsx...");
lines.forEach((line, index) => {
  if (line.includes('activeTab ===') || line.includes('render') || line.includes('Compliance') || line.includes('tab ===') || line.includes('setTab')) {
    if (line.includes('activeTab ===') || line.includes('tab ===') || line.includes('h2') || line.includes('Sidebar') || line.includes('Tab ===') || line.includes('button')) {
      if (line.trim().length < 150) {
        console.log(`${index + 1}: ${line.trim()}`);
      }
    }
  }
});
