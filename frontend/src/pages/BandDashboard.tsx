import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BandLedgerTable from '../components/BandLedgerTable';
import BandHeaderMeta from '../components/BandHeaderMeta';
import BandLedgerTotalsBar from '../components/BandLedgerTotalsBar';
import { useBandPageData } from '../hooks/useBandPageData';
import StatusBlock from '../components/StatusBlock';
import TabSwitch from '../components/TabSwitch';
import FilterBar from '../components/filters/FilterBar';
import FilterSummary from '../components/filters/FilterSummary';
import Listing from '../components/listing/Listing';
import { APP_ROUTES } from '../config/navigation';

function BandDashboard() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openMenu, setOpenMenu] = useState<'timeline' | null>(null);
  const filterRootRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const activeTab =
    (searchParams.get('view') || 'overview').toLowerCase() === 'ledger' ? 'ledger' : 'overview';
  const timelineRaw = (searchParams.get('timeline') || 'upcoming').toLowerCase();
  const timeline: 'upcoming' | 'past' | 'all' =
    timelineRaw === 'past' || timelineRaw === 'all' ? timelineRaw : 'upcoming';
  const archive = (searchParams.get('archive') || '0') === '1';

  const { detail, ledgerMembers, ledgerEvents, loading, error, myEvents, bandMembers, canSeeLedger } = useBandPageData(id, {
    timeline,
    archive,
  });

  const updateQuery = (
    patch: Partial<Record<'view' | 'timeline' | 'archive', string | null>>,
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: false });
  };

  const setActiveTab = (next: 'overview' | 'ledger') => updateQuery({ view: next });
  const setTimeline = (next: 'upcoming' | 'past' | 'all') => updateQuery({ timeline: next });
  const setArchive = (next: boolean) => updateQuery({ archive: next ? '1' : '0' });
  const hasPendingExpenses = useMemo(
    () => ledgerEvents.some((ev) => ev.expenses_eur > 0),
    [ledgerEvents],
  );

  const ledgerBandColumns = useMemo(() => {
    return ledgerMembers.map((m) => {
      const initials = m.display_name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 4);
      return { ...m, initials };
    });
  }, [ledgerMembers]);

  const ledgerTotals = useMemo(() => {
    const memberTotals: Record<number, { allocated: number; paid: number }> = {};
    let globalAllocated = 0;
    let globalPaid = 0;
    let globalExpenses = 0;

    for (const ev of ledgerEvents) {
      globalExpenses += ev.expenses_eur || 0;
      for (const m of ev.members) {
        if (!memberTotals[m.user_id]) {
          memberTotals[m.user_id] = { allocated: 0, paid: 0 };
        }
        memberTotals[m.user_id].allocated += m.allocated_eur || 0;
        memberTotals[m.user_id].paid += m.paid_eur || 0;
        globalAllocated += m.allocated_eur || 0;
        globalPaid += m.paid_eur || 0;
      }
    }

    return { memberTotals, globalAllocated, globalPaid, globalExpenses };
  }, [ledgerEvents]);

  const sortedEvents = [...myEvents].sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );
  const closestDates = sortedEvents.slice(0, 3);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!openMenu) return;
      const root = filterRootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [openMenu]);

  const cancelCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu((curr) => (curr === 'timeline' ? null : curr));
      closeTimerRef.current = null;
    }, 2000);
  };

  const timelineLabel = timeline === 'upcoming' ? 'Upcoming' : timeline === 'past' ? 'Past' : 'All';
  const archiveLabel = archive ? 'On' : 'Off';

  if (loading) return <div className="page"><StatusBlock kind="loading" message="Loading…" /></div>;
  if (error) return <div className="page"><StatusBlock kind="error" message={error} /></div>;
  if (!detail) return <div className="page"><StatusBlock kind="empty" message="Band not found." /></div>;

  return (
    <div className="page">
      <BandHeaderMeta activeTab={activeTab} bandName={detail.band.name} />

      <TabSwitch
        value={activeTab}
        onChange={(next) => setActiveTab(next as 'overview' | 'ledger')}
        options={[
          { value: 'overview', label: 'Overview' },
          ...(canSeeLedger ? [{ value: 'ledger', label: 'Ledger', badge: hasPendingExpenses ? '!' : undefined }] : []),
        ]}
        className="tabs"
      />

      {activeTab === 'overview' && (
        <section className="hub-layout">
          <div className="hub-left-col">
            <div ref={filterRootRef} style={{ maxWidth: '520px' }}>
              <FilterBar
                className="events-toolbar filter-bar"
                summary={
                  <FilterSummary
                    items={[
                      { label: 'Timeline', value: timelineLabel },
                      { label: 'Archive', value: archiveLabel },
                    ]}
                  />
                }
              >
                <div
                  className="events-toolbar-group"
                  onMouseEnter={cancelCloseTimer}
                  onMouseLeave={() => {
                    if (openMenu === 'timeline') scheduleClose();
                  }}
                >
                  <button
                    type="button"
                    className={`events-toolbar-label btn-filter ${openMenu === 'timeline' ? 'events-toolbar-label-active' : ''}`}
                    onClick={() => setOpenMenu(openMenu === 'timeline' ? null : 'timeline')}
                  >
                    Timeline
                  </button>
                  {openMenu === 'timeline' && (
                    <div className="events-toolbar-menu">
                      <button
                        type="button"
                        className={`events-tool btn-filter ${timeline === 'upcoming' ? 'events-tool-active' : ''}`}
                        onClick={() => {
                          setTimeline('upcoming');
                          setOpenMenu(null);
                        }}
                      >
                        Upcoming
                      </button>
                      <button
                        type="button"
                        className={`events-tool btn-filter ${timeline === 'past' ? 'events-tool-active' : ''}`}
                        onClick={() => {
                          setTimeline('past');
                          setOpenMenu(null);
                        }}
                      >
                        Past
                      </button>
                      <button
                        type="button"
                        className={`events-tool btn-filter ${timeline === 'all' ? 'events-tool-active' : ''}`}
                        onClick={() => {
                          setTimeline('all');
                          setOpenMenu(null);
                        }}
                      >
                        All
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`events-toolbar-label btn-filter ${archive ? 'events-toolbar-label-active' : ''}`}
                  onClick={() => setArchive(!archive)}
                >
                  Archive
                </button>
              </FilterBar>
            </div>

            <section className="event-detail-section">
              <h2>Closest dates</h2>
              <Listing
                items={closestDates}
                loading={loading}
                error={error}
                emptyMessage="No dates for selected filters."
                className="event-list"
                getKey={(ev) => ev.date_id}
                renderItem={(ev) => {
                  const d = new Date(ev.event_date);
                  const dateLabel = d.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: timeline === 'past' ? 'numeric' : undefined,
                  });
                  return (
                    <Link className="event-card btn-nav" to={`/events/${ev.date_id}`} style={{ textDecoration: 'none' }}>
                      <div className="event-date">{dateLabel}</div>
                      <div className="event-main">
                        <div className="event-title">{ev.title || `${detail.band.name} @ ${ev.venue_name || 'TBA'}`}</div>
                        <div className="event-sub">
                          {ev.venue_name || 'Unknown venue'} • {ev.city || '—'}, {ev.country || '—'}
                        </div>
                      </div>
                    </Link>
                  );
                }}
              />
            </section>

            <section className="event-detail-section">
              <h2>Band chat (mock)</h2>
              <div className="hub-chat-mock">
                <div className="hub-chat-line"><strong>Manager:</strong> Rehearsal call tomorrow at 18:00.</div>
                <div className="hub-chat-line"><strong>Bass:</strong> Confirmed. Bringing DI and backup cable.</div>
                <div className="hub-chat-line"><strong>FOH:</strong> Please pin final set order before soundcheck.</div>
                <input type="text" placeholder="Chat input mock (read-only for now)" disabled />
              </div>
            </section>

            <section className="event-detail-section">
              <h2>Reserved slot</h2>
              <p>This area is intentionally left for the next operational widget.</p>
            </section>
          </div>

          <aside className="hub-right-col event-detail-section">
            <h2>{detail.band.is_solo ? 'Personal hub actions' : 'Band actions'}</h2>
            <section className="hub-members-strip">
              <div className="hub-members-label">Members</div>
              <div className="hub-members-avatars">
                {bandMembers.map((member) => {
                  const initials = member.display_name
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('')
                    .slice(0, 2);
                  return (
                    <div key={member.user_id} className="hub-member-avatar" title={`${member.display_name} (${member.role})`}>
                      {initials}
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="hub-actions-grid">
              <Link to={`${APP_ROUTES.createEvent}?bandId=${detail.band.id}`} className="hub-action-card btn-nav">
                <strong>Create event</strong>
                <span>Quick-create a date for this context.</span>
              </Link>
              <Link to={`${APP_ROUTES.assetsGear}?bandId=${detail.band.id}`} className="hub-action-card btn-nav">
                <strong>Gear profiles</strong>
                <span>Personal, band, combined, and invoke.</span>
              </Link>
              <Link to={`${APP_ROUTES.assetsSetlists}?bandId=${detail.band.id}`} className="hub-action-card btn-nav">
                <strong>Setlists</strong>
                <span>Build profile defaults and date snapshots.</span>
              </Link>
              <Link to={`${APP_ROUTES.assetsPatch}?bandId=${detail.band.id}`} className="hub-action-card btn-nav">
                <strong>Technical rider</strong>
                <span>I/O patch profiles and recall flow.</span>
              </Link>
              <button type="button" className="hub-action-card" disabled>
                <strong>Add member</strong>
                <span>Member management action will be wired next.</span>
              </button>
              <button type="button" className="hub-action-card" disabled>
                <strong>Ledger tools</strong>
                <span>Band-wide money actions and exports.</span>
              </button>
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'ledger' && canSeeLedger && (
        <section className="event-detail-section" style={{ marginTop: '1rem' }}>
          <h2>Band ledger</h2>
          <BandLedgerTotalsBar totals={ledgerTotals} />
          <BandLedgerTable
            ledgerEvents={ledgerEvents}
            ledgerBandColumns={ledgerBandColumns}
            ledgerTotals={ledgerTotals}
          />
        </section>
      )}
    </div>
  );
}

export default BandDashboard;

