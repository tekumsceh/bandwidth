import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../config/api';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { APP_ROUTES } from '../config/navigation';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token')?.trim() || '', [params]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      if (!token) {
        setTokenValid(false);
        setError('Reset token is missing.');
        setIsValidating(false);
        return;
      }
      setIsValidating(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`));
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Reset token is invalid or expired');
        if (cancelled) return;
        setTokenValid(true);
      } catch (err) {
        if (cancelled) return;
        setTokenValid(false);
        setError(err instanceof Error ? err.message : 'Reset token is invalid or expired');
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    };
    void validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to reset password');
      setStatus('Password updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
      setTokenValid(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="auth-proto-shell">
        <div className="auth-proto-card">
          <div className="auth-proto-head">
            <p>Create a new password for your account.</p>
          </div>

          {isValidating ? (
            <p className="auth-proto-status">Validating reset link…</p>
          ) : tokenValid ? (
            <form className="auth-proto-form" onSubmit={submit}>
              <label className="auth-proto-label">
                <span>New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="auth-proto-label">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="btn btn-action" type="submit" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          ) : null}

          <div className="auth-proto-aux">
            <Link to={APP_ROUTES.login} className="auth-proto-link">
              Back to sign in
            </Link>
          </div>

          {status && <p className="auth-proto-status ok">{status}</p>}
          {error && <p className="auth-proto-status err">{error}</p>}
        </div>
      </div>
    </div>
  );
}

