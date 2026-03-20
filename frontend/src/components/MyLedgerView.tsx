import LedgerSummaryStrip from './LedgerSummaryStrip';
import LedgerFilters from './LedgerFilters';
import BulkPayControl from './BulkPayControl';
import LedgerTable from './LedgerTable';

type LedgerEvent = {
  date_id: number;
  band_id: number;
  band_name: string;
  band_is_solo?: 0 | 1;
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
  ledgerEvents: LedgerEvent[];
  filteredLedgerEvents: LedgerEvent[];
  ledgerBands: LedgerBand[];
  ledgerLoading: boolean;
  ledgerError: string | null;
  ledgerMode: 'unpaid' | 'all';
  setLedgerMode: (v: 'unpaid' | 'all') => void;
  ledgerBandFilter: 'all' | number;
  setLedgerBandFilter: (v: 'all' | number) => void;
  bulkPayAmount: string;
  setBulkPayAmount: (v: string) => void;
  bulkPayStatus: string | null;
  handleBulkPay: () => void;
  handlePayDate: (dateId: number) => void;
  onOpenEventLedger: (dateId: number) => void;
  bandColorById: Map<number, string | null | undefined>;
  totals: { globalAllocated: number; globalPaid: number };
  displayCurrency: string;
  eurToDisplayRate: number;
};

function MyLedgerView({
  ledgerEvents,
  filteredLedgerEvents,
  ledgerBands,
  ledgerLoading,
  ledgerError,
  ledgerMode,
  setLedgerMode,
  ledgerBandFilter,
  setLedgerBandFilter,
  bulkPayAmount,
  setBulkPayAmount,
  bulkPayStatus,
  handleBulkPay,
  handlePayDate,
  onOpenEventLedger,
  bandColorById,
  totals,
  displayCurrency,
  eurToDisplayRate,
}: Props) {
  return (
    <section className="event-detail-section" style={{ marginTop: '0.5rem' }}>
      <h2>Ledger</h2>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <LedgerSummaryStrip
          ledgerEvents={ledgerEvents}
          displayCurrency={displayCurrency}
          eurToDisplayRate={eurToDisplayRate}
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <LedgerFilters
            ledgerMode={ledgerMode}
            setLedgerMode={setLedgerMode}
            ledgerBandFilter={ledgerBandFilter}
            setLedgerBandFilter={setLedgerBandFilter}
            ledgerBands={ledgerBands}
            ledgerEvents={ledgerEvents}
          />
          <BulkPayControl
            bulkPayAmount={bulkPayAmount}
            setBulkPayAmount={setBulkPayAmount}
            handleBulkPay={handleBulkPay}
            ledgerLoading={ledgerLoading}
            bulkPayStatus={null}
          />
        </div>
      </div>

      {bulkPayStatus && <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>{bulkPayStatus}</p>}
      {ledgerLoading && <p className="muted">Loading ledger…</p>}
      {ledgerError && <div className="page-status error">{ledgerError}</div>}
      {!ledgerLoading && !ledgerError && (
        <LedgerTable
          filteredLedgerEvents={filteredLedgerEvents}
          ledgerBands={ledgerBands}
          ledgerLoading={ledgerLoading}
          onOpenEventLedger={onOpenEventLedger}
          handlePayDate={handlePayDate}
          bandColorById={bandColorById}
          totals={totals}
          displayCurrency={displayCurrency}
          eurToDisplayRate={eurToDisplayRate}
        />
      )}
    </section>
  );
}

export default MyLedgerView;

