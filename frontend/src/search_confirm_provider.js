const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchFile(filePath, fileName);
    } else if (file === fileName) {
      console.log("Found file at:", filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(content.substring(0, 1000));
    }
  }
}

searchFile('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src', 'GlobalConfirmProvider.tsx');
