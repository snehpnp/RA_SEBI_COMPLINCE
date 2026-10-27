const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

const srcDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src';

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getAllFiles(srcDir);
console.log('Total files to check:', files.length);

let totalErrors = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const isJsx = file.endsWith('.jsx');
  const sf = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    isJsx ? ts.ScriptKind.JSX : ts.ScriptKind.JS
  );

  if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) {
    console.log(`\n[ERROR in ${path.relative(srcDir, file)}]: ${sf.parseDiagnostics.length} errors`);
    sf.parseDiagnostics.forEach(d => {
      const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
      console.log(`  Line ${line + 1}:${character + 1} - ${d.messageText}`);
    });
    totalErrors += sf.parseDiagnostics.length;
  }
});

console.log(`\nSyntax verification finished. Total parse errors: ${totalErrors}`);
