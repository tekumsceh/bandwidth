import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'react-datepicker/dist/react-datepicker.css';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';

window.addEventListener('error', (event) => {
  void fetch('http://localhost:5000/api/logs/client', {
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
  void fetch('http://localhost:5000/api/logs/client', {
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
