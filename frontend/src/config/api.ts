/**
 * Base URL for the backend API.
 * Set VITE_API_URL in .env (e.g. VITE_API_URL=https://api.example.com) for production.
 * Falls back to http://localhost:5000 in development.
 */
const raw = String(import.meta.env.VITE_API_URL || '').trim();
export const API_BASE_URL = raw || 'http://localhost:5000';

/** Build an API URL from a path (path should start with /). */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
