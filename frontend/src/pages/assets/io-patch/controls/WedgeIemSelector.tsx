import { IemIcon, WedgeIcon } from '../IoPatchIcons';
import { usePopupSide } from '../../ioPatchHooks';

type WedgeIemSelectorProps = {
  ch: number;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function WedgeIemSelector({ ch, value, onChange, onClear, openPopupId, setOpenPopupId }: WedgeIemSelectorProps) {
  const popupId = `wedge-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-instrument-wrap">
      <button
        type="button"
        className="io-patch-instrument-btn"
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={value ? (value === 'Wedge' ? 'Wedge monitor' : 'IEM body pack') : 'Select type'}
        data-io-patch-trigger
      >
        {value === 'IEM' ? (
          <IemIcon size={22} />
        ) : value === 'Wedge' ? (
          <WedgeIcon size={22} />
        ) : (
          <span className="io-patch-instrument-placeholder">src</span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-instrument-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-instrument-picker io-patch-wedge-iem-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-instrument-clear"
              onClick={() => {
                onClear();
                setOpenPopupId(null);
              }}
              title="Clear"
            >
              ✕
            </button>
            <button
              type="button"
              className={`io-patch-instrument-swatch ${value === 'Wedge' ? 'active' : ''}`}
              onClick={() => {
                onChange('Wedge');
                setOpenPopupId(null);
              }}
              title="Wedge monitor"
            >
              <WedgeIcon size={40} />
            </button>
            <button
              type="button"
              className={`io-patch-instrument-swatch ${value === 'IEM' ? 'active' : ''}`}
              onClick={() => {
                onChange('IEM');
                setOpenPopupId(null);
              }}
              title="IEM body pack"
            >
              <IemIcon size={40} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
