const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const destDir = path.resolve('frontend/public/downloads');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const zipPath = path.join(destDir, 'sebi-dsc-bridge.zip');
const files = [
  path.resolve('tools/dsc-bridge/server.js'),
  path.resolve('tools/dsc-bridge/package.json'),
  path.resolve('tools/dsc-bridge/start-bridge.bat'),
  path.resolve('tools/dsc-bridge/install-auto-start.bat'),
  path.resolve('tools/dsc-bridge/uninstall-auto-start.bat'),
  path.resolve('tools/dsc-bridge/run-silent.vbs'),
  path.resolve('tools/dsc-bridge/setup-startup.js')
].join("','");

const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${files}' -DestinationPath '${zipPath}' -Force"`;
execSync(psCmd, { stdio: 'inherit' });
console.log('Zip file created:', fs.existsSync(zipPath), fs.statSync(zipPath).size, 'bytes');
