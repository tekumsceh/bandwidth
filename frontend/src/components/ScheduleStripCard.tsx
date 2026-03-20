import { Link } from 'react-router-dom';
import type { ScheduleEvent } from './scheduleTypes';
import { assetPageHref } from '../config/navigation';
import '../pages/assets/IOPatchPage.css';

type Props = {
  event: ScheduleEvent;
  /** Slot index (1–8); reserved for layout parity with dashboard channels */
  channelSlot: number;
  onSelectEvent: (id: number) => void;
  /** Dashboard: only the closest upcoming (non-done) gig uses full strip band tint */
  fullStripBandTint?: boolean;
  /** Done gigs — same dimming as empty strip pads */
  dimmed?: boolean;
};

function statusDisplay(status: string): { text: string; tone: 'confirmed' | 'pending' | 'postponed' | 'done' | 'other' } {
  const s = status.toLowerCase();
  if (s === 'confirmed') return { text: 'CONFIRMED', tone: 'confirmed' };
  if (s === 'tentative') return { text: 'PENDING', tone: 'pending' };
  if (s === 'postponed') return { text: 'POSTPONED', tone: 'postponed' };
  if (s === 'done') return { text: 'DONE', tone: 'done' };
  if (s === 'cancelled') return { text: 'OFF', tone: 'other' };
  return { text: status.slice(0, 10).toUpperCase(), tone: 'other' };
}

function ScheduleStripCard({
  event,
  channelSlot: _channelSlot,
  onSelectEvent,
  fullStripBandTint = false,
  dimmed = false,
}: Props) {
  const d = new Date(event.event_date);
  const dayNum = d.getDate();
  const monthShort = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const monthTiny = monthShort.slice(0, 3);
  const accent = event.band_color || '#ff8c00';

  const formatTime = (t?: string | null) =>
    t
      ? new Date(`1970-01-01T${t}`).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const venue = (event.venue_name || '—').toUpperCase();
  const city = (event.city || '—').toUpperCase();
  const stInfo = statusDisplay(event.status);

  const bandId = event.band_id;
  const hasAssetLinks = typeof bandId === 'number' && Number.isFinite(bandId);

  const stripBg =
    fullStripBandTint && event.band_color?.trim()
      ? { backgroundColor: `color-mix(in srgb, ${event.band_color.trim()} 22%, #1e1e1e)` as const }
      : undefined;

  return (
    <div
      className={`io-patch-strip io-patch-gig-strip${dimmed ? ' skipped' : ''}`}
      data-description={event.description || ''}
      style={stripBg}
    >
      <div
        className="io-patch-gig-strip-main"
        role="button"
        tabIndex={0}
        onClick={() => onSelectEvent(event.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectEvent(event.id);
          }
        }}
      >
        <div className="io-patch-ch-num-wrap">
          <div
            className="io-patch-ch-num has-color io-patch-ch-num--display io-patch-gig-date-pill"
            style={{
              borderColor: accent,
              boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 8px ${accent}35`,
            }}
          >
            <span className="io-patch-gig-date-mo">{monthTiny}</span>
            <span className="io-patch-gig-date-day">{String(dayNum).padStart(2, '0')}</span>
          </div>
        </div>

        <div className={`io-patch-gig-status io-patch-gig-status--${stInfo.tone}`} title={event.status}>
          {stInfo.text}
        </div>

        <div className="io-patch-instrument-name io-patch-gig-field" title={city}>
          {city}
        </div>
        <div className="io-patch-instrument-name io-patch-gig-field" title={venue}>
          {venue}
        </div>

        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly io-patch-gig-time-compact io-patch-gig-time-sc">
            <span className="io-patch-gig-time-tag">SC</span>
            <span className="io-patch-select-value">{formatTime(event.soundcheck_time)}</span>
          </div>
        </div>
        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly io-patch-gig-time-compact io-patch-gig-time-show">
            <span className="io-patch-gig-time-tag">ST</span>
            <span className="io-patch-select-value">{formatTime(event.set_time)}</span>
          </div>
        </div>
      </div>

      {hasAssetLinks ? (
        <div
          className="io-patch-gig-asset-links"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Link
            className="io-patch-link-btn"
            to={assetPageHref('setlists', bandId, event.id)}
            title="Setlist profiles for this band & date"
            onClick={(e) => e.stopPropagation()}
          >
            SET
          </Link>
          <Link
            className="io-patch-link-btn"
            to={assetPageHref('gear', bandId, event.id)}
            title="Gear profiles for this band & date"
            onClick={(e) => e.stopPropagation()}
          >
            GEAR
          </Link>
          <Link
            className="io-patch-link-btn io-patch-link-btn--io"
            to={assetPageHref('patch', bandId, event.id)}
            title="I/O patch — default patch for this band, scoped to this date"
            onClick={(e) => e.stopPropagation()}
          >
            I/O
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default ScheduleStripCard;
