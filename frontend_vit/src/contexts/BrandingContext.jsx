import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { base_ra_url } from '../utils/config';
const defaultBranding = {
    appName: 'RAGCP',
    logoUrl: '/logo-light.png',
    loginLogoUrl: '/logo-light.png',
    faviconUrl: '/favicon.ico',
};
const BrandingContext = createContext({
    ...defaultBranding,
    refreshBranding: async () => { },
});
export const useBranding = () => useContext(BrandingContext);
export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState(defaultBranding);
    const fetchBranding = async () => {
        try {
            const params = {};
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const tParam = urlParams.get('tenant') || urlParams.get('tenantId') || urlParams.get('company');
                if (tParam)
                    params.tenant = tParam;
                if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    params.domain = window.location.hostname;
                }
            }
            const query = new URLSearchParams(params).toString();
            const res = await api.get(`/system-settings/branding${query ? `?${query}` : ''}`);
            if (res.data.success && res.data.data) {
                // Resolve URLs: paths starting with /uploads/ need the backend base URL
                const BACKEND = base_ra_url;
                const resolveUrl = (url, fallback = '') => {
                    if (!url)
                        return fallback;
                    if (url.startsWith('/uploads/'))
                        return BACKEND + url;
                    return url;
                };
                const newBranding = {
                    appName: res.data.data.appName !== undefined ? res.data.data.appName : defaultBranding.appName,
                    logoUrl: resolveUrl(res.data.data.logoUrl, defaultBranding.logoUrl),
                    loginLogoUrl: resolveUrl(res.data.data.loginLogoUrl || res.data.data.logoUrl, defaultBranding.loginLogoUrl),
                    faviconUrl: resolveUrl(res.data.data.faviconUrl, defaultBranding.faviconUrl),
                };
                setBranding(newBranding);
                // Update DOM elements dynamically
                document.title = newBranding.appName;
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = newBranding.faviconUrl;
            }
        }
        catch (err) {
            console.error('Failed to fetch global branding:', err);
        }
    };
    useEffect(() => {
        fetchBranding();
    }, []);
    return (<BrandingContext.Provider value={{ ...branding, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>);
};
