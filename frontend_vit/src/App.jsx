import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GlobalConfirmProvider } from '@/components/GlobalConfirmProvider';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import AppRoutes from '@/routes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <ThemeProvider>
            <GlobalConfirmProvider>
              <AppRoutes />

              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl',
                  duration: 4000
                }}
              />
            </GlobalConfirmProvider>
          </ThemeProvider>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
