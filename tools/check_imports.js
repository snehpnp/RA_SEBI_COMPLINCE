const fs = require('fs');
const path = require('path');

const srcDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src';
const allFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.jsx') || full.endsWith('.js')) allFiles.push(full);
  }
}

walk(srcDir);
console.log('Total JS/JSX files in frontend_vit/src:', allFiles.length);

const missingImports = new Set();
const importRegex = /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;

for (const f of allFiles) {
  const code = fs.readFileSync(f, 'utf-8');
  let m;
  while ((m = importRegex.exec(code)) !== null) {
    const specifier = m[1];
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const dir = path.dirname(f);
      const testPath = path.resolve(dir, specifier);
      const exists = fs.existsSync(testPath) ||
                     fs.existsSync(testPath + '.jsx') ||
                     fs.existsSync(testPath + '.js') ||
                     fs.existsSync(path.join(testPath, 'index.jsx')) ||
                     fs.existsSync(path.join(testPath, 'index.js'));
      if (!exists) {
        missingImports.add(specifier + ' (in ' + path.relative(srcDir, f) + ')');
      }
    }
  }
}

console.log('Missing relative imports count:', missingImports.size);
for (const imp of missingImports) {
  console.log(' - ', imp);
}
