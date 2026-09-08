'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers, Target, FileText, CreditCard, Receipt,
  ShieldCheck, ShieldAlert, MessageSquare, Bell, User, Settings,
  Scale, LogOut, Menu, X, Loader2, ChevronRight, BarChart
} from 'lucide-react';
import api from '../../services/api';

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

  useEffect(() => {
    // Let ThemeProvider handle theme

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

          // Determine if user needs onboarding
          // Criteria: Needs VERIFIED KYC, signed agreement, and at least 1 active subscription.
          const isKycDone = p.kycStatus === 'VERIFIED' || p.kycStatus === 'APPROVED' || p.status === 'ACTIVE' || p.status === 'PAYMENT_PENDING' || p.status === 'AGREEMENT_PENDING';
          const isAgreementDone = !!p.agreementSigned || p.status === 'ACTIVE' || p.status === 'PAYMENT_PENDING';
          const hasActivePlan = subRes.success && subRes.data.length > 0;

          if (hasActivePlan && (!isKycDone || !isAgreementDone)) {
            // Force onboarding if they have a plan (e.g. assigned by admin) but missing KYC/Agreement
            setShowOnboarding(true);
          } else {
            // If they don't have a plan, let them browse the dashboard.
            setShowOnboarding(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        // Simulate a smooth loading experience
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchData();
  }, []);

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
      case 'dashboard': return <Dashboard profile={profile} setActiveTab={setActiveTab} onTriggerOnboarding={() => setShowOnboarding(true)} />;
      case 'signals': return <MarketSignals />;
      case 'research': return <ResearchReports />;
      case 'subscriptions': return <SubscriptionCenter profile={profile} onTriggerOnboarding={() => setShowOnboarding(true)} />;
      case 'payments': return <PaymentCenter profile={profile} />;
      case 'kyc': return <KYCCenter onTriggerOnboarding={() => setShowOnboarding(true)} />;
      case 'complaints': return <ComplaintsCenter profile={profile} />;
      case 'complaint-status': return <CustomPageView page={{ slug: 'complaint-status', title: 'Complaint Data' }} />;
      case 'support': return <SupportCenter />;
      case 'notifications': return <Notifications />;
      case 'profile': return <ProfileSettings />;
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
                setActiveTab(page.slug);
              }
            }}
          />
        );
      default: {
        const page = pages.find(p => p.slug === activeTab);
        if (page) {
          return <CustomPageView page={page} />;
        }
        return <Dashboard profile={profile} setActiveTab={setActiveTab} onTriggerOnboarding={() => setShowOnboarding(true)} />;
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

  if (showOnboarding) {
    return <OnboardingWizard profile={profile} onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="h-dvh bg-premium-bg text-premium-text flex font-sans overflow-hidden">


      <WelcomeInstructionModal
        profile={profile}
        onClose={() => { }}
        onStart={() => setShowOnboarding(true)}
      />


      {/* Premium Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border text-white transform transition-all duration-300 ease-in-out flex flex-col ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${!mobileMenuOpen && isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>

        {/* Brand */}
        <div className={`h-20 flex items-center border-b border-blue-800 dark:border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            {logoUrl && logoUrl !== '/logo-light.png' ? (
              <img src={logoUrl} alt={appName || 'Logo'} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[150px]'}`} />
            ) : currentUser?.tenantLogo ? (
              <img src={currentUser.tenantLogo} alt={currentUser.tenantName || 'Logo'} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[150px]'}`} />
            ) : (
              <>
                <img src="/logo-light.png" alt="RAGCP Logo" className={`dark:hidden object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
                <img src="/logo-dark.png" alt="RAGCP Logo" className={`hidden dark:block object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
              </>
            )}
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
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-white/15 text-white font-bold shadow-md shadow-black/10'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
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
              onProfileClick={() => setActiveTab('profile' as any)}
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

