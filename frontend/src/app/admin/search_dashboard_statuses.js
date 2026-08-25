const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for dashboard displays...");
lines.forEach((line, index) => {
  if (line.includes('Upcoming') || line.includes('Overdue') || line.includes('Due Alerts') || line.includes('Penalty Alerts')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
