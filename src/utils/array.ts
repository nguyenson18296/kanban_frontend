/**
 * Splits an array into consecutive chunks of at most `size` items.
 * Returns an empty array for empty input. Throws when `size < 1` —
 * a non-positive size would either loop forever or silently swallow
 * data, so fail loudly instead.
 */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error(`chunk: size must be >= 1 (got ${size})`);
  }
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
