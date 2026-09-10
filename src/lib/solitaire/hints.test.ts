import { describe, expect, it } from 'vitest';
import { Card, createDeck, shuffleDeck } from '../cards';
import { mulberry32 } from '../rng';
import { card, pile } from '../../test/factory';
import {
  Hint,
  fortyThievesHints,
  freecellHints,
  klondikeHints,
  missMilliganHints,
  pyramidHints,
  spiderHints,
} from './hints';

const cols = (n: number): Card[][] => Array.from({ length: n }, () => []);

/** The rank of the first card a hint points at, for readable assertions. */
const points = (hints: Hint[], at = 0) => hints[at];

describe('klondike', () => {
  const state = (partial: Partial<Parameters<typeof klondikeHints>[0]> = {}) => ({
    stock: [],
    waste: [],
    foundations: [[], [], [], []] as Card[][],
    tableau: cols(7),
    ...partial,
  });

  it('suggests the ace before anything else', () => {
    const t = cols(7);
    t[0] = [card('A', 'hearts')];
    t[1] = [card('K', 'spades'), card('Q', 'hearts')];
    const best = points(klondikeHints(state({ tableau: t })));
    expect(best.cards).toEqual([card('A', 'hearts').id]);
    expect(best.target).toBe('foundation-0');
  });

  it('prefers a move that turns a card over to one that does not', () => {
    const t = cols(7);
    // Column 0: a face-down card under a nine that has a home on the ten.
    t[0] = [card('3', 'clubs', false), card('9', 'hearts')];
    t[1] = [card('10', 'spades')];
    // Column 2: another nine with a home, but nothing hidden beneath it.
    t[2] = [card('9', 'diamonds')];
    t[3] = [card('10', 'clubs')];

    const best = points(klondikeHints(state({ tableau: t })));
    expect(best.cards).toEqual([card('9', 'hearts').id]);
  });

  it('moves a whole run, not just its top card', () => {
    const t = cols(7);
    t[0] = [card('2', 'clubs', false), card('9', 'hearts'), card('8', 'spades')];
    t[1] = [card('10', 'spades')];
    const best = points(klondikeHints(state({ tableau: t })));
    expect(best.cards).toHaveLength(2);
  });

  it('does not suggest shifting a whole column onto an empty one', () => {
    const t = cols(7);
    t[0] = [card('K', 'spades'), card('Q', 'hearts')];
    // t[1] is empty; moving the king there changes nothing.
    const hints = klondikeHints(state({ tableau: t }));
    expect(hints.filter((h) => h.target === 'tableau-1')).toEqual([]);
  });

  it('falls back to turning the stock when the table is dead', () => {
    const t = cols(7);
    t[0] = [card('K', 'spades')];
    t[1] = [card('K', 'hearts')];
    const hints = klondikeHints(state({ tableau: t, stock: [card('5', 'clubs', false)] }));
    expect(hints).toHaveLength(1);
    expect(hints[0].target).toBe('stock');
  });

  it('has nothing to say about a board with no moves and no stock', () => {
    const t = cols(7);
    t[0] = [card('K', 'spades')];
    t[1] = [card('K', 'hearts')];
    expect(klondikeHints(state({ tableau: t }))).toEqual([]);
  });

  it('always finds something on a fresh deal', () => {
    // Whatever the shuffle, a full stock means there is always a move.
    for (let seed = 1; seed <= 40; seed++) {
      const deck = shuffleDeck(createDeck(), mulberry32(seed));
      const t = cols(7);
      let i = 0;
      for (let a = 0; a < 7; a++) {
        for (let b = a; b < 7; b++) {
          const c = { ...deck[i++], isFaceUp: a === b };
          t[b].push(c);
        }
      }
      expect(klondikeHints(state({ tableau: t, stock: deck.slice(i) })).length).toBeGreaterThan(0);
    }
  });
});

describe('freecell', () => {
  const state = (partial: Partial<Parameters<typeof freecellHints>[0]> = {}) => ({
    freeCells: [null, null, null, null] as (Card | null)[],
    foundations: [[], [], [], []] as Card[][],
    tableau: cols(8),
    ...partial,
  });

  it('plays a card out of a free cell before parking another one', () => {
    const t = cols(8);
    t[0] = [card('K', 'spades')];
    const best = points(freecellHints(state({ freeCells: [card('A', 'hearts'), null, null, null], tableau: t })));
    expect(best.target).toBe('foundation-0');
  });

  it('will not suggest a run longer than the free cells allow', () => {
    // Every cell full and every column occupied, so only one card can be
    // lifted at a time however tempting the run below looks.
    const t = cols(8).map((_, i) => [card('K', i % 2 ? 'hearts' : 'clubs', true, i)]);
    t[0] = pile('9S', '8H', '7S', '6H', '5S');
    t[1] = [card('6', 'spades')];
    const full = [card('2', 'clubs'), card('3', 'clubs'), card('4', 'clubs'), card('5', 'clubs')];
    const hints = freecellHints(state({ tableau: t, freeCells: full }));

    // The four-card run 8H-7S-6H-5S would fit on the six of spades, and is
    // exactly the move that has to be refused here.
    expect(hints.some((h) => h.target === 'tableau-1')).toBe(false);
    expect(hints.every((h) => h.cards.length <= 1)).toBe(true);
  });

  it('offers parking a card only as a last resort', () => {
    const t = cols(8);
    t[0] = [card('A', 'hearts')];
    const hints = freecellHints(state({ tableau: t }));
    expect(hints[0].target).toBe('foundation-0');
    expect(hints[hints.length - 1].target).toMatch(/^freecell-/);
  });
});

describe('spider', () => {
  it('ranks a move that completes a suit above everything', () => {
    const t = cols(10);
    // A full run of spades bar the ace, with the ace waiting elsewhere.
    t[0] = pile('KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S');
    t[1] = [card('A', 'spades')];
    const best = points(spiderHints({ stock: [], tableau: t }));
    expect(best.target).toBe('tableau-0');
    expect(best.score).toBe(100);
  });

  it('will not deal onto a board with an empty column', () => {
    const t = cols(10);
    t[0] = [card('K', 'spades')];
    const hints = spiderHints({ stock: [card('2', 'hearts', false)], tableau: t });
    expect(hints.some((h) => h.target === 'stock')).toBe(false);
  });

  it('deals when every column has a card and nothing else is on', () => {
    const t = cols(10).map((_, i) => [card('K', i % 2 ? 'hearts' : 'spades', true, i)]);
    const hints = spiderHints({ stock: [card('2', 'hearts', false)], tableau: t });
    expect(hints.some((h) => h.target === 'stock')).toBe(true);
  });
});

describe('forty thieves', () => {
  it('sends a card up before shuffling the tableau', () => {
    const t = cols(10);
    t[0] = [card('A', 'hearts')];
    t[1] = [card('9', 'spades')];
    t[2] = [card('10', 'spades')];
    const best = points(fortyThievesHints({
      stock: [], waste: [], foundations: Array.from({ length: 8 }, () => [] as Card[]), tableau: t,
    }));
    expect(best.target).toBe('foundation-0');
  });
});

describe('miss milligan', () => {
  it('empties the pocket when it can', () => {
    const t = cols(8);
    t[0] = [card('K', 'spades')];
    const hints = missMilliganHints({
      stock: [], foundations: Array.from({ length: 8 }, () => [] as Card[]),
      tableau: t, pocket: [card('A', 'hearts')], isTabbyCat: false,
    });
    expect(hints[0].cards).toEqual([card('A', 'hearts').id]);
    expect(hints[0].target).toBe('foundation-0');
  });
});

describe('pyramid', () => {
  /** A pyramid with only the bottom row filled, which is all exposed. */
  const bottomRow = (...cards: Card[]): (Card | null)[] => {
    const p: (Card | null)[] = Array(28).fill(null);
    cards.forEach((c, i) => { p[21 + i] = c; });
    return p;
  };

  it('takes a king on its own', () => {
    const best = points(pyramidHints({ stock: [], waste: [], pyramid: bottomRow(card('K', 'spades'), card('2', 'hearts')) }));
    expect(best.cards).toEqual([card('K', 'spades').id]);
  });

  it('pairs two cards that make thirteen', () => {
    const hints = pyramidHints({
      stock: [], waste: [],
      pyramid: bottomRow(card('9', 'spades'), card('4', 'hearts'), card('2', 'clubs')),
    });
    expect(hints[0].cards).toHaveLength(2);
    expect(hints[0].cards).toContain(card('9', 'spades').id);
    expect(hints[0].cards).toContain(card('4', 'hearts').id);
  });

  it('names no destination, because there is nowhere to put a pair', () => {
    const hints = pyramidHints({
      stock: [], waste: [], pyramid: bottomRow(card('9', 'spades'), card('4', 'hearts')),
    });
    expect(hints[0].target).toBe('');
  });

  it('prefers clearing two pyramid cards to spending the waste', () => {
    const hints = pyramidHints({
      stock: [],
      waste: [card('4', 'diamonds')],
      pyramid: bottomRow(card('9', 'spades'), card('4', 'hearts')),
    });
    // Both pairs make thirteen; the one that does not touch the waste wins.
    expect(hints[0].cards).toContain(card('4', 'hearts').id);
    expect(hints[0].cards).not.toContain(card('4', 'diamonds').id);
  });

  it('says nothing when the pyramid is blocked and the stock is out', () => {
    expect(pyramidHints({ stock: [], waste: [], pyramid: bottomRow(card('2', 'spades'), card('3', 'hearts')) })).toEqual([]);
  });
});
