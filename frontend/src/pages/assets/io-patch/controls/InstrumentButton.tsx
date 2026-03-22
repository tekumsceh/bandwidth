import { getInstruments, getInstrument } from '../../instrumentIcons';
import { usePopupSide } from '../../ioPatchHooks';

type InstrumentButtonProps = {
  ch: number;
  value?: string;
  onChange: (id: string) => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function InstrumentButton({ ch, value, onChange, openPopupId, setOpenPopupId }: InstrumentButtonProps) {
  const popupId = `instrument-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);
  const inst = getInstrument(value);
  const Icon = inst?.Icon;

  return (
    <div className="io-patch-instrument-wrap">
      <button
        type="button"
        className="io-patch-instrument-btn"
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={inst?.label ?? 'Select instrument'}
        data-io-patch-trigger
      >
        {Icon ? <Icon size={22} /> : <span className="io-patch-instrument-placeholder">src</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-instrument-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-instrument-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-instrument-clear"
              onClick={() => {
                onChange('');
                setOpenPopupId(null);
              }}
              title="Clear"
            >
              ✕
            </button>
            {getInstruments().map((i) => {
              const SwatchIcon = i.Icon;
              return (
                <button
                  key={i.id}
                  type="button"
                  className={`io-patch-instrument-swatch ${value === i.id ? 'active' : ''}`}
                  onClick={() => {
                    onChange(i.id);
                    setOpenPopupId(null);
                  }}
                  title={i.label}
                >
                  {SwatchIcon ? <SwatchIcon size={40} /> : <span className="io-patch-instrument-swatch-text">{i.shortLabel}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
