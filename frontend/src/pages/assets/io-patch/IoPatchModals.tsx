import { useState } from 'react';
import { apiUrl } from '../../../config/api';
import type { IoPatchPersistedState } from '../ioPatchStorage';
import { useModalDismissOnOutside } from './IoPatchModalChrome';
import type { ActivePatchSource } from './useIoPatchState';

export { IoPatchSaveModal } from './IoPatchSaveModal';

type IoPatchLoadModalProps = {
  bandId: number;
  savedPatches: { id: number; name: string; is_default: number; updated_at: string }[];
  loadError: string | null;
  onClose: () => void;
  onLoad: (data: IoPatchPersistedState, source?: ActivePatchSource | null) => void;
};

export function IoPatchLoadModal({ bandId, savedPatches, loadError, onClose, onLoad }: IoPatchLoadModalProps) {
  useModalDismissOnOutside(onClose);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleSelect = async (saveId: number) => {
    setLoadingId(saveId);
    try {
      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/${saveId}`), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as { id: number; name: string; data: Record<string, unknown> };
      onLoad(json.data as IoPatchPersistedState, { id: json.id, name: json.name });
    } catch {
      // could set error state
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="io-patch-modal-backdrop" aria-hidden />
      <div
        className="io-patch-modal io-patch-modal-dropdown io-patch-modal--load"
        data-io-patch-popup
        onClick={(e) => e.stopPropagation()}
      >
        <div className="io-patch-modal-body">
          <span className="io-patch-load-heading">Load patch:</span>
          {loadError && <div className="io-patch-modal-error">{loadError}</div>}
          <div className="io-patch-load-list">
            {savedPatches.length === 0 && !loadError && (
              <div className="io-patch-load-empty">No saved patches yet. Save one first.</div>
            )}
            {savedPatches.map((p) => (
              <div key={p.id} className="io-patch-load-item-row">
                <button
                  type="button"
                  className="io-patch-load-item"
                  onClick={() => handleSelect(p.id)}
                  disabled={loadingId !== null}
                >
                  <span className="io-patch-load-name" title={p.name}>
                    {p.name}
                  </span>
                  {p.is_default ? (
                    <span className="io-patch-load-badge" title="Band default patch">
                      Default
                    </span>
                  ) : null}
                  {loadingId === p.id ? <span className="io-patch-load-loading">Loading…</span> : null}
                </button>
              </div>
            ))}
          </div>
          <div className="io-patch-modal-actions">
            <button type="button" className="io-patch-modal-btn io-patch-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
