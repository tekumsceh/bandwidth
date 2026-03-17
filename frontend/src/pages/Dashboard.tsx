import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventsHeaderShell from '../components/EventsHeaderShell';
import EventsToolbar from '../components/EventsToolbar';
import ScheduleList from '../components/ScheduleList';
import MyLedgerView from '../components/MyLedgerView';
import { useEventsPageData } from '../hooks/useEventsPageData';
import { useEventsViewState } from '../hooks/useEventsViewState';

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
  const {
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    bandFilter,
    setBandFilter,
    ledgerBandFilter,
    setLedgerBandFilter,
    ledgerMode,
    setLedgerMode,
    bulkPayAmount,
    setBulkPayAmount,
    bulkPayStatus,
    setBulkPayStatus,
    openMenu,
    setOpenMenu,
    menuCloseTimer,
    setMenuCloseTimer,
  } = useEventsViewState();
  const navigate = useNavigate();
  const [displayCurrency, setDisplayCurrency] = useState('EUR');
  const [eurToDisplayRate, setEurToDisplayRate] = useState(1);

  useEffect(() => {
    const loadCurrencyContext = async () => {
      try {
        const prefRes = await fetch('http://localhost:5000/api/me/preferences/currency');
        const prefJson = (await prefRes.json()) as {
          default_currency?: string;
          local_currency?: string;
          supported_currencies?: string[];
        };
        if (!prefRes.ok) return;
        const target = String(prefJson.default_currency || 'EUR').toUpperCase();
        setDisplayCurrency(target);

        const fxRes = await fetch(`http://localhost:5000/api/me/fx?base=EUR&symbols=${encodeURIComponent(target)}`);
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
    if (activeTab === 'schedule') {
      void refresh({
        view: 'schedule',
        timeline: filter,
        band: bandFilter,
      });
    } else {
      void refreshLedger({
        band: ledgerBandFilter,
        ledgerMode,
      });
    }
  }, [activeTab, filter, bandFilter, ledgerBandFilter, ledgerMode, refresh, refreshLedger]);

  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const filteredEvents = useMemo(() => {
    const now = new Date();

    const list = events.filter((ev) => {
      // Hide cancelled completely
      if (ev.status === 'cancelled') return false;

      const evDate = new Date(ev.event_date);

      if (filter === 'upcoming' && evDate < now) return false;
      if (filter === 'past' && evDate >= now) return false;

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

  const timelineBandOptions = useMemo(() => {
    const now = new Date();
    const allowedBandIds = new Set<number>();

    for (const ev of events) {
      if (ev.status === 'cancelled') continue;
      const evDate = new Date(ev.event_date);

      if (filter === 'upcoming' && evDate < now) continue;
      if (filter === 'past' && evDate >= now) continue;

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
    const bandSet = Array.from(new Set(ledgerEvents.map((ev) => ev.band_name))).sort(
      (a, b) => a.localeCompare(b),
    );
    return bandSet.map((name) => {
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 4);
      return { name, initials };
    });
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
      const band = ev.band_name;
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
      const res = await fetch(`http://localhost:5000/api/me/pay/date/${dateId}`, {
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
      const res = await fetch('http://localhost:5000/api/me/pay/bulk', {
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

  return (
    <div className="page">
      <EventsHeaderShell title={activeTab === 'schedule' ? 'Schedule' : 'My ledger'}>
        <EventsToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filter={filter}
          setFilter={setFilter}
          bandFilter={bandFilter}
          setBandFilter={setBandFilter}
          bandOptions={timelineBandOptions}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          menuCloseTimer={menuCloseTimer}
          setMenuCloseTimer={setMenuCloseTimer}
        />
      </EventsHeaderShell>

      {activeTab === 'schedule' && (
        <>
          <ScheduleList
            events={filteredEvents}
            loading={loading}
            error={error}
            filter={filter}
            onSelectEvent={(id) => navigate(`/events/${id}`)}
          />
          <div
            className="event-detail-section quick-date-panel"
            style={{ marginTop: '0.75rem' }}
          >
            <h2>Add date</h2>
            <QuickCreateInline bands={bandOptions} onCreated={(id) => navigate(`/events/${id}`)} />
          </div>
          <button
            type="button"
            className="fab-button btn-fab"
            onClick={() => navigate('/events/new')}
            aria-label="Create new show"
          >
            +
          </button>
        </>
      )}

      {activeTab === 'ledger' && (
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

type QuickCreateProps = {
  bands: { id: number; name: string }[];
  onCreated: (id: number) => void;
};

function QuickCreateInline({ bands, onCreated }: QuickCreateProps) {
  const [bandId, setBandId] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!bandId || !date) {
      setError('Band and date are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/dates/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ band_id: Number(bandId), event_date: date }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
      onCreated(Number(json.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to quick-create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-create-form">
      <select value={bandId} onChange={(e) => setBandId(e.target.value)}>
        <option value="">Band</option>
        {bands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        min={new Date().toISOString().split('T')[0]}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="Date"
      />
      <button
        type="button"
        className="btn btn-action quick-create-btn"
        disabled={saving}
        onClick={create}
      >
        {saving ? 'ADDING...' : 'ADD'}
      </button>
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}

export default Dashboard;

