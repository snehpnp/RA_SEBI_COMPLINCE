'use client';

import { useState, useEffect } from 'react';
import { Receipt, Download, CreditCard, Clock, Search, ExternalLink, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function PaymentCenter({ profile }: { profile?: any }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadInvoice = async (paymentId: string, transactionRef: string) => {
    try {
      setDownloadingId(paymentId);
      await api.downloadInvoicePdf(paymentId, `Invoice_${transactionRef}.pdf`);
    } catch (error) {
      console.error('Download failed', error);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await api.getClientPayments();
        if (res.success) {
          setTransactions(res.data?.docs || res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch payments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment History</h1>
          <p className="text-sm text-premium-text/60 mt-1">View your past transactions and download GST invoices.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-premium-cards border border-premium-border p-4 rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-text/40" />
          <input 
            type="text" 
            placeholder="Search by Transaction ID..." 
            className="w-full bg-premium-bg border border-premium-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-premium-primary focus:ring-1 focus:ring-premium-primary transition-all"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select className="bg-premium-bg border border-premium-border rounded-xl px-4 py-2.5 text-sm focus:outline-none w-full md:w-auto appearance-none">
            <option>All Time</option>
            <option>Last 30 Days</option>
            <option>Last 6 Months</option>
            <option>Current Financial Year</option>
          </select>
        </div>
      </div>

      <div className="bg-premium-cards border border-premium-border rounded-3xl overflow-hidden flex-1">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-premium-border bg-premium-bg/50">
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans">Transaction</th>
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans">Billed To</th>
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans">Date & Time</th>
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans">Plan</th>
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans">Amount</th>
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans">Status</th>
                <th className="p-4 text-xs font-semibold text-premium-text/60 uppercase tracking-wider font-sans text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-premium-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-premium-primary animate-spin mx-auto mb-4" />
                    <p className="text-sm text-premium-text/60">Loading payment history...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-premium-text/40">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((txn, index) => (
                <tr key={txn.id || txn._id || index} className="hover:bg-premium-bg/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-premium-bg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-premium-text/60" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{txn.transactionRef || txn.receiptNo || txn.id || txn._id || 'TXN-UNKNOWN'}</p>
                        <p className="text-xs text-premium-text/50">{txn.paymentMode || txn.method || 'Online'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-sm text-premium-text">{profile?.name || txn.clientName || 'User'}</p>
                    <p className="text-xs text-premium-text/50">{profile?.email || 'N/A'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">{new Date(txn.createdAt || Date.now()).toLocaleDateString()}</p>
                    <p className="text-xs text-premium-text/50">{new Date(txn.createdAt || Date.now()).toLocaleTimeString()}</p>
                  </td>
                  <td className="p-4 text-sm font-medium">{typeof txn.plan === 'object' ? txn.plan?.name : 'Premium Plan'}</td>
                  <td className="p-4">
                    {(() => {
                      const basePrice = txn.plan?.price || txn.amount || 0;
                      const discount = txn.discountAmount || txn.discountApplied || 0;
                      const taxableAmount = basePrice - discount;
                      let gst = 0;
                      const totalAmount = txn.amount || txn.amountPaid || 0;
                      if (totalAmount > taxableAmount) {
                        gst = totalAmount - taxableAmount;
                      }
                      
                      return (
                        <div className="flex flex-col gap-0.5">
                          {totalAmount !== basePrice && (
                            <>
                              <div className="text-[10px] text-premium-text/60 flex justify-between gap-4">
                                <span>Base:</span> <span>₹{basePrice.toFixed(2)}</span>
                              </div>
                              {discount > 0 && (
                                <div className="text-[10px] text-emerald-500 flex justify-between gap-4">
                                  <span>Discount {txn.coupon?.code && `(${txn.coupon.code})`}:</span> <span>-₹{discount.toFixed(2)}</span>
                                </div>
                              )}
                              {gst > 0 && (
                                <div className="text-[10px] text-premium-text/60 flex justify-between gap-4">
                                  <span>GST (18%):</span> <span>₹{gst.toFixed(2)}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="font-bold text-sm flex justify-between gap-4 mt-1 border-t border-premium-border/50 pt-1">
                            <span>Total:</span> <span className="text-premium-primary">₹{totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    {txn.status === 'successful' || txn.status === 'SUCCESS' ? (
                      <span className="px-2.5 py-1 bg-premium-success/20 text-premium-success rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                        Success
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-premium-danger/20 text-premium-danger rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                        {txn.status || 'Failed'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {txn.status === 'successful' || txn.status === 'SUCCESS' ? (
                      <button 
                        onClick={() => handleDownloadInvoice(txn.id || txn._id, txn.transactionRef || 'Unknown')}
                        disabled={downloadingId === (txn.id || txn._id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-premium-primary/10 hover:bg-premium-primary/20 text-premium-primary rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {downloadingId === (txn.id || txn._id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 
                        {downloadingId === (txn.id || txn._id) ? 'Downloading...' : 'GST Invoice'}
                      </button>
                    ) : (
                      <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-premium-bg text-premium-text/40 rounded-lg text-xs font-medium cursor-not-allowed">
                        N/A
                      </button>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-premium-border">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-premium-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-premium-text/60">Loading payment history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-premium-text/40">
              No transactions found.
            </div>
          ) : (
            transactions.map((txn, index) => (
              <div key={txn.id || txn._id || index} className="p-4 flex flex-col gap-3 hover:bg-premium-bg/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-premium-bg flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-premium-text/60" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-premium-text">{txn.transactionRef || txn.receiptNo || txn.id || txn._id || 'TXN-UNKNOWN'}</p>
                      <p className="text-xs text-premium-text/60">{new Date(txn.createdAt || Date.now()).toLocaleDateString()} {new Date(txn.createdAt || Date.now()).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div>
                    {txn.status === 'successful' || txn.status === 'SUCCESS' ? (
                      <span className="px-2 py-1 bg-premium-success/20 text-premium-success rounded text-[10px] font-bold uppercase">
                        Success
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-premium-danger/20 text-premium-danger rounded text-[10px] font-bold uppercase">
                        {txn.status || 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-premium-bg rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-premium-text/60">Plan</span>
                    <span className="font-medium">{typeof txn.plan === 'object' ? txn.plan?.name : 'Premium Plan'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-premium-border pt-2">
                    <span className="text-premium-text/60">Amount</span>
                    <span className="font-bold text-premium-primary">₹{(txn.amount || txn.amountPaid || txn.plan?.price || 0).toFixed(2)}</span>
                  </div>
                </div>
                
                {txn.status === 'successful' || txn.status === 'SUCCESS' ? (
                  <button 
                    onClick={() => handleDownloadInvoice(txn.id || txn._id, txn.transactionRef || 'Unknown')}
                    disabled={downloadingId === (txn.id || txn._id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-premium-primary/10 text-premium-primary hover:bg-premium-primary/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 mt-1"
                  >
                    {downloadingId === (txn.id || txn._id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    {downloadingId === (txn.id || txn._id) ? 'Downloading...' : 'Download Invoice'}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
