export const base_ra_url = typeof window !== 'undefined'
  ? (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : `${window.location.origin}/backend`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

export const base_api_url = `${base_ra_url}/api/v1`;

export const DSC_BRIDGE_DEFAULT_URL = 'http://127.0.0.1:1620';

export const getDscBridgeUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dsc_bridge_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  if (process.env.NEXT_PUBLIC_DSC_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_DSC_BRIDGE_URL.trim().replace(/\/+$/, '');
  }
  return DSC_BRIDGE_DEFAULT_URL;
};

export const setDscBridgeUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim() || url.trim() === DSC_BRIDGE_DEFAULT_URL) {
      localStorage.removeItem('dsc_bridge_url');
    } else {
      localStorage.setItem('dsc_bridge_url', url.trim().replace(/\/+$/, ''));
    }
  }
};

