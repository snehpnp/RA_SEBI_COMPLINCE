'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import DataTable from 'react-data-table-component';

interface CustomPageViewProps {
  page: any;
}

export default function CustomPageView({ page }: CustomPageViewProps) {
  const [complaintData, setComplaintData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (page?.slug === 'complaint-status') {
      const fetchReport = async () => {
        setLoading(true);
        try {
          const m = new Date().getMonth() || 12; // previous month
          const y = new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
          const res = await api.request(`/complaint-report?month=${m}&year=${y}`);
          if (res.success && res.data) {
            setComplaintData(res.data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchReport();
    }
  }, [page]);

  if (!page) return null;

  if (page.slug === 'complaint-status') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = new Date().getMonth() || 12;
    const y = new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();

    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8 hide-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-premium-cards border border-premium-border rounded-2xl p-6 md:p-8">
            <h1 className="text-2xl font-bold mb-6">{page.title} for {months[m-1]} {y}</h1>
            
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-premium-primary" /></div>
            ) : (() => {
                  const d = complaintData || {
                    investorPendingLastMonth: 0, investorReceived: 0, investorResolved: 0, investorPendingTotal: 0, investorPending3Months: 0, investorAvgResolutionTime: 0,
                    sebiPendingLastMonth: 0, sebiReceived: 0, sebiResolved: 0, sebiPendingTotal: 0, sebiPending3Months: 0, sebiAvgResolutionTime: 0,
                    otherPendingLastMonth: 0, otherReceived: 0, otherResolved: 0, otherPendingTotal: 0, otherPending3Months: 0, otherAvgResolutionTime: 0
                  };

                  const columns = [
                    { name: 'Sr. No.', selector: (row: any) => row.srNo, width: '80px', center: true },
                    { name: 'Received from', selector: (row: any) => row.source, wrap: true },
                    { name: 'Pending at the end of last month', selector: (row: any) => row.pendingLastMonth, center: true, wrap: true },
                    { name: 'Received', selector: (row: any) => row.received, center: true },
                    { name: 'Resolved', selector: (row: any) => row.resolved, center: true },
                    { name: 'Total Pending', selector: (row: any) => row.totalPending, center: true },
                    { name: 'Pending complaints (3 months)', selector: (row: any) => row.pending3Months, center: true, wrap: true },
                    { name: 'Average Resolution time (in days)', selector: (row: any) => row.avgResolutionTime, center: true, wrap: true },
                  ];

                  const data = [
                    {
                      srNo: '1.', source: 'Directly from Investors',
                      pendingLastMonth: d.investorPendingLastMonth, received: d.investorReceived, resolved: d.investorResolved,
                      totalPending: d.investorPendingTotal, pending3Months: d.investorPending3Months, avgResolutionTime: d.investorAvgResolutionTime
                    },
                    {
                      srNo: '2.', source: 'SEBI (SCORES)',
                      pendingLastMonth: d.sebiPendingLastMonth, received: d.sebiReceived, resolved: d.sebiResolved,
                      totalPending: d.sebiPendingTotal, pending3Months: d.sebiPending3Months, avgResolutionTime: d.sebiAvgResolutionTime
                    },
                    {
                      srNo: '3.', source: 'Other Sources (If any)',
                      pendingLastMonth: d.otherPendingLastMonth, received: d.otherReceived, resolved: d.otherResolved,
                      totalPending: d.otherPendingTotal, pending3Months: d.otherPending3Months, avgResolutionTime: d.otherAvgResolutionTime
                    },
                    {
                      srNo: '', source: <span className="font-bold">Grand Total</span>,
                      pendingLastMonth: <span className="font-bold">{d.investorPendingLastMonth + d.sebiPendingLastMonth + d.otherPendingLastMonth}</span>,
                      received: <span className="font-bold">{d.investorReceived + d.sebiReceived + d.otherReceived}</span>,
                      resolved: <span className="font-bold">{d.investorResolved + d.sebiResolved + d.otherResolved}</span>,
                      totalPending: <span className="font-bold">{d.investorPendingTotal + d.sebiPendingTotal + d.otherPendingTotal}</span>,
                      pending3Months: <span className="font-bold">{d.investorPending3Months + d.sebiPending3Months + d.otherPending3Months}</span>,
                      avgResolutionTime: <span className="font-bold">{Math.round((d.investorAvgResolutionTime + d.sebiAvgResolutionTime + d.otherAvgResolutionTime) / 3)}</span>
                    }
                  ];

                  const customStyles = {
                    table: { style: { backgroundColor: 'transparent' } },
                    headRow: { style: { backgroundColor: '#1272a2', color: 'white', minHeight: '50px' } },
                    headCells: { style: { fontSize: '12px', fontWeight: 'bold' } },
                    cells: { style: { padding: '12px', fontSize: '13px' } },
                  };

                  return (
                    <div className="border border-premium-border rounded-xl overflow-hidden">
                      <DataTable
                        columns={columns}
                        data={data}
                        customStyles={customStyles}
                        striped
                        highlightOnHover
                        noDataComponent={<div className="p-4 text-slate-500">No data available</div>}
                      />
                    </div>
                  );
                })()}
          </div>
        </div>
      </div>
    );
  }

  // Normal Content Page
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 hide-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-premium-cards border border-premium-border rounded-2xl p-6 md:p-10">
          <h1 className="text-3xl font-bold mb-8 text-premium-text">{page.title}</h1>
          <div 
            className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-premium-primary hover:prose-a:text-premium-primary/80"
            dangerouslySetInnerHTML={{ __html: page.content || '<p>No content available.</p>' }}
          />
        </div>
      </div>
    </div>
  );
}
