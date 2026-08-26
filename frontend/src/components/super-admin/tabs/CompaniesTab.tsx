'use client';

import { Search, Plus, Download, Eye, Edit, Trash2, Power, PowerOff, RotateCcw, Key, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface CompaniesTabProps {
  companies: any[];
  filteredCompanies: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  currentPageCompanies: number;
  setCurrentPageCompanies: (val: number | ((prev: number) => number)) => void;
  openViewModal: (id: string) => void;
  openEditModal: (id: string) => void;
  openConfirmModal: (action: string, id: string) => void;
  handleImpersonate: (id: string) => void;
  setIsAddCompanyModalOpen: (val: boolean) => void;
  setFormSuccess: (val: any) => void;
  setFormError: (val: any) => void;
  setNewCreds: (val: any) => void;
}

export default function CompaniesTab({
  companies, filteredCompanies, searchQuery, setSearchQuery, itemsPerPage, setItemsPerPage,
  currentPageCompanies, setCurrentPageCompanies, openViewModal, openEditModal,
  openConfirmModal, handleImpersonate, setIsAddCompanyModalOpen, setFormSuccess,
  setFormError, setNewCreds
}: CompaniesTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-300 dark:border-white/10 shadow-sm gap-4">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
            placeholder="Search by name, SEBI Reg, PAN..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              const exportData = filteredCompanies.map(c => ({
                Company_Name: c.companyName,
                SEBI_Registration: c.sebiRegistrationNo,
                PAN: c.panNumber,
                GST: c.gstNumber || 'N/A',
                Created_At: new Date(c.createdAt).toLocaleString(),
                Status: c.status
              }));
              import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, 'RA_Companies'));
            }}
            className="px-5 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAddCompanyModalOpen(true);
              setFormSuccess(null);
              setFormError(null);
              setNewCreds(null);
            }}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-white hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5" />
            <span>Onboard Company</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-white/10 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">S.No</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>SEBI Registration</TableHead>
              <TableHead>PAN / GST</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.slice((currentPageCompanies - 1) * itemsPerPage, currentPageCompanies * itemsPerPage).map((comp, index) => (
              <TableRow key={comp.id}>
                <TableCell className="text-center text-slate-500 font-mono text-xs">
                  {(currentPageCompanies - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell>
                  <span className="font-bold text-slate-900 dark:text-white block">{comp.companyName}</span>
                  <span className="text-xs text-slate-500">{comp.email}</span>
                </TableCell>
                <TableCell className="font-mono text-slate-600 dark:text-slate-400 text-xs">{comp.sebiRegistration}</TableCell>
                <TableCell>
                  <span className="block font-mono text-xs">{comp.pan}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{comp.gst || 'No GST'}</span>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 text-xs">
                  {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${comp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : comp.status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                    {comp.status}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {comp.status !== 'DELETED' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openViewModal(comp.id)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="View"><Eye className="h-[18px] w-[18px]" /></button>
                      <button onClick={() => openEditModal(comp.id)} className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all" title="Edit"><Edit className="h-[18px] w-[18px]" /></button>
                      {comp.status === 'ACTIVE' ? (
                        <button onClick={() => openConfirmModal('SUSPEND', comp.id)} className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all" title="Suspend"><Power className="h-[18px] w-[18px]" /></button>
                      ) : (
                        <button onClick={() => openConfirmModal('ACTIVATE', comp.id)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all" title="Activate"><PowerOff className="h-[18px] w-[18px]" /></button>
                      )}
                      <button onClick={() => handleImpersonate(comp.id)} className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all" title="Login as Admin"><Key className="h-[18px] w-[18px]" /></button>
                      <button onClick={() => openConfirmModal('DELETE', comp.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Soft Delete"><Trash2 className="h-[18px] w-[18px]" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openConfirmModal('RESTORE', comp.id)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all" title="Restore"><RotateCcw className="h-[18px] w-[18px]" /></button>
                      <button onClick={() => handleImpersonate(comp.id)} className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all" title="Login as Admin"><Key className="h-[18px] w-[18px]" /></button>
                      <button onClick={() => openConfirmModal('PERMANENT_DELETE', comp.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Permanent Delete"><Trash2 className="h-[18px] w-[18px] text-rose-500" /></button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredCompanies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500 bg-slate-100 dark:bg-slate-950/20">No active companies found matching the queries.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filteredCompanies.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-950/30 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Showing {((currentPageCompanies - 1) * itemsPerPage) + 1} to {Math.min(currentPageCompanies * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} entries
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
                  onClick={() => setCurrentPageCompanies(prev => typeof prev === 'number' ? Math.max(prev - 1, 1) : 1)}
                  disabled={currentPageCompanies === 1}
                  className="p-1.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold px-2">
                  Page {currentPageCompanies} of {Math.ceil(filteredCompanies.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPageCompanies(prev => typeof prev === 'number' ? Math.min(prev + 1, Math.ceil(filteredCompanies.length / itemsPerPage)) : 1)}
                  disabled={currentPageCompanies === Math.ceil(filteredCompanies.length / itemsPerPage)}
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
