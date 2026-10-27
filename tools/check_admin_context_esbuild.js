const fs = require('fs');
const esbuild = require('d:/RA_SEBI_COMPLINCE/frontend_vit/node_modules/esbuild');

const code = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminContext.jsx', 'utf8');

esbuild.transform(code, {
  loader: 'jsx',
  jsx: 'automatic'
}).then(res => {
  console.log('esbuild check passed!');
}).catch(err => {
  console.log('esbuild errors count:', err.errors ? err.errors.length : 1);
  if (err.errors) {
    err.errors.forEach(e => {
      console.log(`${e.location ? e.location.line : '?'}: ${e.text}`);
    });
  }
});
