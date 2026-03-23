import { useEffect, useLayoutEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { apiUrl } from '../../../config/api';
import { isEmptyPatch, type IoPatchPersistedState } from '../ioPatchStorage';
import { useModalDismissOnOutside } from './IoPatchModalChrome';
import type { ActivePatchSource } from './useIoPatchState';

type SavedPatchRow = { id: number; name: string; is_default: number; updated_at: string };

type IoPatchSaveModalProps = {
  bandId: number;
  savedPatches: SavedPatchRow[];
  activePatchSource: ActivePatchSource | null;
  getPatchData: () => IoPatchPersistedState;
  onClose: () => void;
  onSaved: (meta: { id: number; name: string }) => void;
  saveError: string | null;
  setSaveError: (s: string | null) => void;
};

/** 'new' = create a new named save; number = index into `savedPatches` (overwrite that row). */
type SaveCursor = 'new' | number;

function buildCycleOrder(n: number): SaveCursor[] {
  if (n === 0) return ['new'];
  return ['new', ...Array.from({ length: n }, (_, i) => i)];
}

export function IoPatchSaveModal({
  bandId,
  savedPatches,
  activePatchSource,
  getPatchData,
  onClose,
  onSaved,
  saveError,
  setSaveError,
}: IoPatchSaveModalProps) {
  useModalDismissOnOutside(onClose);
  const [cursor, setCursor] = useState<SaveCursor>('new');
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overwritePhase, setOverwritePhase] = useState<'edit' | 'confirm'>('edit');
  const patchData = getPatchData();
  const isEmpty = isEmptyPatch(patchData);

  useLayoutEffect(() => {
    if (!activePatchSource) {
      setCursor('new');
      setName('');
      return;
    }
    const i = savedPatches.findIndex((p) => p.id === activePatchSource.id);
    if (i >= 0) {
      setCursor(i);
      setName(savedPatches[i]!.name);
    } else {
      setCursor('new');
      setName(activePatchSource.name);
    }
  }, [activePatchSource, savedPatches]);

  const targetSaveId: number | null = typeof cursor === 'number' ? savedPatches[cursor]!.id : null;

  useEffect(() => {
    setOverwritePhase('edit');
  }, [cursor, targetSaveId]);

  const bumpCursor = (dir: 1 | -1) => {
    const n = savedPatches.length;
    if (n === 0) return;
    const order = buildCycleOrder(n);
    setCursor((prev) => {
      const pos = order.indexOf(prev);
      const next = order[(pos + dir + order.length) % order.length]!;
      if (typeof next === 'number') setName(savedPatches[next]!.name);
      else setName('');
      return next;
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (overwritePhase === 'confirm') return;
    if (savedPatches.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      bumpCursor(e.key === 'ArrowDown' ? 1 : -1);
    }
  };

  const runSave = async () => {
    if (isEmpty) return;
    const trimmed = name.trim() || 'Untitled';
    setSaveError(null);
    setSaving(true);
    try {
      if (targetSaveId != null) {
        const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/${targetSaveId}`), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, setAsDefault, data: getPatchData() }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { error?: string }).error || `Save failed (${res.status})`);
        }
        onSaved({ id: targetSaveId, name: trimmed });
        return;
      }

      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, setAsDefault, data: getPatchData() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || `Save failed (${res.status})`);
      }
      const json = (await res.json()) as { id?: number };
      const newId = Number(json.id);
      if (!Number.isFinite(newId)) throw new Error('Save did not return an id');
      onSaved({ id: newId, name: trimmed });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isEmpty) return;
    if (targetSaveId != null && overwritePhase === 'edit') {
      setOverwritePhase('confirm');
      return;
    }
    await runSave();
  };

  const overwriteLabel =
    savedPatches.find((p) => p.id === targetSaveId)?.name?.trim() || name.trim() || 'this patch';

  const overwriteHint =
    typeof cursor === 'number' && savedPatches[cursor]
      ? `Replacing “${savedPatches[cursor]!.name}”`
      : 'New saved patch';

  return (
    <>
      <div className="io-patch-modal-backdrop" aria-hidden />
      <div className="io-patch-modal io-patch-modal-dropdown" data-io-patch-popup onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="io-patch-modal-body">
          {overwritePhase === 'confirm' && targetSaveId != null ? (
            <>
              <p className="io-patch-modal-warn" role="alert">
                Replace the saved patch <strong>“{overwriteLabel}”</strong> with your current setup? This updates it for
                everyone who uses this save.
              </p>
              <div className="io-patch-modal-actions">
                <button
                  type="button"
                  className="io-patch-modal-btn io-patch-modal-btn-secondary"
                  onClick={() => setOverwritePhase('edit')}
                >
                  Back
                </button>
                <button type="submit" className="io-patch-modal-btn io-patch-modal-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Replace patch'}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="io-patch-modal-label">
                Save as
                <input
                  type="text"
                  className="io-patch-modal-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Patch name"
                  autoComplete="off"
                  autoFocus
                  aria-autocomplete="list"
                  aria-label="Patch name — use up and down arrows to pick a saved patch to replace"
                />
              </label>
              {savedPatches.length > 0 ? (
                <p className="io-patch-modal-hint io-patch-modal-hint-tight">
                  <span className="io-patch-save-cursor">{overwriteHint}</span>
                  {' · '}
                  <span className="io-patch-modal-hint-muted">↑ ↓ to cycle saves</span>
                </p>
              ) : null}
              <label className="io-patch-modal-checkbox">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  disabled={isEmpty}
                />
                Set as default
              </label>
              {isEmpty && (
                <div className="io-patch-modal-hint">Patch is empty — nothing to save. Configure channels first.</div>
              )}
              {saveError && <div className="io-patch-modal-error">{saveError}</div>}
              <div className="io-patch-modal-actions">
                <button type="button" className="io-patch-modal-btn io-patch-modal-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="io-patch-modal-btn io-patch-modal-btn-primary"
                  disabled={saving || isEmpty}
                  title={isEmpty ? 'Patch is empty' : undefined}
                >
                  {saving ? 'Saving…' : targetSaveId != null ? 'Replace' : 'Save'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
}
