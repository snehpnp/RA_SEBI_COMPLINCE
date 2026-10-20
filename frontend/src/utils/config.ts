export const base_ra_url = typeof window !== 'undefined'
  ? (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : `${window.location.origin}/backend`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

export const base_api_url = `${base_ra_url}/api/v1`;

// Dynamic default DSC bridge URL: automatically resolves to current active domain
export const getDefaultDscBridgeUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${base_api_url}/dsc-bridge`;
  }
  return 'http://127.0.0.1:1620';
};

export const DSC_BRIDGE_DEFAULT_URL = typeof window !== 'undefined'
  ? `${base_api_url}/dsc-bridge`
  : 'http://127.0.0.1:1620';

export const getDscBridgeUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dsc_bridge_url');
    // If previously saved static 127.0.0.1:1620 or empty, migrate to active dynamic domain
    if (saved && saved.trim() && saved.trim() !== 'http://127.0.0.1:1620') {
      return saved.trim().replace(/\/+$/, '');
    }
    return `${base_api_url}/dsc-bridge`;
  }
  if (process.env.NEXT_PUBLIC_DSC_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_DSC_BRIDGE_URL.trim().replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:1620';
};

export const setDscBridgeUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    const dynamicDefault = `${base_api_url}/dsc-bridge`;
    if (!url || !url.trim() || url.trim() === dynamicDefault) {
      localStorage.removeItem('dsc_bridge_url');
    } else {
      localStorage.setItem('dsc_bridge_url', url.trim().replace(/\/+$/, ''));
    }
  }
};


