export const base_ra_url = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
    : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.startsWith("192.168.") || window.location.hostname.startsWith("10.") || window.location.hostname.endsWith(".local")
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : `${window.location.origin}/backend`))
  : (process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || "http://localhost:5000");

export const base_api_url = `${base_ra_url}/api/v1`;

// Default DSC bridge URL:
// Physical hardware USB token is in client's PC, so use local bridge (http://127.0.0.1:1620)
export const getDefaultDscBridgeUrl = (): string => {
  return 'http://127.0.0.1:1620';
};

export const DSC_BRIDGE_DEFAULT_URL = 'http://127.0.0.1:1620';

export const getDscBridgeUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dsc_bridge_url');
    if (saved && saved.trim() && !saved.includes('/backend/api/v1/dsc-bridge')) {
      return saved.trim().replace(/\/+$/, '');
    }
    return 'http://127.0.0.1:1620';
  }
  if (process.env.NEXT_PUBLIC_DSC_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_DSC_BRIDGE_URL.trim().replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:1620';
};

export const setDscBridgeUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    const def = getDefaultDscBridgeUrl();
    if (!url || !url.trim() || url.trim() === def) {
      localStorage.removeItem('dsc_bridge_url');
    } else {
      localStorage.setItem('dsc_bridge_url', url.trim().replace(/\/+$/, ''));
    }
  }
};
