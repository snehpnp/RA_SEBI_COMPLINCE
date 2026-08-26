'use client';

import { Download, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface MatrixTabProps {
  complianceRules: any[];
  currentPageMatrix: number;
  setCurrentPageMatrix: (val: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  handleToggleRuleActive: (rule: any) => void;
  setEditRuleData: (rule: any) => void;
  setIsEditRuleModalOpen: (val: boolean) => void;
}

export default function MatrixTab({
  complianceRules, currentPageMatrix, setCurrentPageMatrix, itemsPerPage, setItemsPerPage,
  handleToggleRuleActive, setEditRuleData, setIsEditRuleModalOpen
}: MatrixTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Compliance Matrix Rules</h2>
        <button
          onClick={() => {
            const exportData = complianceRules.map(r => ({
              Sr_No: r.serialNo,
              Requirement: r.requirement,
              Frequency: r.frequency,
              Severity: r.severityLevel,
              Penalty: r.penaltyAmount || 'None',
              Status: r.isActive ? 'ACTIVE' : 'INACTIVE'
            }));
            import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, 'Compliance_Matrix'));
          }}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-sm font-bold rounded-xl transition-all flex items-center space-x-2 text-white"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">S.No</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Penalty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complianceRules.slice((currentPageMatrix - 1) * itemsPerPage, currentPageMatrix * itemsPerPage).map((rule, index) => (
              <TableRow key={rule.id}>
                <TableCell className="font-mono text-slate-500">{(currentPageMatrix - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell className="text-slate-900 dark:text-white max-w-sm font-bold">{rule.requirement}</TableCell>
                <TableCell>{rule.frequency}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${rule.severityLevel === 'HIGH' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : rule.severityLevel === 'MODERATE' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>
                    {rule.severityLevel}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={rule.penaltyAmount || 'N/A'}>{rule.penaltyAmount || 'None'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${rule.isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'}`}>
                    {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </TableCell>
                <TableCell className="text-right flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleToggleRuleActive(rule)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all border ${rule.isActive ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'}`}
                    title={rule.isActive ? 'Mark Inactive' : 'Mark Active'}
                  >
                    {rule.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => {
                      setEditRuleData(rule);
                      setIsEditRuleModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:text-primary-400 hover:bg-primary-400/10 rounded transition"
                    title="Edit Rule"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {complianceRules.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500 bg-slate-100 dark:bg-slate-950/20">No compliance rules found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {complianceRules.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-950/30 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Showing {((currentPageMatrix - 1) * itemsPerPage) + 1} to {Math.min(currentPageMatrix * itemsPerPage, complianceRules.length)} of {complianceRules.length} entries
            </span>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 rounded px-2 py-1 outline-none focus:border-primary-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPageMatrix(prev => typeof prev === 'number' ? Math.max(prev - 1, 1) : 1)}
                  disabled={currentPageMatrix === 1}
                  className="p-1.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold px-2">
                  Page {currentPageMatrix} of {Math.ceil(complianceRules.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPageMatrix(prev => typeof prev === 'number' ? Math.min(prev + 1, Math.ceil(complianceRules.length / itemsPerPage)) : 1)}
                  disabled={currentPageMatrix === Math.ceil(complianceRules.length / itemsPerPage)}
                  className="p-1.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
