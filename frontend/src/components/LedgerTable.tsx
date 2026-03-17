type LedgerEvent = {
  date_id: number;
  band_id: number;
  band_name: string;
  event_date: string;
  venue_name: string | null;
  city: string | null;
  allocated_eur: number | string;
  paid_eur: number | string;
};

type LedgerBand = {
  name: string;
  initials: string;
};

type Props = {
  filteredLedgerEvents: LedgerEvent[];
  ledgerBands: LedgerBand[];
  ledgerLoading: boolean;
  onOpenEventLedger: (dateId: number) => void;
  handlePayDate: (dateId: number) => void;
  bandColorById: Map<number, string | null | undefined>;
  totals: { globalAllocated: number; globalPaid: number };
  displayCurrency: string;
  eurToDisplayRate: number;
};

function LedgerTable({
  filteredLedgerEvents,
  ledgerBands,
  ledgerLoading,
  onOpenEventLedger,
  handlePayDate,
  bandColorById,
  totals,
  displayCurrency,
  eurToDisplayRate,
}: Props) {
  if (filteredLedgerEvents.length === 0) {
    return <p className="muted">No shows yet to display in your ledger.</p>;
  }

  const toDisplay = (eur: number) => eur * eurToDisplayRate;
  const shownCurrency = displayCurrency.toUpperCase();

  return (
    <div className="ledger-wrapper">
      <table className="ledger-table">
        <thead>
          <tr>
            <th className="ledger-head">Date</th>
            <th className="ledger-head">Band</th>
            <th className="ledger-head">Venue</th>
            <th className="ledger-head">Set ({shownCurrency})</th>
            <th className="ledger-head">Paid ({shownCurrency})</th>
            <th className="ledger-head">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredLedgerEvents.map((ev) => {
            const d = new Date(ev.event_date);
            const dateLabel = d.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const allocated = Number(ev.allocated_eur || 0);
            const paid = Number(ev.paid_eur || 0);
            const bandColor = bandColorById.get(ev.band_id) ?? null;
            return (
              <tr
                key={ev.date_id}
                style={{ borderLeft: `3px solid ${bandColor || '#4b5563'}`, cursor: 'pointer' }}
                onClick={() => onOpenEventLedger(ev.date_id)}
              >
                <td className="ledger-cell">
                  <span className="ledger-link">{dateLabel}</span>
                </td>
                <td className="ledger-cell">{ev.band_name}</td>
                <td className="ledger-cell">
                  {ev.venue_name || '—'} ({ev.city || '—'})
                </td>
                <td className="ledger-cell">{toDisplay(allocated).toFixed(0)}</td>
                <td className="ledger-cell">{toDisplay(paid).toFixed(0)}</td>
                <td className="ledger-cell">
                  {allocated > paid + 0.0001 && (
                    <button
                      type="button"
                      className="btn btn-action btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePayDate(ev.date_id);
                      }}
                      disabled={ledgerLoading}
                    >
                      Pay
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="ledger-cell">Total</td>
            <td className="ledger-cell">{ledgerBands.map((b) => b.initials).join(', ')}</td>
            <td className="ledger-cell" />
            <td className="ledger-cell">{toDisplay(totals.globalAllocated).toFixed(0)}</td>
            <td className="ledger-cell">{toDisplay(totals.globalPaid).toFixed(0)}</td>
            <td className="ledger-cell" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default LedgerTable;

