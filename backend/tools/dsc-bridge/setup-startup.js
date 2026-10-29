const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appData = process.env.APPDATA;
const startupDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const vbsTarget = path.resolve(__dirname, 'run-silent.vbs');
const workDir = __dirname;
const shortcutPath = path.join(startupDir, 'SEBI-DSC-Bridge.lnk');

// 1. Windows Startup folder shortcut
const vbsScript = `Set ws = CreateObject("WScript.Shell")
Set sc = ws.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
sc.TargetPath = "wscript.exe"
sc.Arguments = """${vbsTarget.replace(/\\/g, '\\\\')}"""
sc.WorkingDirectory = "${workDir.replace(/\\/g, '\\\\')}"
sc.Description = "SEBI Hardware DSC Bridge Background Service"
sc.Save
`;

const tempVbs = path.join(process.env.TEMP, 'make_shortcut.vbs');
fs.writeFileSync(tempVbs, vbsScript, 'utf8');
execSync(`cscript //nologo "${tempVbs}"`);
try { fs.unlinkSync(tempVbs); } catch (e) {}

// 2. Windows Registry Run key
try {
  const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v SEBI_DSC_Bridge /t REG_SZ /d "wscript.exe \\"${vbsTarget}\\"" /f`;
  execSync(regCmd);
} catch (e) {
  console.error('Registry add warning:', e.message);
}

console.log('✅ Auto-Start Successfully Configured:');
console.log('1. Startup Folder Shortcut:', fs.existsSync(shortcutPath));
console.log('2. Registry Key set: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run');
