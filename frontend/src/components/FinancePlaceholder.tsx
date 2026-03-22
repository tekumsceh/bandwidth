/**
 * Shell for the Finance hub view until settlements / ledger work returns.
 */
export default function FinancePlaceholder() {
  return (
    <div className="page page-finance-placeholder">
      <div className="finance-placeholder-card">
        <h2 className="finance-placeholder-title">Finance</h2>
        <p className="finance-placeholder-body">
          Settlements, payouts, and ledger tools are being redesigned. Nothing here runs yet — check back
          when this area is wired up again.
        </p>
      </div>
    </div>
  );
}
