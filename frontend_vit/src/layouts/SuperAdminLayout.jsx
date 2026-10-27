import React from 'react';

export default function SuperAdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {children}
    </div>
  );
}
