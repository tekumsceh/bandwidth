import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../config/api';
import EventsHeaderShell from '../components/EventsHeaderShell';
import EventsToolbar from '../components/EventsToolbar';
import ScheduleList from '../components/ScheduleList';
import MyLedgerView from '../components/MyLedgerView';
import { useAppStatusBar } from '../contexts/AppStatusBarContext';
import { useEventsPageData } from '../hooks/useEventsPageData';
import { displayBandName } from '../utils/bandDisplay';
import {
  buildDashboardStripEventList,
  dashboardStripPrimaryEventId,
} from '../utils/dashboardStripEvents';

function Dashboard() {
  const {
    events,
    ledgerEvents,
    bandOptions,
    loading,
    error,
    ledgerLoading,
    ledgerError,
    refresh,
    refreshLedger,
  } = useEventsPageData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setHubStatusExtras } = useAppStatusBar();
  const [bulkPayAmount, setBulkPayAmount] = useState('');
  const [bulkPayStatus, setBulkPayStatus] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<'view' | 'timeline' | 'band' | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('EUR');
  const [eurToDisplayRate, setEurToDisplayRate] = useState(1);

  const viewRaw = (searchParams.get('view') || 'dashboard').toLowerCase();
  const viewMode: 'dashboard' | 'schedule' | 'ledger' =
    viewRaw === 'ledger' ? 'ledger' : viewRaw === 'schedule' ? 'schedule' : 'dashboard';
  /** Schedule data (incl. dashboard overview) vs ledger */
  const dataTab = viewMode === 'ledger' ? 'ledger' : 'schedule';
  const filterRaw = (searchParams.get('timeline') || 'upcoming').toLowerCase();
  const filter: 'upcoming' | 'past' | 'all' =
    filterRaw === 'past' || filterRaw === 'all' ? filterRaw : 'upcoming';
  const ledgerModeRaw = (searchParams.get('ledgerMode') || 'unpaid').toLowerCase();
  const ledgerMode: 'unpaid' | 'all' = ledgerModeRaw === 'all' ? 'all' : 'unpaid';
  const bandRaw = searchParams.get('bandId') || searchParams.get('band');
  const bandNum = Number(bandRaw || NaN);
  const bandFilter: 'all' | number = Number.isFinite(bandNum) ? bandNum : 'all';
  const ledgerBandFilter: 'all' | number = bandFilter;
  const archive = (searchParams.get('archive') || '0') === '1';

  const updateQuery = (
    patch: Partial<Record<'view' | 'timeline' | 'bandId' | 'band' | 'ledgerMode' | 'archive', string | null>>,
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: false });
  };

  const setActiveTab = (tab: 'schedule' | 'ledger') => updateQuery({ view: tab });
  const setFilter = (next: 'upcoming' | 'past' | 'all') => updateQuery({ timeline: next });
  const setBandFilter = (next: 'all' | number) =>
    updateQuery({
      bandId: next === 'all' ? null : String(next),
      band: null,
    });
  const setLedgerBandFilter = setBandFilter;
  const setLedgerMode = (next: 'unpaid' | 'all') => updateQuery({ ledgerMode: next });

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
    if (!normalized.get('ledgerMode')) {
      normalized.set('ledgerMode', ledgerMode);
      dirty = true;
    }
    if (!normalized.get('archive')) {
      normalized.set('archive', archive ? '1' : '0');
      dirty = true;
    }
    if (dirty) {
      setSearchParams(normalized, { replace: true });
    }
  }, [filter, ledgerMode, archive, searchParams, setSearchParams]);

  useEffect(() => {
    const loadCurrencyContext = async () => {
      try {
        const prefRes = await fetch(apiUrl('/api/me/preferences/currency'));
        const prefJson = (await prefRes.json()) as {
          default_currency?: string;
          local_currency?: string;
          supported_currencies?: string[];
        };
        if (!prefRes.ok) return;
        const target = String(prefJson.default_currency || 'EUR').toUpperCase();
        setDisplayCurrency(target);

        const fxRes = await fetch(apiUrl(`/api/me/fx?base=EUR&symbols=${encodeURIComponent(target)}`));
        const fxJson = (await fxRes.json()) as { rates?: Record<string, number> };
        if (!fxRes.ok) return;
        const rate = Number(fxJson?.rates?.[target] ?? 1);
        setEurToDisplayRate(Number.isFinite(rate) && rate > 0 ? rate : 1);
      } catch {
        // keep EUR fallback silently
      }
    };
    void loadCurrencyContext();
  }, []);
  useEffect(() => {
    if (dataTab === 'schedule') {
      void refresh({
        view: 'schedule',
        /** Full schedule so dashboard strips can mix upcoming + past; timeline filter is client-side. */
        timeline: 'all',
        band: bandFilter,
        archive,
      });
    } else {
      void refreshLedger({
        band: ledgerBandFilter,
        ledgerMode,
        archive,
      });
    }
  }, [dataTab, filter, bandFilter, ledgerBandFilter, ledgerMode, archive, refresh, refreshLedger]);

  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const filteredEvents = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const list = events.filter((ev) => {
      // Hide cancelled completely
      if (ev.status === 'cancelled') return false;

      const evDay = new Date(ev.event_date);
      const evDayStart = new Date(evDay.getFullYear(), evDay.getMonth(), evDay.getDate());

      if (filter === 'upcoming' && evDayStart < todayStart) return false;
      if (filter === 'past' && evDayStart >= todayStart) return false;

      // Filter by band when bandFilter is set
      if (bandFilter !== 'all' && ev.band_id !== bandFilter) {
        return false;
      }

      // confirmed / done / postponed always visible (subject to filters above)
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
  }, [bandFilter, timelineBandOptions, setBandFilter]);

  const ledgerBands = useMemo(() => {
    const byId = new Map<number, (typeof ledgerEvents)[0]>();
    for (const ev of ledgerEvents) {
      if (!byId.has(ev.band_id)) byId.set(ev.band_id, ev);
    }
    return Array.from(byId.values())
      .map((ev) => {
        const name = displayBandName(ev.band_name, ev.band_is_solo);
        const initials = name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('')
          .slice(0, 4);
        return { name, initials };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgerEvents]);

  const filteredLedgerEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...ledgerEvents]
      .filter((ev) => {
        const d = new Date(ev.event_date);
        const allocated = Number(ev.allocated_eur || 0);
        const paid = Number(ev.paid_eur || 0);
        const isUnpaid = allocated > paid + 0.0001;

        // In "unpaid" mode, only show held (past) + unpaid dates
        if (ledgerMode === 'unpaid') {
          if (d >= today) return false;
          if (!isUnpaid) return false;
        }

        if (ledgerBandFilter !== 'all' && ev.band_id !== ledgerBandFilter) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
      );
  }, [ledgerEvents, ledgerMode, ledgerBandFilter]);

  const ledgerTotals = useMemo(() => {
    const bandTotals: Record<string, { allocated: number; paid: number }> = {};
    let globalAllocated = 0;
    let globalPaid = 0;

    // Totals should match what is actually displayed in the table
    for (const ev of filteredLedgerEvents) {
      const band = displayBandName(ev.band_name, ev.band_is_solo);
      const allocated = Number(ev.allocated_eur || 0);
      const paid = Number(ev.paid_eur || 0);
      if (!bandTotals[band]) {
        bandTotals[band] = { allocated: 0, paid: 0 };
      }
      bandTotals[band].allocated += allocated;
      bandTotals[band].paid += paid;
      globalAllocated += allocated;
      globalPaid += paid;
    }
    return { bandTotals, globalAllocated, globalPaid };
  }, [filteredLedgerEvents]);

  const bandColorById = useMemo(() => {
    const map = new Map<number, string | null | undefined>();
    for (const ev of events) {
      if (!map.has(ev.band_id)) {
        map.set(ev.band_id, ev.band_color ?? null);
      }
    }
    return map;
  }, [events]);

  const handlePayDate = async (dateId: number) => {
    try {
      setBulkPayStatus(null);
      const res = await fetch(apiUrl(`/api/me/pay/date/${dateId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Failed to pay date (${res.status})`);
      }
      setBulkPayStatus(json?.message || 'Date marked as paid.');
      await refreshLedger({ band: ledgerBandFilter, ledgerMode });
    } catch (e: unknown) {
      setBulkPayStatus(toErrorMessage(e, 'Failed to pay date.'));
    }
  };

  const handleBulkPay = async () => {
    const amt = Number(bulkPayAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setBulkPayStatus('Enter a positive amount.');
      return;
    }
    try {
      setBulkPayStatus(null);
      const res = await fetch(apiUrl('/api/me/pay/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Failed to apply bulk pay (${res.status})`);
      }
      const applied = json?.applied_amount ?? 0;
      const fully = json?.fully_paid_dates ?? 0;
      const remaining = json?.remaining_amount ?? 0;
      setBulkPayStatus(
        `Applied ${applied.toFixed(0)} EUR across ${fully} fully paid dates. Remaining from bulk: ${remaining.toFixed(
          0,
        )} EUR.`,
      );
      await refreshLedger({ band: ledgerBandFilter, ledgerMode });
    } catch (e: unknown) {
      setBulkPayStatus(toErrorMessage(e, 'Failed to apply bulk pay.'));
    }
  };

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

  const pageTitle =
    viewMode === 'ledger' ? 'Finance' : viewMode === 'schedule' ? 'Gigs' : 'Overview';
  const pageSubtitle =
    viewMode === 'ledger'
      ? 'My ledger · settlements & payouts'
      : viewMode === 'schedule'
        ? 'Gig management · timeline & routing'
        : 'Main Mix / Stereo Bus';

  const summaryViewLabel = 'Finance';

  /** Console-style overview: no title row — strips only. */
  const showEventsHeader = !(viewMode === 'dashboard' && dataTab === 'schedule');

  return (
    <div className={`page page-events-hub page-events-hub--${viewMode}`}>
      {showEventsHeader ? (
        <EventsHeaderShell title={pageTitle} subtitle={pageSubtitle} showBack={false}>
          {dataTab === 'ledger' ? (
            <EventsToolbar
              activeTab={dataTab}
              setActiveTab={setActiveTab}
              filter={filter}
              setFilter={setFilter}
              bandFilter={bandFilter}
              setBandFilter={setBandFilter}
              bandOptions={timelineBandOptions}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              hideViewSwitch
              summaryViewLabel={summaryViewLabel}
            />
          ) : null}
        </EventsHeaderShell>
      ) : null}

      {dataTab === 'schedule' && (
        <>
          <div
            className={
              viewMode === 'dashboard' ? 'dashboard-overview-well' : undefined
            }
          >
            <ScheduleList
              events={viewMode === 'dashboard' ? dashboardStripEvents : filteredEvents}
              loading={loading}
              error={error}
              filter={filter}
              layout={viewMode === 'dashboard' ? 'strips' : 'cards'}
              dashboardStripMode={viewMode === 'dashboard'}
              stripPrimaryEventId={viewMode === 'dashboard' ? dashboardStripPrimaryId : null}
              onAddDate={() => navigate('/events/new')}
              onSelectEvent={(id) => navigate(`/events/${id}`)}
            />
          </div>
        </>
      )}

      {dataTab === 'ledger' && (
        <MyLedgerView
          ledgerEvents={ledgerEvents}
          filteredLedgerEvents={filteredLedgerEvents}
          ledgerBands={ledgerBands}
          ledgerLoading={ledgerLoading}
          ledgerError={ledgerError}
          ledgerMode={ledgerMode}
          setLedgerMode={setLedgerMode}
          ledgerBandFilter={ledgerBandFilter}
          setLedgerBandFilter={setLedgerBandFilter}
          bulkPayAmount={bulkPayAmount}
          setBulkPayAmount={setBulkPayAmount}
          bulkPayStatus={bulkPayStatus}
          handleBulkPay={handleBulkPay}
          handlePayDate={handlePayDate}
          onOpenEventLedger={(dateId) => navigate(`/events/${dateId}?tab=ledger`)}
          bandColorById={bandColorById}
          totals={ledgerTotals}
          displayCurrency={displayCurrency}
          eurToDisplayRate={eurToDisplayRate}
        />
      )}
    </div>
  );
}

export default Dashboard;

