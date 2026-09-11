'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useBranding } from '../contexts/BrandingContext';

interface AuthFlipContainerProps {
  initialView?: 'login' | 'register';
}

export default function AuthFlipContainer({ initialView = 'login' }: AuthFlipContainerProps) {
  const { loginLogoUrl, logoUrl, appName } = useBranding();
  const [isFlipped, setIsFlipped] = useState(initialView === 'register');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setIsFlipped(initialView === 'register');
  }, [initialView]);

  useEffect(() => {
    // Dynamic logo priority: loginLogoUrl > logoUrl
    const candidate = loginLogoUrl || logoUrl || null;
    setCurrentLogo(candidate);
    setImageError(false);
  }, [loginLogoUrl, logoUrl]);

  const handleImageError = () => {
    if (currentLogo === loginLogoUrl && logoUrl && logoUrl !== loginLogoUrl) {
      setCurrentLogo(logoUrl);
      return;
    }
    setImageError(true);
  };

  const displayName = appName || 'RAGCP';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans overflow-hidden selection:bg-blue-500 selection:text-white" style={{ perspective: '1200px' }}>
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/15 dark:bg-blue-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-400/15 dark:bg-indigo-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 dark:opacity-5 pointer-events-none" />

      {/* Dynamic Logo / Brand Name */}
      {(!imageError && currentLogo) ? (
        <div className="relative z-20 mb-6 sm:mb-8 transition-transform hover:scale-[1.02] duration-300 flex flex-col items-center">
          <img 
            src={currentLogo} 
            alt={displayName || 'Logo'} 
            className="h-14 sm:h-16 max-w-[280px] object-contain drop-shadow-sm" 
            onError={handleImageError} 
          />
        </div>
      ) : (
        <div className="relative z-20 mb-6 sm:mb-8 text-center transition-transform hover:scale-[1.02] duration-300 flex items-center justify-center gap-3">
          <div className="p-2.5 bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/30 rounded-2xl text-primary-600 dark:text-primary-400 shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white drop-shadow-sm">
            {displayName}
          </h1>
        </div>
      )}

      {/* Flip Container Card */}
      <div className="relative z-10 w-full max-w-md md:max-w-lg transition-all duration-700 ease-in-out"
        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

        {/* Front Side: Login */}
        <div className={`w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] p-6 sm:p-8 md:p-9 flex flex-col transition-all duration-300 ${isFlipped ? 'pointer-events-none absolute top-0 left-0 opacity-0' : 'relative opacity-100'}`}
          style={{ backfaceVisibility: 'hidden' }}>
          <LoginForm onFlip={() => setIsFlipped(true)} />
        </div>

        {/* Back Side: Register */}
        <div className={`w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] p-6 sm:p-8 md:p-9 flex flex-col transition-all duration-300 ${!isFlipped ? 'pointer-events-none absolute top-0 left-0 opacity-0' : 'relative opacity-100'}`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <RegisterForm onFlip={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}
