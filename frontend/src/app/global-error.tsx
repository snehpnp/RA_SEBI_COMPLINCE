'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global root error:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 border border-slate-200 text-center">
          <h2 className="text-lg font-bold text-slate-800">Application Error</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6">
            {error?.message || 'A global application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
