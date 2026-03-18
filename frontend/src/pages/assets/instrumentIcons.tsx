import type { ReactNode } from 'react';
import { resolveInstruments } from '../../config/userIconSelection';

type InstrumentDef = { id: string; label: string; shortLabel: string; Icon: (p: { size?: number }) => ReactNode };

/** Resolved instruments from user selection (localStorage) or defaults. */
export function getInstruments(): InstrumentDef[] {
  return resolveInstruments();
}

export function getInstrument(id: string | undefined) {
  return id ? getInstruments().find((i) => i.id === id) : undefined;
}
