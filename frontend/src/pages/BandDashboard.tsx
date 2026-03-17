import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BandScheduleList from '../components/BandScheduleList';
import BandLedgerTable from '../components/BandLedgerTable';
import BandHeaderMeta from '../components/BandHeaderMeta';
import BandLedgerTotalsBar from '../components/BandLedgerTotalsBar';
import { useBandPageData } from '../hooks/useBandPageData';
import StatusBlock from '../components/StatusBlock';
import TabSwitch from '../components/TabSwitch';

function BandDashboard() {
  const { id } = useParams();

  const { detail, ledgerMembers, ledgerEvents, loading, error, myEvents, canSeeLedger } = useBandPageData(id);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview');
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

  const now = new Date();
  const sortedEvents = [...myEvents].sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );
  const upcomingEvents = sortedEvents.filter(
    (ev) => new Date(ev.event_date) >= now,
  );
  const pastEvents = sortedEvents.filter(
    (ev) => new Date(ev.event_date) < now,
  );

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
        <BandScheduleList
          bandName={detail.band.name}
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
        />
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

