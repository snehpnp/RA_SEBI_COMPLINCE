'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, CreditCard, TrendingUp, TrendingDown, RefreshCw, Bell, FileText, Download, Target, ChevronRight, Loader2, Clock, XCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function Dashboard({ profile, setActiveTab, onTriggerOnboarding }: { profile: any, setActiveTab: (tab: string) => void, onTriggerOnboarding?: () => void }) {
  const userName = profile?.name?.split(' ')[0] || 'User';
  const [topSignals, setTopSignals] = useState<any[]>([]);
  const [topReports, setTopReports] = useState<any[]>([]);
  const [topActivity, setTopActivity] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [sigRes, repRes, notifRes, subRes] = await Promise.all([
          api.getSignals().catch(() => ({ success: false, data: [] })),
          api.listResearch().catch(() => ({ success: false, data: [] })),
          api.getClientNotifications().catch(() => ({ success: false, data: [] })),
          api.getClientSubscriptions().catch(() => ({ success: false, data: [] }))
        ]);
        
        if (sigRes.success && sigRes.data) {
          setTopSignals(sigRes.data.filter((s: any) => s.status === 'OPEN' || s.status === 'open').slice(0, 3));
        }

        // Combine research from both standalone articles and signal reports
        const signalReports = (sigRes?.success && Array.isArray(sigRes.data))
          ? sigRes.data
              .filter((s: any) => s.reportUrl)
              .map((s: any) => ({
                id: s.id || s._id,
                title: `${s.stock?.symbol || s.symbol || s.stockName || 'Research Report'} ${s.callType ? `• ${s.callType}` : ''}`,
                symbol: s.stock?.symbol || s.symbol || 'STOCK',
                segment: s.segment || 'CASH',
                callType: s.callType || 'BUY',
                reportUrl: s.reportUrl,
                createdAt: s.createdAt,
                type: 'SIGNAL_REPORT'
              }))
          : [];

        const standaloneReports = (repRes?.success && Array.isArray(repRes.data))
          ? repRes.data.map((r: any) => ({
              id: r.id || r._id,
              title: r.title,
              symbol: r.symbol || r.category || 'RESEARCH',
              segment: r.segment || 'ADVISORY',
              reportUrl: r.fileUrl || r.pdfUrl || r.reportUrl,
              createdAt: r.createdAt,
              type: 'ARTICLE'
            }))
          : [];

        const combinedReports = [...signalReports, ...standaloneReports].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        setTopReports(combinedReports.slice(0, 3));
        if (notifRes.success && notifRes.data) {
          setTopActivity(notifRes.data.slice(0, 4));
        }
        if (subRes.success && subRes.data) {
          const active = subRes.data.find((s: any) => s.status === 'ACTIVE');
          setActiveSub(active || null);
        }
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const fetchMarketData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await api.getMarketOverview();
      if (res.success && res.data) {
        setMarketData(res.data);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      }
    } catch (err) {
      console.error('Error fetching market data', err);
    } finally {
      setMarketLoading(false);
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchMarketData();
    
    // Auto-refresh every 15 seconds
    const intervalId = setInterval(() => {
      fetchMarketData(false);
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Derive KYC status from profile
  const isKraVerified = Boolean(profile?.kraVerified === true || profile?.kycStatus === 'VERIFIED' || profile?.kycStatus === 'APPROVED');
  const isAgreementSigned = profile?.agreements?.some(
    (a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE'
  ) || !!profile?.agreementSigned;
  const kycStatus: string = profile?.status || 'PENDING_ONBOARDING';

  const getKycDisplay = () => {
    if (isKraVerified && isAgreementSigned) return { label: 'Fully Verified', color: 'text-premium-success', bg: 'bg-premium-success/20', Icon: ShieldCheck };
    if (kycStatus === 'KYC_FAILED') return { label: 'KYC Failed', color: 'text-premium-danger', bg: 'bg-premium-danger/20', Icon: XCircle };
    if (isKraVerified && !isAgreementSigned) return { label: 'Agreement Pending', color: 'text-premium-warning', bg: 'bg-premium-warning/20', Icon: AlertCircle };
    if (kycStatus === 'KYC_PENDING') return { label: 'KYC Pending', color: 'text-premium-warning', bg: 'bg-premium-warning/20', Icon: Clock };
    return { label: 'KYC Required', color: 'text-amber-500', bg: 'bg-amber-500/20', Icon: AlertCircle };
  };
  const kyc = getKycDisplay();

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500">
      
      {/* Greeting & Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-premium-text">Good Morning, {userName} 👋</h1>
          <p className="text-premium-text/60 text-sm mt-1">Here is what's happening with your account today.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('subscriptions')} className="bg-premium-primary hover:bg-premium-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Buy Plan
          </button>
          <button onClick={() => setActiveTab('support')} className="bg-premium-cards border border-premium-border hover:bg-premium-border text-premium-text px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Raise Ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="bg-premium-cards border border-premium-border p-6 rounded-3xl flex items-center gap-4 cursor-pointer hover:border-premium-primary/40 transition-colors"
          onClick={() => setActiveTab('kyc')}
        >
          <div className={`w-12 h-12 rounded-full ${kyc.bg} flex items-center justify-center`}>
            <kyc.Icon className={`w-6 h-6 ${kyc.color}`} />
          </div>
          <div>
            <p className="text-sm text-premium-text/60">KYC Status</p>
            <p className={`text-lg font-bold ${kyc.color}`}>{kyc.label}</p>
          </div>
        </div>
        
        <div
          className="bg-premium-cards border border-premium-border p-6 rounded-3xl flex items-center gap-4 cursor-pointer hover:border-premium-primary/40 transition-colors"
          onClick={() => setActiveTab('subscriptions')}
        >
          <div className="w-12 h-12 rounded-full bg-premium-primary/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-premium-primary" />
          </div>
          <div>
            <p className="text-sm text-premium-text/60">Subscription</p>
            {activeSub ? (
              <>
                <p className="text-lg font-bold text-premium-text">{activeSub.plan?.name || 'Active Plan'}</p>
                <p className="text-xs text-premium-text/40 mt-0.5">
                  Expires: {new Date(activeSub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-premium-text/40">No Active Plan</p>
            )}
          </div>
        </div>

        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Market Signals */}
        <div className="lg:col-span-2 bg-premium-cards border border-premium-border rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-premium-primary" /> Today's Signals
            </h2>
            <button onClick={() => setActiveTab('signals')} className="text-sm text-premium-primary hover:underline flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-premium-primary" /></div>
            ) : topSignals.length === 0 ? (
              <p className="text-sm text-premium-text/40">No active signals.</p>
            ) : (
              topSignals.map((signal, i) => (
                <div key={i} onClick={() => setActiveTab('signals')} className="p-4 bg-premium-bg border border-premium-border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-premium-primary/50 transition-colors cursor-pointer">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${signal.recommendation === 'BUY' ? 'bg-premium-success/20 text-premium-success' : 'bg-premium-danger/20 text-premium-danger'}`}>
                        {signal.recommendation}
                      </span>
                      <span className="font-bold text-lg">{signal.symbol}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-premium-text/60">
                      <span className="flex items-center gap-1"><Target className="w-4 h-4 text-premium-primary" /> Target 1: {signal.target1}</span>
                      <span className="flex items-center gap-1"><Target className="w-4 h-4 text-premium-primary" /> Target 2: {signal.target2}</span>
                      <span className="flex items-center gap-1 text-premium-danger">SL: {signal.stopLoss}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs text-premium-text/60">Confidence</span>
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5].map(c => (
                        <div key={c} className={`w-2 h-2 rounded-full ${c <= (signal.confidenceScore || 4) ? 'bg-premium-success' : 'bg-premium-bg'}`}></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Market Overview */}
        <div className="bg-premium-cards border border-premium-border rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-premium-text">Market Overview</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-[11px] text-premium-text/40 hidden sm:inline">{lastUpdated}</span>
                )}
                <button
                  onClick={() => fetchMarketData(true)}
                  disabled={isRefreshing}
                  title="Refresh market data"
                  className="p-1.5 rounded-lg hover:bg-premium-bg text-premium-text/60 hover:text-premium-primary transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-premium-primary' : ''}`} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {marketLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-premium-primary" />
                  <span className="text-xs text-premium-text/40">Fetching live market data...</span>
                </div>
              ) : marketData.length > 0 ? (
                marketData.map((item, i) => (
                  <MarketItem key={i} item={item} />
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-premium-text/40">Market data unavailable.</p>
                  <button onClick={() => fetchMarketData(true)} className="mt-2 text-xs text-premium-primary hover:underline">
                    Try Reconnecting
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Latest Research Reports */}
        <div className="lg:col-span-2 bg-premium-cards border border-premium-border rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-premium-primary" /> Latest Research
            </h2>
            <button onClick={() => setActiveTab('research')} className="text-sm text-premium-primary hover:underline flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-premium-primary" /></div>
            ) : topReports.length === 0 ? (
              <p className="col-span-3 text-sm text-premium-text/40">No recent reports.</p>
            ) : (
              topReports.map((r, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveTab('research')} 
                  className="bg-premium-bg border border-premium-border p-4 rounded-2xl hover:border-premium-primary/50 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-9 h-9 rounded-xl bg-premium-primary/10 flex items-center justify-center text-premium-primary group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      {r.segment && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-premium-cards border border-premium-border text-premium-text/70 uppercase">
                          {r.segment}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1 text-premium-text group-hover:text-premium-primary transition-colors line-clamp-2">
                      {r.title}
                    </h3>
                    <p className="text-xs text-premium-text/50 mb-3">
                      {new Date(r.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  
                  {r.reportUrl ? (
                    <a
                      href={api.getDownloadUrl(r.reportUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs text-premium-primary hover:text-white bg-premium-primary/10 hover:bg-premium-primary px-3 py-1.5 rounded-lg font-bold transition-all w-fit mt-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  ) : (
                    <span className="text-xs text-premium-primary font-semibold flex items-center gap-1 mt-2">
                      View Report <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications & Activity */}
        <div className="bg-premium-cards border border-premium-border rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-premium-primary" /> Recent Activity
            </h2>
          </div>
          <div className="space-y-5">
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-premium-primary" /></div>
            ) : topActivity.length === 0 ? (
              <p className="text-sm text-premium-text/40">No recent activity.</p>
            ) : (
              topActivity.map((act, i) => (
                <ActivityItem key={i} text={act.title} time={new Date(act.createdAt || Date.now()).toLocaleDateString()} type={act.type || 'report'} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function UserIconProgress({ percentage }: { percentage: number }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
       <svg className="w-full h-full transform -rotate-90">
         <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-premium-warning/20" />
         <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="125" strokeDashoffset={125 - (125 * percentage) / 100} className="text-premium-warning" />
       </svg>
       <span className="absolute text-[10px] font-bold text-premium-warning">{percentage}%</span>
    </div>
  );
}

function MarketItem({ item }: { item: any }) {
  const isUp = item.isUp !== false;
  const isCurrency = item.category === 'Currency';

  return (
    <div className="p-3 bg-premium-bg/60 hover:bg-premium-bg border border-premium-border/80 hover:border-premium-primary/40 rounded-2xl transition-all duration-200">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-premium-text">{item.name}</span>
            {item.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-premium-cards border border-premium-border text-premium-text/50">
                {item.category}
              </span>
            )}
          </div>
          {item.dayHigh && item.dayLow && item.dayHigh !== '---' ? (
            <p className="text-[11px] text-premium-text/40 mt-0.5">
              H: <span className="text-premium-text/60 font-medium">{item.dayHigh}</span> • L: <span className="text-premium-text/60 font-medium">{item.dayLow}</span>
            </p>
          ) : (
            <p className="text-[11px] text-premium-text/40 mt-0.5">
              Prev: <span className="text-premium-text/60 font-medium">{item.previousClose || item.value}</span>
            </p>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-sm font-bold font-mono tracking-tight text-premium-text">
            {isCurrency ? `₹${item.value}` : item.value}
          </div>
          <div className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] mt-0.5 ${
            isUp 
              ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3 stroke-[2.5]" /> : <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
            <span>{item.change} ({item.percentChange})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, date, icon: Icon }: { title: string, date: string, icon: any }) {
  return (
    <div className="bg-premium-bg border border-premium-border p-4 rounded-2xl hover:border-premium-primary/50 transition-colors group cursor-pointer">
      <Icon className="w-6 h-6 text-premium-text/50 group-hover:text-premium-primary mb-3 transition-colors" />
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-premium-text/50 mb-3">{date}</p>
      <div className="flex items-center gap-1 text-xs text-premium-primary font-medium">
        <Download className="w-3 h-3" /> Download PDF
      </div>
    </div>
  );
}

function ActivityItem({ text, time, type }: { text: string, time: string, type: 'signal'|'report'|'payment' }) {
  const getIcon = () => {
    if (type === 'signal') return <Target className="w-4 h-4 text-premium-success" />;
    if (type === 'report') return <FileText className="w-4 h-4 text-premium-primary" />;
    return <CreditCard className="w-4 h-4 text-premium-warning" />;
  };
  
  return (
    <div className="flex gap-3">
      <div className="mt-0.5">{getIcon()}</div>
      <div>
        <p className="text-sm font-medium">{text}</p>
        <p className="text-xs text-premium-text/50">{time}</p>
      </div>
    </div>
  );
}
