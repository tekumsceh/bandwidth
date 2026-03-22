import { Folder, Import, ListMusic, Package, Settings } from 'lucide-react';

type Props = {
  onSetlistClick: () => void;
};

/**
 * Save / Load / Setlist / Gear / Settings row — same controls as before, intended for
 * `.io-patch-action-bar` (same slot as I/O patch page).
 */
export default function DashboardOverviewActions({ onSetlistClick }: Props) {
  return (
    <>
      <button
        type="button"
        className="io-patch-action-btn"
        disabled
        title="Save (coming soon)"
        aria-label="Save"
      >
        <Folder size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="io-patch-action-btn"
        disabled
        title="Load (coming soon)"
        aria-label="Load"
      >
        <Import size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="io-patch-action-btn"
        title="Setlist — songs and sets"
        aria-label="Open setlist manager"
        onClick={onSetlistClick}
      >
        <ListMusic size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="io-patch-action-btn"
        disabled
        title="Gear (coming soon)"
        aria-label="Gear"
      >
        <Package size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="io-patch-action-btn"
        disabled
        title="Settings (coming soon)"
        aria-label="Settings"
      >
        <Settings size={18} strokeWidth={2} />
      </button>
    </>
  );
}
