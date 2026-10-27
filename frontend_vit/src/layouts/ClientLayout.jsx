import React from 'react';

export default function ClientLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">
      {children}
    </div>
  );
}
