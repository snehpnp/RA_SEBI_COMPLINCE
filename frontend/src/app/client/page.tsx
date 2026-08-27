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
import { useBranding } from '../../contexts/BrandingContext';

import dynamic from 'next/dynamic';

function ClientPortalContent() {
  const router = useRouter();
  const { appName, logoUrl } = useBranding();
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  const handleLogout = async (allDevices: boolean = false) => {
    await api.logout(allDevices);
    window.location.href = '/login';
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
        return (
          <Legal
            pages={pages}
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

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-premium-cards border border-premium-border flex items-center justify-center"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5 text-premium-text" /> : <Menu className="w-5 h-5 text-premium-text" />}
      </button>

      {/* Premium Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border text-white transform transition-all duration-300 ease-in-out flex flex-col ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${!mobileMenuOpen && isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>

        {/* Brand */}
        <div className={`h-24 flex items-center border-b border-blue-800 dark:border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
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
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex w-full items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
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
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              >
                <item.icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
                {!isSidebarCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                )}
              </button>
            )
          })}

          {/* Dynamic Policies Section */}
          {pages.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setPoliciesExpanded(!policiesExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-white/70 hover:bg-white/5 hover:text-white group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-white/50 group-hover:text-white/80 shrink-0" />
                  {!isSidebarCollapsed && <span>Policies</span>}
                </div>
                {!isSidebarCollapsed && (
                  <div className={`transition-transform duration-200 ${policiesExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </button>

              {!isSidebarCollapsed && policiesExpanded && (
                <div className="pl-12 pr-4 space-y-1 mt-1">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        if (page.type === 'URL' && page.externalUrl) {
                          window.open(page.externalUrl, '_blank');
                        } else {
                          setActiveTab(page.slug);
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === page.slug
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className={`p-4 border-t border-blue-800 dark:border-premium-border relative overflow-hidden flex flex-col ${isSidebarCollapsed ? 'px-2' : ''}`}>
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />

          <div
            onClick={() => { setActiveTab('profile' as any); setMobileMenuOpen(false); }}
            className={`bg-white/5 backdrop-blur-md rounded-2xl flex items-center gap-3 border border-white/10 hover:border-white/30 transition-all duration-300 group relative overflow-hidden cursor-pointer ${isSidebarCollapsed ? 'p-2 justify-center flex-col' : 'p-4'}`}>

            {/* Shimmer effect inside the card */}
            <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_infinite]" />

            <div className="relative shrink-0">
              {/* Pulsing ring around avatar */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/50 animate-ping opacity-75" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-white shadow-[0_0_10px_rgba(251,191,36,0.5)] relative z-10">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'H'}
              </div>
              {/* Online/Verified indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-blue-900 rounded-full z-20" />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 relative z-10">
                <p className="font-bold text-sm truncate text-white">{profile?.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <p className="text-[10px] font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 animate-pulse">
                    Premium Member
                  </p>
                </div>
              </div>
            )}

            {!isSidebarCollapsed && (
              <div className="relative z-10 shrink-0 mr-1"><ThemeToggle /></div>
            )}
          </div>
          <div className={`flex-1 mt-4 border-t border-blue-800/50 dark:border-white/10 ${isSidebarCollapsed ? 'p-2' : 'pt-4'}`}>
            <button onClick={() => setIsLogoutModalOpen(true)} className={`w-full flex items-center hover:bg-red-500/10 rounded-xl text-white/60 hover:text-red-400 transition-all group ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between p-3'}`}>
              {!isSidebarCollapsed && <span className="font-semibold text-sm">Sign Out</span>}
              <LogOut className={`w-4 h-4 transition-transform ${!isSidebarCollapsed ? 'group-hover:translate-x-1' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-dvh overflow-y-auto custom-scrollbar bg-premium-bg relative">
        {/* Subtle background glow for main content */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-premium-primary/5 blur-[150px] pointer-events-none" />

        <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-full relative z-10">
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

