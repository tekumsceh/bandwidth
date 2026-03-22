import type { ReactNode } from 'react';
import { CHANNEL_COLORS } from '../../ioPatchConstants';
import { usePopupSide } from '../../ioPatchHooks';

type ChannelNumProps = {
  ch: number;
  color?: string;
  onColorChange: (color: string) => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
  icon: ReactNode;
};

export function ChannelNum({ ch, color, onColorChange, openPopupId, setOpenPopupId, icon }: ChannelNumProps) {
  const popupId = `color-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-ch-num-wrap">
      <button
        type="button"
        className={`io-patch-ch-num ${color ? 'has-color' : ''}`}
        style={
          color
            ? {
                borderColor: color,
                boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 8px ${color}35`,
              }
            : undefined
        }
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        data-io-patch-trigger
      >
        <span className="io-patch-ch-icon">{icon}</span>
        {String(ch + 1).padStart(2, '0')}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-color-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-color-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-color-swatch io-patch-color-clear"
              onClick={() => {
                onColorChange('');
                setOpenPopupId(null);
              }}
              title="Clear color"
            >
              ✕
            </button>
            {CHANNEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="io-patch-color-swatch"
                style={{ backgroundColor: c }}
                onClick={() => {
                  onColorChange(color === c ? '' : c);
                  setOpenPopupId(null);
                }}
                title={c}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
