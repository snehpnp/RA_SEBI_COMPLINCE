export const base_ra_url = typeof window !== 'undefined' && window.location.hostname === "localhost" 
  ? "https://compliance.pnpuniverse.in/backend" 
  : typeof window !== 'undefined' ? `${window.location.origin}/backend` : "https://compliance.pnpuniverse.in/backend";

export const base_api_url = `${base_ra_url}/api/v1`;
