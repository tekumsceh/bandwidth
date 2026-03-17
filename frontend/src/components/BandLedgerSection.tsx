type FinanceMember = {
  user_id: number;
  display_name: string;
  allocated_eur: number;
  paid_eur: number;
};

type FinanceSummary = {
  totals: Record<string, number>;
  members: FinanceMember[];
};

type Props = {
  canSeeBandFinance: boolean;
  finance: FinanceSummary | null;
};

function BandLedgerSection({ canSeeBandFinance, finance }: Props) {
  if (!canSeeBandFinance) return null;

  const totalIncoming = finance?.totals?.incoming_in ?? 0;
  const totalExpenses = finance?.totals?.expense_out ?? 0;
  const totalAllocated = finance?.totals?.member_allocation_out ?? 0;
  const profit = totalIncoming - totalExpenses - totalAllocated;

  return (
    <>
      <section className="event-detail-section">
        <h2>Finance snapshot</h2>
        {finance ? (
          <ul>
            <li>
              <span>Incoming (recorded):</span>
              <strong>{totalIncoming.toFixed(2)} EUR</strong>
            </li>
            <li>
              <span>Expenses:</span>
              <strong>{totalExpenses.toFixed(2)} EUR</strong>
            </li>
            <li>
              <span>Allocated to members:</span>
              <strong>{totalAllocated.toFixed(2)} EUR</strong>
            </li>
            <li>
              <span>Profit (rough):</span>
              <strong>{profit.toFixed(2)} EUR</strong>
            </li>
          </ul>
        ) : (
          <p className="muted">No finance data yet.</p>
        )}
      </section>

      <div className="event-detail-grid" style={{ marginTop: '1rem' }}>
        <section className="event-detail-section">
          <h2>Per‑member finance</h2>
          {finance && finance.members.length > 0 ? (
            <ul className="lineup-list">
              {finance.members.map((m) => (
                <li key={m.user_id}>
                  <span className="lineup-name">{m.display_name}</span>
                  <span className="lineup-role">
                    Allocated: {Number(m.allocated_eur || 0).toFixed(2)} EUR
                  </span>
                  <span className="lineup-role">
                    Paid: {Number(m.paid_eur || 0).toFixed(2)} EUR
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No per‑member allocations yet.</p>
          )}
        </section>
      </div>
    </>
  );
}

export default BandLedgerSection;

