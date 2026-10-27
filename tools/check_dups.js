const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminContext.jsx', 'utf8');
const lines = content.split('\n');

const earlierCode = lines.slice(0, 5205).join('\n');
const dupLines = lines.slice(5206, 5231);

dupLines.forEach(l => {
  const match = l.match(/const\s+\[([a-zA-Z0-9_]+),/);
  if (match) {
    const varName = match[1];
    const exists = earlierCode.includes(`const [${varName},`) || earlierCode.includes(`const ${varName} `);
    console.log(`${varName}: already declared = ${exists}`);
  }
});
