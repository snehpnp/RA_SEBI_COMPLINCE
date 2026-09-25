'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (!params.has('role')) {
      params.set('role', 'client');
    }
    const query = params.toString();
    router.replace(query ? `/login?${query}` : '/login');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Redirecting to login...</p>
      </div>
    </div>
  );
}

export default function ClientLoginAlias() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}
