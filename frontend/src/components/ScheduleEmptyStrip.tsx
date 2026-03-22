import { StripFrame } from '../pages/assets/io-patch/StripFrame';
import '../pages/assets/IOPatchPage.css';

type Props = {
  channelSlot: number;
};

/** Inert strip to pad dashboard row to 8 channels — same shell as I/O strips */
function ScheduleEmptyStrip({ channelSlot: _channelSlot }: Props) {
  return (
    <StripFrame className="date-strip" skipped aria-hidden>
      <div className="date-strip-main date-strip-main--inert">
        <div className="io-patch-ch-num-wrap">
          <div className="io-patch-ch-num io-patch-ch-num--display">
            <span className="io-patch-ch-icon">·</span>
            —
          </div>
        </div>

        <div className="date-strip-status date-strip-status--empty">—</div>

        <div className="io-patch-instrument-name date-strip-field">—</div>
        <div className="io-patch-instrument-name date-strip-field">—</div>

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
    </StripFrame>
  );
}

export default ScheduleEmptyStrip;
