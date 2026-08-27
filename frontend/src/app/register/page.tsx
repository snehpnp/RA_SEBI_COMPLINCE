'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthFlipContainer from '../../components/AuthFlipContainer';

export default function RegisterPageUnified() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'SUPER_ADMIN') {
          router.replace('/super-admin');
        } else if (user.role === 'CLIENT') {
          router.replace('/client');
        } else {
          router.replace('/admin');
        }
      } catch (e) {
        setChecking(false);
      }
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-500" />
          <span className="text-lg font-semibold text-slate-600 dark:text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Loading Portal...</span>
        </div>
      </div>
    }>
      <AuthFlipContainer initialView="register" />
    </Suspense>
  );
}
