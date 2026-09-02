'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, CreditCard, TrendingUp, Bell, FileText, Download, Target, ChevronRight, Loader2, Clock, XCircle, AlertCircle } from 'lucide-react';
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
        if (repRes.success && repRes.data) {
          setTopReports(repRes.data.slice(0, 3));
        }
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

  useEffect(() => {
    let isMounted = true;
    
    const fetchMarketData = async () => {
      try {
        const res = await api.getMarketOverview();
        if (res.success && res.data && isMounted) {
          setMarketData(res.data);
        }
      } catch (err) {
        console.error('Error fetching market data', err);
      } finally {
        if (isMounted) setMarketLoading(false);
      }
    };
    
    // Initial fetch
    fetchMarketData();
    
    // Auto-refresh every 15 seconds
    const intervalId = setInterval(fetchMarketData, 15000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Derive KYC status from profile
  const kycStatus: string = profile?.status || 'PENDING_ONBOARDING';
  const getKycDisplay = () => {
    if ((kycStatus === 'ACTIVE' && !!profile?.agreementSigned) || kycStatus === 'PAYMENT_PENDING' || profile?.kycStatus === 'VERIFIED') return { label: 'Verified', color: 'text-premium-success', bg: 'bg-premium-success/20', Icon: ShieldCheck };
    if (kycStatus === 'KYC_FAILED') return { label: 'KYC Failed', color: 'text-premium-danger', bg: 'bg-premium-danger/20', Icon: XCircle };
    if (kycStatus === 'KYC_PENDING' || (kycStatus === 'ACTIVE' && !profile?.agreementSigned)) return { label: 'Pending', color: 'text-premium-warning', bg: 'bg-premium-warning/20', Icon: Clock };
    if (kycStatus === 'AGREEMENT_PENDING') return { label: 'Agreement Pending', color: 'text-premium-warning', bg: 'bg-premium-warning/20', Icon: AlertCircle };
    return { label: 'Not Started', color: 'text-premium-text/50', bg: 'bg-premium-text/10', Icon: AlertCircle };
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="bg-premium-cards border border-premium-border p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-500" />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm text-premium-text/60">Service Accuracy</p>
              <p className="text-sm font-bold text-amber-500">92%</p>
            </div>
            <div className="w-full h-1.5 bg-premium-bg rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '92%' }}></div>
            </div>
            <p className="text-xs text-premium-text/40 mt-1">Based on closed signals</p>
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
        <div className="bg-premium-cards border border-premium-border rounded-3xl p-6">
          <h2 className="text-lg font-semibold mb-6">Market Overview</h2>
          <div className="space-y-4">
            {marketLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-premium-primary" /></div>
            ) : marketData.length > 0 ? (
              marketData.map((item, i) => (
                <MarketItem key={i} name={item.name} value={item.value} change={item.change} isUp={item.isUp} />
              ))
            ) : (
              <p className="text-sm text-premium-text/40">Market data unavailable.</p>
            )}
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
                <div key={i} onClick={() => setActiveTab('research')} className="bg-premium-bg border border-premium-border p-4 rounded-2xl hover:border-premium-primary/50 transition-colors group cursor-pointer">
                  <FileText className="w-6 h-6 text-premium-text/50 group-hover:text-premium-primary mb-3 transition-colors" />
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">{r.title}</h3>
                  <p className="text-xs text-premium-text/50 mb-3">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</p>
                  <div className="flex items-center gap-1 text-xs text-premium-primary font-medium">
                    <Download className="w-3 h-3" /> Download PDF
                  </div>
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

function MarketItem({ name, value, change, isUp }: { name: string, value: string, change: string, isUp: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-premium-text/80 font-medium">{name}</span>
      <div className="text-right">
        <div className="text-sm font-semibold">{value}</div>
        <div className={`text-xs ${isUp ? 'text-premium-success' : 'text-premium-danger'}`}>{change}</div>
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
