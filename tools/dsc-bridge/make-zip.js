const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine root directory
let rootDir = process.cwd();
if (!fs.existsSync(path.join(rootDir, 'frontend')) && fs.existsSync(path.join(rootDir, '../frontend'))) {
  rootDir = path.resolve(rootDir, '..');
}

const dscDir = path.join(rootDir, 'tools/dsc-bridge');
const backendDscDir = path.join(rootDir, 'backend/tools/dsc-bridge');
const activeDir = fs.existsSync(dscDir) ? dscDir : backendDscDir;

const files = [
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
  const filesList = files.join("','");
  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${filesList}' -DestinationPath '${zipPath}' -Force"`;
  try {
    execSync(psCmd, { stdio: 'inherit' });
    console.log(`Zip created at ${zipPath} (${fs.statSync(zipPath).size} bytes)`);
  } catch (e) {
    console.error(`Failed to create zip at ${zipPath}:`, e.message);
  }
}
