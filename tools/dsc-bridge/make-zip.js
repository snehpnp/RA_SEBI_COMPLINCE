const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let rootDir = process.cwd();
if (!fs.existsSync(path.join(rootDir, 'frontend')) && fs.existsSync(path.join(rootDir, '../frontend'))) {
  rootDir = path.resolve(rootDir, '..');
}

const activeDir = path.join(rootDir, 'tools/dsc-bridge');

const files = [
  path.join(activeDir, 'node_modules'),
  path.join(activeDir, 'server.js'),
  path.join(activeDir, 'package.json'),
  path.join(activeDir, 'start-bridge.bat'),
  path.join(activeDir, 'install-auto-start.bat'),
  path.join(activeDir, 'uninstall-auto-start.bat'),
  path.join(activeDir, 'run-silent.vbs'),
  path.join(activeDir, 'setup-startup.js')
].filter(f => fs.existsSync(f));

const outDirs = [
  path.join(rootDir, 'frontend/public/downloads'),
  path.join(rootDir, 'backend/public/downloads')
];

for (const outDir of outDirs) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, 'sebi-dsc-bridge.zip');
  const filesList = files.map(f => `'${f.replace(/\\/g, '/')}'`).join(',');
  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path ${filesList} -DestinationPath '${zipPath.replace(/\\/g, '/')}' -Force"`;
  try {
    console.log(`Creating zip at: ${zipPath} ...`);
    execSync(psCmd, { stdio: 'inherit' });
    console.log(`Zip successfully created: ${zipPath} (${(fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (e) {
    console.error(`Failed to create zip at ${zipPath}:`, e.message);
  }
}
