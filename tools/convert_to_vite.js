const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

const srcRoot = 'd:/RA_SEBI_COMPLINCE/frontend/src';
const destRoot = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src';

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function transpileFile(srcFile, destFile) {
  let code = fs.readFileSync(srcFile, 'utf-8');
  
  // Transpile TS -> JS/JSX
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false
    }
  });

  let output = result.outputText;
  // Clean up 'use client'
  output = output.replace(/^['"]use client['"];?\s*/g, '');

  ensureDirSync(path.dirname(destFile));
  fs.writeFileSync(destFile, output, 'utf-8');
  console.log(`Transpiled: ${path.relative(srcRoot, srcFile)} -> ${path.relative(destRoot, destFile)}`);
}

// Convert directories
const mappings = [
  { src: 'contexts', dest: 'contexts', extMap: { '.tsx': '.jsx', '.ts': '.js' } },
  { src: 'hooks', dest: 'hooks', extMap: { '.tsx': '.jsx', '.ts': '.js' } },
  { src: 'data', dest: 'data', extMap: { '.tsx': '.jsx', '.ts': '.js' } },
  { src: 'services', dest: 'services', extMap: { '.tsx': '.jsx', '.ts': '.js' } },
  { src: 'components', dest: 'components', extMap: { '.tsx': '.jsx', '.ts': '.js' } },
];

function processDir(relSrc, relDest, extMap) {
  const fullSrc = path.join(srcRoot, relSrc);
  const fullDest = path.join(destRoot, relDest);
  if (!fs.existsSync(fullSrc)) return;

  const entries = fs.readdirSync(fullSrc, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(fullSrc, entry.name);
    if (entry.isDirectory()) {
      processDir(path.join(relSrc, entry.name), path.join(relDest, entry.name), extMap);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === '.tsx' || ext === '.ts') {
        const baseName = path.basename(entry.name, ext);
        const newExt = extMap[ext] || (ext === '.tsx' ? '.jsx' : '.js');
        const destPath = path.join(fullDest, baseName + newExt);
        transpileFile(srcPath, destPath);
      }
    }
  }
}

for (const m of mappings) {
  processDir(m.src, m.dest, m.extMap);
}

// Convert individual profile and modal pages
const specialFiles = [
  { src: 'app/admin/ActiveClientSummary.tsx', dest: 'components/admin/ActiveClientSummary.jsx' },
  { src: 'app/admin/profile/page.tsx', dest: 'pages/admin/profile/AdminProfilePage.jsx' },
  { src: 'app/admin/staff-profile/page.tsx', dest: 'pages/admin/profile/StaffProfilePage.jsx' },
  { src: 'app/admin/pa-profile/page.tsx', dest: 'pages/admin/profile/PAProfilePage.jsx' },
  { src: 'app/super-admin/profile/page.tsx', dest: 'pages/super-admin/profile/SuperAdminProfilePage.jsx' },
  { src: 'app/client/profile/page.tsx', dest: 'pages/client/profile/ClientProfilePage.jsx' },
  { src: 'app/video-kyc/[sessionId]/VideoKycClient.tsx', dest: 'pages/video-kyc/VideoKycRoomPage.jsx' },
];

for (const sf of specialFiles) {
  const src = path.join(srcRoot, sf.src);
  const dest = path.join(destRoot, sf.dest);
  if (fs.existsSync(src)) {
    transpileFile(src, dest);
  } else {
    console.warn('Special file not found:', src);
  }
}

console.log('Conversion completed successfully!');
