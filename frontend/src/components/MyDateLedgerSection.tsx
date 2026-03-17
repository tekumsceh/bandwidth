import DateVenueRow from './DateVenueRow';
import MoneyPair from './MoneyPair';

type EventDetailData = {
  city: string | null;
  country: string | null;
  venue_name: string | null;
};

type Props = {
  data: EventDetailData;
  dateStr: string;
  myLedgerRow: { allocated_eur: number; paid_eur: number } | null;
};

function MyDateLedgerSection({ data, dateStr, myLedgerRow }: Props) {
  return (
    <section className="event-detail-section">
      <h2>My ledger for this date</h2>
      <ul className="detail-list">
        <li>
          <span>Show:</span>
          <strong>
            <DateVenueRow
              dateLabel={dateStr}
              city={data.city}
              country={data.country}
              venueName={data.venue_name}
            />
          </strong>
        </li>
      </ul>
      {myLedgerRow && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
          <div>
            Price/Paid:{' '}
            <strong>
              <MoneyPair allocated={myLedgerRow.allocated_eur} paid={myLedgerRow.paid_eur} suffix="EUR" />
            </strong>
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            Remaining:{' '}
            <strong>{(myLedgerRow.allocated_eur - myLedgerRow.paid_eur).toFixed(2)} EUR</strong>
          </div>
        </div>
      )}
    </section>
  );
}

export default MyDateLedgerSection;

