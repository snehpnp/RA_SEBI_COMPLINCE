const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

function transpileAndFix(srcPath, destPath, replacers = []) {
  const code = fs.readFileSync(srcPath, 'utf-8');
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false
    }
  });

  let output = result.outputText.replace(/^['"]use client['"];?\s*/g, '');
  for (const [from, to] of replacers) {
    output = output.replace(from, to);
  }

  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(destPath, output, 'utf-8');
  console.log(`Transpiled and saved: ${destPath}`);
}

// 1. Super Admin Page
transpileAndFix(
  'd:/RA_SEBI_COMPLINCE/frontend/src/app/super-admin/page.tsx',
  'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/super-admin/SuperAdminPage.jsx',
  [
    [/from '\.\.\/\.\.\/components/g, "from '@/components"],
    [/from '\.\.\/\.\.\/services/g, "from '@/services"],
    [/from '\.\.\/\.\.\/utils/g, "from '@/utils"],
    [/from '\.\/profile\/page'/g, "from './profile/SuperAdminProfilePage'"],
  ]
);

// 2. Client Page
transpileAndFix(
  'd:/RA_SEBI_COMPLINCE/frontend/src/app/client/page.tsx',
  'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/client/ClientPage.jsx',
  [
    [/from '\.\.\/\.\.\/components/g, "from '@/components"],
    [/from '\.\.\/\.\.\/services/g, "from '@/services"],
    [/from '\.\.\/\.\.\/utils/g, "from '@/utils"],
    [/from '\.\.\/\.\.\/contexts/g, "from '@/contexts"],
    [/from '\.\/profile\/page'/g, "from './profile/ClientProfilePage'"],
  ]
);

console.log('Super Admin and Client pages converted!');
