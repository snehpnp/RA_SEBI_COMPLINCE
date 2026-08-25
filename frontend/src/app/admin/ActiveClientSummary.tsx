'use client';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { Download, Users, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ActiveClientSummary() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dailyCounts, setDailyCounts] = useState<{ date: string; count: number }[]>([]);
  const [highestCount, setHighestCount] = useState<number>(0);
  const [lowestCount, setLowestCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateClients, setSelectedDateClients] = useState<any[]>([]);
  const [loadingModal, setLoadingModal] = useState<boolean>(false);

  useEffect(() => {
    fetchSummary();
  }, [currentMonth]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const res = await api.request(`/admin/active-clients/summary?month=${monthStr}`);
      if (res.success) {
        setDailyCounts(res.data.dailyCounts);
        setHighestCount(res.data.highestCount);
        const nonZero = res.data.dailyCounts.filter((d:any) => d.count > 0);
        setLowestCount(nonZero.length > 0 ? Math.min(...nonZero.map((d:any) => d.count)) : 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load active client summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsByDate = async (date: string) => {
    setSelectedDate(date);
    setLoadingModal(true);
    try {
      const res = await api.request(`/admin/active-clients/date?date=${date}`);
      if (res.success) {
        setSelectedDateClients(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load clients for ' + date);
    } finally {
      setLoadingModal(false);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatForCsv = (clients: any[]) => {
    return clients.map((c, idx) => {
      const feesArray = c.activePlans.map((p:any) => p.totalFees || 0);
      const sumFees = feesArray.reduce((acc: number, curr: number) => acc + Number(curr), 0);
      return {
        'S.No': idx + 1,
        Name: c.name,
        Email: c.email,
        Phone: c.mobile,
        State: c.state,
        City: c.city,
        PAN: c.pan,
        KYCDate: c.kycDate ? new Date(c.kycDate).toLocaleDateString() : 'N/A',
        Plans: c.activePlans.map((p:any) => p.planName).join(', '),
        PlanStart: c.activePlans.map((p:any) => new Date(p.startDate).toLocaleDateString()).join(', '),
        PlanEnd: c.activePlans.map((p:any) => new Date(p.endDate).toLocaleDateString()).join(', '),
        Fees: feesArray.join(', '),
        'Total Fees': sumFees
      };
    });
  };

  const downloadMonthCsv = async () => {
    try {
      toast.loading('Preparing monthly export...', { id: 'monthExport' });
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const res = await api.request(`/admin/active-clients/month-export?month=${monthStr}`);
      if (res.success && res.data.length > 0) {
        const data = formatForCsv(res.data);
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
        XLSX.writeFile(workbook, `Active_Clients_Month_${monthStr}.xlsx`);
        toast.success('Export downloaded!', { id: 'monthExport' });
      } else {
        toast.error('No active clients this month', { id: 'monthExport' });
      }
    } catch (err) {
      toast.error('Export failed', { id: 'monthExport' });
    }
  };

  const downloadDateCsv = () => {
    if (selectedDateClients.length === 0) {
      toast.error('No data to download');
      return;
    }
    const data = formatForCsv(selectedDateClients);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    XLSX.writeFile(workbook, `Active_Clients_${selectedDate}.xlsx`);
  };

  // Helper to generate calendar blanks
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const blanks = Array(firstDay).fill(null);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-600" />
            Active Client Summary
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">View daily historical active client counts</p>
        </div>
        <button
          onClick={downloadMonthCsv}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download Month CSV
        </button>
      </div>

      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-100 dark:border-slate-700">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="mb-6 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border border-primary-100 dark:border-primary-800/30 p-5 rounded-xl flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-primary-800 dark:text-primary-300">Highest Active Clients</h4>
          <p className="text-xs text-primary-600 dark:text-primary-400">Peak count for {monthNames[currentMonth.getMonth()]}</p>
        </div>
        <div className="text-3xl font-bold text-primary-700 dark:text-primary-400 flex items-center gap-2">
          <Users className="w-6 h-6 opacity-70" /> {highestCount}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
          
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="bg-slate-50 dark:bg-slate-800/30 rounded-lg min-h-[80px]"></div>
          ))}
          
          {dailyCounts.map((data, i) => {
            const dateNum = i + 1;
            const isHigh = highestCount > 0 && data.count === highestCount;
            const isLow = lowestCount > 0 && data.count === lowestCount && data.count > 0;
            
            let bgClass = "bg-white dark:bg-slate-800";
            if (isHigh) bgClass = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
            else if (isLow) bgClass = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

            return (
              <div 
                key={data.date} 
                onClick={() => fetchClientsByDate(data.date)}
                className={`${bgClass} border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[80px] hover:border-primary-400 hover:shadow-md cursor-pointer transition flex flex-col justify-between group`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-medium ${isHigh ? 'text-green-600 dark:text-green-400' : isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-400 group-hover:text-primary-500'}`}>{dateNum}</span>
                  {isHigh && <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 px-1.5 rounded uppercase font-bold">High</span>}
                  {isLow && !isHigh && <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 px-1.5 rounded uppercase font-bold">Low</span>}
                </div>
                <div className="text-center mt-2">
                  <span className={`text-lg font-bold ${data.count > 0 ? (isHigh ? 'text-green-700 dark:text-green-400' : isLow ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white') : 'text-slate-300 dark:text-slate-600'}`}>
                    {data.count}
                  </span>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Clients</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Date Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Active Clients on {selectedDate}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadDateCsv}
                  disabled={loadingModal || selectedDateClients.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4 inline mr-1" /> Export CSV
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingModal ? (
                 <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
              ) : selectedDateClients.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No active clients found for this date.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 rounded-l-lg">Client Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3 rounded-r-lg">Active Plans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateClients.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{c.name}</td>
                          <td className="px-4 py-3">{c.email}</td>
                          <td className="px-4 py-3">{c.mobile}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {c.activePlans.map((p:any, pIdx:number) => (
                                <span key={pIdx} className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-[10px] px-2 py-0.5 rounded-full">
                                  {p.planName}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
