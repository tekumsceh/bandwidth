import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { apiUrl } from './config/api';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import { APP_ROUTES } from './config/navigation';
import type { AppBandSummary, CurrentUser } from './types';
import { AuthenticatedShell } from './shell/AuthenticatedShell';
import { parseJsonBody, throwHttpError } from './utils/apiJson';
import { toErrorMessage } from './utils/toErrorMessage';

function App() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [myBands, setMyBands] = useState<{ id: number; name: string }[]>([]);
  const pendingExpensesCount = 0;
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const loadAppContext = useCallback(async () => {
    setIsBootstrapping(true);
    setMeError(null);
    try {
      const meRes = await fetch(apiUrl('/api/me'));
      if (meRes.status === 401) {
        setMe(null);
        setMyBands([]);
        setCanAccessAdmin(false);
        return;
      }
      if (!meRes.ok) {
        await throwHttpError(meRes, 'Failed to load current user');
      }
      const meJson = await parseJsonBody<CurrentUser>(meRes);
      setMe(meJson);

      const [bandsRes, adminRes] = await Promise.all([
        fetch(apiUrl('/api/bands')),
        fetch(apiUrl('/api/admin/config/can-access')),
      ]);

      if (bandsRes.ok) {
        const bandsJson = await parseJsonBody<AppBandSummary[]>(bandsRes);
        setMyBands(bandsJson);
      } else {
        setMyBands([]);
      }

      if (adminRes.ok) {
        const adminJson = await parseJsonBody<{ canAccess: boolean }>(adminRes);
        setCanAccessAdmin(Boolean(adminJson.canAccess));
      } else {
        setCanAccessAdmin(false);
      }
    } catch (e: unknown) {
      setMe(null);
      setMyBands([]);
      setCanAccessAdmin(false);
      setMeError(toErrorMessage(e, 'Failed to load current user'));
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    void loadAppContext();
  }, [loadAppContext]);

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST' });
    } catch {
      // ignore network errors; reload context anyway
    }
    await loadAppContext();
  }, [loadAppContext]);

  if (isBootstrapping) {
    return (
      <BrowserRouter>
        <div className="app-shell">
          <main className="app-main">
            <div className="page-loading">Loading…</div>
          </main>
        </div>
      </BrowserRouter>
    );
  }

  if (!me) {
    return (
      <BrowserRouter>
        <div className="app-shell">
          <main className="app-main">
            <Routes>
              <Route path={APP_ROUTES.login} element={<Login onAuthenticated={loadAppContext} />} />
              <Route path={APP_ROUTES.register} element={<Login onAuthenticated={loadAppContext} />} />
              <Route path={APP_ROUTES.resetPassword} element={<ResetPassword />} />
              <Route path={APP_ROUTES.verifyEmail} element={<VerifyEmail />} />
              <Route path="*" element={<Navigate to={APP_ROUTES.login} replace />} />
            </Routes>
            {meError && <div className="page-status">{meError}</div>}
          </main>
        </div>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AuthenticatedShell
        me={me}
        meError={meError}
        logout={logout}
        canAccessAdmin={canAccessAdmin}
        myBands={myBands}
        pendingExpensesCount={pendingExpensesCount}
      />
    </BrowserRouter>
  );
}

export default App;
