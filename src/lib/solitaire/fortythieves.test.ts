import { describe, expect, it } from 'vitest';
import { card, pile } from '../../test/factory';
import {
  canMoveToFoundation,
  canMoveToTableau,
  getMaxMoveCount,
  isValidFortyThievesSequence,
} from './fortythieves';

describe('forty thieves tableau', () => {
  it('takes any card on an empty column', () => {
    expect(canMoveToTableau(undefined, card('7', 'hearts'))).toBe(true);
    expect(canMoveToTableau(undefined, card('K', 'spades'))).toBe(true);
  });

  it('builds down within one suit, which is what makes it hard', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'spades'))).toBe(true);
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'clubs'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'hearts'))).toBe(false);
  });

  it('refuses a wrong rank in the right suit', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('6', 'spades'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('9', 'spades'))).toBe(false);
  });
});

describe('forty thieves foundation', () => {
  it('starts at the ace and climbs in suit', () => {
    expect(canMoveToFoundation(undefined, card('A', 'diamonds'))).toBe(true);
    expect(canMoveToFoundation(undefined, card('K', 'diamonds'))).toBe(false);
    expect(canMoveToFoundation(card('A', 'diamonds'), card('2', 'diamonds'))).toBe(true);
    expect(canMoveToFoundation(card('A', 'diamonds'), card('2', 'hearts'))).toBe(false);
  });
});

describe('isValidFortyThievesSequence', () => {
  it('accepts a same-suit descending run', () => {
    expect(isValidFortyThievesSequence(pile('9C', '8C', '7C'))).toBe(true);
  });

  it('accepts a single card', () => {
    expect(isValidFortyThievesSequence(pile('9C'))).toBe(true);
  });

  it('rejects a mixed-suit run', () => {
    expect(isValidFortyThievesSequence(pile('9C', '8S', '7C'))).toBe(false);
  });

  it('rejects a run that skips a rank', () => {
    expect(isValidFortyThievesSequence(pile('9C', '7C'))).toBe(false);
  });
});

describe('getMaxMoveCount', () => {
  it('moves one card with no empty columns', () => {
    expect(getMaxMoveCount(0, false)).toBe(1);
  });

  it('adds one card per empty column used as scratch space', () => {
    expect(getMaxMoveCount(1, false)).toBe(2);
    expect(getMaxMoveCount(3, false)).toBe(4);
  });

  it('does not count the destination when moving into an empty column', () => {
    expect(getMaxMoveCount(1, true)).toBe(1);
    expect(getMaxMoveCount(3, true)).toBe(3);
  });
});
