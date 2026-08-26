import type { Metadata } from 'next';
import './globals.css';
import { GlobalConfirmProvider } from '@/components/GlobalConfirmProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BrandingProvider } from '@/contexts/BrandingContext';

import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'RAGCP - Research Analyst Governance & Compliance Platform',
  description: 'Enterprise Governance, Onboarding, Compliance & Research Analytics Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://app.digio.in/sdk/v11/digio.js"></script>
        <style dangerouslySetInnerHTML={{ __html: `
          * {
            font-family: 'Outfit', sans-serif;
          }
        ` }} />
      </head>
      <body className="antialiased min-h-screen transition-colors duration-200" suppressHydrationWarning>
        <BrandingProvider>
          <ThemeProvider>
            <GlobalConfirmProvider>
              {children}
              <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl', duration: 4000 }} />
            </GlobalConfirmProvider>
          </ThemeProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
