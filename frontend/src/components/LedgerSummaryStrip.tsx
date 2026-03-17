type LedgerEvent = {
  event_date: string;
  allocated_eur: number | string;
  paid_eur: number | string;
};

type Props = {
  ledgerEvents: LedgerEvent[];
  displayCurrency: string;
  eurToDisplayRate: number;
};

function LedgerSummaryStrip({ ledgerEvents, displayCurrency, eurToDisplayRate }: Props) {
  const year = new Date().getFullYear();
  const thisYearEvents = ledgerEvents.filter((ev) => new Date(ev.event_date).getFullYear() === year);
  const totalEarned = thisYearEvents.reduce((sum, ev) => sum + Number(ev.paid_eur || 0), 0);
  const eligible = ledgerEvents.reduce((sum, ev) => {
    const d = new Date(ev.event_date);
    const allocated = Number(ev.allocated_eur || 0);
    const paid = Number(ev.paid_eur || 0);
    if (d < new Date() && allocated > paid) return sum + (allocated - paid);
    return sum;
  }, 0);
  const toDisplay = (eur: number) => eur * eurToDisplayRate;
  const shownCurrency = displayCurrency.toUpperCase();

  return (
    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
      <span style={{ marginRight: '1rem' }}>
        This year paid: <strong>{toDisplay(totalEarned).toFixed(0)} {shownCurrency}</strong>
      </span>
      <span>
        Held but not paid: <strong>{toDisplay(eligible).toFixed(0)} {shownCurrency}</strong>
      </span>
      <span style={{ marginLeft: '1rem' }} className="muted">
        Rounded display values
      </span>
    </div>
  );
}

export default LedgerSummaryStrip;

