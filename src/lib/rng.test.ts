import { describe, expect, it } from 'vitest';
import { MAX_SEED, mulberry32, parseSeed, randomSeed } from './rng';

describe('mulberry32', () => {
  it('repeats exactly for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const runA = Array.from({ length: 200 }, a);
    const runB = Array.from({ length: 200 }, b);
    expect(runA).toEqual(runB);
  });

  it('diverges for adjacent seeds', () => {
    const a = Array.from({ length: 50 }, mulberry32(1));
    const b = Array.from({ length: 50 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it('stays inside [0, 1)', () => {
    const next = mulberry32(99);
    for (let i = 0; i < 5000; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('spreads roughly evenly across the unit interval', () => {
    // A shuffle biased toward low indices would deal recognisably stacked
    // hands, so check the generator is not lopsided.
    const next = mulberry32(2024);
    const buckets = new Array(10).fill(0);
    const draws = 100_000;
    for (let i = 0; i < draws; i++) buckets[Math.floor(next() * 10)]++;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(draws / 10 - draws / 100);
      expect(count).toBeLessThan(draws / 10 + draws / 100);
    }
  });
});

describe('parseSeed', () => {
  it('accepts deal numbers as strings and as numbers', () => {
    expect(parseSeed('8675309')).toBe(8675309);
    expect(parseSeed(0)).toBe(0);
    expect(parseSeed(MAX_SEED - 1)).toBe(MAX_SEED - 1);
  });

  it('rejects anything that was never a deal number', () => {
    // Each of these must fall back to a random deal rather than deal seed 0.
    expect(parseSeed(null)).toBeNull();
    expect(parseSeed(undefined)).toBeNull();
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('klondike')).toBeNull();
    expect(parseSeed('12.5')).toBeNull();
    expect(parseSeed(-1)).toBeNull();
    expect(parseSeed(MAX_SEED)).toBeNull();
    expect(parseSeed(NaN)).toBeNull();
  });
});

describe('randomSeed', () => {
  it('stays in range', () => {
    for (let i = 0; i < 1000; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(MAX_SEED);
    }
  });

  it('round-trips through parseSeed', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(parseSeed(String(s))).toBe(s);
    }
  });
});
