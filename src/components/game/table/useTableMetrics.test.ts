import { describe, expect, it } from 'vitest';
import { CORNER_DEPTH } from '../cardGeometry';
import { computeTableMetrics } from './useTableMetrics';

/** The shapes the six games actually use. */
const SHAPES = [
  { name: 'klondike', columns: 7, typicalColumn: 9 },
  { name: 'freecell', columns: 8, typicalColumn: 10 },
  { name: 'spider', columns: 10, typicalColumn: 12 },
  { name: 'fortythieves', columns: 10, typicalColumn: 8 },
  { name: 'missmilligan', columns: 8, typicalColumn: 10 },
];

/** Screens people actually play on, from a big monitor down to a small phone. */
const VIEWPORTS = [
  { name: '4k', width: 3840, height: 2160 },
  { name: '1080p', width: 1920, height: 1080 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'small laptop', width: 1280, height: 720 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tiny phone', width: 320, height: 568 },
];

describe('a covered card always shows its rank and pip', () => {
  // This is the bug that prompted the rule: a column of five was fanned as
  // tightly as a column of nineteen, so only the bottom card could be read.
  for (const shape of SHAPES) {
    for (const viewport of VIEWPORTS) {
      it(`${shape.name} on ${viewport.name}`, () => {
        const m = computeTableMetrics(shape, viewport);
        const cornerDepth = m.cardWidth * CORNER_DEPTH;

        for (let cards = 2; cards <= 24; cards++) {
          expect(m.fanFor(cards)).toBeGreaterThanOrEqual(cornerDepth);
        }
      });
    }
  }
});

describe('fanFor', () => {
  const klondike = { columns: 7, typicalColumn: 9 };
  const desktop = { width: 1920, height: 1080 };

  it('fans a short column loosely', () => {
    const m = computeTableMetrics(klondike, desktop);
    expect(m.fanFor(5)).toBe(m.cardSpacing);
  });

  it('does not squeeze a short column just because a long one is possible', () => {
    const m = computeTableMetrics(klondike, desktop);
    expect(m.fanFor(5)).toBeGreaterThan(m.fanFor(18));
  });

  it('tightens as a column deepens, then stops', () => {
    const m = computeTableMetrics(klondike, desktop);
    const fans = [6, 10, 14, 18, 24].map((n) => m.fanFor(n));
    for (let i = 1; i < fans.length; i++) {
      expect(fans[i]).toBeLessThanOrEqual(fans[i - 1]);
    }
    // Never tighter than the floor, however deep it goes.
    expect(m.fanFor(52)).toBe(m.fanFor(24));
  });

  it('keeps cards within the sensible range on any screen', () => {
    for (const viewport of VIEWPORTS) {
      const m = computeTableMetrics(klondike, viewport);
      expect(m.cardWidth).toBeGreaterThanOrEqual(40);
      expect(m.cardWidth).toBeLessThanOrEqual(132);
      expect(m.cardHeight).toBe(Math.round(m.cardWidth * 1.5));
    }
  });

  it('holds the table to the width its columns need', () => {
    const m = computeTableMetrics(klondike, { width: 3840, height: 2160 });
    expect(m.tableWidth).toBe(7 * m.cardWidth + 6 * m.columnGap);
    expect(m.tableWidth).toBeLessThan(3840);
  });

  it('fills the row rather than centring on a narrow screen', () => {
    const m = computeTableMetrics(klondike, { width: 390, height: 844 });
    expect(m.tableWidth).toBeLessThanOrEqual(390);
    expect(m.tableWidth).toBeGreaterThan(390 * 0.8);
  });
});
