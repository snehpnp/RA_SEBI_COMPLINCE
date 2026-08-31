'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import api from '../../services/api';
import DataTable from 'react-data-table-component';

const tableCustomStyles = {
  table: { style: { backgroundColor: 'transparent', color: 'inherit' } },
  headRow: {
    style: {
      backgroundColor: 'transparent',
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      minHeight: '44px',
      color: 'inherit',
    },
  },
  headCells: {
    style: {
      fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
      color: 'inherit', paddingLeft: '16px', paddingRight: '16px',
      opacity: 0.7,
    },
  },
  cells: {
    style: {
      paddingLeft: '16px', paddingRight: '16px',
      fontSize: '12px', color: 'inherit',
    },
  },
  rows: {
    style: {
      backgroundColor: 'transparent',
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
      color: 'inherit',
      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
    },
  },
  pagination: {
    style: { backgroundColor: 'transparent', borderTopColor: 'rgba(255, 255, 255, 0.1)', color: 'inherit' },
  },
};

export default function ResearchReports() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'cash' | 'future' | 'option'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use a fixed dark theme for the client portal data tables since the portal has a dark glassmorphism theme
  const [isDarkMode, setIsDarkMode] = useState(true);

  const renderDate = (dateString: string | null) => {
    if (!dateString) return <span className="text-premium-text/40">-</span>;
    const d = new Date(dateString);
    return (
      <div className="flex flex-col">
        <span className="font-medium text-premium-text/90">{d.toLocaleDateString()}</span>
        <span className="text-[11px] text-premium-text/50">{d.toLocaleTimeString()}</span>
      </div>
    );
  };

  const columns = [
    {
      name: 'Date',
      cell: (row: any) => renderDate(row.createdAt),
      sortable: true,
      sortFunction: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      name: 'Trade Name',
      cell: (row: any) => (
        <span className="font-bold tracking-wide">
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
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${row.status === 'OPEN' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
          {row.status}
        </span>
      ),
      sortable: true,
    },
    {
      name: 'Segment',
      cell: (row: any) => (
        <span className="bg-premium-bg px-2 py-1 rounded-md text-xs border border-premium-border">{row.segment}</span>
      ),
      sortable: true,
    },
    {
      name: 'Action',
      cell: (row: any) => (
        <a href={api.getDownloadUrl(row.reportUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-premium-primary/10 hover:bg-premium-primary text-premium-primary hover:text-white rounded-lg text-xs font-bold transition-all duration-300">
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
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Research Reports</h1>
          <p className="text-sm text-premium-text/60 mt-1">Download in-depth research reports and technical charts for our trades.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto pb-2 hide-scrollbar gap-2">
          {categories.map(c => (
            <button 
              key={c.id}
              onClick={() => setActiveCategory(c.id as any)}
              className={`whitespace-nowrap px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === c.id ? 'bg-premium-primary text-white shadow-md' : 'bg-premium-cards border border-premium-border text-premium-text/70 hover:border-premium-text hover:bg-premium-border/50'
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
            className="px-4 py-2 text-sm rounded-xl border border-premium-border bg-premium-cards text-premium-text focus:border-premium-primary outline-none w-48 transition-colors"
          />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 text-sm rounded-xl border border-premium-border bg-premium-cards text-premium-text focus:border-premium-primary outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-premium-primary animate-spin mb-4" />
          <p className="text-sm text-premium-text/60">Loading research reports...</p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] border border-dashed border-premium-border rounded-3xl">
          <FileText className="w-12 h-12 text-premium-border mb-4" />
          <p className="text-premium-text/60">No research reports found in this category.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-premium-border bg-premium-cards/30">
          <DataTable
            columns={columns}
            data={filteredSignals}
            pagination
            paginationPerPage={10}
            highlightOnHover
            responsive
            customStyles={tableCustomStyles}
            theme={isDarkMode ? 'dark' : 'default'}
            noDataComponent={<div className="p-8 text-center text-premium-text/60">No research reports found in this category.</div>}
          />
        </div>
      )}
    </div>
  );
}
