const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminContext.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('const [closingAlertId,')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
  if (l.includes('const [isComplaintModalOpen,')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
