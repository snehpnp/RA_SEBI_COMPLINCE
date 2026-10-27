const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

// 1. Fix AdminLayout.jsx
let layout = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminLayout.jsx', 'utf-8');

// Replace corrupted line 594-601
layout = layout.replace(
  /\{\(isProfileComplete \|\| user\.role !== 'ADMIN' \|\| user\?\.isImpersonated\) && \(\)<\/>\s*<\/?>\s*<\/?>\s*<\/?>\s*<\/?>\s*<\/?>;[\s\S]*?<div className="space-y-8">\s*\{children\}\s*<\/div>\s*<\/div>\s*\)\}/,
  `{(isProfileComplete || user?.role !== 'ADMIN' || user?.isImpersonated) && (
                <div className="space-y-8">
                  {children}
                </div>
              )}`
);

// Replace corrupted line 1365-end
layout = layout.replace(
  /<\/div>\s*<\/div>\);\s*\}\s*div >\s*;\s*div >\s*;[\s\S]*$/,
  `</div>
          </div>
        )}

      </div>
    </div>
  );
}`
);

// Also check if any other syntax at bottom
layout = layout.replace(/<\/div>\);\s*\}\s*<\/div>\s*<\/div>\s*\);\s*\}\s*$/, `</div>
        )}

      </div>
    </div>
  );
}`);

fs.writeFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminLayout.jsx', layout, 'utf-8');

// 2. Fix the 5 self-invoking tabs
const selfTabs = ['AuditLogsTab.jsx', 'ChecklistTab.jsx', 'L2ApprovalsTab.jsx', 'PaymentsTab.jsx', 'RolesTab.jsx'];
const tabsDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/tabs';

selfTabs.forEach(tabFile => {
  const filePath = path.join(tabsDir, tabFile);
  let code = fs.readFileSync(filePath, 'utf-8');

  // Change "(() => {" into "return (() => {"
  code = code.replace(/(\n\s*)\(\(\)\s*=>\s*\{/, '$1return (() => {');
  
  // Ensure closing has only single closing brace for function
  code = code.replace(/\n\}\s*\n\}\s*$/, '\n}\n');

  fs.writeFileSync(filePath, code, 'utf-8');
});

console.log('Fixed AdminLayout and self-invoking tabs!');
