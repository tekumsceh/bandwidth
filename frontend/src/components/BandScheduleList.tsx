import { Link } from 'react-router-dom';

type BandEvent = {
  date_id: number;
  event_date: string;
  title: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
};

type Props = {
  bandName: string;
  upcomingEvents: BandEvent[];
  pastEvents: BandEvent[];
};

function BandScheduleList({ bandName, upcomingEvents, pastEvents }: Props) {
  return (
    <div className="event-detail-grid" style={{ marginTop: '1rem' }}>
      <section className="event-detail-section">
        <h2>Upcoming shows (me in this band)</h2>
        {upcomingEvents.length === 0 ? (
          <p className="muted">Nothing on your radar yet.</p>
        ) : (
          <ul className="lineup-list">
            {upcomingEvents.map((ev) => {
              const d = new Date(ev.event_date);
              const dateLabel = d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
              });
              return (
                <li key={ev.date_id}>
                  <Link
                    className="event-card btn-nav"
                    to={`/events/${ev.date_id}`}
                    style={{ padding: '0.6rem 0.9rem', textDecoration: 'none' }}
                  >
                    <div className="event-date">{dateLabel}</div>
                    <div className="event-main">
                      <div className="event-title">
                        {ev.title || `${bandName} @ ${ev.venue_name || 'TBA'}`}
                      </div>
                      <div className="event-sub">
                        {ev.venue_name || 'Unknown venue'} • {ev.city || '—'}, {ev.country || '—'}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="event-detail-section">
        <h2>Past shows (me in this band)</h2>
        {pastEvents.length === 0 ? (
          <p className="muted">No past shows yet.</p>
        ) : (
          <ul className="lineup-list">
            {pastEvents.slice(0, 25).map((ev) => {
              const d = new Date(ev.event_date);
              const dateLabel = d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
              return (
                <li key={ev.date_id}>
                  <span className="lineup-name">
                    {dateLabel} – {ev.title || `${bandName} @ ${ev.venue_name || 'TBA'}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default BandScheduleList;

