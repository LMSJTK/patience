import { beforeEach, describe, expect, it } from 'vitest';
import { Card, RANKS, SUITS, getCardValue } from '../lib/cards';
import { card } from '../test/factory';
import { useGameStore } from './useGameStore';
import { useKlondikeStore } from './useKlondikeStore';

const s = () => useKlondikeStore.getState();

/**
 * XP earned in total for a game. addXp spends XP on levels as it goes, so the
 * raw `xp` field resets on every level-up and cannot be compared directly.
 * Levelling from L to L+1 costs L * 100.
 */
function totalXp(game: 'klondike'): number {
  const { level, xp } = useGameStore.getState().stats[game];
  return (100 * (level - 1) * level) / 2 + xp;
}

/** Four complete foundations, i.e. a won board. */
function wonFoundations(): Card[][] {
  return SUITS.map((suit) => RANKS.map((rank) => card(rank, suit)));
}

beforeEach(() => {
  // Both stores are module singletons, so each test starts from a known deal
  // and a zeroed XP ledger.
  useGameStore.getState().setStats({} as never);
  s().initGame(1, 12345);
});

describe('initGame', () => {
  it('deals the klondike pyramid: 1 through 7 cards across seven columns', () => {
    expect(s().tableau.map((col) => col.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('leaves the remaining 24 cards in the stock and an empty waste', () => {
    expect(s().stock).toHaveLength(24);
    expect(s().waste).toEqual([]);
    expect(s().foundations).toEqual([[], [], [], []]);
  });

  it('turns up exactly the last card of each column', () => {
    for (const col of s().tableau) {
      expect(col[col.length - 1].isFaceUp).toBe(true);
      expect(col.slice(0, -1).every((c) => !c.isFaceUp)).toBe(true);
    }
  });

  it('uses all 52 cards exactly once', () => {
    const ids = [...s().stock, ...s().tableau.flat()].map((c) => c.id);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
  });

  it('deals the same cards for the same deal number', () => {
    const first = s().tableau.flat().map((c) => c.id);
    s().initGame(1, 12345);
    expect(s().tableau.flat().map((c) => c.id)).toEqual(first);
  });

  it('deals different cards for a different deal number', () => {
    const first = s().tableau.flat().map((c) => c.id);
    s().initGame(1, 999);
    expect(s().tableau.flat().map((c) => c.id)).not.toEqual(first);
  });

  it('records the deal number so it can be shown and shared', () => {
    expect(s().seed).toBe(12345);
  });

  it('clears history, so a fresh deal reads as zero moves', () => {
    expect(s().history).toEqual([]);
    expect(s().isWon).toBe(false);
  });
});

describe('drawCard', () => {
  it('turns one card face up onto the waste in draw-one', () => {
    s().drawCard();
    expect(s().waste).toHaveLength(1);
    expect(s().stock).toHaveLength(23);
    expect(s().waste[0].isFaceUp).toBe(true);
  });

  it('turns three at a time in draw-three', () => {
    s().initGame(3, 12345);
    s().drawCard();
    expect(s().waste).toHaveLength(3);
    expect(s().stock).toHaveLength(21);
  });

  it('draws whatever is left when fewer than three remain', () => {
    s().initGame(3, 12345);
    useKlondikeStore.setState({ stock: s().stock.slice(0, 2) });
    s().drawCard();
    expect(s().waste).toHaveLength(2);
    expect(s().stock).toHaveLength(0);
  });

  it('turns the waste back into the stock when the stock runs out', () => {
    useKlondikeStore.setState({ stock: [], waste: [card('A', 'hearts'), card('2', 'hearts')] });
    s().drawCard();
    expect(s().stock).toHaveLength(2);
    expect(s().waste).toEqual([]);
    expect(s().stock.every((c) => !c.isFaceUp)).toBe(true);
  });

  it('recycles in the order the cards were played', () => {
    // The card played first must come back off the stock first.
    useKlondikeStore.setState({ stock: [], waste: [card('A', 'hearts'), card('2', 'hearts')] });
    s().drawCard();
    expect(s().stock.map((c) => c.rank)).toEqual(['2', 'A']);
  });

  it('does nothing when both stock and waste are empty', () => {
    useKlondikeStore.setState({ stock: [], waste: [], history: [] });
    s().drawCard();
    expect(s().history).toHaveLength(0);
  });
});

describe('handleDrop', () => {
  it('accepts a descending alternating-colour build', () => {
    useKlondikeStore.setState({
      tableau: [[card('8', 'spades')], [card('7', 'hearts')], [], [], [], [], []],
    });
    s().handleDrop({ type: 'tableau', index: 1, cardIndex: 0 }, { type: 'tableau', index: 0 });
    expect(s().tableau[0].map((c) => c.rank)).toEqual(['8', '7']);
    expect(s().tableau[1]).toEqual([]);
  });

  it('refuses a same-colour build and leaves the board untouched', () => {
    useKlondikeStore.setState({
      tableau: [[card('8', 'spades')], [card('7', 'clubs')], [], [], [], [], []],
      history: [],
    });
    s().handleDrop({ type: 'tableau', index: 1, cardIndex: 0 }, { type: 'tableau', index: 0 });
    expect(s().tableau[0]).toHaveLength(1);
    expect(s().tableau[1]).toHaveLength(1);
    expect(s().history).toHaveLength(0);
  });

  it('turns up the card a move uncovers', () => {
    useKlondikeStore.setState({
      tableau: [[card('8', 'spades')], [card('K', 'clubs', false), card('7', 'hearts')], [], [], [], [], []],
    });
    s().handleDrop({ type: 'tableau', index: 1, cardIndex: 1 }, { type: 'tableau', index: 0 });
    expect(s().tableau[1][0].isFaceUp).toBe(true);
  });

  it('sends an ace to an empty foundation', () => {
    useKlondikeStore.setState({ waste: [card('A', 'hearts')], foundations: [[], [], [], []] });
    s().handleDrop({ type: 'waste' }, { type: 'foundation', index: 0 });
    expect(s().foundations[0].map((c) => c.rank)).toEqual(['A']);
    expect(s().waste).toEqual([]);
  });

  it('refuses more than one card onto a foundation', () => {
    useKlondikeStore.setState({
      tableau: [[card('A', 'hearts'), card('2', 'hearts')], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    s().handleDrop({ type: 'tableau', index: 0, cardIndex: 0 }, { type: 'foundation', index: 0 });
    expect(s().foundations[0]).toEqual([]);
  });

  it('lets a card come back off a foundation', () => {
    useKlondikeStore.setState({
      foundations: [[card('A', 'spades')], [], [], []],
      tableau: [[card('2', 'hearts')], [], [], [], [], [], []],
    });
    s().handleDrop({ type: 'foundation', index: 0 }, { type: 'tableau', index: 0 });
    expect(s().foundations[0]).toEqual([]);
    expect(s().tableau[0].map((c) => c.rank)).toEqual(['2', 'A']);
  });

  it('opens an empty column to a king and nothing else', () => {
    useKlondikeStore.setState({ tableau: [[], [card('K', 'spades')], [], [], [], [], []] });
    s().handleDrop({ type: 'tableau', index: 1, cardIndex: 0 }, { type: 'tableau', index: 0 });
    expect(s().tableau[0]).toHaveLength(1);

    useKlondikeStore.setState({ tableau: [[], [card('Q', 'spades')], [], [], [], [], []] });
    s().handleDrop({ type: 'tableau', index: 1, cardIndex: 0 }, { type: 'tableau', index: 0 });
    expect(s().tableau[0]).toHaveLength(0);
  });

  it('moves a whole run, not just the card grabbed', () => {
    useKlondikeStore.setState({
      tableau: [[card('9', 'hearts')], [card('8', 'spades'), card('7', 'diamonds')], [], [], [], [], []],
    });
    s().handleDrop({ type: 'tableau', index: 1, cardIndex: 0 }, { type: 'tableau', index: 0 });
    expect(s().tableau[0].map((c) => c.rank)).toEqual(['9', '8', '7']);
    expect(s().tableau[1]).toEqual([]);
  });
});

describe('autoMoveCard', () => {
  it('prefers the foundation over the tableau', () => {
    useKlondikeStore.setState({
      waste: [card('A', 'hearts')],
      foundations: [[], [], [], []],
      tableau: [[card('2', 'spades')], [], [], [], [], [], []],
    });
    s().autoMoveCard({ type: 'waste' });
    expect(s().foundations[0].map((c) => c.rank)).toEqual(['A']);
  });

  it('falls back to a legal tableau build', () => {
    useKlondikeStore.setState({
      waste: [card('7', 'hearts')],
      foundations: [[], [], [], []],
      tableau: [[card('8', 'spades')], [], [], [], [], [], []],
    });
    s().autoMoveCard({ type: 'waste' });
    expect(s().tableau[0].map((c) => c.rank)).toEqual(['8', '7']);
    expect(s().waste).toEqual([]);
  });

  it('leaves a card alone when it has nowhere to go', () => {
    useKlondikeStore.setState({
      waste: [card('7', 'hearts')],
      foundations: [[], [], [], []],
      tableau: [[card('8', 'diamonds')], [], [], [], [], [], []],
      history: [],
    });
    s().autoMoveCard({ type: 'waste' });
    expect(s().waste).toHaveLength(1);
    expect(s().history).toHaveLength(0);
  });

  it('does not shuffle a lone king between empty columns', () => {
    useKlondikeStore.setState({
      tableau: [[card('K', 'spades')], [], [], [], [], [], []],
      foundations: [[], [], [], []],
      history: [],
    });
    s().autoMoveCard({ type: 'tableau', index: 0, cardIndex: 0 });
    expect(s().tableau[0]).toHaveLength(1);
    expect(s().history).toHaveLength(0);
  });
});

describe('undo', () => {
  it('puts the board back as it was', () => {
    const before = JSON.stringify(s().tableau);
    s().drawCard();
    s().undo();
    expect(JSON.stringify(s().tableau)).toBe(before);
    expect(s().waste).toEqual([]);
    expect(s().history).toHaveLength(0);
  });

  it('unwinds one move at a time', () => {
    s().drawCard();
    s().drawCard();
    expect(s().history).toHaveLength(2);
    s().undo();
    expect(s().history).toHaveLength(1);
    expect(s().waste).toHaveLength(1);
  });

  it('does nothing at the start of a game', () => {
    s().undo();
    expect(s().history).toHaveLength(0);
    expect(s().waste).toEqual([]);
  });
});

describe('checkWin', () => {
  it('declares a win once all four foundations are full', () => {
    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    expect(s().isWon).toBe(true);
  });

  it('stays quiet while a foundation is short a card', () => {
    const nearly = wonFoundations();
    nearly[3] = nearly[3].slice(0, 12);
    useKlondikeStore.setState({ foundations: nearly });
    s().checkWin();
    expect(s().isWon).toBe(false);
  });

  it('pays out XP for the win', () => {
    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    expect(totalXp('klondike')).toBe(100);
  });

  it('pays out once, not once per call', () => {
    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    s().checkWin();
    expect(totalXp('klondike')).toBe(100);
  });

  it('cannot be farmed by winning, undoing, and winning again', () => {
    // Regression: undo clears isWon so the board is playable, which used to
    // let the same deal bank its XP over and over.
    useKlondikeStore.setState({
      foundations: wonFoundations(),
      history: [{ stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []], score: 0, stockPasses: 0 }],
    });
    s().checkWin();
    expect(totalXp('klondike')).toBe(100);

    s().undo();
    expect(s().isWon).toBe(false);

    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    expect(totalXp('klondike')).toBe(100);
  });

  it('pays out again for a genuinely new deal', () => {
    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    s().initGame(1, 777);
    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    expect(totalXp('klondike')).toBe(200);
  });
});

describe('level progression', () => {
  it('turns 100 XP into level 2 with nothing left over', () => {
    useKlondikeStore.setState({ foundations: wonFoundations() });
    s().checkWin();
    const stats = useGameStore.getState().stats.klondike;
    expect(stats.level).toBe(2);
    expect(stats.xp).toBe(0);
  });
});

describe('card values used by the rules', () => {
  it('matches the ranks the foundations count on', () => {
    // A foundation is full at 13 cards, so the ranks must run 1..13 with no gaps.
    expect(RANKS.map(getCardValue)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
});
