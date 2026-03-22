import { Link } from 'react-router-dom';
import type { ScheduleEvent } from './scheduleTypes';
import { assetPageHref } from '../config/navigation';
import { StripFrame } from '../pages/assets/io-patch/StripFrame';
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

type GigAssetStripBtnProps = {
  disabled: boolean;
  disabledTitle: string;
  to: string;
  linkTitle: string;
  className: string;
  label: string;
};

function GigAssetStripButton({ disabled, disabledTitle, to, linkTitle, className, label }: GigAssetStripBtnProps) {
  if (disabled) {
    return (
      <span className={`${className} io-patch-link-btn--disabled`} title={disabledTitle} aria-disabled="true">
        {label}
      </span>
    );
  }
  return (
    <Link className={className} to={to} title={linkTitle} onClick={(e) => e.stopPropagation()}>
      {label}
    </Link>
  );
}

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
  const assetLinksDisabled = dimmed;
  const assetLinksDisabledTitle = 'Not available — this date is marked done';

  const stripBg =
    fullStripBandTint && event.band_color?.trim()
      ? { backgroundColor: `color-mix(in srgb, ${event.band_color.trim()} 22%, #1e1e1e)` as const }
      : undefined;

  return (
    <StripFrame
      className="date-strip"
      skipped={dimmed}
      data-description={event.description || ''}
      style={stripBg}
    >
      <div
        className="date-strip-main"
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
            className="io-patch-ch-num has-color io-patch-ch-num--display date-strip-pill"
            style={{
              borderColor: accent,
              boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 8px ${accent}35`,
            }}
          >
            <span className="date-strip-mo">{monthTiny}</span>
            <span className="date-strip-day">{String(dayNum).padStart(2, '0')}</span>
          </div>
        </div>

        <div className={`date-strip-status date-strip-status--${stInfo.tone}`} title={event.status}>
          {stInfo.text}
        </div>

        <div className="io-patch-instrument-name date-strip-field" title={city}>
          {city}
        </div>
        <div className="io-patch-instrument-name date-strip-field" title={venue}>
          {venue}
        </div>

        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly date-strip-time-compact date-strip-time-sc">
            <span className="date-strip-time-tag">SC</span>
            <span className="io-patch-select-value">{formatTime(event.soundcheck_time)}</span>
          </div>
        </div>
        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly date-strip-time-compact date-strip-time-show">
            <span className="date-strip-time-tag">ST</span>
            <span className="io-patch-select-value">{formatTime(event.set_time)}</span>
          </div>
        </div>
      </div>

      {hasAssetLinks ? (
        <div
          className="date-strip-asset-links"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <GigAssetStripButton
            disabled={assetLinksDisabled}
            disabledTitle={assetLinksDisabledTitle}
            to={assetPageHref('setlists', bandId, event.id)}
            linkTitle="Setlist profiles for this band & date"
            className="io-patch-link-btn"
            label="SET"
          />
          <GigAssetStripButton
            disabled={assetLinksDisabled}
            disabledTitle={assetLinksDisabledTitle}
            to={assetPageHref('gear', bandId, event.id)}
            linkTitle="Gear profiles for this band & date"
            className="io-patch-link-btn"
            label="GEAR"
          />
          <GigAssetStripButton
            disabled={assetLinksDisabled}
            disabledTitle={assetLinksDisabledTitle}
            to={assetPageHref('patch', bandId, event.id)}
            linkTitle="I/O patch — default patch for this band, scoped to this date"
            className="io-patch-link-btn io-patch-link-btn--io"
            label="I/O"
          />
        </div>
      ) : null}
    </StripFrame>
  );
}

export default ScheduleStripCard;
