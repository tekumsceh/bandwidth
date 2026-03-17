type PendingExpense = {
  id: number;
  display_name: string;
  label: string;
  amount_eur: number;
  created_at: string;
};

type Props = {
  canSeeBandFinance: boolean;
  pendingExpenses: PendingExpense[];
  onApprove: (paymentId: number) => void;
  onReject: (paymentId: number) => void;
};

function PendingExpensesPanel({ canSeeBandFinance, pendingExpenses, onApprove, onReject }: Props) {
  if (!canSeeBandFinance) return null;

  return (
    <section className="event-detail-section" style={{ marginTop: '1rem' }}>
      <h2>Pending expenses</h2>
      {pendingExpenses.length === 0 ? (
        <p className="muted">No pending expenses.</p>
      ) : (
        <ul className="lineup-list">
          {pendingExpenses.map((p) => (
            <li key={p.id}>
              <span className="lineup-name">{p.display_name}</span>
              <span className="lineup-role">{p.label || 'Expense'}: {Number(p.amount_eur || 0).toFixed(2)} EUR</span>
              <div style={{ display: 'inline-flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
                <button type="button" className="btn btn-action btn-secondary" onClick={() => onApprove(p.id)}>
                  Approve
                </button>
                <button type="button" className="btn btn-action btn-secondary" onClick={() => onReject(p.id)}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PendingExpensesPanel;

