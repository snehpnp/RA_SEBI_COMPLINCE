'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers, Target, FileText, CreditCard, Receipt,
  ShieldCheck, ShieldAlert, MessageSquare, Bell, User, Settings,
  Scale, LogOut, Menu, X, Loader2, ChevronRight, BarChart, Sparkles, Check, Lock
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

// Components
import Dashboard from '../../components/client/Dashboard';
import MarketSignals from '../../components/client/MarketSignals';
import ResearchReports from '../../components/client/ResearchReports';
import SubscriptionCenter from '../../components/client/SubscriptionCenter';
import PaymentCenter from '../../components/client/PaymentCenter';
import KYCCenter from '../../components/client/KYCCenter';
import ComplaintsCenter from '../../components/client/ComplaintsCenter';
import SupportCenter from '../../components/client/SupportCenter';
import ProfileSettings from '../../components/client/ProfileSettings';
import Notifications from '../../components/client/Notifications';
import Legal from '../../components/client/Legal';
import OnboardingWizard from '../../components/client/OnboardingWizard';
import WelcomeInstructionModal from '../../components/client/WelcomeInstructionModal';
import CustomPageView from '../../components/client/CustomPageView';
import { ThemeToggle } from '../../components/ThemeToggle';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import { useBranding } from '../../contexts/BrandingContext';

import dynamic from 'next/dynamic';

function ClientPortalContent() {
  const router = useRouter();
  const { appName, logoUrl } = useBranding();
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clientActiveTab') || 'dashboard';
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login?error=expired');
        return;
      }
      localStorage.setItem('clientActiveTab', activeTab);
    }
  }, [activeTab, router]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [policiesExpanded, setPoliciesExpanded] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Targeted Plan State for Locked Signals -> Subscription Highlighting
  const [targetPlanId, setTargetPlanId] = useState<string | null>(null);
  const [targetPlanName, setTargetPlanName] = useState<string | null>(null);

  // Real-time Notification & Live Trade Alert System
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [activeRealtimeAlert, setActiveRealtimeAlert] = useState<any | null>(null);
  const [dataRefreshCounter, setDataRefreshCounter] = useState(0);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const realtimeAlertRef = useRef<HTMLDivElement>(null);

  // Play audio chime for new live trade / report alert
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio might not play if user hasn't interacted yet
    }
  };

  const fetchNotifications = async (silent = false) => {
    try {
      const res = await api.getClientNotifications();
      if (res.success && Array.isArray(res.data)) {
        const notifs = res.data;
        setNotifications(notifs);

        const unread = notifs.filter((n: any) => !n.isRead && !n.read && n.status !== 'READ');
        setUnreadNotifCount(unread.length);

        if (notifs.length > 0) {
          const newest = notifs[0];
          const newestId = String(newest.id || newest._id);

          // If this is a new notification after initial page load and it's unread
          const isNewNotif = !lastSeenNotifIdRef.current || newestId !== lastSeenNotifIdRef.current;
          if (initialLoadDoneRef.current && isNewNotif) {
            const isUnread = !newest.isRead && !newest.read && newest.status !== 'READ';
            if (isUnread) {
              setActiveRealtimeAlert(newest);
              playNotificationChime();
              setDataRefreshCounter(prev => prev + 1);
            }
          }

          lastSeenNotifIdRef.current = newestId;
        }

        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
        }
      }
    } catch (err) {
      // Background poll silently fails
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markClientNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      setUnreadNotifCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      const [profileRes, subRes, pagesRes] = await Promise.all([
        api.getClientProfile().catch(() => ({ success: false, data: null })),
        api.getClientSubscriptions().catch(() => ({ success: false, data: [] })),
        api.request('/pages').catch(() => ({ success: false, data: [] }))
      ]);

      if (pagesRes?.success && pagesRes.data) {
        setPages(pagesRes.data);
      }

      if (profileRes?.success && profileRes.data) {
        const p = profileRes.data;
        setProfile(p);

        // Determine if user has an active assigned plan (from admin or purchase)
        const hasPlan = Boolean(
          (subRes?.success && Array.isArray(subRes.data) && subRes.data.some((s: any) => s.status === 'ACTIVE' || s.status === 'active')) ||
          (p.subscriptions && Array.isArray(p.subscriptions) && p.subscriptions.some((s: any) => s.status === 'ACTIVE' || s.status === 'active')) ||
          (p.status === 'ACTIVE' && (p.subscriptions?.length > 0 || p.plan))
        );

        // Determine if compliance onboarding is fully completed
        const isKycDone = Boolean(p.kraVerified === true || p.kycStatus === 'VERIFIED' || p.kycStatus === 'APPROVED');
        const isAgreementDone = Boolean(p.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE') || p.agreementSigned);
        const isFully = isKycDone && isAgreementDone;

        // Strict compliance check: If plan is assigned AND KYC/Agreement is pending, lock access & open onboarding
        if (hasPlan && !isFully) {
          setShowOnboarding(true);
          setActiveTab('kyc');
        } else {
          setShowOnboarding(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  useEffect(() => {
    fetchData();
    fetchNotifications();
    const notifInterval = setInterval(() => {
      fetchNotifications(true);
    }, 4000);
    return () => clearInterval(notifInterval);
  }, []);

  // Auto-close realtime alert on outside click or after 15 seconds
  useEffect(() => {
    if (!activeRealtimeAlert) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (realtimeAlertRef.current && !realtimeAlertRef.current.contains(e.target as Node)) {
        setActiveRealtimeAlert(null);
      }
    };

    const attachTimer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);

    const autoDismissTimer = setTimeout(() => {
      setActiveRealtimeAlert(null);
    }, 15000);

    return () => {
      clearTimeout(attachTimer);
      clearTimeout(autoDismissTimer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activeRealtimeAlert]);

  // Check if client has an active assigned plan
  const hasAssignedPlan = Boolean(
    (profile?.subscriptions && Array.isArray(profile.subscriptions) && profile.subscriptions.some((s: any) => s.status === 'ACTIVE' || s.status === 'active')) ||
    (profile?.status === 'ACTIVE' && (profile?.subscriptions?.length > 0 || profile?.plan))
  );

  // Check if compliance onboarding is fully completed
  const isKycDone = Boolean(profile?.kraVerified === true || profile?.kycStatus === 'VERIFIED' || profile?.kycStatus === 'APPROVED');
  const isAgreementDone = Boolean(profile?.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE') || profile?.agreementSigned);
  const isFullyOnboarded = isKycDone && isAgreementDone;

  const handleTabChange = (newTab: string, planId?: string | null, planName?: string | null) => {
    // Immediately close any open alert popups or notification dropdowns on tab switch
    setActiveRealtimeAlert(null);
    setIsNotifDropdownOpen(false);

    if (planId !== undefined) {
      setTargetPlanId(planId);
      setTargetPlanName(planName !== undefined ? planName : null);
    } else if (newTab !== 'subscriptions') {
      setTargetPlanId(null);
      setTargetPlanName(null);
    }

    // Strict Compliance Guard: If plan is assigned but KYC / Agreement incomplete, block other tabs and redirect to KYC
    if (hasAssignedPlan && !isFullyOnboarded) {
      if (newTab !== 'kyc' && newTab !== 'support' && newTab !== 'legal') {
        toast.error('SEBI Compliance Alert: Please complete DigiLocker KYC and Advisory Agreement first.');
        setActiveTab('kyc');
        setShowOnboarding(true);
        return;
      }
    }

    setActiveTab(newTab);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clientActiveTab', newTab);
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'signals', label: 'Market Signals', icon: Target },
    { id: 'research', label: 'Research Reports', icon: FileText },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'payments', label: 'Payment History', icon: Receipt },
    { id: 'kyc', label: 'KYC Center', icon: ShieldCheck },
    { id: 'complaints', label: 'Raise Complaints', icon: ShieldAlert },
    { id: 'complaint-status', label: 'Complaint Data', icon: BarChart },
    { id: 'support', label: 'Support', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'legal', label: 'Legal', icon: Scale },
  ];

  const handleLogout = async (allDevices = false) => {
    setIsLogoutModalOpen(false);
    await api.logout(allDevices);
    router.push('/login');
  };

  const getFullUrl = (url?: string | null) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl() + ''}${url}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <Dashboard
          profile={profile}
          setActiveTab={handleTabChange}
          onTriggerOnboarding={() => setShowOnboarding(true)}
          onUnlockTrade={(signal) => {
            if (!isFullyOnboarded) {
              handleTabChange('kyc');
            } else {
              handleTabChange('subscriptions', signal?.planId || null, signal?.planName || null);
            }
          }}
          refreshTrigger={dataRefreshCounter}
        />
      );
      case 'signals': return (
        <MarketSignals
          onUnlockTrade={(signal) => {
            if (!isFullyOnboarded) {
              handleTabChange('kyc');
            } else {
              handleTabChange('subscriptions', signal?.planId || null, signal?.planName || null);
            }
          }}
        />
      );
      case 'research': return <ResearchReports />;
      case 'subscriptions': return (
        <SubscriptionCenter
          profile={profile}
          onNavigateToKyc={() => handleTabChange('kyc')}
          onTriggerOnboarding={() => setShowOnboarding(true)}
          targetPlanId={targetPlanId}
          targetPlanName={targetPlanName}
          onClearTargetPlan={() => {
            setTargetPlanId(null);
            setTargetPlanName(null);
          }}
        />
      );
      case 'payments': return <PaymentCenter profile={profile} />;
      case 'kyc': return <KYCCenter onTriggerOnboarding={() => setShowOnboarding(true)} />;
      case 'complaints': return <ComplaintsCenter profile={profile} />;
      case 'complaint-status': return <CustomPageView page={{ slug: 'complaint-status', title: 'Complaint Data' }} />;
      case 'support': return <SupportCenter />;
      case 'notifications': return <Notifications onNavigateToTab={handleTabChange} onRefreshUnreadCount={fetchNotifications} />;
      case 'profile': return <ProfileSettings onNavigateToKyc={() => handleTabChange('kyc')} />;
      case 'legal':
        const legalPages = [...pages];
        if (profile?.user?.tenant?.termsPdfUrl) {
          legalPages.push({ id: 'termsPdf', title: 'Terms & Conditions', slug: 'terms-conditions', type: 'URL', externalUrl: getFullUrl(profile.user.tenant.termsPdfUrl) });
        }
        if (profile?.user?.tenant?.privacyPdfUrl) {
          legalPages.push({ id: 'privacyPdf', title: 'Privacy Policy', slug: 'privacy-policy', type: 'URL', externalUrl: getFullUrl(profile.user.tenant.privacyPdfUrl) });
        }
        if (profile?.user?.tenant?.internalPolicyUrl) {
          // Check if Internal Policy already exists in the API response to avoid duplicates
          if (!legalPages.some(p => p.slug === 'internal-policy')) {
            legalPages.push({ id: 'internalPolicyPdf', title: 'Internal Policy', slug: 'internal-policy', type: 'URL', externalUrl: getFullUrl(profile.user.tenant.internalPolicyUrl) });
          }
        }
        return (
          <Legal
            pages={legalPages}
            onReadDocument={(page: any) => {
              if (page.type === 'URL' && page.externalUrl) {
                window.open(page.externalUrl, '_blank');
              } else {
                handleTabChange(page.slug);
              }
            }}
          />
        );
      default: {
        const page = pages.find(p => p.slug === activeTab);
        if (page) {
          return <CustomPageView page={page} />;
        }
        return <Dashboard profile={profile} setActiveTab={handleTabChange} onTriggerOnboarding={() => setShowOnboarding(true)} />;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-bg flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-premium-primary/20 flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-premium-primary animate-spin" />
        </div>
        <p className="text-premium-text/60 font-sans tracking-widest uppercase text-sm">Loading Workspace</p>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-premium-bg text-premium-text flex font-sans overflow-hidden relative">
      {/* Onboarding Wizard Modal Overlay */}
      {showOnboarding && (
        <OnboardingWizard
          profile={profile}
          onClose={() => setShowOnboarding(false)}
          onComplete={() => {
            setShowOnboarding(false);
            fetchData();
          }}
        />
      )}

      <WelcomeInstructionModal
        profile={profile}
        onClose={() => { }}
        onStart={() => setShowOnboarding(true)}
      />

      {/* Floating On-Screen Real-Time Alert Banner / Popup */}
      {activeRealtimeAlert && (
        <div
          ref={realtimeAlertRef}
          className="fixed top-5 right-5 z-[100] max-w-sm w-full bg-white dark:bg-slate-900 border-2 border-primary-500 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  Live Alert
                </span>
                <button
                  onClick={() => setActiveRealtimeAlert(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Close alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                {activeRealtimeAlert.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {activeRealtimeAlert.message}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    const type = (activeRealtimeAlert.type || '').toLowerCase();
                    if (type === 'report') {
                      handleTabChange('research');
                    } else {
                      handleTabChange('signals');
                    }
                    setActiveRealtimeAlert(null);
                  }}
                  className="flex-1 py-1.5 px-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>View Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveRealtimeAlert(null)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Premium Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border text-white transform transition-all duration-300 ease-in-out flex flex-col ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${!mobileMenuOpen && isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>

        {/* Brand */}
        <div className={`h-20 flex items-center border-b border-blue-800 dark:border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            {(() => {
              const rawLogo = (logoUrl && logoUrl !== '/logo-light.png') ? logoUrl : (currentUser?.tenantLogo || currentUser?.tenant?.logoUrl);
              const logoSrc = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${api.getBaseUrl()}${rawLogo}`) : null;
              const displayName = appName || currentUser?.tenantName || currentUser?.tenant?.companyName || 'Logo';

              if (logoSrc) {
                return (
                  <img src={logoSrc} alt={displayName} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[150px]'}`} />
                );
              }
              return (
                <>
                  <img src="/logo-light.png" alt="RAGCP Logo" className={`dark:hidden object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
                  <img src="/logo-dark.png" alt="RAGCP Logo" className={`hidden dark:block object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
                </>
              );
            })()}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex w-full items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Expand Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 hide-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isNotif = item.id === 'notifications';
            const isLockedByCompliance = hasAssignedPlan && !isFullyOnboarded && (item.id === 'dashboard' || item.id === 'signals' || item.id === 'research' || item.id === 'subscriptions' || item.id === 'payments');
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-white/15 text-white font-bold shadow-md shadow-black/10'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? (isLockedByCompliance ? `${item.label} (KYC Pending)` : item.label) : undefined}
              >
                <div className="relative shrink-0">
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`} />
                  {isNotif && unreadNotifCount > 0 && isSidebarCollapsed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
                  )}
                  {isLockedByCompliance && isSidebarCollapsed && (
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full flex items-center justify-center text-[7px] text-black font-bold">🔒</span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate text-left">{item.label}</span>
                    {isLockedByCompliance && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 ml-1">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                )}
                {!isSidebarCollapsed && isNotif && unreadNotifCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
                {!isSidebarCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                )}
              </button>
            )
          })}

          {profile?.user?.tenant?.termsPdfUrl && (
            <a href={getFullUrl(profile.user.tenant.termsPdfUrl)} target="_blank" rel="noreferrer" className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group text-white/70 hover:bg-white/5 hover:text-white ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? "Terms & Conditions" : undefined}>
              <FileText className="w-5 h-5 transition-colors shrink-0 text-white/50 group-hover:text-white/80" />
              {!isSidebarCollapsed && <span>Terms & Conditions</span>}
            </a>
          )}
          
          {profile?.user?.tenant?.privacyPdfUrl && (
            <a href={getFullUrl(profile.user.tenant.privacyPdfUrl)} target="_blank" rel="noreferrer" className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group text-white/70 hover:bg-white/5 hover:text-white ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? "Privacy Policy" : undefined}>
              <FileText className="w-5 h-5 transition-colors shrink-0 text-white/50 group-hover:text-white/80" />
              {!isSidebarCollapsed && <span>Privacy Policy</span>}
            </a>
          )}
          
          {profile?.user?.tenant?.internalPolicyUrl && (
            <a href={getFullUrl(profile.user.tenant.internalPolicyUrl)} target="_blank" rel="noreferrer" className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group text-white/70 hover:bg-white/5 hover:text-white ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? "Internal Policy" : undefined}>
              <FileText className="w-5 h-5 transition-colors shrink-0 text-white/50 group-hover:text-white/80" />
              {!isSidebarCollapsed && <span>Internal Policy</span>}
            </a>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-dvh flex flex-col overflow-hidden bg-premium-bg relative">
        {/* Subtle background glow for main content */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-premium-primary/5 blur-[150px] pointer-events-none" />

        {/* Top Header Bar with Theme, User & Logout */}
        <header className="h-20 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between shrink-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
              title="Open Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-base md:text-xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label || (activeTab === 'profile' ? 'Profile Settings' : activeTab.replace(/-/g, ' '))}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {currentUser?.tenantName ? `${currentUser.tenantName} Client Portal` : 'Client Investment & Research Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Real-time Notification Bell with Badge & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center"
                title="Notifications & Trade Alerts"
              >
                <Bell className={`w-5 h-5 ${unreadNotifCount > 0 ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md shadow-rose-600/30 animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotifDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifDropdownOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Live Alerts</span>
                        {unreadNotifCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 text-[10px] font-bold">
                            {unreadNotifCount} new
                          </span>
                        )}
                      </div>
                      {unreadNotifCount > 0 && (
                        <button
                          onClick={handleMarkAllNotifsRead}
                          className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                      {notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center">
                          <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n: any) => {
                          const isUnread = !n.isRead && !n.read && n.status !== 'READ';
                          const type = (n.type || '').toLowerCase();
                          return (
                            <div
                              key={n.id || n._id}
                              onClick={() => {
                                setIsNotifDropdownOpen(false);
                                if (type === 'report') {
                                  handleTabChange('research');
                                } else {
                                  handleTabChange('signals');
                                }
                              }}
                              className={`p-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                                isUnread ? 'bg-primary-50/30 dark:bg-primary-950/20' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                                type === 'signal' || type === 'alert' || type === 'update'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : type === 'report'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                              }`}>
                                {type === 'signal' ? <Target className="w-4 h-4" /> : type === 'report' ? <FileText className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {n.title}
                                  </h5>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {n.message}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 text-center">
                      <button
                        onClick={() => {
                          setIsNotifDropdownOpen(false);
                          handleTabChange('notifications');
                        }}
                        className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-500 flex items-center justify-center gap-1 mx-auto"
                      >
                        <span>View All Notifications</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <ThemeToggle />
            </div>

            {/* Profile Dropdown with Username & Logout */}
            <UserProfileDropdown
              user={{
                name: profile?.name || 'Client',
                email: profile?.email || profile?.user?.email,
                role: 'Client'
              }}
              badgeLabel="Premium Member"
              badgeColor="amber"
              onProfileClick={() => handleTabChange('profile')}
              onLogoutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>
        </header>

        {/* Content Scroll View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 md:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
            <LogOut className="h-12 w-12 text-rose-600 dark:text-rose-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-center mb-2 text-slate-800 dark:text-white">Sign Out</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-6">Are you sure you want to sign out of your account?</p>
            {profile?.allowMultiDeviceLogin ? (
              <div className="flex flex-col space-y-3">
                <button onClick={() => handleLogout(false)} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Sign out on this device</button>
                <button onClick={() => handleLogout(true)} className="w-full py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-500 hover:bg-rose-900/40 text-sm font-bold rounded-xl transition-colors">Sign out on ALL devices</button>
                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300 mt-2">Cancel</button>
              </div>
            ) : (
              <div className="flex justify-center space-x-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={() => handleLogout(false)} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Log Out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(ClientPortalContent), { ssr: false });

