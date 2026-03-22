import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { apiUrl } from '../../../config/api';
import { isEmptyPatch, type IoPatchPersistedState } from '../ioPatchStorage';

/** Close when clicking outside modal content; keep action bar and other popups reachable in one click. */
function useModalDismissOnOutside(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let remove: (() => void) | undefined;
    const t = window.setTimeout(() => {
      const onMouseDown = (e: MouseEvent) => {
        const raw = e.target;
        const el = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
        if (!el) return;
        if (el.closest('[data-io-patch-popup]') || el.closest('.io-patch-action-bar')) return;
        onCloseRef.current();
      };
      document.addEventListener('mousedown', onMouseDown, true);
      remove = () => document.removeEventListener('mousedown', onMouseDown, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      remove?.();
    };
  }, []);
}

type IoPatchSaveModalProps = {
  bandId: number;
  getPatchData: () => IoPatchPersistedState;
  onClose: () => void;
  onSaved: () => void;
  saveError: string | null;
  setSaveError: (s: string | null) => void;
};

export function IoPatchSaveModal({ bandId, getPatchData, onClose, onSaved, saveError, setSaveError }: IoPatchSaveModalProps) {
  useModalDismissOnOutside(onClose);
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const patchData = getPatchData();
  const isEmpty = isEmptyPatch(patchData);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isEmpty) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Untitled', setAsDefault, data: getPatchData() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Save failed (${res.status})`);
      }
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="io-patch-modal-backdrop" aria-hidden />
      <div className="io-patch-modal io-patch-modal-dropdown" data-io-patch-popup onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="io-patch-modal-body">
          <label className="io-patch-modal-label">
            Save
            <input
              type="text"
              className="io-patch-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patch name"
              autoFocus
            />
          </label>
          <label className="io-patch-modal-checkbox">
            <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} disabled={isEmpty} />
            Set as default
          </label>
          {isEmpty && <div className="io-patch-modal-hint">Patch is empty — nothing to save. Configure channels first.</div>}
          {saveError && <div className="io-patch-modal-error">{saveError}</div>}
          <div className="io-patch-modal-actions">
            <button type="button" className="io-patch-modal-btn io-patch-modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="io-patch-modal-btn io-patch-modal-btn-primary" disabled={saving || isEmpty} title={isEmpty ? 'Patch is empty' : undefined}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

type IoPatchLoadModalProps = {
  bandId: number;
  savedPatches: { id: number; name: string; is_default: number; updated_at: string }[];
  loadError: string | null;
  onClose: () => void;
  onLoad: (data: IoPatchPersistedState) => void;
  /** When opening from a gig deep-link, allow pinning a save so this date always loads it (owner/admin). */
  dateId?: number | null;
};

export function IoPatchLoadModal({ bandId, savedPatches, loadError, onClose, onLoad, dateId }: IoPatchLoadModalProps) {
  useModalDismissOnOutside(onClose);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [bindingId, setBindingId] = useState<number | null>(null);
  const [bindError, setBindError] = useState<string | null>(null);

  const handleSelect = async (saveId: number) => {
    setLoadingId(saveId);
    try {
      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/${saveId}`), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as { data: Record<string, unknown> };
      onLoad(json.data as IoPatchPersistedState);
    } catch {
      // could set error state
    } finally {
      setLoadingId(null);
    }
  };

  const handleBindToDate = async (saveId: number) => {
    if (dateId == null) return;
    setBindError(null);
    setBindingId(saveId);
    try {
      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/for-date/${dateId}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || `Could not set (${res.status})`);
      }
    } catch (e) {
      setBindError(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setBindingId(null);
    }
  };

  return (
    <>
      <div className="io-patch-modal-backdrop" aria-hidden />
      <div className="io-patch-modal io-patch-modal-dropdown" data-io-patch-popup onClick={(e) => e.stopPropagation()}>
        <div className="io-patch-modal-body">
          {loadError && <div className="io-patch-modal-error">{loadError}</div>}
          {bindError && <div className="io-patch-modal-error">{bindError}</div>}
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
                  disabled={loadingId !== null || bindingId !== null}
                >
                  <span className="io-patch-load-name">{p.name}</span>
                  {p.is_default ? <span className="io-patch-load-badge">Default</span> : null}
                  {loadingId === p.id ? <span className="io-patch-load-loading">Loading…</span> : null}
                </button>
                {dateId != null ? (
                  <button
                    type="button"
                    className="io-patch-load-pin"
                    title="Always use this save when opening I/O for this gig (admin)"
                    disabled={loadingId !== null || bindingId !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleBindToDate(p.id);
                    }}
                  >
                    {bindingId === p.id ? '…' : 'Gig'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="io-patch-modal-actions">
            <button type="button" className="io-patch-modal-btn io-patch-modal-btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}
