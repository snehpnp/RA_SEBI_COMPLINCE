export const base_ra_url = typeof window !== 'undefined' && window.location.hostname === "localhost"
  ? "http://localhost:5000"
  :`${window.location.origin}/backend`;

export const base_api_url = `${base_ra_url}/api/v1`;
