import { describe, expect, it } from 'vitest';
import { Card, RANKS, SUITS } from '../cards';
import { card } from '../../test/factory';
import {
  AutoPlayState,
  applyAutoMove,
  cardsRemaining,
  isFullyRevealed,
  nextAutoMove,
  willAutoCompleteClear,
} from './klondikeAuto';

const empty = (): AutoPlayState => ({
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
});

const state = (partial: Partial<AutoPlayState>): AutoPlayState => ({ ...empty(), ...partial });

/** Every card, face up, split across the seven columns. */
function everythingOnTheTable(): AutoPlayState {
  const columns: Card[][] = [[], [], [], [], [], [], []];
  let i = 0;
  for (const suit of SUITS) {
    // Kings first so each column reads high to low, as a real endgame does.
    for (const rank of [...RANKS].reverse()) {
      columns[i % 7].push(card(rank, suit));
      i++;
    }
  }
  return state({ tableau: columns });
}

describe('isFullyRevealed', () => {
  it('is true when nothing is face down', () => {
    expect(isFullyRevealed(state({ tableau: [[card('K', 'spades')]] }))).toBe(true);
  });

  it('is false while a card is still hidden', () => {
    expect(isFullyRevealed(state({ tableau: [[card('K', 'spades', false)]] }))).toBe(false);
  });
});

describe('nextAutoMove', () => {
  it('sends an ace up before anything else', () => {
    const s = state({ tableau: [[card('A', 'hearts')], [card('K', 'spades')]] });
    expect(nextAutoMove(s)).toEqual({ kind: 'toFoundation', from: 0, foundation: 0 });
  });

  it('prefers the waste, so the pile does not grow', () => {
    const s = state({ waste: [card('A', 'hearts')], tableau: [[card('A', 'spades')]] });
    expect(nextAutoMove(s)).toEqual({ kind: 'toFoundation', from: 'waste', foundation: 0 });
  });

  it('turns the stock over when nothing can be played', () => {
    const s = state({ stock: [card('9', 'clubs', false)], tableau: [[card('K', 'spades')]] });
    expect(nextAutoMove(s)).toEqual({ kind: 'draw' });
  });

  it('moves a card aside when doing so frees one the foundations want', () => {
    // The ace is trapped under the two of its own suit: no sequence of
    // foundation moves alone can ever reach it.
    const s = state({
      tableau: [[card('A', 'spades'), card('2', 'spades')], [card('3', 'hearts')]],
    });
    expect(nextAutoMove(s)).toEqual({ kind: 'unblock', from: 0, to: 1 });
  });

  it('does not move a card aside when it frees nothing useful', () => {
    const s = state({ tableau: [[card('9', 'clubs'), card('2', 'spades')], [card('3', 'hearts')]] });
    expect(nextAutoMove(s)).toBeNull();
  });

  it('gives up when the board is bare', () => {
    expect(nextAutoMove(empty())).toBeNull();
  });
});

describe('applyAutoMove', () => {
  it('moves a card up without touching the state it was given', () => {
    const before = state({ tableau: [[card('A', 'hearts')]] });
    const after = applyAutoMove(before, { kind: 'toFoundation', from: 0, foundation: 0 });
    expect(after.foundations[0].map((c) => c.rank)).toEqual(['A']);
    expect(after.tableau[0]).toEqual([]);
    expect(before.tableau[0]).toHaveLength(1);
    expect(before.foundations[0]).toEqual([]);
  });

  it('moves a card between columns', () => {
    const before = state({ tableau: [[card('A', 'spades'), card('2', 'spades')], [card('3', 'hearts')]] });
    const after = applyAutoMove(before, { kind: 'unblock', from: 0, to: 1 });
    expect(after.tableau[0].map((c) => c.rank)).toEqual(['A']);
    expect(after.tableau[1].map((c) => c.rank)).toEqual(['3', '2']);
  });

  it('turns cards face up as they are drawn', () => {
    const before = state({ stock: [card('9', 'clubs', false)] });
    const after = applyAutoMove(before, { kind: 'draw' });
    expect(after.waste[0].isFaceUp).toBe(true);
    expect(after.stock).toEqual([]);
  });

  it('recycles the waste when the stock runs out', () => {
    const before = state({ stock: [], waste: [card('A', 'hearts'), card('2', 'hearts')] });
    const after = applyAutoMove(before, { kind: 'draw' });
    expect(after.stock.map((c) => c.rank)).toEqual(['2', 'A']);
    expect(after.stock.every((c) => !c.isFaceUp)).toBe(true);
    expect(after.waste).toEqual([]);
  });

  it('draws three at a time when the game says so', () => {
    const before = state({
      stock: [card('9', 'clubs', false), card('8', 'clubs', false), card('7', 'clubs', false)],
    });
    expect(applyAutoMove(before, { kind: 'draw' }, 3).waste).toHaveLength(3);
  });
});

describe('willAutoCompleteClear', () => {
  it('refuses while a card is still face down', () => {
    const s = state({ tableau: [[card('A', 'hearts', false)]] });
    expect(willAutoCompleteClear(s)).toBe(false);
  });

  it('clears a whole deck laid out face up', () => {
    const s = everythingOnTheTable();
    expect(cardsRemaining(s)).toBe(52);
    expect(willAutoCompleteClear(s)).toBe(true);
  });

  it('clears a deck sitting entirely in the stock', () => {
    const stock: Card[] = [];
    for (const suit of SUITS) for (const rank of RANKS) stock.push(card(rank, suit, false));
    expect(willAutoCompleteClear(state({ stock }))).toBe(true);
  });

  it('unpicks an ace trapped under its own two when somewhere legal exists', () => {
    // Foundation moves alone can never reach this ace. The two has a red
    // three to move onto, so the routine gets there.
    const columns: Card[][] = [[], [], [], [], [], [], []];
    columns[0] = [card('A', 'spades'), card('2', 'spades')];
    columns[1] = [card('3', 'hearts')];
    let i = 0;
    for (const suit of SUITS) {
      for (const rank of [...RANKS].reverse()) {
        const placed =
          (suit === 'spades' && (rank === 'A' || rank === '2')) ||
          (suit === 'hearts' && rank === '3');
        if (placed) continue;
        columns[2 + (i % 5)].push(card(rank, suit));
        i++;
      }
    }
    const s = state({ tableau: columns });
    expect(cardsRemaining(s)).toBe(52);
    expect(nextAutoMove(s)).toEqual({ kind: 'unblock', from: 0, to: 1 });
    expect(willAutoCompleteClear(s)).toBe(true);
  });

  it('admits it when the blocking card has nowhere legal to go', () => {
    // The same trapped ace, but every red three is buried and empty columns
    // take kings only, so the two of spades cannot be moved aside. A full
    // solver would shift other cards to make room; this routine does not
    // pretend to, and the button stays hidden rather than lying.
    const columns: Card[][] = [[], [], [], [], [], [], []];
    columns[0] = [card('A', 'spades'), card('2', 'spades')];
    let i = 0;
    for (const suit of SUITS) {
      for (const rank of [...RANKS].reverse()) {
        if (suit === 'spades' && (rank === 'A' || rank === '2')) continue;
        columns[1 + (i % 6)].push(card(rank, suit));
        i++;
      }
    }
    expect(willAutoCompleteClear(state({ tableau: columns }))).toBe(false);
  });

  it('terminates instead of cycling the stock forever', () => {
    // Nothing can ever go up: no aces anywhere, so drawing achieves nothing.
    const s = state({
      stock: [card('9', 'clubs', false), card('8', 'diamonds', false)],
      tableau: [[card('K', 'spades'), card('5', 'hearts')], [card('Q', 'clubs')]],
    });
    expect(willAutoCompleteClear(s)).toBe(false);
  });

  it('is already done when everything is on the foundations', () => {
    const foundations = SUITS.map((suit) => RANKS.map((rank) => card(rank, suit)));
    expect(willAutoCompleteClear(state({ foundations }))).toBe(true);
  });
});
