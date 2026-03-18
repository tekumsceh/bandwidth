import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import FilterBar from './filters/FilterBar';
import FilterSummary from './filters/FilterSummary';

type BandOption = {
  id: number;
  name: string;
  color?: string | null;
};

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

  const viewLabel = activeTab === 'schedule' ? 'Schedule' : 'Ledger';
  const timelineLabel =
    filter === 'upcoming' ? 'Upcoming' : filter === 'past' ? 'Past' : 'All';
  const selectedBand =
    bandFilter === 'all'
      ? 'All bands'
      : bandOptions.find((b) => b.id === bandFilter)?.name || 'All bands';

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
            {bandOptions.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`events-tool btn-filter ${bandFilter === b.id ? 'events-tool-active' : ''}`}
                onClick={() => {
                  setBandFilter(b.id);
                  setOpenMenu(null);
                }}
              >
                {short(b.name)}
              </button>
            ))}
          </div>
        )}
      </div>
      </FilterBar>
    </div>
  );
}

export default EventsToolbar;

