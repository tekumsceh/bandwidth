import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../config/navigation';
import { apiUrl } from '../config/api';

type Props = {
  onAuthenticated: () => Promise<void> | void;
};

export default function Login({ onAuthenticated }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canUseDevQuickLogin = import.meta.env.DEV;

  useEffect(() => {
    setMode(location.pathname === APP_ROUTES.register ? 'register' : 'login');
  }, [location.pathname]);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const oauthError = qs.get('oauth_error');
    if (oauthError) {
      setError(`Google sign-in failed: ${oauthError.replace(/_/g, ' ')}`);
      setStatus(null);
      setBusy(false);
    }
  }, [location.search]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password, remember_me: rememberMe }
          : { email, password, display_name: displayName || undefined };
      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `${mode} failed`);
      }
      await onAuthenticated();
      setStatus(mode === 'login' ? 'Signed in successfully.' : 'Account created and signed in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const devAdminLogin = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(apiUrl('/api/auth/dev-admin-login'), { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Dev admin login failed');
      await onAuthenticated();
      setStatus('Dev admin session established.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev admin login failed');
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    window.location.assign(apiUrl('/api/auth/google/start'));
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to submit forgot-password request');
      setStatus(`If an account exists for ${resetEmail || 'that email'}, reset instructions will be sent.`);
      setForgotMode(false);
    } catch {
      setError('Failed to process forgot-password request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="auth-proto-shell">
        <div className="auth-proto-card">
          <div className="auth-proto-head">
            <p>
              {forgotMode
                ? 'Enter your account email and we will send recovery instructions.'
                : mode === 'login'
                  ? 'Sign in to continue to Bandwidth.'
                  : 'Register with email now, add Google later or use it directly when enabled.'}
            </p>
          </div>

          {!forgotMode && (
            <div className="auth-proto-tabs">
              <button
                type="button"
                className={`auth-proto-pill ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login');
                  navigate(APP_ROUTES.login);
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`auth-proto-pill ${mode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setMode('register');
                  navigate(APP_ROUTES.register);
                }}
              >
                Register
              </button>
            </div>
          )}

          {!forgotMode ? (
            <form className="auth-proto-form" onSubmit={submit}>
              {mode === 'register' && (
                <label className="auth-proto-label">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="auth-proto-label">
                <span>Email</span>
                <input
                  type="email"
                  className="auth-proto-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-proto-label">
                <span>Password</span>
                <div className="auth-proto-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className="auth-proto-field auth-proto-password-input"
                  />
                  <button
                    type="button"
                    className="auth-proto-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M3.3 2.3 2 3.6l4 4C4.2 9 3.1 10.6 2.5 12c1.7 4 5.3 6.5 9.5 6.5 1.7 0 3.2-.4 4.6-1l3.4 3.4 1.3-1.3L3.3 2.3Zm8.7 5.2a4.5 4.5 0 0 1 4.5 4.5c0 .6-.1 1.1-.3 1.7l-5.9-5.9c.5-.2 1.1-.3 1.7-.3ZM12 5.5c4.2 0 7.8 2.5 9.5 6.5-.5 1.1-1.2 2.1-2 3l-1.4-1.4c.4-.5.7-1 .9-1.6-1.5-3.1-4.4-5-7.5-5-.6 0-1.2.1-1.7.2L8.3 5.7c1.1-.1 2.3-.2 3.7-.2Z"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 5.5c4.2 0 7.8 2.5 9.5 6.5-1.7 4-5.3 6.5-9.5 6.5S4.2 16 2.5 12C4.2 8 7.8 5.5 12 5.5Zm0 2C9 7.5 6.4 9.2 5 12c1.4 2.8 4 4.5 7 4.5s5.6-1.7 7-4.5c-1.4-2.8-4-4.5-7-4.5Zm0 1.8A2.7 2.7 0 1 1 12 15a2.7 2.7 0 0 1 0-5.7Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              {mode === 'login' && (
                <label className="auth-proto-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
              )}
              <button className="btn btn-action" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="auth-proto-or-wrap">
                <hr />
                <span className="auth-proto-or-pill">OR</span>
                <hr />
              </div>

              <button
                type="button"
                className="auth-proto-pill auth-proto-pill-google auth-proto-pill-main"
                onClick={googleLogin}
                disabled={busy}
              >
                Continue with Google
              </button>
            </form>
          ) : (
            <form className="auth-proto-form" onSubmit={submitForgot}>
              <label className="auth-proto-label">
                <span>Email</span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                />
              </label>
              <button className="btn btn-action" type="submit" disabled={busy}>
                {busy ? 'Submitting…' : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="auth-proto-aux">
            {!forgotMode ? (
              <>
                <button type="button" className="auth-proto-link" onClick={() => setForgotMode(true)}>
                  Forgot password?
                </button>
                <span className="auth-proto-divider">•</span>
                <button
                  type="button"
                  className="auth-proto-link"
                  onClick={() => {
                    const next = mode === 'login' ? 'register' : 'login';
                    setMode(next);
                    navigate(next === 'register' ? APP_ROUTES.register : APP_ROUTES.login);
                  }}
                >
                  {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
                </button>
                {canUseDevQuickLogin && (
                  <>
                    <span className="auth-proto-divider">•</span>
                    <button type="button" className="auth-proto-link" onClick={devAdminLogin} disabled={busy}>
                      Dev quick login
                    </button>
                  </>
                )}
              </>
            ) : (
              <button type="button" className="auth-proto-link" onClick={() => setForgotMode(false)}>
                Back to sign in
              </button>
            )}
          </div>

          {status && <p className="auth-proto-status ok">{status}</p>}
          {error && <p className="auth-proto-status err">{error}</p>}
        </div>
      </div>
    </div>
  );
}
