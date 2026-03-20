/**
 * Local storage for I/O patch state. Persists per band so state survives page navigation.
 * Save to DB is separate — triggered by explicit Save action.
 */

const STORAGE_PREFIX = 'io-patch-state-';

export type IoPatchPersistedState = {
  inputChannelRange: string;
  outputChannelRange: string;
  showOutput: boolean;
  inputPatch: Record<number, { mic: string; stand: string }>;
  outputPatch: Record<number, { type: string; member: string }>;
  inputChannelColors: Record<number, string>;
  outputChannelColors: Record<number, string>;
  inputChannelInstruments: Record<number, string>;
  inputChannelInstrumentLabels?: Record<number, string>;
  inputChannelSkips: Record<number, boolean>;
  outputChannelSkips: Record<number, boolean>;
  inputChannelLinks: Record<number, number>;
  outputChannelLinks: Record<number, number>;
  inputChannelLR: Record<number, string>;
  outputChannelLR: Record<number, string>;
};

function keyBand(bandId: number) {
  return `${STORAGE_PREFIX}${bandId}`;
}

function keyForBandOrDate(bandId: number, dateId?: number | null) {
  return dateId != null ? `${STORAGE_PREFIX}${bandId}-date-${dateId}` : keyBand(bandId);
}

export function loadIoPatchState(bandId: number): IoPatchPersistedState | null {
  try {
    const raw = localStorage.getItem(keyBand(bandId));
    if (!raw) return null;
    return JSON.parse(raw) as IoPatchPersistedState;
  } catch {
    return null;
  }
}

/** True if patch is unchanged from default (nothing configured) */
export function isEmptyPatch(state: IoPatchPersistedState): boolean {
  if (Object.keys(state.inputChannelColors ?? {}).length > 0) return false;
  if (Object.keys(state.outputChannelColors ?? {}).length > 0) return false;
  if (Object.keys(state.inputChannelInstruments ?? {}).length > 0) return false;
  if (Object.keys(state.inputChannelSkips ?? {}).length > 0) return false;
  if (Object.keys(state.outputChannelSkips ?? {}).length > 0) return false;
  if (Object.keys(state.inputChannelLinks ?? {}).length > 0) return false;
  if (Object.keys(state.outputChannelLinks ?? {}).length > 0) return false;
  if (Object.keys(state.inputChannelLR ?? {}).length > 0) return false;
  if (Object.keys(state.outputChannelLR ?? {}).length > 0) return false;
  for (let i = 0; i < 32; i++) {
    const inp = state.inputPatch?.[i];
    if (inp && (inp.mic !== '—' || inp.stand !== '—')) return false;
    const out = state.outputPatch?.[i];
    if (out && (out.type !== '' || out.member !== '—')) return false;
  }
  return true;
}

/**
 * Persist draft. Use `dateId` when the I/O page is opened for a gig so edits
 * don't overwrite the band-wide draft stored under the band key only.
 */
export function saveIoPatchState(
  bandId: number,
  state: IoPatchPersistedState,
  dateId?: number | null,
): void {
  try {
    localStorage.setItem(keyForBandOrDate(bandId, dateId), JSON.stringify(state));
  } catch {
    // quota exceeded or similar
  }
}
