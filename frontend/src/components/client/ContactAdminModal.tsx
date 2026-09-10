'use client';

import React from 'react';
import { 
  Building2, 
  Sparkles, 
  X, 
  Info, 
  CheckCircle2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: any;
  finalPrice?: number | string;
  appliedCoupon?: any;
  adminContact?: {
    companyName?: string | null;
    email?: string | null;
    mobile?: string | null;
    sebiRegistration?: string | null;
    address?: string | null;
    website?: string | null;
  } | null;
  userProfile?: any;
  customMessage?: string;
}

export default function ContactAdminModal({
  isOpen,
  onClose,
  plan,
  finalPrice,
  appliedCoupon,
  adminContact,
  userProfile,
  customMessage
}: ContactAdminModalProps) {
  if (!isOpen) return null;

  const companyName = adminContact?.companyName || userProfile?.user?.tenant?.companyName || 'Advisory Team';
  const sebiReg = adminContact?.sebiRegistration || userProfile?.user?.tenant?.sebiRegistration;

  const planName = plan?.name || 'Selected Plan';
  const displayPrice = finalPrice ? `₹${finalPrice}` : (plan?.amount || plan?.price ? `₹${plan?.amount || plan?.price}` : '');
  const durationText = plan?.durationMonths || plan?.duration ? `${plan?.durationMonths || plan?.duration} Month(s)` : '1 Month';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-premium-cards border border-premium-border text-premium-text rounded-3xl shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-300">
        
        {/* Header with Close */}
        <div className="p-6 pb-4 border-b border-premium-border/60 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-premium-text/40 hover:text-premium-text bg-premium-bg hover:bg-premium-border/40 rounded-xl transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-premium-primary/10 border border-premium-primary/20 flex items-center justify-center text-premium-primary shadow-sm">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-premium-primary/10 text-premium-primary border border-premium-primary/20">
                  Admin Activation
                </span>
                {sebiReg && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-premium-bg text-premium-text/70 border border-premium-border">
                    SEBI: {sebiReg}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-premium-text mt-1">Contact Administrator</h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Plan Summary Card */}
          {plan && (
            <div className="p-4 rounded-2xl bg-premium-bg border border-premium-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-premium-primary/10 flex items-center justify-center text-premium-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-premium-text/50 font-medium uppercase tracking-wider">Plan Selected</p>
                  <h4 className="font-bold text-sm text-premium-text">
                    {planName} <span className="text-xs font-normal text-premium-text/60">({durationText})</span>
                  </h4>
                </div>
              </div>
              {displayPrice && (
                <div className="text-right">
                  <p className="text-[11px] text-premium-text/50 font-medium uppercase tracking-wider">Total Price</p>
                  <span className="text-base font-bold text-premium-primary">{displayPrice}</span>
                </div>
              )}
            </div>
          )}

          {/* Clean Message Box */}
          <div className="p-4 rounded-2xl bg-premium-bg/60 border border-premium-border space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="font-semibold text-premium-text">
                  Is plan ko buy karne ke liye kripya Administrator se contact karein.
                </p>
                <p className="text-premium-text/70">
                  Aapke contact karne ke baad Administrator yeh plan aapke account par directly assign aur activate kar denge.
                </p>
              </div>
            </div>

            {companyName && (
              <div className="pt-2.5 border-t border-premium-border/60 flex items-center justify-between text-xs text-premium-text/60">
                <span className="flex items-center gap-1.5 font-medium text-premium-text/80">
                  <Building2 className="w-3.5 h-3.5 text-premium-primary" /> {companyName}
                </span>
                {sebiReg && (
                  <span className="text-[11px] font-semibold text-premium-primary">
                    {sebiReg}
                  </span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-premium-bg/50 border-t border-premium-border flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full py-3 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_var(--tw-colors-premium-primary)] flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Theek Hai / Okay
          </button>
        </div>

      </div>
    </div>
  );
}
