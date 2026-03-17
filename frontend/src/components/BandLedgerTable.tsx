import { Link } from 'react-router-dom';

type BandLedgerMember = {
  user_id: number;
  display_name: string;
  initials: string;
};

type BandLedgerEvent = {
  date_id: number;
  event_date: string;
  band_paid_at: string | null;
  expenses_eur: number;
  members: {
    user_id: number;
    allocated_eur: number;
    paid_eur: number;
  }[];
};

type Props = {
  ledgerEvents: BandLedgerEvent[];
  ledgerBandColumns: BandLedgerMember[];
  ledgerTotals: {
    memberTotals: Record<number, { allocated: number; paid: number }>;
    globalAllocated: number;
    globalPaid: number;
    globalExpenses: number;
  };
};

function BandLedgerTable({ ledgerEvents, ledgerBandColumns, ledgerTotals }: Props) {
  if (ledgerEvents.length === 0) {
    return <p className="muted">No shows yet to display in the ledger.</p>;
  }

  return (
    <div className="ledger-wrapper">
      <table className="ledger-table">
        <thead>
          <tr>
            <th className="ledger-head">Date</th>
            {ledgerBandColumns.map((m) => (
              <th key={m.user_id} className="ledger-head" title={m.display_name}>
                {m.initials}
              </th>
            ))}
            <th className="ledger-head">Expenses</th>
            <th className="ledger-head">Σ</th>
          </tr>
        </thead>
        <tbody>
          {ledgerEvents.map((ev) => {
            const dateLabel = new Date(ev.event_date).toISOString().slice(5, 10);
            const perMember = new Map<number, { allocated: number; paid: number }>();
            let rowAllocated = 0;
            let rowPaid = 0;
            for (const m of ev.members) {
              perMember.set(m.user_id, {
                allocated: m.allocated_eur || 0,
                paid: m.paid_eur || 0,
              });
              rowAllocated += m.allocated_eur || 0;
              rowPaid += m.paid_eur || 0;
            }

            return (
              <tr key={ev.date_id}>
                <td className="ledger-cell ledger-sticky">
                  <Link className="ledger-link btn-nav" to={`/events/${ev.date_id}`}>
                    {dateLabel}
                  </Link>
                  {ev.band_paid_at && (
                    <span className="badge" style={{ marginLeft: '0.4rem' }} title="Band has been paid for this date">
                      $
                    </span>
                  )}
                </td>
                {ledgerBandColumns.map((m) => {
                  const vals = perMember.get(m.user_id);
                  if (!vals) return <td key={m.user_id} className="ledger-cell ledger-empty">—</td>;
                  return <td key={m.user_id} className="ledger-cell">{`${vals.allocated.toFixed(0)}/${vals.paid.toFixed(0)}`}</td>;
                })}
                <td className="ledger-cell">{(ev.expenses_eur || 0).toFixed(0)}</td>
                <td className="ledger-cell">{`${rowAllocated.toFixed(0)}/${rowPaid.toFixed(0)}`}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="ledger-cell ledger-sticky">Total</td>
            {ledgerBandColumns.map((m) => {
              const totals = ledgerTotals.memberTotals[m.user_id] || { allocated: 0, paid: 0 };
              return (
                <td key={m.user_id} className="ledger-cell">
                  {`${totals.allocated.toFixed(0)}/${totals.paid.toFixed(0)}`}
                </td>
              );
            })}
            <td className="ledger-cell">{ledgerTotals.globalExpenses.toFixed(0)}</td>
            <td className="ledger-cell">{`${ledgerTotals.globalAllocated.toFixed(0)}/${ledgerTotals.globalPaid.toFixed(0)}`}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default BandLedgerTable;

