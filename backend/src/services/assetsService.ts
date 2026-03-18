export type GearItemRow = {
  label: string;
  category: string | null;
  qty: number;
  notes: string | null;
  source: string;
};

export function canEditAssetScope(scope: string, isOwner: boolean, canManageBand: boolean) {
  if (scope === 'personal') return isOwner;
  if (scope === 'band') return canManageBand;
  return false;
}

export function resolveDefaultProfileId<T extends { id: number; is_default?: number | boolean }>(profiles: T[]) {
  if (!profiles.length) return null;
  const explicit = profiles.find((p) => Boolean(p.is_default));
  return explicit ? explicit.id : profiles[0].id;
}

export function mergeGearItems(params: { bandItems: GearItemRow[]; personalItems: GearItemRow[] }) {
  // Keep explicit source rows instead of forced dedupe, so users can see what came from where.
  // Client can collapse by label/category if desired.
  return [...params.bandItems, ...params.personalItems];
}

