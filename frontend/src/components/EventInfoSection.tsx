type EventDetailData = {
  band_name: string;
  city: string | null;
  country: string | null;
  venue_name: string | null;
  description: string | null;
  address: string | null;
  band_paid_at?: string | null;
  load_in_time: string | null;
  soundcheck_time: string | null;
  doors_time: string | null;
  set_time: string | null;
  curfew_time: string | null;
  tech_notes: string | null;
  hospitality_notes: string | null;
  organizer_contact?: string | null;
  tech_contact?: string | null;
};

type LineupMember = {
  id: number;
  display_name: string;
  role: string | null;
  is_confirmed: 0 | 1;
};

type Props = {
  data: EventDetailData;
  lineup: LineupMember[];
  dateStr: string;
  formatTime: (value: string | null) => string | null;
};

function EventInfoSection({ data, lineup, dateStr, formatTime }: Props) {
  return (
    <>
      <div className="event-detail-grid">
        <section className="event-detail-section">
          <h2>Overview</h2>
          <ul className="detail-list">
            <li>
              <span>Band:</span>
              <strong>{data.band_name}</strong>
            </li>
            <li>
              <span>Date:</span>
              <strong>{dateStr}</strong>
            </li>
            <li>
              <span>Where:</span>
              <strong>
                {data.city || '—'}, {data.country || '—'}
              </strong>
            </li>
            <li>
              <span>Venue:</span>
              <strong>{data.venue_name || 'TBA'}</strong>
            </li>
          </ul>
          {data.description && <p style={{ marginTop: '0.75rem' }}>{data.description}</p>}
          {data.address && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <span style={{ opacity: 0.7 }}>Venue address:</span> <strong>{data.address}</strong>
            </p>
          )}
          {data.band_paid_at && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ opacity: 0.7 }}>Band payment:</span>{' '}
              <strong>Band has been marked as paid for this date.</strong>
            </p>
          )}
        </section>

        <section className="event-detail-section">
          <h2>Technical notes</h2>
          <ul className="detail-list">
            <li>
              <span>Load‑in:</span>
              <strong>{formatTime(data.load_in_time) || '—'}</strong>
            </li>
            <li>
              <span>Soundcheck:</span>
              <strong>{formatTime(data.soundcheck_time) || '—'}</strong>
            </li>
            <li>
              <span>Doors:</span>
              <strong>{formatTime(data.doors_time) || '—'}</strong>
            </li>
            <li>
              <span>Show:</span>
              <strong>{formatTime(data.set_time) || '—'}</strong>
            </li>
            <li>
              <span>End / Curfew:</span>
              <strong>{formatTime(data.curfew_time) || '—'}</strong>
            </li>
          </ul>
          {data.tech_notes && <p style={{ marginTop: '0.75rem' }}>{data.tech_notes}</p>}
          {data.organizer_contact && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <span style={{ opacity: 0.7 }}>Organizer contact:</span>{' '}
              <strong>{data.organizer_contact}</strong>
            </p>
          )}
          {data.tech_contact && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              <span style={{ opacity: 0.7 }}>Tech contact:</span> <strong>{data.tech_contact}</strong>
            </p>
          )}
        </section>

        <section className="event-detail-section">
          <h2>Hospitality</h2>
          <p>{data.hospitality_notes || 'No hospitality notes yet.'}</p>
        </section>
      </div>

      <div className="event-detail-grid" style={{ marginTop: '1rem' }}>
        <section className="event-detail-section">
          <h2>Lineup</h2>
          {lineup.length === 0 ? (
            <p className="muted">No lineup added yet.</p>
          ) : (
            <ul className="lineup-list">
              {lineup.map((m) => (
                <li key={m.id}>
                  <span className="lineup-name">{m.display_name}</span>
                  {m.role && <span className="lineup-role">{m.role}</span>}
                  {m.is_confirmed === 0 && <span className="badge">Unconfirmed</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default EventInfoSection;

