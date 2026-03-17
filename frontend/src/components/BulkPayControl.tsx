type Props = {
  bulkPayAmount: string;
  setBulkPayAmount: (v: string) => void;
  handleBulkPay: () => void;
  ledgerLoading: boolean;
  bulkPayStatus: string | null;
};

function BulkPayControl({
  bulkPayAmount,
  setBulkPayAmount,
  handleBulkPay,
  ledgerLoading,
  bulkPayStatus,
}: Props) {
  return (
    <>
      <div className="bulk-pay-control">
        <input
          type="number"
          min="0"
          step="1"
          value={bulkPayAmount}
          onChange={(e) => setBulkPayAmount(e.target.value)}
          placeholder="Bulk pay EUR"
        />
        <button type="button" className="btn btn-action btn-secondary" onClick={handleBulkPay} disabled={ledgerLoading}>
          Distribute
        </button>
      </div>
      {bulkPayStatus && <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>{bulkPayStatus}</p>}
    </>
  );
}

export default BulkPayControl;

