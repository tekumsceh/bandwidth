import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { apiUrl } from './config/api';
import Dashboard from './pages/Dashboard';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import BandDashboard from './pages/BandDashboard';
import AdminConfig from './pages/AdminConfig';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import GearPage from './pages/assets/Gear';
import SetlistsPage from './pages/assets/Setlists';
import PatchPage from './pages/assets/Patch';
import TestingGround from './pages/temp/TestingGround';
import { TEMP_PAGES_ENABLED } from './config/tempMode';
import { APP_ROUTES, WORK_NAV_ITEMS, ACCOUNT_NAV_ITEMS, ASSET_NAV_ITEMS, TEMP_LAB_NAV_ITEMS } from './config/navigation';
import type { CurrentUser } from './types';

function App() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [myBands, setMyBands] = useState<{ id: number; name: string }[]>([]);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const loadAppContext = useCallback(async () => {
    setIsBootstrapping(true);
    setMeError(null);
    try {
      const meRes = await fetch(apiUrl('/api/me'));
      if (meRes.status === 401) {
        setMe(null);
        setMyBands([]);
        setPendingExpensesCount(0);
        setCanAccessAdmin(false);
        return;
      }
      if (!meRes.ok) {
        const json = await meRes.json().catch(() => null);
        throw new Error(json?.error || `Failed to load current user (${meRes.status})`);
      }
      const meJson = (await meRes.json()) as CurrentUser;
      setMe(meJson);

      const [bandsRes, pendingRes, adminRes] = await Promise.all([
        fetch(apiUrl('/api/bands')),
        fetch(apiUrl('/api/me/expenses/pending-count')),
        fetch(apiUrl('/api/admin/config/can-access')),
      ]);

      if (bandsRes.ok) {
        const bandsJson = (await bandsRes.json()) as { id: number; name: string }[];
        setMyBands(bandsJson);
      } else {
        setMyBands([]);
      }

      if (pendingRes.ok) {
        const pendingJson = (await pendingRes.json()) as { pending_count: number };
        setPendingExpensesCount(pendingJson.pending_count || 0);
      } else {
        setPendingExpensesCount(0);
      }

      if (adminRes.ok) {
        const adminJson = (await adminRes.json()) as { canAccess: boolean };
        setCanAccessAdmin(Boolean(adminJson.canAccess));
      } else {
        setCanAccessAdmin(false);
      }
    } catch (e: unknown) {
      setMe(null);
      setMyBands([]);
      setPendingExpensesCount(0);
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

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!isUserMenuOpen) return;
      const root = userMenuRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [isUserMenuOpen]);

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
      <AppAuthenticatedShell
        me={me}
        loadAppContext={loadAppContext}
        meError={meError}
        logout={logout}
        canAccessAdmin={canAccessAdmin}
        myBands={myBands}
        pendingExpensesCount={pendingExpensesCount}
        isUserMenuOpen={isUserMenuOpen}
        setIsUserMenuOpen={setIsUserMenuOpen}
        userMenuRef={userMenuRef}
      />
    </BrowserRouter>
  );
}

function AppAuthenticatedShell({
  me,
  loadAppContext: _loadAppContext,
  meError,
  logout,
  canAccessAdmin,
  myBands,
  pendingExpensesCount,
  isUserMenuOpen,
  setIsUserMenuOpen,
  userMenuRef,
}: {
  me: CurrentUser;
  loadAppContext: () => Promise<void>;
  meError: string | null;
  logout: () => Promise<void>;
  canAccessAdmin: boolean;
  myBands: { id: number; name: string }[];
  pendingExpensesCount: number;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const location = useLocation();
  const isIOPatchPage = location.pathname === APP_ROUTES.assetsPatch;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-shell ${isSidebarOpen ? 'app-sidebar-open' : ''}`}>
        <button
          type="button"
          className="app-sidebar-handle"
          onClick={() => setIsSidebarOpen((v) => !v)}
          aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isSidebarOpen}
        >
          <span className="app-sidebar-handle-icon" aria-hidden>
            {isSidebarOpen ? '‹' : '›'}
          </span>
        </button>
        {isSidebarOpen && (
          <div
            className="app-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden
          />
        )}
        <aside className="app-sidebar">
          <div className="app-logo">Bandwidth</div>
          <nav className="app-nav">
            {WORK_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
            {ACCOUNT_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="nav-section-label">Assets</div>
            {ASSET_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
            {TEMP_PAGES_ENABLED && (
              <>
                <div className="nav-section-label">Temporary lab</div>
                {TEMP_LAB_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
            {canAccessAdmin && (
              <NavLink
                to={APP_ROUTES.adminConfig}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Admin
              </NavLink>
            )}
            {myBands.length > 0 && (
              <>
                <div className="nav-section-label">My bands</div>
                {myBands.map((b) => (
                  <NavLink
                    key={b.id}
                    to={`/bands/${b.id}`}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    {b.name}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
          <div className="app-user" ref={userMenuRef}>
            {me ? (
              <>
                <button
                  type="button"
                  className="app-user-avatar-trigger"
                  aria-label="Open account menu"
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                >
                  <div className="app-user-avatar">
                    {me.displayName
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                </button>
                <div className="app-user-info">
                  <div className="app-user-name">
                    {me.displayName}
                    {pendingExpensesCount > 0 && (
                      <span
                        className="badge badge-warning"
                        style={{ marginLeft: '0.35rem', fontSize: '0.65rem' }}
                        title="There are pending expenses awaiting approval"
                      >
                        {pendingExpensesCount}
                      </span>
                    )}
                  </div>
                  <div className="app-user-meta">
                    {(me.defaultCurrency || 'EUR').toUpperCase()} / {(me.localCurrency || 'EUR').toUpperCase()}
                  </div>
                </div>
                {isUserMenuOpen && (
                  <div className="app-user-menu" role="menu" aria-label="Account actions">
                    <a
                      href={APP_ROUTES.login}
                      className="app-user-menu-link"
                      role="menuitem"
                      onClick={async (e) => {
                        e.preventDefault();
                        setIsUserMenuOpen(false);
                        await logout();
                      }}
                    >
                      Logout
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="app-user-placeholder">
                {meError ? 'User not loaded' : 'Loading user…'}
              </div>
            )}
          </div>
        </aside>
        <main className={`app-main ${isIOPatchPage ? 'app-main-no-scroll' : ''}`}>
          <Routes>
            <Route path={APP_ROUTES.home} element={<Navigate to={APP_ROUTES.events} replace />} />
            <Route path={APP_ROUTES.login} element={<Navigate to={APP_ROUTES.events} replace />} />
            <Route path={APP_ROUTES.register} element={<Navigate to={APP_ROUTES.events} replace />} />
            <Route path={APP_ROUTES.resetPassword} element={<ResetPassword />} />
            <Route path={APP_ROUTES.verifyEmail} element={<VerifyEmail />} />
            <Route path={APP_ROUTES.events} element={<Dashboard />} />
            <Route path={APP_ROUTES.bandDetail} element={<BandDashboard />} />
            <Route path={APP_ROUTES.createEvent} element={<CreateEvent />} />
            <Route path={APP_ROUTES.eventDetail} element={<EventDetail />} />
            <Route path={APP_ROUTES.settings} element={<Settings />} />
            <Route path={APP_ROUTES.assetsGear} element={<GearPage />} />
            <Route path={APP_ROUTES.assetsSetlists} element={<SetlistsPage />} />
            <Route path={APP_ROUTES.assetsPatch} element={<PatchPage />} />
            <Route path={APP_ROUTES.adminConfig} element={<AdminConfig me={me} />} />
            {TEMP_PAGES_ENABLED && (
              <Route path={APP_ROUTES.labTestingGround} element={<TestingGround />} />
            )}
          </Routes>
        </main>
      </div>
  );
}

export default App;
