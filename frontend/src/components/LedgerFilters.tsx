import { displayBandName } from '../utils/bandDisplay';

type LedgerEvent = {
  band_id: number;
  band_name: string;
  band_is_solo?: 0 | 1;
};

type LedgerBand = {
  name: string;
  initials: string;
};

type Props = {
  ledgerMode: 'unpaid' | 'all';
  setLedgerMode: (v: 'unpaid' | 'all') => void;
  ledgerBandFilter: 'all' | number;
  setLedgerBandFilter: (v: 'all' | number) => void;
  ledgerBands: LedgerBand[];
  ledgerEvents: LedgerEvent[];
};

function LedgerFilters({
  ledgerMode,
  setLedgerMode,
  ledgerBandFilter,
  setLedgerBandFilter,
  ledgerBands,
  ledgerEvents,
}: Props) {
  const short = (value: string) =>
    value.length > 15 ? `${value.slice(0, 15)}` : value;

  return (
    <>
      <div className="tabs" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`tab-button btn-filter ${ledgerMode === 'unpaid' ? 'active' : ''}`}
          onClick={() => setLedgerMode('unpaid')}
        >
          Unpaid only
        </button>
        <button
          type="button"
          className={`tab-button btn-filter ${ledgerMode === 'all' ? 'active' : ''}`}
          onClick={() => setLedgerMode('all')}
        >
          All dates
        </button>
      </div>
      {ledgerBands.length > 1 && (
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`tab-button btn-filter ${ledgerBandFilter === 'all' ? 'active' : ''}`}
            onClick={() => setLedgerBandFilter('all')}
          >
            All bands
          </button>
          {Array.from(
            new Map(
              ledgerEvents.map((ev) => [
                ev.band_id,
                { name: displayBandName(ev.band_name, ev.band_is_solo) },
              ]),
            ).entries(),
          ).map(([id, { name }]) => (
            <button
              key={id}
              type="button"
              className={`tab-button btn-filter ${ledgerBandFilter === id ? 'active' : ''}`}
              onClick={() => setLedgerBandFilter(id as number)}
            >
              {short(name)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default LedgerFilters;

