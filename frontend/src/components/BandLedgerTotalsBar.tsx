type Totals = {
  globalAllocated: number;
  globalPaid: number;
  globalExpenses: number;
};

type Props = {
  totals: Totals;
};

function BandLedgerTotalsBar({ totals }: Props) {
  return (
    <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', opacity: 0.9 }}>
      <span style={{ marginRight: '1rem' }}>
        Allocated/Paid: <strong>{totals.globalAllocated.toFixed(0)}/{totals.globalPaid.toFixed(0)} EUR</strong>
      </span>
      <span>
        Expenses: <strong>{totals.globalExpenses.toFixed(0)} EUR</strong>
      </span>
    </div>
  );
}

export default BandLedgerTotalsBar;

