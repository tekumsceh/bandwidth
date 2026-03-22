/** Normalize thrown values into a user-visible string. */
export function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
