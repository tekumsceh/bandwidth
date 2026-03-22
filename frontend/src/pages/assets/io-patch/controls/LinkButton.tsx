import { Link as LinkIcon } from 'lucide-react';
import { usePopupSide } from '../../ioPatchHooks';

type LinkButtonProps = {
  ch: number;
  linkedCh: number | undefined;
  onLink: (targetCh: number) => void;
  onUnlink: () => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function LinkButton({ ch, linkedCh, onLink, onUnlink, openPopupId, setOpenPopupId }: LinkButtonProps) {
  const popupId = `link-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);
  const isLinked = linkedCh !== undefined;

  return (
    <div className="io-patch-link-wrap">
      <button
        type="button"
        className={`io-patch-link-btn ${isLinked ? 'linked' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={isLinked ? `Linked to channel ${String(linkedCh + 1).padStart(2, '0')}` : 'Link channel'}
        data-io-patch-trigger
      >
        <LinkIcon size={16} strokeWidth={2} />
        {isLinked && <span className="io-patch-link-num">{String(linkedCh + 1).padStart(2, '0')}</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-link-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-link-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            {isLinked ? (
              <button
                type="button"
                className="io-patch-link-unlink"
                onClick={() => {
                  onUnlink();
                  setOpenPopupId(null);
                }}
              >
                Unlink
              </button>
            ) : (
              <div className="io-patch-link-channel-grid">
                {Array.from({ length: 32 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`io-patch-link-channel-btn ${i === ch ? 'self' : ''}`}
                    onClick={() => {
                      if (i !== ch) {
                        onLink(i);
                        setOpenPopupId(null);
                      }
                    }}
                    disabled={i === ch}
                    title={i === ch ? 'Same channel' : `Link to channel ${String(i + 1).padStart(2, '0')}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
