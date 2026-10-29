export const base_ra_url = typeof window !== 'undefined'
  ? (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : `${window.location.origin}/backend`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

export const base_api_url = `${base_ra_url}/api/v1`;

// Default DSC bridge URL:
// Both on localhost and live domain (e.g. portal.thinkupresearch.com),
// default to the integrated backend DSC bridge (${base_api_url}/dsc-bridge)
// to prevent mixed-content / CORS errors from HTTPS to 127.0.0.1:1620.
export const getDefaultDscBridgeUrl = (): string => {
  return `${base_api_url}/dsc-bridge`;
};

export const DSC_BRIDGE_DEFAULT_URL = `${base_api_url}/dsc-bridge`;

export const getDscBridgeUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dsc_bridge_url');
    if (saved && saved.trim()) {
      const isHttps = window.location.protocol === 'https:';
      const isLocalHostSaved = saved.includes('127.0.0.1') || saved.includes('localhost');
      // If user had old local loopback saved while on live HTTPS, clear it to use the live bridge without CORS errors
      if (isHttps && isLocalHostSaved) {
        localStorage.removeItem('dsc_bridge_url');
        return `${base_api_url}/dsc-bridge`;
      }
      return saved.trim().replace(/\/+$/, '');
    }
    return `${base_api_url}/dsc-bridge`;
  }
  if (process.env.NEXT_PUBLIC_DSC_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_DSC_BRIDGE_URL.trim().replace(/\/+$/, '');
  }
  return `${base_api_url}/dsc-bridge`;
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
