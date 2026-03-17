type Props = {
  canSeeBandFinance: boolean;
  canRequestExpense?: boolean;
  incomingAmount: string;
  setIncomingAmount: (v: string) => void;
  incomingLabel: string;
  setIncomingLabel: (v: string) => void;
  expenseAmount: string;
  setExpenseAmount: (v: string) => void;
  expenseLabel: string;
  setExpenseLabel: (v: string) => void;
  myPaidAmount: string;
  setMyPaidAmount: (v: string) => void;
  savingIncoming: boolean;
  savingExpense: boolean;
  savingMyPaid: boolean;
  onAddIncoming: () => void;
  onAddExpense: () => void;
  onAddMyPaid: () => void;
  onBandPaid: () => void;
  onMemberPaidFlag: () => void;
};

function EventLedgerActions({
  canSeeBandFinance,
  canRequestExpense = false,
  incomingAmount,
  setIncomingAmount,
  incomingLabel,
  setIncomingLabel,
  expenseAmount,
  setExpenseAmount,
  expenseLabel,
  setExpenseLabel,
  myPaidAmount,
  setMyPaidAmount,
  savingIncoming,
  savingExpense,
  savingMyPaid,
  onAddIncoming,
  onAddExpense,
  onAddMyPaid,
  onBandPaid,
  onMemberPaidFlag,
}: Props) {
  return (
    <section className="event-detail-section" style={{ marginTop: '1rem' }}>
      <h2>Ledger actions</h2>
      {canSeeBandFinance && (
        <div className="form-row">
          <label>
            <span>Incoming EUR</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={incomingAmount}
              onChange={(e) => setIncomingAmount(e.target.value)}
            />
          </label>
          <label>
            <span>Incoming label</span>
            <input
              type="text"
              value={incomingLabel}
              onChange={(e) => setIncomingLabel(e.target.value)}
              placeholder="Door / guarantee / etc"
            />
          </label>
          <button type="button" className="btn btn-action btn-secondary" disabled={savingIncoming} onClick={onAddIncoming}>
            {savingIncoming ? 'Saving…' : 'Add incoming'}
          </button>
        </div>
      )}

      {(canSeeBandFinance || canRequestExpense) && (
        <div className="form-row">
          <label>
            <span>Expense EUR</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
            />
          </label>
          <label>
            <span>Expense label</span>
            <input
              type="text"
              value={expenseLabel}
              onChange={(e) => setExpenseLabel(e.target.value)}
              placeholder="Travel / strings / etc"
            />
          </label>
          <button type="button" className="btn btn-action btn-secondary" disabled={savingExpense} onClick={onAddExpense}>
            {savingExpense ? 'Saving…' : 'Add expense'}
          </button>
        </div>
      )}

      <div className="form-row">
        <label>
          <span>Mark paid amount (me)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={myPaidAmount}
            onChange={(e) => setMyPaidAmount(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-action btn-secondary" disabled={savingMyPaid} onClick={onAddMyPaid}>
          {savingMyPaid ? 'Saving…' : 'Add my paid'}
        </button>
        <button type="button" className="btn btn-action btn-secondary" onClick={onMemberPaidFlag}>
          Mark paid
        </button>
        {canSeeBandFinance && (
          <button type="button" className="btn btn-action btn-secondary" onClick={onBandPaid}>
            Mark band paid
          </button>
        )}
      </div>
    </section>
  );
}

export default EventLedgerActions;

