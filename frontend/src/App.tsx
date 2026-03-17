import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import BandDashboard from './pages/BandDashboard';
import AdminConfig from './pages/AdminConfig';
import Settings from './pages/Settings';
import TestingGround from './pages/temp/TestingGround';
import PlanOverview from './pages/temp/PlanOverview';
import PlanExecution from './pages/temp/PlanExecution';
import { TEMP_PAGES_ENABLED } from './config/tempMode';
import type { CurrentUser } from './types';

function App() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [myBands, setMyBands] = useState<{ id: number; name: string }[]>([]);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, bandsRes, pendingRes] = await Promise.all([
          fetch('http://localhost:5000/api/me'),
          fetch('http://localhost:5000/api/bands'),
          fetch('http://localhost:5000/api/me/expenses/pending-count'),
        ]);

        if (!meRes.ok) {
          const json = await meRes.json().catch(() => null);
          throw new Error(json?.error || `Failed to load current user (${meRes.status})`);
        }
        const meJson = (await meRes.json()) as CurrentUser;
        setMe(meJson);

        if (bandsRes.ok) {
          const bandsJson = (await bandsRes.json()) as { id: number; name: string }[];
          setMyBands(bandsJson);
        }

        if (pendingRes.ok) {
          const pendingJson = (await pendingRes.json()) as { pending_count: number };
          setPendingExpensesCount(pendingJson.pending_count || 0);
        }
        const adminRes = await fetch('http://localhost:5000/api/admin/config/can-access');
        if (adminRes.ok) {
          const adminJson = (await adminRes.json()) as { canAccess: boolean };
          setCanAccessAdmin(Boolean(adminJson.canAccess));
        }
      } catch (e: unknown) {
        setMeError(toErrorMessage(e, 'Failed to load current user'));
      }
    };
    load();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="app-logo">Bandwidth</div>
          <nav className="app-nav">
            <NavLink
              to="/events"
              end
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Events
            </NavLink>
            <NavLink to="/events/new" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              New event
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Settings
            </NavLink>
            {TEMP_PAGES_ENABLED && (
              <>
                <div className="nav-section-label">Temporary lab</div>
                <NavLink
                  to="/_lab/testing-ground"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Testing ground
                </NavLink>
                <NavLink
                  to="/_lab/plan-overview"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Plan overview
                </NavLink>
                <NavLink
                  to="/_lab/plan-execution"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Plan execution
                </NavLink>
              </>
            )}
            {canAccessAdmin && (
              <NavLink to="/admin/config" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
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
          <div className="app-user">
            {me ? (
              <>
                <div className="app-user-avatar">
                  {me.displayName
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
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
              </>
            ) : (
              <div className="app-user-placeholder">
                {meError ? 'User not loaded' : 'Loading user…'}
              </div>
            )}
          </div>
        </aside>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<Dashboard />} />
            <Route path="/bands/:id" element={<BandDashboard />} />
            <Route path="/events/new" element={<CreateEvent />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/config" element={<AdminConfig me={me} />} />
            {TEMP_PAGES_ENABLED && (
              <>
                <Route path="/_lab/testing-ground" element={<TestingGround />} />
                <Route path="/_lab/plan-overview" element={<PlanOverview />} />
                <Route path="/_lab/plan-execution" element={<PlanExecution />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
