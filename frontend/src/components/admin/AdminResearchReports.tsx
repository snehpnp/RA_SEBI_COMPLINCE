'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import api from '../../services/api';
import DataTable from 'react-data-table-component';

const tableCustomStyles = {
  table: {
    style: {
      backgroundColor: 'transparent',
    },
  },
  headRow: {
    style: {
      backgroundColor: 'rgba(241, 245, 249, 0.5)',
      borderBottomColor: 'rgba(203, 213, 225, 0.5)',
      minHeight: '44px',
    },
  },
  headCells: {
    style: {
      fontSize: '10px',
      fontWeight: '800',
      textTransform: 'uppercase',
      color: '#475569',
      paddingLeft: '16px',
      paddingRight: '16px',
    },
  },
  cells: {
    style: {
      paddingLeft: '16px',
      paddingRight: '16px',
      fontSize: '12px',
      color: '#334155',
    },
  },
  rows: {
    style: {
      backgroundColor: 'transparent',
      borderBottomColor: 'rgba(203, 213, 225, 0.5)',
      '&:hover': {
        backgroundColor: 'rgba(241, 245, 249, 0.8)',
      },
    },
  },
  pagination: {
    style: {
      backgroundColor: 'transparent',
      borderTopColor: 'rgba(203, 213, 225, 0.5)',
    },
  },
};

export default function AdminResearchReports() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'cash' | 'future' | 'option'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for dark mode to pass to DataTable theme
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const renderDate = (dateString: string | null) => {
    if (!dateString) return <span className="text-slate-400">-</span>;
    const d = new Date(dateString);
    return (
      <div className="flex flex-col">
        <span className="font-medium text-slate-800 dark:text-slate-200">{d.toLocaleDateString()}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{d.toLocaleTimeString()}</span>
      </div>
    );
  };

  const columns = [
    {
      name: 'Entry Date',
      cell: (row: any) => renderDate(row.createdAt),
      sortable: true,
      sortFunction: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      name: 'Exit Date',
      cell: (row: any) => renderDate(row.closedAt),
      sortable: true,
      sortFunction: (a: any, b: any) => new Date(a.closedAt || 0).getTime() - new Date(b.closedAt || 0).getTime(),
    },
    {
      name: 'Report Date',
      cell: (row: any) => renderDate(row.updatedAt),
      sortable: true,
      sortFunction: (a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      name: 'Trade Name',
      cell: (row: any) => (
        <span className="font-bold tracking-wide text-slate-900 dark:text-white">
          {row.stock?.symbol}
          {row.segment === 'OPTION' && row.strikePrice && ` ${row.strikePrice}`}
          {row.segment === 'OPTION' && row.optionType && ` ${row.optionType}`}
        </span>
      ),
      sortable: true,
    },
    {
      name: 'Status',
      cell: (row: any) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${row.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500 border border-amber-200 dark:border-amber-500/20' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-500/20'}`}>
          {row.status}
        </span>
      ),
      sortable: true,
    },
    {
      name: 'Segment',
      cell: (row: any) => (
        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-700">{row.segment}</span>
      ),
      sortable: true,
    },
    {
      name: 'Plan Name',
      cell: (row: any) => <span className="text-slate-700 dark:text-slate-300 font-medium">{row.planName || '-'}</span>,
      sortable: true,
    },
    {
      name: 'Researcher Name',
      cell: (row: any) => <span className="text-slate-600 dark:text-slate-400">{row.createdByName || '-'}</span>,
      sortable: true,
    },
    {
      name: 'Action',
      cell: (row: any) => (
        <a href={api.getDownloadUrl(row.reportUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-500/10 dark:hover:bg-blue-600 dark:text-blue-400 dark:hover:text-white rounded-lg text-xs font-bold transition-all duration-300">
          <Download className="w-4 h-4" /> Download
        </a>
      ),
      center: true,
    },
  ];

  const categories = [
    { id: 'all', label: 'All Reports' },
    { id: 'cash', label: 'Cash' },
    { id: 'future', label: 'Future' },
    { id: 'option', label: 'Option' },
  ];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.getSignals();
        if (res.success) {
          // Filter to only include signals that have an attached report
          const signalsWithReports = res.data.filter((s: any) => s.reportUrl);
          setSignals(signalsWithReports);
        }
      } catch (err) {
        console.error('Failed to fetch signals for research reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filteredSignals = signals.filter(s => {
    const matchesCategory = activeCategory === 'all' || s.segment?.toLowerCase() === activeCategory;
    const matchesStatus = statusFilter === 'all' || s.status?.toLowerCase() === statusFilter;
    const tradeName = `${s.stock?.symbol || ''} ${s.strikePrice || ''} ${s.optionType || ''}`.trim().toLowerCase();
    const matchesSearch = tradeName.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-200 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-500" /> Research Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View and manage all uploaded research reports across all segments.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto pb-2 hide-scrollbar gap-2">
          {categories.map(c => (
            <button 
              key={c.id}
              onClick={() => setActiveCategory(c.id as any)}
              className={`whitespace-nowrap px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === c.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="text" 
            placeholder="Search trade name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-48"
          />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-sm text-slate-500">Loading research reports...</p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500">No research reports found in this category.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm glassmorphism">
          <DataTable
            columns={columns}
            data={filteredSignals}
            pagination
            paginationPerPage={10}
            highlightOnHover
            responsive
            customStyles={tableCustomStyles}
            theme={isDarkMode ? 'dark' : 'default'}
            noDataComponent={<div className="p-8 text-center text-slate-500 font-medium">No research reports found in this category.</div>}
          />
        </div>
      )}
    </div>
  );
}

