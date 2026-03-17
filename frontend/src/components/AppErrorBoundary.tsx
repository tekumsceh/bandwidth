import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  async componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      await fetch('http://localhost:5000/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          kind: 'react_error_boundary',
          message: error.message,
          stack: error.stack || null,
          componentStack: info.componentStack || null,
          url: window.location.href,
          userAgent: navigator.userAgent,
          occurredAt: new Date().toISOString(),
        }),
        keepalive: true,
      });
    } catch {
      // silent fallback
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
            color: '#f8fafc',
            padding: '1rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Please refresh. Error has been logged.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;

