const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching in admin/page.tsx...");
lines.forEach((line, index) => {
  if (line.includes('activeTab ===') || line.includes('compliance') || line.includes('alert') || line.includes('checklist')) {
    if (line.includes('activeTab ===') || line.includes('renderCompliance') || line.includes('Compliance Desk')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
