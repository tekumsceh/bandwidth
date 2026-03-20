import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import FilterBar from './filters/FilterBar';
import FilterSummary from './filters/FilterSummary';
import { bandOptionLabel } from '../utils/bandDisplay';

type BandOption = {
  id: number;
  name: string;
  color?: string | null;
  is_solo?: 0 | 1;
};

function hexToRgba(hex: string | null | undefined, alpha: number): string {
  const h = (hex || '#64748b').trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  if (!m) return `rgba(100, 116, 139, ${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type Props = {
  activeTab: 'schedule' | 'ledger';
  setActiveTab: (tab: 'schedule' | 'ledger') => void;
  filter: 'upcoming' | 'past' | 'all';
  setFilter: (value: 'upcoming' | 'past' | 'all') => void;
  bandFilter: 'all' | number;
  setBandFilter: (value: 'all' | number) => void;
  bandOptions: BandOption[];
  openMenu: 'view' | 'timeline' | 'band' | null;
  setOpenMenu: Dispatch<SetStateAction<'view' | 'timeline' | 'band' | null>>;
  /** Hide Schedule/Ledger switch — use top navigation (Dashboard / Dates / Finance) instead */
  hideViewSwitch?: boolean;
  /** Override "View" line in the filter summary (e.g. Dashboard / Dates / Finance) */
  summaryViewLabel?: string;
};

function EventsToolbar({
  activeTab,
  setActiveTab,
  filter,
  setFilter,
  bandFilter,
  setBandFilter,
  bandOptions,
  openMenu,
  setOpenMenu,
  hideViewSwitch = false,
  summaryViewLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const short = (value: string) =>
    value.length > 15 ? `${value.slice(0, 15)}` : value;

  const cancelCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (menu: 'view' | 'timeline' | 'band') => {
    cancelCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu((curr) => (curr === menu ? null : curr));
      closeTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!openMenu) return;
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      cancelCloseTimer();
    };
  }, [openMenu, setOpenMenu]);

  const viewLabel =
    summaryViewLabel ?? (activeTab === 'schedule' ? 'Schedule' : 'Ledger');
  const timelineLabel =
    filter === 'upcoming' ? 'Upcoming' : filter === 'past' ? 'Past' : 'All';
  const selectedBand =
    bandFilter === 'all'
      ? 'All bands'
      : (() => {
          const b = bandOptions.find((x) => x.id === bandFilter);
          return b ? bandOptionLabel(b) : 'All bands';
        })();

  return (
    <div ref={rootRef}>
      <FilterBar
        className="events-toolbar filter-bar"
        summary={
          <FilterSummary
            items={[
              { label: 'View', value: viewLabel },
              { label: 'Timeline', value: timelineLabel },
              { label: 'Band', value: selectedBand },
            ]}
          />
        }
      >
      {!hideViewSwitch && (
      <div
        className="events-toolbar-group"
        onMouseEnter={cancelCloseTimer}
        onMouseLeave={() => {
          if (openMenu === 'view') scheduleClose('view');
        }}
      >
        <button
          type="button"
          className={`events-toolbar-label btn-filter ${openMenu === 'view' ? 'events-toolbar-label-active' : ''}`}
          onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
        >
          View
        </button>
        {openMenu === 'view' && (
          <div className="events-toolbar-menu">
            <button
              type="button"
              className={`events-tool btn-filter ${activeTab === 'schedule' ? 'events-tool-active' : ''}`}
              onClick={() => {
                setActiveTab('schedule');
                setOpenMenu(null);
              }}
            >
              Schedule
            </button>
            <button
              type="button"
              className={`events-tool btn-filter ${activeTab === 'ledger' ? 'events-tool-active' : ''}`}
              onClick={() => {
                setActiveTab('ledger');
                setOpenMenu(null);
              }}
            >
              Ledger
            </button>
          </div>
        )}
      </div>
      )}

      <div
        className="events-toolbar-group"
        onMouseEnter={cancelCloseTimer}
        onMouseLeave={() => {
          if (openMenu === 'timeline') scheduleClose('timeline');
        }}
      >
        <button
          type="button"
          className={`events-toolbar-label btn-filter ${openMenu === 'timeline' ? 'events-toolbar-label-active' : ''}`}
          onClick={() => setOpenMenu(openMenu === 'timeline' ? null : 'timeline')}
        >
          Timeline
        </button>
        {openMenu === 'timeline' && (
          <div className="events-toolbar-menu">
            <button
              type="button"
              className={`events-tool btn-filter ${filter === 'past' ? 'events-tool-active' : ''}`}
              onClick={() => {
                setFilter('past');
                setOpenMenu(null);
              }}
            >
              Past
            </button>
            <button
              type="button"
              className={`events-tool btn-filter ${filter === 'upcoming' ? 'events-tool-active' : ''}`}
              onClick={() => {
                setFilter('upcoming');
                setOpenMenu(null);
              }}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`events-tool btn-filter ${filter === 'all' ? 'events-tool-active' : ''}`}
              onClick={() => {
                setFilter('all');
                setOpenMenu(null);
              }}
            >
              All
            </button>
          </div>
        )}
      </div>

      <div
        className="events-toolbar-group"
        onMouseEnter={cancelCloseTimer}
        onMouseLeave={() => {
          if (openMenu === 'band') scheduleClose('band');
        }}
      >
        <button
          type="button"
          className={`events-toolbar-label btn-filter ${openMenu === 'band' ? 'events-toolbar-label-active' : ''}`}
          onClick={() => setOpenMenu(openMenu === 'band' ? null : 'band')}
        >
          Band
        </button>
        {openMenu === 'band' && (
          <div className="events-toolbar-menu">
            <button
              type="button"
              className={`events-tool btn-filter ${bandFilter === 'all' ? 'events-tool-active' : ''}`}
              onClick={() => {
                setBandFilter('all');
                setOpenMenu(null);
              }}
            >
              All
            </button>
            {bandOptions.map((b) => {
              const accent = b.color?.trim() || '#64748b';
              const selected = bandFilter === b.id;
              const label = bandOptionLabel(b);
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`events-tool btn-filter events-tool--band ${selected ? 'events-tool-band--selected' : ''}`}
                  style={{
                    background: selected
                      ? `linear-gradient(180deg, ${hexToRgba(accent, 0.22)} 0%, ${hexToRgba(accent, 0.09)} 100%)`
                      : `linear-gradient(180deg, ${hexToRgba(accent, 0.14)} 0%, ${hexToRgba(accent, 0.05)} 100%)`,
                    color: '#e5e7eb',
                    borderLeft: `3px solid ${accent}`,
                    boxShadow: selected
                      ? `inset 0 0 0 1px rgba(0,0,0,0.45), 0 0 0 1px ${hexToRgba(accent, 0.85)}, 0 0 0 1px ${hexToRgba(accent, 0.35)}, 0 2px 14px ${hexToRgba(accent, 0.28)}`
                      : `inset 0 2px 4px rgba(0,0,0,0.35)`,
                  }}
                  onClick={() => {
                    setBandFilter(b.id);
                    setOpenMenu(null);
                  }}
                >
                  {short(label)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </FilterBar>
    </div>
  );
}

export default EventsToolbar;

