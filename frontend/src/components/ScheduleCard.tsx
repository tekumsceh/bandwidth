import type { ScheduleEvent } from './scheduleTypes';
import { displayBandName } from '../utils/bandDisplay';

type Props = {
  event: ScheduleEvent;
  filter: 'upcoming' | 'past' | 'all';
  onSelectEvent: (id: number) => void;
};

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'tentative') return 'Pending';
  if (s === 'postponed') return 'Postponed';
  if (s === 'done') return 'Done';
  if (s === 'cancelled') return 'Cancelled';
  return status.replace(/_/g, ' ');
}

function ScheduleCard({ event, filter: _filter, onSelectEvent }: Props) {
  const d = new Date(event.event_date);
  const dateLong = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formatTime = (t?: string | null) =>
    t
      ? new Date(`1970-01-01T${t}`).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;
  const soundcheckLabel = formatTime(event.soundcheck_time);
  const showLabel = formatTime(event.set_time);

  const priceRaw = event.event_price;
  const priceNum = typeof priceRaw === 'string' ? Number(priceRaw) : Number(priceRaw ?? 0);
  const priceStr =
    Number.isFinite(priceNum) && priceNum > 0
      ? `${(event.currency || 'EUR').toUpperCase()} ${priceNum.toFixed(0)}`
      : null;

  const venue = event.venue_name || 'Unknown venue';
  const band = displayBandName(event.band_name, event.band_is_solo);

  return (
    <div
      className="event-card event-card--gig"
      onClick={() => onSelectEvent(event.id)}
      style={{
        borderLeft: `3px solid ${event.band_color || '#4b5563'}`,
        cursor: 'pointer',
      }}
      data-description={event.description || ''}
    >
      <div className="event-card-gig-head">
        <div className="event-card-gig-head-main">
          <div className="event-card-gig-venue">{venue}</div>
          {band ? <div className="event-card-gig-band">{band}</div> : null}
          <div className="event-card-gig-date-long">{dateLong}</div>
        </div>
        <div className={`event-card-gig-status event-card-gig-status--${event.status.toLowerCase()}`}>
          {statusLabel(event.status)}
        </div>
      </div>

      <div className="event-card-gig-times">
        <div className="event-card-gig-time-block">
          <span className="event-card-gig-time-label">Load in</span>
          <span className="event-card-gig-time-value event-card-gig-time-value--muted">—</span>
        </div>
        <div className="event-card-gig-time-block">
          <span className="event-card-gig-time-label">Soundcheck</span>
          <span className="event-card-gig-time-value">{soundcheckLabel || '—'}</span>
        </div>
        <div className="event-card-gig-time-block">
          <span className="event-card-gig-time-label">Set time</span>
          <span className="event-card-gig-time-value">{showLabel || '—'}</span>
        </div>
      </div>

      <div className="event-card-gig-foot">
        <div className="event-card-gig-foot-left">
          {priceStr ? <span className="event-card-gig-price">{priceStr}</span> : null}
          {event.city ? <span className="event-card-gig-city">{event.city}</span> : null}
        </div>
        <div className="event-card-gig-foot-right">
          {event.band_paid_at && (
            <span className="badge badge-paid" title="Band has been paid for this date">
              Paid
            </span>
          )}
          {event.description && (
            <button
              type="button"
              className="event-accordion-toggle btn-toggle"
              onClick={(e) => {
                e.stopPropagation();
                const card = (e.currentTarget.closest('.event-card') as HTMLElement | null) || null;
                if (!card) return;
                card.classList.toggle('event-card-expanded');
              }}
              aria-label="Toggle description"
            >
              ▾
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScheduleCard;
