import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'react-datepicker/dist/react-datepicker.css';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import { API_BASE_URL, apiUrl } from './config/api';

const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isBackend = url.startsWith(API_BASE_URL);
  if (!isBackend) return nativeFetch(input, init);
  const nextInit: RequestInit = {
    ...(init || {}),
    credentials: init?.credentials || 'include',
  };
  return nativeFetch(input, nextInit);
}) as typeof window.fetch;

window.addEventListener('error', (event) => {
  void fetch(apiUrl('/api/logs/client'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      kind: 'window_error',
      message: event.message || 'Unknown window error',
      stack: (event.error && event.error.stack) || null,
      url: window.location.href,
      occurredAt: new Date().toISOString(),
    }),
    keepalive: true,
  }).catch(() => undefined);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { message?: string; stack?: string } | undefined;
  void fetch(apiUrl('/api/logs/client'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      kind: 'unhandled_rejection',
      message: reason?.message || String(event.reason || 'Unhandled rejection'),
      stack: reason?.stack || null,
      url: window.location.href,
      occurredAt: new Date().toISOString(),
    }),
    keepalive: true,
  }).catch(() => undefined);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
