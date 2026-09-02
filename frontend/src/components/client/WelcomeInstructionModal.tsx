'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, CreditCard, Target, ChevronRight, X, Sparkles } from 'lucide-react';

export default function WelcomeInstructionModal({ profile, onClose, onStart }: { profile: any, onClose: () => void, onStart: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Check if the user is genuinely new (e.g., PENDING_ONBOARDING)
    // Or if they haven't seen the modal in this session
    const hasSeen = localStorage.getItem('hasSeenWelcomeModal');
    const isNew = ['PENDING_ONBOARDING', 'KYC_PENDING', 'AGREEMENT_PENDING'].includes(profile?.status) || 
                  ['PENDING_ONBOARDING', 'KYC_PENDING', 'AGREEMENT_PENDING'].includes(profile?.kycStatus);
    
    if (isNew && !hasSeen) {
      setIsOpen(true);
    }
  }, [profile]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenWelcomeModal', 'true');
    onClose();
  };

  const handleStart = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenWelcomeModal', 'true');
    onStart();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-premium-cards border border-premium-border/50 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-premium-primary via-premium-warning to-premium-primary" />
        <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-premium-primary/10 blur-[80px] pointer-events-none" />
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-premium-text/50 hover:text-premium-text bg-premium-bg/50 hover:bg-premium-bg rounded-full transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-10 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-premium-primary/20 flex items-center justify-center border border-premium-primary/30">
              <Sparkles className="w-6 h-6 text-premium-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                Welcome to RAGCP!
              </h2>
              <p className="text-premium-text/60 mt-1">Let's get you set up in 3 simple steps.</p>
            </div>
          </div>

          <div className="space-y-6 mt-8">
            {/* Step 1 */}
            <div className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center text-premium-primary font-bold group-hover:border-premium-primary/50 group-hover:bg-premium-primary/10 transition-colors z-10">
                  1
                </div>
                <div className="w-px h-full bg-premium-border group-hover:bg-premium-primary/30 transition-colors my-2" />
              </div>
              <div className="pb-6 pt-1">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-premium-text">
                  <ShieldCheck className="w-5 h-5 text-premium-warning" />
                  Sign Agreement (SEBI Mandate)
                </h3>
                <p className="text-sm text-premium-text/60 mt-2 leading-relaxed">
                  As per SEBI guidelines, it is mandatory to sign a service agreement before taking any plan. This process is seamless and securely powered by Digio.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center text-premium-primary font-bold group-hover:border-premium-primary/50 group-hover:bg-premium-primary/10 transition-colors z-10">
                  2
                </div>
                <div className="w-px h-full bg-premium-border group-hover:bg-premium-primary/30 transition-colors my-2" />
              </div>
              <div className="pb-6 pt-1">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-premium-text">
                  <CreditCard className="w-5 h-5 text-premium-success" />
                  Choose & Pay for Service
                </h3>
                <p className="text-sm text-premium-text/60 mt-2 leading-relaxed">
                  Once your agreement is signed, browse through our premium plans and complete the payment for the service that best suits your trading style.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center text-premium-primary font-bold group-hover:border-premium-primary/50 group-hover:bg-premium-primary/10 transition-colors z-10">
                  3
                </div>
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-premium-text">
                  <Target className="w-5 h-5 text-amber-500" />
                  Receive Trades & Signals
                </h3>
                <p className="text-sm text-premium-text/60 mt-2 leading-relaxed">
                  After successful payment, log in to your dashboard to view high-accuracy trades, market signals, and research reports based on your subscription.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-4">
            <button 
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl border border-premium-border hover:bg-premium-bg text-premium-text/80 font-semibold transition-colors"
            >
              Explore Dashboard
            </button>
            <button 
              onClick={handleStart}
              className="flex-1 py-3 px-4 rounded-xl bg-premium-primary hover:bg-premium-primary/90 text-white font-bold shadow-lg hover:shadow-xl dark:shadow-[0_0_15px_var(--tw-colors-premium-primary)] dark:hover:shadow-[0_0_25px_var(--tw-colors-premium-primary)] transition-all flex items-center justify-center gap-2"
            >
              Complete Setup <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
