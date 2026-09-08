import { describe, expect, it } from 'vitest';
import { card, pile } from '../../test/factory';
import { canMoveToFoundation, canMoveToTableau, getMaxMoveCount, isValidSequence } from './freecell';

describe('freecell tableau', () => {
  it('opens an empty column to any card, unlike klondike', () => {
    expect(canMoveToTableau(undefined, card('K', 'spades'))).toBe(true);
    expect(canMoveToTableau(undefined, card('7', 'hearts'))).toBe(true);
    expect(canMoveToTableau(undefined, card('A', 'clubs'))).toBe(true);
  });

  it('builds down in alternating colours', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'hearts'))).toBe(true);
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'clubs'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('6', 'hearts'))).toBe(false);
  });
});

describe('freecell foundation', () => {
  it('starts at the ace and climbs in suit', () => {
    expect(canMoveToFoundation(undefined, card('A', 'clubs'))).toBe(true);
    expect(canMoveToFoundation(undefined, card('2', 'clubs'))).toBe(false);
    expect(canMoveToFoundation(card('A', 'clubs'), card('2', 'clubs'))).toBe(true);
    expect(canMoveToFoundation(card('A', 'clubs'), card('2', 'spades'))).toBe(false);
  });
});

describe('isValidSequence', () => {
  it('accepts a run that alternates colour and descends', () => {
    expect(isValidSequence(pile('9H', '8S', '7D', '6C'))).toBe(true);
  });

  it('accepts a single card and an empty selection', () => {
    expect(isValidSequence([])).toBe(true);
    expect(isValidSequence(pile('9H'))).toBe(true);
  });

  it('rejects a run where two neighbours share a colour', () => {
    expect(isValidSequence(pile('9H', '8D', '7S'))).toBe(false);
  });

  it('rejects a run that skips a rank', () => {
    expect(isValidSequence(pile('9H', '7S', '6D'))).toBe(false);
  });
});

describe('getMaxMoveCount', () => {
  it('moves one card with nothing free', () => {
    expect(getMaxMoveCount(0, 0, false)).toBe(1);
  });

  it('adds one card per free cell', () => {
    expect(getMaxMoveCount(1, 0, false)).toBe(2);
    expect(getMaxMoveCount(4, 0, false)).toBe(5);
  });

  it('doubles per empty column', () => {
    expect(getMaxMoveCount(0, 1, false)).toBe(2);
    expect(getMaxMoveCount(0, 2, false)).toBe(4);
    expect(getMaxMoveCount(4, 2, false)).toBe(20);
  });

  it('does not count the destination when moving into an empty column', () => {
    // The column you are filling cannot also be used as scratch space.
    expect(getMaxMoveCount(4, 1, true)).toBe(5);
    expect(getMaxMoveCount(4, 2, true)).toBe(10);
  });

  it('never drops below one card when the destination is the only empty column', () => {
    expect(getMaxMoveCount(0, 0, true)).toBe(1);
  });
});
