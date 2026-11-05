const fs = require('fs');

// 1. Update controller
let cPath = 'backend/src/controllers/researcherSignatureController.ts';
let cContent = fs.readFileSync(cPath, 'utf8');
if (!cContent.includes('dscBridgeDownloadExe')) {
  let target = "return res.status(404).json({ success: false, message: 'sebi-dsc-bridge.zip not found on server' });\r\n};";
  let targetLF = "return res.status(404).json({ success: false, message: 'sebi-dsc-bridge.zip not found on server' });\n};";
  let replacement = `

export const dscBridgeDownloadExe = async (req: Request, res: Response) => {
  const candidatePaths = [
    path.resolve(process.cwd(), 'public/downloads/sebi-dsc-bridge-setup.exe'),
    path.resolve(process.cwd(), '../frontend/public/downloads/sebi-dsc-bridge-setup.exe'),
    path.resolve(__dirname, '../../public/downloads/sebi-dsc-bridge-setup.exe'),
    path.resolve(__dirname, '../../../frontend/public/downloads/sebi-dsc-bridge-setup.exe'),
    path.resolve(__dirname, '../../tools/dsc-bridge/sebi-dsc-bridge-setup.exe')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return res.download(p, 'sebi-dsc-bridge-setup.exe');
    }
  }
  return res.status(404).json({ success: false, message: 'sebi-dsc-bridge-setup.exe not found on server' });
};`;
  if (cContent.includes(target)) {
    cContent = cContent.replace(target, target + replacement);
    fs.writeFileSync(cPath, cContent, 'utf8');
    console.log('Updated controller (CRLF)');
  } else if (cContent.includes(targetLF)) {
    cContent = cContent.replace(targetLF, targetLF + replacement);
    fs.writeFileSync(cPath, cContent, 'utf8');
    console.log('Updated controller (LF)');
  } else {
    console.log('Target not found in controller');
  }
}

// 2. Update routes
let rPath = 'backend/src/routes/api.ts';
let rContent = fs.readFileSync(rPath, 'utf8');
if (!rContent.includes('dscBridgeDownloadExe')) {
  rContent = rContent.replace('dscBridgeDownloadZip,', 'dscBridgeDownloadZip,\n  dscBridgeDownloadExe,');
  rContent = rContent.replace("router.get('/dsc-bridge/download', dscBridgeDownloadZip);", "router.get('/dsc-bridge/download', dscBridgeDownloadZip);\nrouter.get('/dsc-bridge/download-setup', dscBridgeDownloadExe);");
  rContent = rContent.replace("router.get('/researcher/dsc/bridge/download', dscBridgeDownloadZip);", "router.get('/researcher/dsc/bridge/download', dscBridgeDownloadZip);\nrouter.get('/researcher/dsc/bridge/download-setup', dscBridgeDownloadExe);");
  fs.writeFileSync(rPath, rContent, 'utf8');
  console.log('Updated routes/api.ts');
}

