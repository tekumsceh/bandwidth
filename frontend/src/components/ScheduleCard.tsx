type ScheduleEvent = {
  id: number;
  band_color?: string | null;
  event_date: string;
  city: string | null;
  venue_name: string | null;
  soundcheck_time?: string | null;
  set_time?: string | null;
  status: string;
  description?: string | null;
  band_paid_at?: string | null;
};

type Props = {
  event: ScheduleEvent;
  filter: 'upcoming' | 'past' | 'all';
  onSelectEvent: (id: number) => void;
};

function ScheduleCard({ event, filter, onSelectEvent }: Props) {
  const d = new Date(event.event_date);
  const dateLabel = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: filter === 'upcoming' ? undefined : 'numeric',
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

  return (
    <div
      className="event-card"
      onClick={() => onSelectEvent(event.id)}
      style={{
        borderLeft: `3px solid ${event.band_color || '#4b5563'}`,
        cursor: 'pointer',
      }}
      data-description={event.description || ''}
    >
      <div className="event-date">{dateLabel}</div>
      <div className="event-main">
        <div className="event-sub">
          {event.city || '—'} • {event.venue_name || 'Unknown venue'}
          {soundcheckLabel ? ` • SC: ${soundcheckLabel}` : ''}
          {showLabel ? ` • SHOW: ${showLabel}` : ''}
        </div>
      </div>
      <div className="event-meta">
        {event.status === 'postponed' && <span className="badge badge-warning">Postponed</span>}
        {event.status === 'tentative' && <span className="badge">Pending</span>}
        {event.band_paid_at && (
          <span
            className="badge"
            title="Band has been paid for this date"
            style={{ marginLeft: '0.35rem' }}
          >
            $
          </span>
        )}
        {event.description && (
          <button
            type="button"
            className="event-accordion-toggle btn-toggle"
            onClick={(e) => {
              e.stopPropagation();
              const card = (e.currentTarget.parentElement?.parentElement as HTMLElement | null) || null;
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
  );
}

export default ScheduleCard;

