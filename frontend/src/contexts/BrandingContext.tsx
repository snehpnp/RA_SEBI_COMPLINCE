'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface BrandingContextType {
  appName: string;
  logoUrl: string;
  loginLogoUrl: string;
  faviconUrl: string;
  refreshBranding: () => Promise<void>;
}

const defaultBranding = {
  appName: 'RAGCP',
  logoUrl: '/logo-light.png',
  loginLogoUrl: '/logo-light.png',
  faviconUrl: '/favicon.ico',
};

const BrandingContext = createContext<BrandingContextType>({
  ...defaultBranding,
  refreshBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState(defaultBranding);

  const fetchBranding = async () => {
    try {
      const res = await api.get('/system-settings/branding');
      if (res.data.success && res.data.data) {

        // Resolve URLs: paths starting with /uploads/ need the backend base URL
        const BACKEND = process.env.NODE_ENV === 'production'
          ? 'https://compliance.pnpuniverse.in/backend'
          : 'http://localhost:5000';

        const resolveUrl = (url: string, fallback: string) => {
          if (!url) return fallback;
          if (url.startsWith('/uploads/')) return BACKEND + url;
          return url;
        };

        const newBranding = {
          appName: res.data.data.appName || defaultBranding.appName,
          logoUrl: resolveUrl(res.data.data.logoUrl, defaultBranding.logoUrl),
          loginLogoUrl: resolveUrl(res.data.data.loginLogoUrl, defaultBranding.loginLogoUrl),
          faviconUrl: resolveUrl(res.data.data.faviconUrl, defaultBranding.faviconUrl),
        };
        setBranding(newBranding);
        
        // Update DOM elements dynamically
        document.title = newBranding.appName;
        
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = newBranding.faviconUrl;
      }
    } catch (err) {
      console.error('Failed to fetch global branding:', err);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ ...branding, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};
