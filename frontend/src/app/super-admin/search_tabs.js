const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/super-admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for tabs...");
lines.forEach((line, index) => {
  if (line.includes('companies') || line.includes('matrix') || line.includes('telemetry')) {
    if (line.includes('onClick') && line.includes('Tab(')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
