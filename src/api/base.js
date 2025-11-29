const globalBase =
  (typeof window !== 'undefined' && (window.__API_BASE__ || window.API_BASE)) ||
  '';
const metaBase =
  typeof document !== 'undefined'
    ? document.querySelector('meta[name="api-base"]')?.content || ''
    : '';

const normalized = (globalBase || metaBase || '').trim().replace(/\/$/, '');

export const API_BASE = normalized;

export function withApi(path) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${suffix}` : suffix;
}

