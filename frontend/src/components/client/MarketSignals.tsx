'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, Clock, CheckCircle2, XCircle, FileText, Download, Loader2, Bell } from 'lucide-react';
import api from '../../services/api';
import { base_ra_url } from '../../utils/config';

export default function MarketSignals() {
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [category, setCategory] = useState<'all' | 'cash' | 'future' | 'option'>('all');
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [showAlertsForSignal, setShowAlertsForSignal] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['all', 'cash', 'future', 'option'];

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await api.getSignals();
        if (res.success) {
          setSignals(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch signals', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSignals();
  }, []);

  const filteredSignals = signals.filter(s => {
    const statusMatch = activeTab === 'active' ? s.status === 'OPEN' || s.status === 'open' : s.status === 'CLOSED' || s.status === 'closed';
    const segment = s.stock?.segment || s.segment;
    const typeMatch = category === 'all' || segment?.toLowerCase() === category;
    return statusMatch && typeMatch;
  });

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Market Signals</h1>
          <p className="text-sm text-premium-text/60 mt-1">Exclusive trading recommendations for premium members.</p>
        </div>
      </div>

      {/* Tabs & Categories */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex bg-premium-cards border border-premium-border p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('active')} 
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-premium-primary text-white shadow-md' : 'text-premium-text/60 hover:text-premium-text'}`}
          >
            Active Calls
          </button>
          <button 
            onClick={() => setActiveTab('closed')} 
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'closed' ? 'bg-premium-primary text-white shadow-md' : 'text-premium-text/60 hover:text-premium-text'}`}
          >
            Closed Calls
          </button>
        </div>

        <div className="flex overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar gap-2">
          {categories.map(c => (
            <button 
              key={c}
              onClick={() => setCategory(c as any)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all ${
                category === c ? 'bg-premium-primary/20 border-premium-primary text-premium-primary' : 'bg-premium-bg border-premium-border text-premium-text/60 hover:border-premium-text/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-premium-primary animate-spin mb-4" />
          <p className="text-sm text-premium-text/60">Loading signals...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSignals.map(signal => (
          <div key={signal.id} onClick={() => setSelectedSignal(signal)} className="bg-premium-cards border border-premium-border rounded-3xl p-6 cursor-pointer hover:border-premium-primary/50 hover:shadow-lg hover:shadow-premium-primary/5 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${signal.callType === 'BUY' || signal.recommendation === 'BUY' ? 'bg-premium-success/20 text-premium-success' : 'bg-premium-danger/20 text-premium-danger'}`}>
                    {signal.callType || signal.recommendation}
                  </span>
                  {signal.closeStatus && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-500">
                      {signal.closeStatus.replace(/_/g, ' ')}
                    </span>
                  )}
                  {signal.status !== 'OPEN' && signal.status !== 'open' && !signal.closeStatus && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-500/20 text-blue-500">
                      {signal.status}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-2 group-hover:text-premium-primary transition-colors">{signal.stock?.symbol || signal.symbol}</h3>
                <p className="text-xs text-premium-text/50 uppercase">{signal.stock?.segment || signal.segment} • {signal.tradeDuration || signal.type}</p>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= signal.confidenceScore ? 'bg-premium-success' : 'bg-premium-border'}`}></div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 bg-premium-bg rounded-2xl p-4 border border-premium-border">
              <div>
                <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Entry Price</p>
                <p className="font-semibold text-sm">{signal.entryPrice}</p>
              </div>
              <div>
                <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Stop Loss</p>
                <p className={`font-semibold text-sm ${signal.closeStatus === 'SL_HIT' ? 'text-red-500 line-through' : 'text-premium-danger'}`}>{signal.stoploss || signal.stopLoss}</p>
              </div>
              <div>
                <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Target 1</p>
                <p className={`font-semibold text-sm ${signal.closeTargets?.includes('TARGET1') ? 'text-yellow-500 font-bold' : 'text-premium-success'}`}>{signal.target1}</p>
              </div>
              <div>
                <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Target 2</p>
                <p className={`font-semibold text-sm ${signal.closeTargets?.includes('TARGET2') ? 'text-yellow-500 font-bold' : 'text-premium-success'}`}>{signal.target2 || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Target 3</p>
                <p className={`font-semibold text-sm ${signal.closeTargets?.includes('TARGET3') ? 'text-yellow-500 font-bold' : 'text-premium-success'}`}>{signal.target3 || '---'}</p>
              </div>
            </div>
            
            {signal.closeStatus && (
              <div className="mb-4 bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                <p className="text-xs font-bold text-yellow-500 mb-1">UPDATE: {signal.closeStatus.replace(/_/g, ' ')}</p>
                {signal.exitPrice && <p className="text-sm">Exit Price: <span className="font-bold">{signal.exitPrice}</span></p>}
                {signal.closeRemark && <p className="text-xs text-premium-text/70 mt-1">{signal.closeRemark}</p>}
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-premium-text/60 border-t border-premium-border pt-4">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {signal.createdAt ? new Date(signal.createdAt).toLocaleString() : (signal.timeFrame || signal.tradeDuration || 'N/A')}</span>
              <span className="flex items-center gap-1">Duration: {signal.tradeDuration?.replace(/_/g, ' ') || 'N/A'}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-premium-border space-y-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowAlertsForSignal(signal); }}
                className="w-full py-2.5 bg-premium-primary/10 text-premium-primary hover:bg-premium-primary/20 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" /> View Alerts {signal.messages && signal.messages.length > 0 ? `(${signal.messages.length})` : ''}
              </button>
              {signal.reportUrl && (
                 <a 
                   href={`${base_ra_url}${signal.reportUrl}`}
                   target="_blank" 
                   rel="noreferrer"
                   onClick={(e) => e.stopPropagation()}
                   className="w-full py-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                 >
                   <FileText className="w-4 h-4" /> Download Report
                 </a>
              )}
            </div>
          </div>
        ))}

        {filteredSignals.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-premium-text/40 bg-premium-cards/50 border border-premium-border border-dashed rounded-3xl">
            <AlertCircle className="w-12 h-12 mb-4 text-premium-border" />
            <p>No {activeTab} signals found for this category.</p>
          </div>
        )}
        </div>
      )}

      {/* Alerts Modal */}
      {showAlertsForSignal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-premium-cards border border-premium-border rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-premium-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-premium-primary" /> 
                Trade Alerts
              </h3>
              <button onClick={() => setShowAlertsForSignal(null)} className="w-8 h-8 rounded-full bg-premium-bg hover:bg-premium-border flex items-center justify-center transition-colors">
                <XCircle className="w-5 h-5 text-premium-text/60" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {(!showAlertsForSignal.messages || showAlertsForSignal.messages.length === 0) ? (
                <div className="text-center py-8 text-premium-text/50">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No alerts for this trade yet.</p>
                </div>
              ) : (
                showAlertsForSignal.messages.map((msg: any) => (
                  <div key={msg.id} className="bg-premium-bg border border-premium-border rounded-2xl p-4">
                    <p className="text-sm text-premium-text/90">{msg.message}</p>
                    <p className="text-[10px] text-premium-text/50 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signal Details Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-premium-cards border border-premium-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
            <div className="sticky top-0 bg-premium-cards/90 backdrop-blur-md border-b border-premium-border p-6 flex justify-between items-center z-10">
              <div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${selectedSignal.callType === 'BUY' || selectedSignal.recommendation === 'BUY' ? 'bg-premium-success/20 text-premium-success' : 'bg-premium-danger/20 text-premium-danger'}`}>
                    {selectedSignal.callType || selectedSignal.recommendation}
                  </span>
                  {selectedSignal.closeStatus && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-500">
                      {selectedSignal.closeStatus.replace(/_/g, ' ')}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold">{selectedSignal.stock?.symbol || selectedSignal.symbol}</h2>
                </div>
                <p className="text-sm text-premium-text/60 mt-1">{selectedSignal.stock?.name || selectedSignal.name} • {selectedSignal.stock?.segment || selectedSignal.segment} • {selectedSignal.createdAt ? new Date(selectedSignal.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
              <button onClick={() => setSelectedSignal(null)} className="w-10 h-10 rounded-full bg-premium-bg hover:bg-premium-border flex items-center justify-center transition-colors">
                <XCircle className="w-6 h-6 text-premium-text/60" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Targets Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-premium-bg p-4 rounded-2xl border border-premium-border">
                  <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Entry Range</p>
                  <p className="font-semibold">{selectedSignal.entryPrice}</p>
                </div>
                <div className="bg-premium-bg p-4 rounded-2xl border border-premium-border">
                  <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Target 1</p>
                  <p className={`font-semibold ${selectedSignal.closeTargets?.includes('TARGET1') ? 'text-yellow-500 font-bold' : 'text-premium-success'}`}>{selectedSignal.target1}</p>
                </div>
                <div className="bg-premium-bg p-4 rounded-2xl border border-premium-border">
                  <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Target 2</p>
                  <p className={`font-semibold ${selectedSignal.closeTargets?.includes('TARGET2') ? 'text-yellow-500 font-bold' : 'text-premium-success'}`}>{selectedSignal.target2 || '---'}</p>
                </div>
                <div className="bg-premium-bg p-4 rounded-2xl border border-premium-border">
                  <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Target 3</p>
                  <p className={`font-semibold ${selectedSignal.closeTargets?.includes('TARGET3') ? 'text-yellow-500 font-bold' : 'text-premium-success'}`}>{selectedSignal.target3 || '---'}</p>
                </div>
                <div className="bg-premium-danger/5 p-4 rounded-2xl border border-premium-danger/20">
                  <p className="text-[10px] text-premium-danger/70 uppercase tracking-wider mb-1">Stop Loss</p>
                  <p className={`font-semibold ${selectedSignal.closeStatus === 'SL_HIT' ? 'text-red-500 line-through' : 'text-premium-danger'}`}>{selectedSignal.stoploss || selectedSignal.stopLoss}</p>
                </div>
              </div>
              
              {selectedSignal.closeStatus && (
                <div className="bg-yellow-500/10 rounded-2xl p-5 border border-yellow-500/20">
                  <h3 className="text-lg font-bold text-yellow-500 mb-2">Trade Update: {selectedSignal.closeStatus.replace(/_/g, ' ')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedSignal.exitPrice && (
                      <div>
                        <p className="text-xs text-yellow-500/70 uppercase tracking-wider mb-1">Exit Price</p>
                        <p className="text-xl font-bold text-yellow-500">{selectedSignal.exitPrice}</p>
                      </div>
                    )}
                    {selectedSignal.closedAt && (
                      <div>
                        <p className="text-xs text-yellow-500/70 uppercase tracking-wider mb-1">Updated On</p>
                        <p className="text-sm font-semibold text-yellow-500/90">{new Date(selectedSignal.closedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedSignal.closeRemark && (
                    <div className="mt-3 pt-3 border-t border-yellow-500/20">
                      <p className="text-sm text-yellow-500/90">{selectedSignal.closeRemark}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-premium-bg px-4 py-2 rounded-xl text-sm border border-premium-border flex items-center gap-2">
                  <span className="text-premium-text/50">Risk/Reward:</span> <span className="font-semibold">{selectedSignal.riskRewardRatio}</span>
                </div>
                <div className="bg-premium-bg px-4 py-2 rounded-xl text-sm border border-premium-border flex items-center gap-2">
                  <span className="text-premium-text/50">Time Frame:</span> <span className="font-semibold">{selectedSignal.timeFrame}</span>
                </div>
                <div className="bg-premium-bg px-4 py-2 rounded-xl text-sm border border-premium-border flex items-center gap-2">
                  <span className="text-premium-text/50">Validity:</span> <span className="font-semibold">{selectedSignal.validity}</span>
                </div>
              </div>

              {/* Rationale */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-premium-primary" /> Analyst Notes
                </h3>
                <div className="bg-premium-bg border border-premium-border p-5 rounded-2xl text-sm leading-relaxed text-premium-text/80">
                  {selectedSignal.reason}
                  <div className="mt-4 pt-4 border-t border-premium-border text-xs text-premium-text/50 flex justify-between items-center">
                    <span>Generated by: {selectedSignal.analyst}</span>
                    <span className="flex items-center gap-1">Confidence: {selectedSignal.confidenceScore}/5</span>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selectedSignal.reportUrl && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Attachments & Charts</h3>
                  <div className="flex gap-3">
                    <a href={api.getDownloadUrl(selectedSignal.reportUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-premium-bg border border-premium-border hover:border-premium-primary px-4 py-3 rounded-xl text-sm transition-colors group">
                      <Download className="w-4 h-4 text-premium-text/50 group-hover:text-premium-primary" />
                      <span>Technical Chart PDF</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
