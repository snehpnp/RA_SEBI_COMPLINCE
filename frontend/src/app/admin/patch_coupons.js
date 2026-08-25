const fs = require('fs');
const path = require('path');
const pagePath = path.join(__dirname, 'page.tsx');

let content = fs.readFileSync(pagePath, 'utf8');

// 1. Import Tag from lucide-react if not present
if (!content.includes('Tag,')) {
    content = content.replace(/import {([^}]*)} from 'lucide-react';/, (match, p1) => {
        return `import { Tag, ${p1.trim()} } from 'lucide-react';`;
    });
}

// 2. Import CouponsManager
if (!content.includes('import CouponsManager')) {
    content = content.replace(/export default function AdminDashboard\(\) \{/, 
        `import CouponsManager from '../../components/CouponsManager';\n\nexport default function AdminDashboard() {`
    );
}

// 3. Add Coupons to NAV_CONFIG
if (!content.includes("tab: 'coupons'")) {
    content = content.replace(/const NAV_CONFIG = \[/, 
        `const NAV_CONFIG = [\n  { name: 'Coupons', tab: 'coupons', icon: Tag, accessKey: 'ACCESS_SETTINGS' },`
    );
}

// 4. Render CouponsManager
if (!content.includes("<CouponsManager />")) {
    content = content.replace(/\{activeTab === 'settings' && \(/, 
        `{activeTab === 'coupons' && <CouponsManager />}\n\n        {activeTab === 'settings' && (`
    );
}

// 5. Add State for new settings
if (!content.includes('const [kycFirst')) {
    content = content.replace(/const \[gstCalculationType, setGstCalculationType\] = useState\('EXCLUSIVE'\);/, 
        `const [gstCalculationType, setGstCalculationType] = useState('EXCLUSIVE');
  const [kycFirst, setKycFirst] = useState(true);
  const [welcomeEmailText, setWelcomeEmailText] = useState('');
  const [termsPdf, setTermsPdf] = useState(null);
  const [privacyPdf, setPrivacyPdf] = useState(null);`
    );
}

// 6. Populate state in fetchSettings
if (!content.includes('setKycFirst(res.data.kycFirst')) {
    content = content.replace(/setGstCalculationType\(res\.data\.gstCalculationType \|\| 'EXCLUSIVE'\);/, 
        `setGstCalculationType(res.data.gstCalculationType || 'EXCLUSIVE');
        setKycFirst(res.data.kycFirst !== false); // default true
        setWelcomeEmailText(res.data.welcomeEmailText || '');`
    );
}

// 7. Append to formData in handleSaveSettings
if (!content.includes('formData.append(\'kycFirst\'')) {
    content = content.replace(/formData\.append\('gstCalculationType', gstCalculationType\);/, 
        `formData.append('gstCalculationType', gstCalculationType);
      formData.append('kycFirst', kycFirst);
      formData.append('welcomeEmailText', welcomeEmailText);
      if (termsPdf) formData.append('termsPdf', termsPdf);
      if (privacyPdf) formData.append('privacyPdf', privacyPdf);`
    );
}

// 8. Add Settings UI blocks
const settingsUiBlock = `
                <div className="mt-6 border-t border-slate-400 dark:border-white/10 pt-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Onboarding Flow & PDFs</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" checked={kycFirst} onChange={e => setKycFirst(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Require KYC before Payment</span>
                      </label>
                      <p className="text-xs text-slate-500 ml-8 mt-1">If unchecked, users will pay first and then do KYC.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Welcome Email Custom Text</label>
                      <textarea value={welcomeEmailText} onChange={e => setWelcomeEmailText(e.target.value)} rows={3} placeholder="Add custom text to the welcome email..." className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 outline-none transition" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Terms & Conditions PDF</label>
                        <input type="file" accept="application/pdf" onChange={e => setTermsPdf(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                        <p className="text-xs text-slate-500 mt-1">Sent automatically with Welcome Email.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Privacy Policy PDF</label>
                        <input type="file" accept="application/pdf" onChange={e => setPrivacyPdf(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                        <p className="text-xs text-slate-500 mt-1">Sent automatically with Welcome Email.</p>
                      </div>
                    </div>
                  </div>
                </div>
`;

if (!content.includes('Require KYC before Payment')) {
    content = content.replace(/<\/div>\s*<h2 className="text-2xl font-bold mb-6 mt-8">📧 Email & SMTP Configuration<\/h2>/, 
        `${settingsUiBlock}\n              </div>\n\n              <h2 className="text-2xl font-bold mb-6 mt-8">📧 Email & SMTP Configuration</h2>`
    );
}

fs.writeFileSync(pagePath, content);
console.log('Admin page patched successfully.');
