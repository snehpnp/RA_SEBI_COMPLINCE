const fs = require('fs');
const lines = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8').split('\n');

// Find where the gstCalculationType check is
const gstCheck = lines.findIndex(l => l.includes("{gstCalculationType === 'EXCLUSIVE' ? ("));
const end = lines.findIndex((l, i) => i > gstCheck && l.includes(") : ("));

const replacement = `                                          {gstCalculationType === 'EXCLUSIVE' ? (
                                            <div className="text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400 leading-tight">
                                              <div>Base: ₹{sub.plan?.price.toLocaleString()}</div>
                                              <div>GST: ₹{Math.round(sub.plan?.price * 0.18).toLocaleString()}</div>
                                              <div className="font-bold text-slate-800 dark:text-slate-200">Total: ₹{Math.round(sub.plan?.price * 1.18).toLocaleString()}</div>
                                            </div>`.split('\n');

lines.splice(gstCheck, end - gstCheck, ...replacement);
fs.writeFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', lines.join('\n'));
console.log('Fixed GST branch');
