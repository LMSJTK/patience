import { describe, expect, it } from 'vitest';
import { Card } from '../cards';
import { card } from '../../test/factory';
import { getCoveringIndices, getRowCol, isCardExposed } from './pyramid';

/** A full 28-card pyramid with nothing removed yet. */
function fullPyramid(): (Card | null)[] {
  return Array.from({ length: 28 }, () => card('5', 'hearts'));
}

describe('getRowCol', () => {
  it('places the apex at row 0', () => {
    expect(getRowCol(0)).toEqual({ row: 0, col: 0 });
  });

  it('walks each row left to right', () => {
    expect(getRowCol(1)).toEqual({ row: 1, col: 0 });
    expect(getRowCol(2)).toEqual({ row: 1, col: 1 });
    expect(getRowCol(3)).toEqual({ row: 2, col: 0 });
    expect(getRowCol(5)).toEqual({ row: 2, col: 2 });
  });

  it('puts the last card at the right end of the bottom row', () => {
    expect(getRowCol(21)).toEqual({ row: 6, col: 0 });
    expect(getRowCol(27)).toEqual({ row: 6, col: 6 });
  });

  it('gives every row one more card than the row above it', () => {
    const counts = new Array(7).fill(0);
    for (let i = 0; i < 28; i++) counts[getRowCol(i).row]++;
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('getCoveringIndices', () => {
  it('names the two cards resting on the apex', () => {
    expect(getCoveringIndices(0)).toEqual([1, 2]);
  });

  it('names overlapping pairs for neighbours in a row', () => {
    // Cards 1 and 2 share card 4, which is why removing one rarely frees a card.
    expect(getCoveringIndices(1)).toEqual([3, 4]);
    expect(getCoveringIndices(2)).toEqual([4, 5]);
  });

  it('names the pair for a card in the second-to-last row', () => {
    expect(getCoveringIndices(20)).toEqual([26, 27]);
  });
});

describe('isCardExposed', () => {
  it('exposes the whole bottom row from the start', () => {
    const pyramid = fullPyramid();
    for (let i = 21; i < 28; i++) {
      expect(isCardExposed(i, pyramid)).toBe(true);
    }
  });

  it('covers everything above the bottom row at the start', () => {
    const pyramid = fullPyramid();
    for (let i = 0; i < 21; i++) {
      expect(isCardExposed(i, pyramid)).toBe(false);
    }
  });

  it('keeps a card covered while either supporter remains', () => {
    const pyramid = fullPyramid();
    pyramid[1] = null;
    expect(isCardExposed(0, pyramid)).toBe(false);
    pyramid[1] = card('5', 'hearts');
    pyramid[2] = null;
    expect(isCardExposed(0, pyramid)).toBe(false);
  });

  it('exposes a card once both supporters are gone', () => {
    const pyramid = fullPyramid();
    pyramid[1] = null;
    pyramid[2] = null;
    expect(isCardExposed(0, pyramid)).toBe(true);
  });
});
