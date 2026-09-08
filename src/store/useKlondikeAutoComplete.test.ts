import { beforeEach, describe, expect, it } from 'vitest';
import { Card, RANKS, SUITS } from '../lib/cards';
import { card } from '../test/factory';
import { useGameStore } from './useGameStore';
import { useKlondikeStore } from './useKlondikeStore';

const s = () => useKlondikeStore.getState();

/** Run the finish routine to the end, the way the board's timer does. */
function finish(maxSteps = 500): number {
  let steps = 0;
  while (steps < maxSteps && s().autoCompleteStep()) steps++;
  return steps;
}

beforeEach(() => {
  useGameStore.getState().setStats({} as never);
  s().initGame(1, 4242);
});

describe('canAutoComplete', () => {
  it('stays hidden on a fresh deal, where most cards are face down', () => {
    expect(s().canAutoComplete()).toBe(false);
  });

  it('stays hidden once the game is already won', () => {
    useKlondikeStore.setState({
      foundations: SUITS.map((suit) => RANKS.map((rank) => card(rank, suit))),
      tableau: [[], [], [], [], [], [], []],
      stock: [],
      waste: [],
      isWon: true,
    });
    expect(s().canAutoComplete()).toBe(false);
  });

  it('appears once every card is face up', () => {
    // A whole deck on the table, each column running high to low.
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let i = 0;
    for (const suit of SUITS) {
      for (const rank of [...RANKS].reverse()) {
        tableau[i % 7].push(card(rank, suit));
        i++;
      }
    }
    useKlondikeStore.setState({ tableau, stock: [], waste: [], foundations: [[], [], [], []] });
    expect(s().canAutoComplete()).toBe(true);
  });

  it('appears when the whole deck is still in the stock', () => {
    const stock = SUITS.flatMap((suit) => RANKS.map((rank) => card(rank, suit, false)));
    useKlondikeStore.setState({
      stock,
      waste: [],
      tableau: [[], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    expect(s().canAutoComplete()).toBe(true);
  });
});

describe('autoCompleteStep', () => {
  it('drives a revealed board all the way to a win', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let i = 0;
    for (const suit of SUITS) {
      for (const rank of [...RANKS].reverse()) {
        tableau[i % 7].push(card(rank, suit));
        i++;
      }
    }
    useKlondikeStore.setState({ tableau, stock: [], waste: [], foundations: [[], [], [], []] });

    expect(s().canAutoComplete()).toBe(true);
    const steps = finish();

    expect(s().isWon).toBe(true);
    expect(s().foundations.every((col) => col.length === 13)).toBe(true);
    expect(s().tableau.every((col) => col.length === 0)).toBe(true);
    // 52 cards up, plus the moves needed to unpick them.
    expect(steps).toBeGreaterThanOrEqual(52);
  });

  it('finishes a deck dealt entirely into the stock', () => {
    const stock = SUITS.flatMap((suit) => RANKS.map((rank) => card(rank, suit, false)));
    useKlondikeStore.setState({
      stock,
      waste: [],
      tableau: [[], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    finish(3000);
    expect(s().isWon).toBe(true);
  });

  it('awards the win exactly once, however it was reached', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let i = 0;
    for (const suit of SUITS) {
      for (const rank of [...RANKS].reverse()) {
        tableau[i % 7].push(card(rank, suit));
        i++;
      }
    }
    useKlondikeStore.setState({ tableau, stock: [], waste: [], foundations: [[], [], [], []] });
    finish();
    const { level, xp } = useGameStore.getState().stats.klondike;
    expect((100 * (level - 1) * level) / 2 + xp).toBe(100);
  });

  it('reports nothing left to do on a finished board', () => {
    useKlondikeStore.setState({
      foundations: SUITS.map((suit) => RANKS.map((rank) => card(rank, suit))),
      tableau: [[], [], [], [], [], [], []],
      stock: [],
      waste: [],
    });
    expect(s().autoCompleteStep()).toBe(false);
  });

  it('leaves every move in the history, so the finish can be undone', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let i = 0;
    for (const suit of SUITS) {
      for (const rank of [...RANKS].reverse()) {
        tableau[i % 7].push(card(rank, suit));
        i++;
      }
    }
    useKlondikeStore.setState({
      tableau,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      history: [],
    });
    const steps = finish();
    expect(s().history.length).toBe(steps);
  });
});
