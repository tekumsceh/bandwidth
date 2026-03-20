import { Plus } from 'lucide-react';
import '../pages/assets/IOPatchPage.css';

type Props = {
  onAddDate: () => void;
  channelSlot: number;
};

/** Last channel: create new date / gig */
function ScheduleAddStrip({ onAddDate, channelSlot: _channelSlot }: Props) {
  return (
    <div
      className="io-patch-strip io-patch-gig-strip io-patch-gig-strip--add"
      role="button"
      tabIndex={0}
      onClick={onAddDate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddDate();
        }
      }}
      aria-label="Add new date"
    >
      <div className="io-patch-gig-strip-main">
        <div className="io-patch-ch-num-wrap">
          <div
            className="io-patch-ch-num has-color io-patch-ch-num--display io-patch-gig-date-pill--add"
            style={{
              borderColor: '#ff8c00',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 8px rgba(255, 140, 0, 0.15)',
            }}
          >
            <Plus size={14} strokeWidth={2.5} className="io-patch-gig-add-icon" aria-hidden />
          </div>
        </div>

        <div className="io-patch-gig-status io-patch-gig-status--add">ADD</div>

        <div className="io-patch-instrument-name io-patch-gig-field">—</div>
        <div className="io-patch-instrument-name io-patch-gig-field">Schedule</div>

        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly io-patch-gig-time-compact io-patch-gig-time-sc">
            <span className="io-patch-gig-time-tag">SC</span>
            <span className="io-patch-select-value">—</span>
          </div>
        </div>
        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly io-patch-gig-time-compact io-patch-gig-time-show">
            <span className="io-patch-gig-time-tag">ST</span>
            <span className="io-patch-select-value">—</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduleAddStrip;
