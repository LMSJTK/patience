import { describe, expect, it } from 'vitest';
import { Card, RANKS, SUITS, createDeck, shuffleDeck } from '../cards';
import { mulberry32 } from '../rng';
import { card, pile } from '../../test/factory';
import {
  AutoPlayState,
  applyAutoMove,
  cardsRemaining,
  nextAutoMove,
  willAutoCompleteClear,
} from './freecellAuto';

const empty = (): AutoPlayState => ({
  freeCells: [null, null, null, null],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], [], []],
});

const state = (partial: Partial<AutoPlayState>): AutoPlayState => ({ ...empty(), ...partial });

/** Every card on the table, each column reading high to low as an endgame does. */
function everythingOnTheTable(): AutoPlayState {
  const columns: Card[][] = [[], [], [], [], [], [], [], []];
  let i = 0;
  for (const suit of SUITS) {
    for (const rank of [...RANKS].reverse()) {
      columns[i % 8].push(card(rank, suit));
      i++;
    }
  }
  return state({ tableau: columns });
}

describe('nextAutoMove', () => {
  it('sends an ace up before anything else', () => {
    const s = state({ tableau: [[card('K', 'spades')], [card('A', 'hearts')]] });
    expect(nextAutoMove(s)).toEqual({
      kind: 'toFoundation',
      from: { type: 'tableau', index: 1 },
      foundation: 0,
    });
  });

  it('empties a free cell before playing off the table', () => {
    // Both are playable; the cell should go first so it is free for unblocking.
    const s = state({
      freeCells: [card('A', 'hearts'), null, null, null],
      tableau: [[card('A', 'spades')]],
    });
    expect(nextAutoMove(s)).toEqual({
      kind: 'toFoundation',
      from: { type: 'freecell', index: 0 },
      foundation: 0,
    });
  });

  it('builds on a foundation in suit order', () => {
    const s = state({
      foundations: [pile('AH'), [], [], []],
      tableau: [[card('2', 'hearts')]],
    });
    expect(nextAutoMove(s)).toEqual({
      kind: 'toFoundation',
      from: { type: 'tableau', index: 0 },
      foundation: 0,
    });
  });

  it('moves a blocking card onto a column that will take it', () => {
    // The ace of spades is buried under the two. The two has a home on the
    // red three, so the ace comes free without spending a cell.
    const s = state({
      tableau: [pile('AS', '2S'), pile('3H')],
    });
    expect(nextAutoMove(s)).toEqual({
      kind: 'unblock',
      from: 0,
      to: { type: 'tableau', index: 1 },
    });
  });

  it('parks a blocking card in a free cell when no column will take it', () => {
    const s = state({ tableau: [pile('AS', '2S')] });
    expect(nextAutoMove(s)).toEqual({
      kind: 'unblock',
      from: 0,
      to: { type: 'freecell', index: 0 },
    });
  });

  it('does not move a card that frees nothing the foundations want', () => {
    // Nothing can go up and shuffling the kings around achieves nothing.
    const s = state({ tableau: [pile('KS', 'QH'), pile('KD')] });
    expect(nextAutoMove(s)).toBeNull();
  });

  it('has nothing to do on an empty board', () => {
    expect(nextAutoMove(empty())).toBeNull();
  });
});

describe('applyAutoMove', () => {
  it('leaves the state it was given untouched', () => {
    const before = state({ tableau: [[card('A', 'hearts')]] });
    applyAutoMove(before, {
      kind: 'toFoundation',
      from: { type: 'tableau', index: 0 },
      foundation: 0,
    });
    expect(before.tableau[0]).toHaveLength(1);
    expect(before.foundations[0]).toHaveLength(0);
  });

  it('clears the cell a card came out of', () => {
    const s = state({ freeCells: [card('A', 'hearts'), null, null, null] });
    const next = applyAutoMove(s, {
      kind: 'toFoundation',
      from: { type: 'freecell', index: 0 },
      foundation: 0,
    });
    expect(next.freeCells[0]).toBeNull();
    expect(next.foundations[0]).toHaveLength(1);
  });

  it('parks a card in the cell it was sent to', () => {
    const s = state({ tableau: [pile('AS', '2S')] });
    const next = applyAutoMove(s, { kind: 'unblock', from: 0, to: { type: 'freecell', index: 2 } });
    expect(next.freeCells[2]?.rank).toBe('2');
    expect(next.tableau[0]).toHaveLength(1);
  });
});

describe('cardsRemaining', () => {
  it('counts a whole deck when the foundations are bare', () => {
    expect(cardsRemaining(empty())).toBe(52);
  });

  it('counts down as the foundations fill', () => {
    expect(cardsRemaining(state({ foundations: [pile('AH', '2H'), [], [], []] }))).toBe(50);
  });
});

describe('willAutoCompleteClear', () => {
  it('clears a board where every column is already in order', () => {
    expect(willAutoCompleteClear(everythingOnTheTable())).toBe(true);
  });

  it('clears a board that needs a card moved out of the way first', () => {
    // Ace of spades under its own two, which nothing can take it from except
    // a free cell. Foundation-only play would stall here.
    const s = everythingOnTheTable();
    const spades = s.tableau.findIndex((col) => col.some((c) => c.rank === 'A' && c.suit === 'spades'));
    s.tableau[spades] = [...s.tableau[spades].filter((c) => !(c.rank === 'A' && c.suit === 'spades'))];
    s.tableau[spades].push(card('A', 'spades'), card('2', 'clubs'));
    expect(willAutoCompleteClear(s)).toBe(true);
  });

  it('refuses a board it cannot actually finish', () => {
    // Two aces buried under kings, with no cell to spare and no column that
    // will take a king.
    const s = state({
      freeCells: [card('5', 'hearts'), card('6', 'hearts'), card('7', 'hearts'), card('8', 'hearts')],
      tableau: [pile('AS', 'KD'), pile('AH', 'KC')],
    });
    expect(willAutoCompleteClear(s)).toBe(false);
  });

  it('refuses an ordinary opening deal', () => {
    // The real shuffle, laid out the way the store deals it. A fresh board is
    // never finishable, so the button must not be offered on the first move of
    // any game — checked over a hundred deals rather than a lucky one.
    for (let seed = 1; seed <= 100; seed++) {
      const deck = shuffleDeck(createDeck(), mulberry32(seed)).map((c) => ({ ...c, isFaceUp: true }));
      const tableau: Card[][] = [[], [], [], [], [], [], [], []];
      let i = 0;
      for (let col = 0; col < 8; col++) {
        for (let n = 0; n < (col < 4 ? 7 : 6); n++) tableau[col].push(deck[i++]);
      }
      expect(willAutoCompleteClear(state({ tableau }))).toBe(false);
    }
  });

  it('is true when the board is already empty', () => {
    const done = state({
      foundations: SUITS.map((suit) => RANKS.map((rank) => card(rank, suit))),
    });
    expect(cardsRemaining(done)).toBe(0);
    expect(willAutoCompleteClear(done)).toBe(true);
  });
});

describe('running the routine to the end', () => {
  it('empties every board it said it would', () => {
    let current = everythingOnTheTable();
    expect(willAutoCompleteClear(current)).toBe(true);

    let steps = 0;
    while (cardsRemaining(current) > 0) {
      const move = nextAutoMove(current);
      expect(move).not.toBeNull();
      current = applyAutoMove(current, move!);
      steps++;
      expect(steps).toBeLessThan(200);
    }

    expect(current.foundations.every((col) => col.length === 13)).toBe(true);
    expect(current.tableau.every((col) => col.length === 0)).toBe(true);
    expect(current.freeCells.every((c) => c === null)).toBe(true);
  });
});
