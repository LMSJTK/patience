import { describe, expect, it } from 'vitest';
import { RANKS, SUITS, createDeck, getCardColor, getCardValue, shuffleDeck } from './cards';
import { mulberry32 } from './rng';

describe('getCardValue', () => {
  it('ranks ace low and the court cards 11 to 13', () => {
    expect(getCardValue('A')).toBe(1);
    expect(getCardValue('10')).toBe(10);
    expect(getCardValue('J')).toBe(11);
    expect(getCardValue('Q')).toBe(12);
    expect(getCardValue('K')).toBe(13);
  });

  it('gives every rank a distinct value from 1 to 13', () => {
    const values = RANKS.map(getCardValue);
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
});

describe('getCardColor', () => {
  it('reds the hearts and diamonds', () => {
    expect(getCardColor('hearts')).toBe('red');
    expect(getCardColor('diamonds')).toBe('red');
    expect(getCardColor('clubs')).toBe('black');
    expect(getCardColor('spades')).toBe('black');
  });
});

describe('createDeck', () => {
  it('builds 52 distinct cards, 13 of each suit', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    for (const suit of SUITS) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(13);
    }
  });

  it('deals every card face down', () => {
    expect(createDeck().every((c) => !c.isFaceUp)).toBe(true);
  });

  it('keeps ids unique across multiple decks', () => {
    // Miss Milligan and Forty Thieves use two decks.
    const deck = createDeck(2);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((c) => c.id)).size).toBe(104);
  });

  it('keeps ids unique when suits repeat, as one-suit Spider does', () => {
    // Eight spade decks: 104 cards that differ only by which copy they are.
    const deck = createDeck(8, ['spades']);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((c) => c.id)).size).toBe(104);
    expect(deck.every((c) => c.suit === 'spades')).toBe(true);
  });
});

describe('shuffleDeck', () => {
  it('keeps every card and leaves the original alone', () => {
    const deck = createDeck();
    const before = deck.map((c) => c.id);
    const shuffled = shuffleDeck(deck);

    expect(shuffled).toHaveLength(deck.length);
    expect([...shuffled.map((c) => c.id)].sort()).toEqual([...before].sort());
    expect(deck.map((c) => c.id)).toEqual(before);
  });

  it('deals the same order for the same seed', () => {
    const a = shuffleDeck(createDeck(), mulberry32(8675309));
    const b = shuffleDeck(createDeck(), mulberry32(8675309));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('deals a different order for a different seed', () => {
    const a = shuffleDeck(createDeck(), mulberry32(1));
    const b = shuffleDeck(createDeck(), mulberry32(2));
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('actually reorders the deck', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, mulberry32(42));
    expect(shuffled.map((c) => c.id)).not.toEqual(deck.map((c) => c.id));
  });
});
