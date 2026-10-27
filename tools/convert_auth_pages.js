const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

function transpileAndFix(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) return;
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
  output = output.replace(/from '\.\.\/\.\.\/components/g, "from '@/components");
  output = output.replace(/from '\.\.\/components/g, "from '@/components");
  output = output.replace(/from '\.\.\/\.\.\/contexts/g, "from '@/contexts");
  output = output.replace(/from '\.\.\/contexts/g, "from '@/contexts");

  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(destPath, output, 'utf-8');
  console.log(`Transpiled auth page: ${destPath}`);
}

const authFiles = [
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/login/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/LoginPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/adminlogin/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/AdminLoginPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/superadmin/login/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/SuperAdminLoginPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/client-login/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/ClientLoginPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/client-register/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/ClientRegisterPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/staff-login/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/StaffLoginPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/user-login/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/UserLoginPage.jsx' },
  { src: 'd:/RA_SEBI_COMPLINCE/frontend/src/app/register/page.tsx', dest: 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/auth/RegisterPage.jsx' },
];

for (const f of authFiles) {
  transpileAndFix(f.src, f.dest);
}

console.log('All auth pages converted!');
