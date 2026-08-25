'use client';
import { useState, useEffect } from 'react';
import { Save, Loader2, History, X, Eye, Calendar, CheckCircle, Download } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface ReportData {
  investorPendingLastMonth: number;
  investorReceived: number;
  investorResolved: number;
  investorPendingTotal: number;
  investorPending3Months: number;
  investorAvgResolutionTime: number;

  sebiPendingLastMonth: number;
  sebiReceived: number;
  sebiResolved: number;
  sebiPendingTotal: number;
  sebiPending3Months: number;
  sebiAvgResolutionTime: number;

  otherPendingLastMonth: number;
  otherReceived: number;
  otherResolved: number;
  otherPendingTotal: number;
  otherPending3Months: number;
  otherAvgResolutionTime: number;
}

export default function ComplaintReportAdmin() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [month, setMonth] = useState<number>(new Date().getMonth() || 12);
  const [year, setYear] = useState<number>(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());

  const [data, setData] = useState<ReportData>({
    investorPendingLastMonth: 0, investorReceived: 0, investorResolved: 0, investorPendingTotal: 0, investorPending3Months: 0, investorAvgResolutionTime: 0,
    sebiPendingLastMonth: 0, sebiReceived: 0, sebiResolved: 0, sebiPendingTotal: 0, sebiPending3Months: 0, sebiAvgResolutionTime: 0,
    otherPendingLastMonth: 0, otherReceived: 0, otherResolved: 0, otherPendingTotal: 0, otherPending3Months: 0, otherAvgResolutionTime: 0
  });

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const handleDownloadHistoryCSV = async () => {
    setDownloadingCsv(true);
    try {
      const res = await api.request('/complaint-report/history');
      const reports = res && res.success ? (res.data || []) : historyList;

      if (reports.length === 0) {
        toast('No complaint report history available to download.');
        return;
      }

      const headers = [
        'Month',
        'Year',
        'Category (Source)',
        'Pending at End of Last Month',
        'Received During Month',
        'Resolved During Month',
        'Total Pending',
        'Pending (> 3 Months)',
        'Avg Resolution Time (Days)',
        'Last Updated'
      ];

      const rows: string[][] = [headers];

      reports.forEach((item: any) => {
        const mStr = months[item.month - 1];
        const yStr = item.year;
        const d = item.data || {};
        const updated = new Date(item.updatedAt).toLocaleString();

        rows.push([
          mStr, yStr.toString(), 'Directly from Investors',
          (d.investorPendingLastMonth || 0).toString(),
          (d.investorReceived || 0).toString(),
          (d.investorResolved || 0).toString(),
          (d.investorPendingTotal || 0).toString(),
          (d.investorPending3Months || 0).toString(),
          (d.investorAvgResolutionTime || 0).toString(),
          updated
        ]);

        rows.push([
          mStr, yStr.toString(), 'SEBI (SCORES)',
          (d.sebiPendingLastMonth || 0).toString(),
          (d.sebiReceived || 0).toString(),
          (d.sebiResolved || 0).toString(),
          (d.sebiPendingTotal || 0).toString(),
          (d.sebiPending3Months || 0).toString(),
          (d.sebiAvgResolutionTime || 0).toString(),
          updated
        ]);

        rows.push([
          mStr, yStr.toString(), 'Other Sources (If any)',
          (d.otherPendingLastMonth || 0).toString(),
          (d.otherReceived || 0).toString(),
          (d.otherResolved || 0).toString(),
          (d.otherPendingTotal || 0).toString(),
          (d.otherPending3Months || 0).toString(),
          (d.otherAvgResolutionTime || 0).toString(),
          updated
        ]);

        const totPrev = (d.investorPendingLastMonth || 0) + (d.sebiPendingLastMonth || 0) + (d.otherPendingLastMonth || 0);
        const totRec = (d.investorReceived || 0) + (d.sebiReceived || 0) + (d.otherReceived || 0);
        const totRes = (d.investorResolved || 0) + (d.sebiResolved || 0) + (d.otherResolved || 0);
        const totPend = (d.investorPendingTotal || 0) + (d.sebiPendingTotal || 0) + (d.otherPendingTotal || 0);
        const tot3M = (d.investorPending3Months || 0) + (d.sebiPending3Months || 0) + (d.otherPending3Months || 0);
        const avgDays = Math.round(((d.investorAvgResolutionTime || 0) + (d.sebiAvgResolutionTime || 0) + (d.otherAvgResolutionTime || 0)) / 3);

        rows.push([
          mStr, yStr.toString(), 'Grand Total',
          totPrev.toString(),
          totRec.toString(),
          totRes.toString(),
          totPend.toString(),
          tot3M.toString(),
          avgDays.toString(),
          updated
        ]);
      });

      const csvContent = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SEBI_Complaint_Reports_History_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download history CSV');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fetchReport = async (m: number, y: number) => {
    setLoading(true);
    try {
      const response = await api.request(`/complaint-report?month=${m}&year=${y}`);
      if (response && response.success && response.data) {
        setData(response.data);
      } else {
        // Reset if no data found
        setData({
          investorPendingLastMonth: 0, investorReceived: 0, investorResolved: 0, investorPendingTotal: 0, investorPending3Months: 0, investorAvgResolutionTime: 0,
          sebiPendingLastMonth: 0, sebiReceived: 0, sebiResolved: 0, sebiPendingTotal: 0, sebiPending3Months: 0, sebiAvgResolutionTime: 0,
          otherPendingLastMonth: 0, otherReceived: 0, otherResolved: 0, otherPendingTotal: 0, otherPending3Months: 0, otherAvgResolutionTime: 0
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch report:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.request('/complaint-report/history');
      if (res && res.success) {
        setHistoryList(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchReport(month, year);
  }, [month, year]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.request('/admin/complaint-report', {
        method: 'POST',
        body: JSON.stringify({ month, year, data })
      });
      if (response && response.success) {
        toast.success('Report saved successfully!');
        if (isHistoryOpen) fetchHistory();
      } else {
        toast(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ReportData, value: string) => {
    setData({ ...data, [field]: parseInt(value) || 0 });
  };

  const InputCell = ({ field }: { field: keyof ReportData }) => (
    <td className="p-2 border border-slate-200 dark:border-slate-700">
      <input
        type="number"
        value={data[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="w-full text-center bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary-500 rounded p-1 font-semibold"
      />
    </td>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Complaint Status Report</h1>
          <p className="text-slate-500 text-sm mt-1">Enter monthly statistics to display on the client portal.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>{months[month - 1]} {year}</span>
          </div>

          <button
            onClick={() => {
              setIsHistoryOpen(true);
              fetchHistory();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-sm rounded-xl transition border border-primary-500/30 shadow-sm"
          >
            <History className="w-4 h-4" />
            <span>Report History</span>
          </button>

          <button
            onClick={handleDownloadHistoryCSV}
            disabled={downloadingCsv}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl transition border border-emerald-500/30 shadow-sm disabled:opacity-50"
          >
            {downloadingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download History CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
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
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">Loading data...</td></tr>
            ) : (
              <>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-4 text-center font-medium border border-slate-200 dark:border-slate-700">1.</td>
                  <td className="p-4 font-medium border border-slate-200 dark:border-slate-700">Directly from Investors</td>
                  <InputCell field="investorPendingLastMonth" />
                  <InputCell field="investorReceived" />
                  <InputCell field="investorResolved" />
                  <InputCell field="investorPendingTotal" />
                  <InputCell field="investorPending3Months" />
                  <InputCell field="investorAvgResolutionTime" />
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-4 text-center font-medium border border-slate-200 dark:border-slate-700">2.</td>
                  <td className="p-4 font-medium border border-slate-200 dark:border-slate-700">SEBI (SCORES)</td>
                  <InputCell field="sebiPendingLastMonth" />
                  <InputCell field="sebiReceived" />
                  <InputCell field="sebiResolved" />
                  <InputCell field="sebiPendingTotal" />
                  <InputCell field="sebiPending3Months" />
                  <InputCell field="sebiAvgResolutionTime" />
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-4 text-center font-medium border border-slate-200 dark:border-slate-700">3.</td>
                  <td className="p-4 font-medium border border-slate-200 dark:border-slate-700">Other Sources (If any)</td>
                  <InputCell field="otherPendingLastMonth" />
                  <InputCell field="otherReceived" />
                  <InputCell field="otherResolved" />
                  <InputCell field="otherPendingTotal" />
                  <InputCell field="otherPending3Months" />
                  <InputCell field="otherAvgResolutionTime" />
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold">
                  <td colSpan={2} className="p-4 text-right border border-slate-200 dark:border-slate-700">Grand Total</td>
                  <td className="p-4 text-center border border-slate-200 dark:border-slate-700">{data.investorPendingLastMonth + data.sebiPendingLastMonth + data.otherPendingLastMonth}</td>
                  <td className="p-4 text-center border border-slate-200 dark:border-slate-700">{data.investorReceived + data.sebiReceived + data.otherReceived}</td>
                  <td className="p-4 text-center border border-slate-200 dark:border-slate-700">{data.investorResolved + data.sebiResolved + data.otherResolved}</td>
                  <td className="p-4 text-center border border-slate-200 dark:border-slate-700">{data.investorPendingTotal + data.sebiPendingTotal + data.otherPendingTotal}</td>
                  <td className="p-4 text-center border border-slate-200 dark:border-slate-700">{data.investorPending3Months + data.sebiPending3Months + data.otherPending3Months}</td>
                  <td className="p-4 text-center border border-slate-200 dark:border-slate-700">
                    {Math.round((data.investorAvgResolutionTime + data.sebiAvgResolutionTime + data.otherAvgResolutionTime) / 3)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl shadow-lg shadow-primary-500/20 font-bold flex items-center space-x-2 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Save Data for {months[month - 1]} {year}</span>
        </button>
      </div>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Reports History</h3>
                  <p className="text-xs text-slate-500">History of all monthly complaint reports saved so far</p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4">
              {loadingHistory ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  <p>Loading history records...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No previous monthly complaint reports found.
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-3.5 font-bold rounded-l-xl">Month / Year</th>
                      <th className="p-3.5 font-bold text-center">Total Received</th>
                      <th className="p-3.5 font-bold text-center">Total Resolved</th>
                      <th className="p-3.5 font-bold text-center">Total Pending</th>
                      <th className="p-3.5 font-bold text-center">Saved Date</th>
                      <th className="p-3.5 font-bold text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {historyList.map((item) => {
                      const d = item.data || {};
                      const totRec = (d.investorReceived || 0) + (d.sebiReceived || 0) + (d.otherReceived || 0);
                      const totRes = (d.investorResolved || 0) + (d.sebiResolved || 0) + (d.otherResolved || 0);
                      const totPend = (d.investorPendingTotal || 0) + (d.sebiPendingTotal || 0) + (d.otherPendingTotal || 0);
                      const isCurrent = item.month === month && item.year === year;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>{months[item.month - 1]} {item.year}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-full border border-emerald-500/20">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">{totRec}</td>
                          <td className="p-3.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">{totRes}</td>
                          <td className="p-3.5 text-center font-semibold text-amber-600 dark:text-amber-400">{totPend}</td>
                          <td className="p-3.5 text-center text-xs text-slate-500">
                            {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setMonth(item.month);
                                setYear(item.year);
                                setData(item.data);
                                setIsHistoryOpen(false);
                              }}
                              className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs rounded-lg transition inline-flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View / Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
