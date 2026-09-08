/**
 * Deterministic randomness for deals.
 *
 * Every game seeds its shuffle from a number, so the same number always
 * produces the same deal. That is what makes a deal shareable by link,
 * replayable after a loss, and identical for everyone on a daily challenge.
 */

export type Rng = () => number;

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 *
 * Chosen over `Math.random` because it is seedable and over a larger
 * generator because a deal only needs 52 to 104 draws.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The largest deal number, exclusive. Nine digits stays readable and typable. */
export const MAX_SEED = 1_000_000_000;

/** A fresh deal number for a game nobody asked to replay. */
export function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED);
}

/**
 * Coerce anything a URL or an input box might supply into a usable seed.
 * Returns null when the value could never have been a deal number, so the
 * caller can fall back to a random deal instead of silently dealing seed 0.
 */
export function parseSeed(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n >= MAX_SEED) return null;
  return n;
}
