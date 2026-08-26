'use client';

import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';




const renderAuditDiff = (oldStr: string | null, newStr: string | null) => {
  if (!oldStr && !newStr) return <span className="text-slate-600 italic">No diff payload</span>;

  let oldObj: any = null;
  let newObj: any = null;

  try { if (oldStr) oldObj = JSON.parse(oldStr); } catch (e) { oldObj = oldStr; }
  try { if (newStr) newObj = JSON.parse(newStr); } catch (e) { newObj = newStr; }

  const isObject = (val: any) => typeof val === 'object' && val !== null;

  if (isObject(oldObj) && isObject(newObj)) {
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    const changes: JSX.Element[] = [];
    allKeys.forEach(k => {
      if (k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'deletedAt' || k === 'tenantId' || k === 'password' || k === 'adminId') return;
      const oldV = oldObj[k];
      const newV = newObj[k];
      if (oldV !== newV) {
        changes.push(
          <div key={k} className="border-b border-slate-300 dark:border-white/5 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
            <span className="text-slate-600 dark:text-slate-400 capitalize text-[10px] block font-bold mb-0.5">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            <div className="flex flex-wrap items-center gap-2">
              {oldV !== undefined && <span className="text-rose-600 dark:text-rose-400/80 line-through bg-rose-500/10 px-1.5 py-0.5 rounded break-all" title={String(oldV)}>{String(oldV) || 'empty'}</span>}
              {oldV !== undefined && newV !== undefined && <span className="text-slate-500 text-[10px]">→</span>}
              {newV !== undefined && <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded break-all" title={String(newV)}>{String(newV) || 'empty'}</span>}
            </div>
          </div>
        );
      }
    });
    return changes.length > 0 ? <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-2">{changes}</div> : <span className="text-slate-500 italic">No visible data changes</span>;
  }

  const renderObj = (obj: any, color: string) => {
    if (!isObject(obj)) return <div className={`${color} break-all`}>{String(obj)}</div>;
    return (
      <div className="space-y-1.5">
        {Object.entries(obj).map(([k, v]) => {
          if (k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'deletedAt' || k === 'tenantId' || k === 'password' || k === 'adminId') return null;
          if (v === null || v === undefined || v === '') return null;
          return (
            <div key={k} className="flex flex-col border-b border-slate-300 dark:border-white/5 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
              <span className="text-slate-600 dark:text-slate-400 capitalize font-bold text-[10px]">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className={`${color} font-medium break-all mt-0.5`} title={String(v)}>{String(v)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
      {oldObj && <div className="bg-rose-500/5 p-2 rounded border border-rose-500/10"><span className="text-rose-600 dark:text-rose-500 font-bold block mb-2 text-[10px] uppercase">Deleted / Old Data</span>{renderObj(oldObj, 'text-rose-600 dark:text-rose-400/80')}</div>}
      {newObj && <div className="bg-emerald-500/5 p-2 rounded border border-emerald-500/10"><span className="text-emerald-600 dark:text-emerald-500 font-bold block mb-2 text-[10px] uppercase">New Data</span>{renderObj(newObj, 'text-emerald-600 dark:text-emerald-400')}</div>}
    </div>
  );
};

interface AuditTabProps {
  auditLogs: any[];
  currentPageLogs: number;
  setCurrentPageLogs: (val: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
}

export default function AuditTab({
  auditLogs, currentPageLogs, setCurrentPageLogs, itemsPerPage, setItemsPerPage
}: AuditTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Audit Trails</h2>
        <button
          onClick={() => {
            const exportData = auditLogs.map(log => ({
              User: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim(),
              Email: log.user?.email,
              Action: log.action,
              Module: log.module,
              IP_Address: log.ipAddress || '127.0.0.1',
              Timestamp: new Date(log.timestamp).toLocaleString()
            }));
            import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, 'Audit_Logs'));
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
              <TableHead>User Context</TableHead>
              <TableHead>Action / Module</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Details Change (Old → New)</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.slice((currentPageLogs - 1) * itemsPerPage, currentPageLogs * itemsPerPage).map((log, index) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-slate-500">{(currentPageLogs - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell>
                  <span className="font-semibold block font-sans text-sm">{log.user?.firstName} {log.user?.lastName}</span>
                  <span className="text-[10px] text-slate-500 block">{log.user?.email}</span>
                </TableCell>
                <TableCell>
                  <span className="text-primary-600 dark:text-primary-400 font-bold block">{log.action}</span>
                  <span className="text-[10px] text-slate-500 block">{log.module}</span>
                </TableCell>
                <TableCell className="text-slate-500">{log.ipAddress || '127.0.0.1'}</TableCell>
                <TableCell className="max-w-md text-[10px] align-top">
                  {renderAuditDiff(log.oldValue, log.newValue)}
                </TableCell>
                <TableCell className="text-slate-500 text-[10px]">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {auditLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 bg-slate-100 dark:bg-slate-950/20">No system events logged in database.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {auditLogs.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-950/30 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-sans">
              Showing {((currentPageLogs - 1) * itemsPerPage) + 1} to {Math.min(currentPageLogs * itemsPerPage, auditLogs.length)} of {auditLogs.length} entries
            </span>
            <div className="flex items-center space-x-6 font-sans">
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
                  onClick={() => setCurrentPageLogs(prev => typeof prev === 'number' ? Math.max(prev - 1, 1) : 1)}
                  disabled={currentPageLogs === 1}
                  className="p-1.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold px-2">
                  Page {currentPageLogs} of {Math.ceil(auditLogs.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPageLogs(prev => typeof prev === 'number' ? Math.min(prev + 1, Math.ceil(auditLogs.length / itemsPerPage)) : 1)}
                  disabled={currentPageLogs === Math.ceil(auditLogs.length / itemsPerPage)}
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
