/** LR + link column text shared by input/output patch tables. */
export function buildLinkDescription(
  lr: 'L' | 'R' | '' | undefined,
  linked: number | undefined,
): string {
  const parts: string[] = [];
  if (lr) parts.push(lr);
  if (linked !== undefined) parts.push(`ch ${String(linked + 1).padStart(2, '0')}`);
  return parts.length ? parts.join(', ') : '—';
}
