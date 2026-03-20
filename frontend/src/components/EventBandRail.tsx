import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../pages/assets/IOPatchPage.css';
import { bandOptionLabel } from '../utils/bandDisplay';

type Band = { id: number; name: string; color?: string | null; is_solo?: number | null };

type Props = {
  bands: Band[];
  /** When false, only per-band buttons (I/O patch needs a concrete band). Default true = include “All”. */
  showAllOption?: boolean;
};

/** Short label for patch rail buttons (same column as I/O strip width) */
function bandButtonLabel(displayName: string) {
  const t = displayName.trim();
  if (t === 'me') return 'me';
  if (t.length <= 4) return t.toUpperCase();
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return `${a}${b}`.toUpperCase();
  }
  return t.slice(0, 4).toUpperCase();
}

function bandRailShortLabel(b: Band) {
  const label = bandOptionLabel(b);
  return bandButtonLabel(label);
}

function bandRailButtonStyle(b: Band, active: boolean): CSSProperties | undefined {
  const raw = b.color?.trim();
  if (!raw) return undefined;
  if (active) {
    return {
      borderColor: raw,
      color: raw,
      background: `linear-gradient(180deg, color-mix(in srgb, ${raw} 28%, #1e1e1e) 0%, color-mix(in srgb, ${raw} 12%, #1e1e1e) 100%)`,
      boxShadow: `inset 0 1px 2px ${raw}44, 0 0 10px ${raw}55`,
    };
  }
  return {
    borderColor: `color-mix(in srgb, ${raw} 50%, #3a3a3a)`,
    color: `color-mix(in srgb, ${raw} 75%, #9ca3af)`,
  };
}

/**
 * Full-height left rail on /events — same control style as I/O patch channel range.
 * "All" = no bandId (every band). Selecting a band sets ?bandId=…
 */
function EventBandRail({ bands, showAllOption = true }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('bandId') || searchParams.get('band');
  const selected = Number(raw || NaN);
  const selectedId = Number.isFinite(selected) ? selected : null;

  const applyBand = (id: 'all' | number) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'all') {
      next.delete('bandId');
      next.delete('band');
    } else {
      next.set('bandId', String(id));
      next.delete('band');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="app-band-rail-scroll">
      <div className="io-patch-section-title app-band-rail-title">Band</div>
      <div className="io-patch-range-group io-patch-range-input">
        {showAllOption ? (
          <button
            type="button"
            className={`io-patch-range-btn ${selectedId === null ? 'active' : ''}`}
            onClick={() => applyBand('all')}
            title="All bands"
          >
            All
          </button>
        ) : null}
        {bands.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`io-patch-range-btn ${selectedId === b.id ? 'active' : ''}`}
            style={bandRailButtonStyle(b, selectedId === b.id)}
            onClick={() => applyBand(b.id)}
            title={bandOptionLabel(b)}
          >
            {bandRailShortLabel(b)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EventBandRail;
