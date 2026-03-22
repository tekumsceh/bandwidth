import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_ROUTES } from '../config/navigation';
import EventsHeaderShell from '../components/EventsHeaderShell';
import DashboardOverviewActions from '../components/DashboardOverviewActions';
import ScheduleList from '../components/ScheduleList';
import FinancePlaceholder from '../components/FinancePlaceholder';
import '../pages/assets/IOPatchPage.css';
import { useAppStatusBar } from '../contexts/AppStatusBarContext';
import { useEventsPageData } from '../hooks/useEventsPageData';
import {
  buildDashboardStripEventList,
  dashboardStripPrimaryEventId,
} from '../utils/dashboardStripEvents';

function Dashboard() {
  const { events, bandOptions, loading, error, refresh } = useEventsPageData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setHubStatusExtras } = useAppStatusBar();

  const viewRaw = (searchParams.get('view') || 'dashboard').toLowerCase();
  const viewMode: 'dashboard' | 'ledger' = viewRaw === 'ledger' ? 'ledger' : 'dashboard';
  const dataTab = viewMode === 'ledger' ? 'ledger' : 'schedule';

  const filterRaw = (searchParams.get('timeline') || 'upcoming').toLowerCase();
  const filter: 'upcoming' | 'past' | 'all' =
    filterRaw === 'past' || filterRaw === 'all' ? filterRaw : 'upcoming';
  const bandRaw = searchParams.get('bandId') || searchParams.get('band');
  const bandNum = Number(bandRaw || NaN);
  const bandFilter: 'all' | number = Number.isFinite(bandNum) ? bandNum : 'all';
  const archive = (searchParams.get('archive') || '0') === '1';

  const setlistManagerHref = useMemo(() => {
    if (bandFilter === 'all') return APP_ROUTES.assetsSetlists;
    const q = new URLSearchParams({ bandId: String(bandFilter) });
    return `${APP_ROUTES.assetsSetlists}?${q.toString()}`;
  }, [bandFilter]);

  const updateQuery = (
    patch: Partial<Record<'view' | 'timeline' | 'bandId' | 'band' | 'archive', string | null>>,
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: false });
  };

  const setBandFilter = (next: 'all' | number) =>
    updateQuery({
      bandId: next === 'all' ? null : String(next),
      band: null,
    });

  useEffect(() => {
    const normalized = new URLSearchParams(searchParams);
    let dirty = false;
    if (!normalized.get('view')) {
      normalized.set('view', 'dashboard');
      dirty = true;
    }
    if (!normalized.get('timeline')) {
      normalized.set('timeline', filter);
      dirty = true;
    }
    if (!normalized.get('archive')) {
      normalized.set('archive', archive ? '1' : '0');
      dirty = true;
    }
    if (dirty) {
      setSearchParams(normalized, { replace: true });
    }
  }, [filter, archive, searchParams, setSearchParams]);

  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    if (v === 'schedule') {
      const next = new URLSearchParams(searchParams);
      next.set('view', 'dashboard');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void import('../pages/assets/IOPatchPage');
    }, 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (dataTab !== 'schedule') return;
    void refresh({
      view: 'schedule',
      timeline: 'all',
      band: bandFilter,
      archive,
    });
  }, [dataTab, bandFilter, archive, refresh]);

  const filteredEvents = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const list = events.filter((ev) => {
      if (ev.status === 'cancelled') return false;

      const evDay = new Date(ev.event_date);
      const evDayStart = new Date(evDay.getFullYear(), evDay.getMonth(), evDay.getDate());

      if (filter === 'upcoming' && evDayStart < todayStart) return false;
      if (filter === 'past' && evDayStart >= todayStart) return false;

      if (bandFilter !== 'all' && ev.band_id !== bandFilter) {
        return false;
      }

      return true;
    });

    return [...list].sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
    );
  }, [events, filter, bandFilter]);

  const dashboardStripEvents = useMemo(
    () => buildDashboardStripEventList(events, bandFilter),
    [events, bandFilter],
  );

  const dashboardStripPrimaryId = useMemo(
    () => dashboardStripPrimaryEventId(events, bandFilter),
    [events, bandFilter],
  );

  const dashboardHeaderDateId = useMemo(() => {
    if (dashboardStripPrimaryId != null) return dashboardStripPrimaryId;
    return dashboardStripEvents[0]?.id ?? null;
  }, [dashboardStripPrimaryId, dashboardStripEvents]);

  const timelineBandOptions = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const allowedBandIds = new Set<number>();

    for (const ev of events) {
      if (ev.status === 'cancelled') continue;
      const evDay = new Date(ev.event_date);
      const evDayStart = new Date(evDay.getFullYear(), evDay.getMonth(), evDay.getDate());

      if (filter === 'upcoming' && evDayStart < todayStart) continue;
      if (filter === 'past' && evDayStart >= todayStart) continue;

      allowedBandIds.add(ev.band_id);
    }

    return bandOptions.filter((b) => allowedBandIds.has(b.id));
  }, [events, filter, bandOptions]);

  useEffect(() => {
    if (bandFilter === 'all') return;
    const stillVisible = timelineBandOptions.some((b) => b.id === bandFilter);
    if (!stillVisible) {
      setBandFilter('all');
    }
  }, [bandFilter, timelineBandOptions]);

  const nextEventLabel = useMemo(() => {
    if (filteredEvents.length === 0) return '—';
    const d = new Date(filteredEvents[0].event_date);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }, [filteredEvents]);

  useEffect(() => {
    if (viewMode !== 'dashboard') {
      setHubStatusExtras(null);
      return;
    }
    setHubStatusExtras(
      <>
        <span className="app-status-bar-hub-next">Next · {nextEventLabel}</span>
        <span className="app-status-bar-sep" aria-hidden>
          ·
        </span>
        <span className="app-status-bar-hub-stat">{filteredEvents.length} upcoming</span>
      </>,
    );
    return () => setHubStatusExtras(null);
  }, [viewMode, filteredEvents.length, nextEventLabel, setHubStatusExtras]);

  const pageTitle = viewMode === 'ledger' ? 'Finance' : 'Overview';
  const pageSubtitle =
    viewMode === 'ledger' ? 'Settlements & payouts (coming later)' : 'Main Mix / Stereo Bus';

  const showEventsHeader = !(viewMode === 'dashboard' && dataTab === 'schedule');

  return (
    <div className={`page page-events-hub page-events-hub--${viewMode}`}>
      {showEventsHeader ? (
        <EventsHeaderShell title={pageTitle} subtitle={pageSubtitle} showBack={false}>
          {null}
        </EventsHeaderShell>
      ) : null}

      {dataTab === 'schedule' && (
        <div className="io-patch-page">
          <div className="io-patch-workspace">
            <div className="io-patch-workspace-toolbar" aria-label="Dashboard overview">
              <span className="io-patch-workspace-label">Overview</span>
              <span className="io-patch-workspace-hint">Main Mix / Stereo Bus</span>
              {dashboardHeaderDateId != null ? (
                <span className="io-patch-workspace-scope">
                  Date #{dashboardHeaderDateId} · on deck
                </span>
              ) : null}
              <span className="io-patch-workspace-toolbar-spacer" aria-hidden />
              <span className="strip-toolbar-trail-placeholder" aria-hidden />
            </div>
            <div className="io-patch-body">
              <div className="io-patch-content io-patch-content--dashboard-strips">
                <div className="io-patch-action-bar">
                  <DashboardOverviewActions
                    onSetlistClick={() => navigate(setlistManagerHref)}
                  />
                </div>
                <div className="dashboard-overview-strip-wrap">
                  <ScheduleList
                    events={dashboardStripEvents}
                    loading={loading}
                    error={error}
                    stripPrimaryEventId={dashboardStripPrimaryId}
                    onAddDate={() => navigate('/events/new')}
                    onSelectEvent={(id) => navigate(`/events/${id}`)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {dataTab === 'ledger' && <FinancePlaceholder />}
    </div>
  );
}

export default Dashboard;
