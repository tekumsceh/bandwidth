import '../pages/assets/IOPatchPage.css';

type Props = {
  channelSlot: number;
};

/** Inert strip to pad dashboard row to 8 channels — same shell as I/O patch strips. */
function ScheduleEmptyStrip({ channelSlot: _channelSlot }: Props) {
  return (
    <div className="io-patch-strip io-patch-gig-strip skipped" aria-hidden>
      <div className="io-patch-gig-strip-main io-patch-gig-strip-main--inert">
        <div className="io-patch-ch-num-wrap">
          <div className="io-patch-ch-num io-patch-ch-num--display">
            <span className="io-patch-ch-icon">·</span>
            —
          </div>
        </div>

        <div className="io-patch-gig-status io-patch-gig-status--empty">—</div>

        <div className="io-patch-instrument-name io-patch-gig-field">—</div>
        <div className="io-patch-instrument-name io-patch-gig-field">—</div>

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

export default ScheduleEmptyStrip;
