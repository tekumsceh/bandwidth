/** Personal band (`is_solo`) is shown as "me" everywhere in the app. */
export function displayBandName(name: string | undefined | null, bandIsSolo?: number | null): string {
  if (bandIsSolo === 1) return 'me';
  return name?.trim() || '';
}

/** Toolbar / band picker label for a band option */
export function bandOptionLabel(band: { name: string; is_solo?: number | null }): string {
  return displayBandName(band.name, band.is_solo ?? null);
}
