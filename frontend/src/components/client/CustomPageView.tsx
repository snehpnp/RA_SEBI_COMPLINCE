'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';

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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                  <thead className="bg-[#1272a2] text-white">
                    <tr>
                      <th className="p-4 font-bold border border-white/20 text-center">Sr. No.</th>
                      <th className="p-4 font-bold border border-white/20">Received from</th>
                      <th className="p-4 font-bold border border-white/20 text-center">Pending at the end of last month</th>
                      <th className="p-4 font-bold border border-white/20 text-center">Received</th>
                      <th className="p-4 font-bold border border-white/20 text-center">Resolved</th>
                      <th className="p-4 font-bold border border-white/20 text-center">Total Pending</th>
                      <th className="p-4 font-bold border border-white/20 text-center">Pending complaints (3 months)</th>
                      <th className="p-4 font-bold border border-white/20 text-center">Average Resolution time (in days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-premium-border">
                    {(() => {
                      const d = complaintData || {
                        investorPendingLastMonth: 0, investorReceived: 0, investorResolved: 0, investorPendingTotal: 0, investorPending3Months: 0, investorAvgResolutionTime: 0,
                        sebiPendingLastMonth: 0, sebiReceived: 0, sebiResolved: 0, sebiPendingTotal: 0, sebiPending3Months: 0, sebiAvgResolutionTime: 0,
                        otherPendingLastMonth: 0, otherReceived: 0, otherResolved: 0, otherPendingTotal: 0, otherPending3Months: 0, otherAvgResolutionTime: 0
                      };
                      return (
                        <>
                          <tr className="hover:bg-premium-bg/50 transition">
                            <td className="p-4 text-center font-medium border border-premium-border">1.</td>
                            <td className="p-4 font-medium border border-premium-border">Directly from Investors</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorPendingLastMonth}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorReceived}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorResolved}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorPendingTotal}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorPending3Months}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorAvgResolutionTime}</td>
                          </tr>
                          <tr className="hover:bg-premium-bg/50 transition">
                            <td className="p-4 text-center font-medium border border-premium-border">2.</td>
                            <td className="p-4 font-medium border border-premium-border">SEBI (SCORES)</td>
                            <td className="p-4 text-center border border-premium-border">{d.sebiPendingLastMonth}</td>
                            <td className="p-4 text-center border border-premium-border">{d.sebiReceived}</td>
                            <td className="p-4 text-center border border-premium-border">{d.sebiResolved}</td>
                            <td className="p-4 text-center border border-premium-border">{d.sebiPendingTotal}</td>
                            <td className="p-4 text-center border border-premium-border">{d.sebiPending3Months}</td>
                            <td className="p-4 text-center border border-premium-border">{d.sebiAvgResolutionTime}</td>
                          </tr>
                          <tr className="hover:bg-premium-bg/50 transition">
                            <td className="p-4 text-center font-medium border border-premium-border">3.</td>
                            <td className="p-4 font-medium border border-premium-border">Other Sources (If any)</td>
                            <td className="p-4 text-center border border-premium-border">{d.otherPendingLastMonth}</td>
                            <td className="p-4 text-center border border-premium-border">{d.otherReceived}</td>
                            <td className="p-4 text-center border border-premium-border">{d.otherResolved}</td>
                            <td className="p-4 text-center border border-premium-border">{d.otherPendingTotal}</td>
                            <td className="p-4 text-center border border-premium-border">{d.otherPending3Months}</td>
                            <td className="p-4 text-center border border-premium-border">{d.otherAvgResolutionTime}</td>
                          </tr>
                          <tr className="bg-premium-bg/80 font-bold">
                            <td colSpan={2} className="p-4 text-right border border-premium-border">Grand Total</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorPendingLastMonth + d.sebiPendingLastMonth + d.otherPendingLastMonth}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorReceived + d.sebiReceived + d.otherReceived}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorResolved + d.sebiResolved + d.otherResolved}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorPendingTotal + d.sebiPendingTotal + d.otherPendingTotal}</td>
                            <td className="p-4 text-center border border-premium-border">{d.investorPending3Months + d.sebiPending3Months + d.otherPending3Months}</td>
                            <td className="p-4 text-center border border-premium-border">
                              {Math.round((d.investorAvgResolutionTime + d.sebiAvgResolutionTime + d.otherAvgResolutionTime) / 3)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
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
