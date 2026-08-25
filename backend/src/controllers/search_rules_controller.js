const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/backend/src/controllers/superAdminController.ts', 'utf8');
const lines = content.split('\n');

console.log("Searching for getComplianceRules...");
lines.forEach((line, index) => {
  if (line.includes('getComplianceRules') || line.includes('updateComplianceRule')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
