'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (user.role === 'CLIENT') {
          router.push('/client');
        } else {
          router.push('/admin');
        }
      } catch (e) {
        router.push('/admin/login');
      }
    } else {
      router.push('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}
