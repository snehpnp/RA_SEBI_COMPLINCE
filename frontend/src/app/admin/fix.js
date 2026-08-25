const fs = require('fs');
const lines = fs.readFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', 'utf8').split('\n');
const start = lines.findIndex((l, i) => i > 5850 && l.includes('EDIT_PLANS'));
const end = lines.findIndex((l, i) => i > start && l.includes(') : ('));

const replacement = `                              {(!isStaff || hasPermission('EDIT_PLANS')) && (
                                <button onClick={() => handleTogglePlanStatus(plan.id)} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-xl text-xs font-bold transition">
                                  <span>Toggle</span>
                                </button>
                              )}
                              {(!isStaff || hasPermission('DELETE_PLANS')) && (
                                <button onClick={() => handleDeletePlan(plan.id)} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition border border-rose-500/20">
                                  <Trash2 className="h-3 w-3" /> <span>Delete</span>
                                </button>
                              )}
                            </>`.split('\n');

lines.splice(start, end - start, ...replacement);
fs.writeFileSync('c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx', lines.join('\n'));
console.log('Fixed');
