const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/super-admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for edit tenant functions...");
lines.forEach((line, index) => {
  if (line.includes('updateTenant') || line.includes('editTenant') || line.includes('handleEdit') || line.includes('handleUpdateCompany')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
