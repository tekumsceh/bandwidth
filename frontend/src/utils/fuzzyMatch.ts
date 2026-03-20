/** Word-wise substring match for searchable lists (dropdowns, pickers). */
export function fuzzyMatch(query: string, option: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const opt = option.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((w) => opt.includes(w));
}
