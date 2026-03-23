import { Plus } from 'lucide-react';
import { StripFrame } from '../pages/assets/io-patch/StripFrame';
import '../pages/assets/IOPatchPage.css';

type Props = {
  onAddDate: () => void;
  channelSlot: number;
};

/** Last channel: create new date / gig */
function ScheduleAddStrip({ onAddDate, channelSlot: _channelSlot }: Props) {
  return (
    <StripFrame
      className="date-strip date-strip--add"
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
      <div className="date-strip-main">
        <div className="io-patch-ch-num-wrap">
          <div
            className="io-patch-ch-num has-color io-patch-ch-num--display date-strip-pill--add"
            style={{
              borderColor: '#ff8c00',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 8px rgba(255, 140, 0, 0.15)',
            }}
          >
            <Plus size={14} strokeWidth={2.5} className="date-strip-add-icon" aria-hidden />
          </div>
        </div>

        <div className="date-strip-status date-strip-status--add">ADD</div>

        <div className="io-patch-instrument-name date-strip-field">—</div>
        <div className="io-patch-instrument-name date-strip-field">Schedule</div>

        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly date-strip-time-compact date-strip-time-sc">
            <span className="date-strip-time-tag">SC</span>
            <span className="io-patch-select-value">—</span>
          </div>
        </div>
        <div className="io-patch-select-wrap">
          <div className="io-patch-select-btn io-patch-select-btn--readonly date-strip-time-compact date-strip-time-show">
            <span className="date-strip-time-tag">ST</span>
            <span className="io-patch-select-value">—</span>
          </div>
        </div>
      </div>

      <div className="date-strip-asset-links date-strip-asset-links--ghost" aria-hidden>
        <span className="io-patch-link-btn">SET</span>
        <span className="io-patch-link-btn">GEAR</span>
        <span className="io-patch-link-btn io-patch-link-btn--io">I/O</span>
      </div>
    </StripFrame>
  );
}

export default ScheduleAddStrip;
