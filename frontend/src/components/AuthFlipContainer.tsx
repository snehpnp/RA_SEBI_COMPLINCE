'use client';

import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useBranding } from '../contexts/BrandingContext';

interface AuthFlipContainerProps {
  initialView?: 'login' | 'register';
}

export default function AuthFlipContainer({ initialView = 'login' }: AuthFlipContainerProps) {
  const { loginLogoUrl, appName } = useBranding();
  const [isFlipped, setIsFlipped] = useState(initialView === 'register');

  useEffect(() => {
    setIsFlipped(initialView === 'register');
  }, [initialView]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden" style={{ perspective: '1000px' }}>
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />

      {/* Logo at the very top */}
      <div className="relative z-20 mb-8 animate-fade-in-up">
        {loginLogoUrl && loginLogoUrl !== '/logo-light.png' ? (
          <img src={loginLogoUrl} alt={appName || 'Logo'} className="h-16 object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <img src="/logo-light.png" alt="RAGCP" className="h-12 dark:hidden" />
            <img src="/logo-dark.png" alt="RAGCP" className="h-12 hidden dark:block" />
          </div>
        )}
      </div>

      {/* Flip Container */}
      <div className="relative z-10 w-full max-w-md md:max-w-xl transition-all duration-700 ease-in-out"
           style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        
        {/* Front Side: Login */}
        <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col transition-all duration-300 ${isFlipped ? 'pointer-events-none absolute top-0 left-0 opacity-0' : 'relative opacity-100'}`}
             style={{ backfaceVisibility: 'hidden' }}>
          <LoginForm onFlip={() => setIsFlipped(true)} />
        </div>

        {/* Back Side: Register */}
        <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col transition-all duration-300 ${!isFlipped ? 'pointer-events-none absolute top-0 left-0 opacity-0' : 'relative opacity-100'}`}
             style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <RegisterForm onFlip={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}
