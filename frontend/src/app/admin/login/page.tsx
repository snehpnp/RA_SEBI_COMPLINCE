'use client';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginForm from '../../../components/LoginForm';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Loading Session...</span>
        </div>
      </div>
    }>
      <LoginForm defaultRole="admin" />
    </Suspense>
  );
}
