import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LogOut, Menu, Music2 } from 'lucide-react';
import type { AppBandSummary, CurrentUser } from '../types';
import { displayBandName } from '../utils/bandDisplay';
import { AppStatusBarProvider } from '../contexts/AppStatusBarContext';
import {
  APP_ROUTES,
  ACCOUNT_NAV_ITEMS,
  ASSET_NAV_ITEMS,
  WORK_NAV_ITEMS,
  eventsHubHref,
  eventsHubHrefPreservingQuery,
  isEventsHubPathname,
} from '../config/navigation';
import PrimaryHubNav from '../components/PrimaryHubNav';
import EventBandRail from '../components/EventBandRail';
import ResetPassword from '../pages/ResetPassword';
import VerifyEmail from '../pages/VerifyEmail';
import {
  LazyAdminConfig,
  LazyBandDashboard,
  LazyCreateEvent,
  LazyDashboard,
  LazyEventDetail,
  LazyGearPage,
  LazyPatchPage,
  LazySetlistsPage,
  LazySettings,
} from '../routes/lazyPages';
import { AppStatusBar } from './AppStatusBar';

function LegacyEventsHubRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: APP_ROUTES.events, search }} replace />;
}

type Props = {
  me: CurrentUser;
  meError: string | null;
  logout: () => Promise<void>;
  canAccessAdmin: boolean;
  myBands: AppBandSummary[];
  pendingExpensesCount: number;
};

function RouteFallback() {
  return (
    <div className="page-loading" style={{ padding: '2rem', textAlign: 'center' }}>
      Loading…
    </div>
  );
}

export function AuthenticatedShell({
  me,
  meError,
  logout,
  canAccessAdmin,
  myBands,
  pendingExpensesCount,
}: Props) {
  const location = useLocation();
  const isIOPatchPage = location.pathname === APP_ROUTES.assetsPatch;
  const isEventsHub = isEventsHubPathname(location.pathname);
  const hubView = (new URLSearchParams(location.search).get('view') || 'dashboard').toLowerCase();
  /** Same flex + overflow shell as I/O patch — strip console on hub, not Finance. */
  const isHubStripConsole = isEventsHub && hubView !== 'ledger';
  /** Same band rail as Events hub — also for asset workspaces (gear / setlists / I/O patch). */
  const showBandRail =
    isEventsHub || location.pathname.startsWith('/assets/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer when route changes
    setIsSidebarOpen(false);
  }, [location.pathname]);

  /** Default landing after auth — `/` loads the hub without a client redirect. */
  const eventsHome = APP_ROUTES.home;

  return (
    <AppStatusBarProvider>
      <div className={`app-shell app-shell--topnav ${isSidebarOpen ? 'app-sidebar-open' : ''}`}>
        <header className="app-topbar">
          <div className="app-topbar-left">
            <Link
              to={
                isEventsHub
                  ? eventsHubHrefPreservingQuery('dashboard', location.search)
                  : eventsHubHref('dashboard')
              }
              className="app-brand"
            >
              <Music2 size={18} className="app-brand-icon" aria-hidden />
              <span className="app-brand-text">Bandwidth</span>
              <span className="app-brand-version">v0.0.0</span>
            </Link>
            <button
              type="button"
              className="app-menu-btn"
              onClick={() => setIsSidebarOpen((v) => !v)}
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
            >
              <Menu size={20} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <PrimaryHubNav />
          <div className="app-topbar-right">
            <div className="app-system-status" aria-live="polite">
              <span className="app-system-status-label">System status</span>
              <span className="app-system-status-value">
                <span className="app-system-status-dot" aria-hidden />
                Online
              </span>
            </div>
          </div>
        </header>

        <div className="app-body">
          {isSidebarOpen && (
            <div
              className="app-sidebar-backdrop"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden
            />
          )}
          <aside className="app-sidebar app-sidebar--drawer">
            <div className="app-sidebar-heading">Menu</div>
            <div className="app-sidebar-scroll">
              <nav className="app-nav">
                {WORK_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => {
                      if (item.key === 'events') {
                        const onHub = isEventsHubPathname(location.pathname);
                        const view = new URLSearchParams(location.search).get('view') || 'dashboard';
                        const hubEventsActive = onHub && view !== 'ledger';
                        return hubEventsActive ? 'nav-link active' : 'nav-link';
                      }
                      return isActive ? 'nav-link active' : 'nav-link';
                    }}
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
                        className={({ isActive }) =>
                          isActive ? 'nav-link nav-link--band active' : 'nav-link nav-link--band'
                        }
                        style={
                          {
                            '--nav-band-color': b.color?.trim() || '#6b7280',
                          } as CSSProperties
                        }
                      >
                        <span className="nav-link-band-swatch" aria-hidden />
                        {displayBandName(b.name, b.is_solo ?? null)}
                      </NavLink>
                    ))}
                  </>
                )}
              </nav>
            </div>
            <div className="app-sidebar-footer">
              <button
                type="button"
                className="app-sidebar-logout"
                onClick={() => void logout()}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} strokeWidth={2.25} aria-hidden />
                <span>Log out</span>
              </button>
            </div>
          </aside>
          {showBandRail ? (
            <aside className="app-events-band-rail" aria-label="Band filter">
              <EventBandRail
                bands={myBands}
                showAllOption={location.pathname !== APP_ROUTES.assetsPatch}
              />
            </aside>
          ) : null}
          <main className={`app-main ${isIOPatchPage || isHubStripConsole ? 'app-main-no-scroll' : ''}`}>
            {meError ? <div className="page-status page-status--inline">{meError}</div> : null}
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path={APP_ROUTES.home} element={<LazyDashboard />} />
                <Route path={APP_ROUTES.events} element={<LazyDashboard />} />
                <Route path="/events" element={<LegacyEventsHubRedirect />} />
                <Route path={APP_ROUTES.login} element={<Navigate to={eventsHome} replace />} />
                <Route path={APP_ROUTES.register} element={<Navigate to={eventsHome} replace />} />
                <Route path={APP_ROUTES.resetPassword} element={<ResetPassword />} />
                <Route path={APP_ROUTES.verifyEmail} element={<VerifyEmail />} />
                <Route path={APP_ROUTES.bandDetail} element={<LazyBandDashboard />} />
                <Route path={APP_ROUTES.createEvent} element={<LazyCreateEvent />} />
                <Route path={APP_ROUTES.eventDetail} element={<LazyEventDetail />} />
                <Route path={APP_ROUTES.settings} element={<LazySettings />} />
                <Route path={APP_ROUTES.assetsGear} element={<LazyGearPage />} />
                <Route path={APP_ROUTES.assetsSetlists} element={<LazySetlistsPage />} />
                <Route path={APP_ROUTES.assetsPatch} element={<LazyPatchPage />} />
                <Route path={APP_ROUTES.adminConfig} element={<LazyAdminConfig me={me} />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        <AppStatusBar me={me} pendingExpensesCount={pendingExpensesCount} />
      </div>
    </AppStatusBarProvider>
  );
}
