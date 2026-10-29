export const base_ra_url = typeof window !== 'undefined'
  ? (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : `${window.location.origin}/backend`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

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
