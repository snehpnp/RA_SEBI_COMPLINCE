const fs = require('fs');
const content = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for loadData in admin/page.tsx...");
lines.forEach((line, index) => {
  if (line.includes('loadData') || line.includes('fetchData')) {
    if (line.includes('const') || line.includes('function') || line.includes('useEffect')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
