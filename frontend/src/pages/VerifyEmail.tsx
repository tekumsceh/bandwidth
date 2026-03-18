import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { APP_ROUTES } from '../config/navigation';
import { apiUrl } from '../config/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token')?.trim() || '', [params]);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) {
        setBusy(false);
        setError('Verification token is missing.');
        return;
      }
      setBusy(true);
      setError(null);
      setStatus(null);
      try {
        const res = await fetch(apiUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`));
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Email verification failed');
        if (cancelled) return;
        setStatus('Email verified successfully. You can continue using your account.');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Email verification failed');
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="page">
      <div className="auth-proto-shell">
        <div className="auth-proto-card">
          <div className="auth-proto-head">
            <p>Verifying your email…</p>
          </div>
          {busy && <p className="auth-proto-status">Working…</p>}
          {status && <p className="auth-proto-status ok">{status}</p>}
          {error && <p className="auth-proto-status err">{error}</p>}
          <div className="auth-proto-aux">
            <Link to={APP_ROUTES.login} className="auth-proto-link">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

