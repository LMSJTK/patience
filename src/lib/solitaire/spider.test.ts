import { describe, expect, it } from 'vitest';
import { Card } from '../cards';
import { card, pile } from '../../test/factory';
import { canMoveToTableau, checkForCompletedSequence, isValidSpiderSequence } from './spider';

/** A full king-to-ace run in one suit, which is what Spider clears. */
function fullSuit(suit: 'spades' | 'hearts', faceUp = true): Card[] {
  const ranks = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'] as const;
  return ranks.map((r) => card(r, suit, faceUp));
}

describe('spider tableau', () => {
  it('takes any card on an empty column', () => {
    expect(canMoveToTableau(undefined, card('7', 'hearts'))).toBe(true);
    expect(canMoveToTableau(undefined, card('K', 'spades'))).toBe(true);
  });

  it('builds down ignoring suit, which is what separates it from klondike', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'spades'))).toBe(true);
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'hearts'))).toBe(true);
  });

  it('still refuses a wrong rank', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('6', 'spades'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('9', 'spades'))).toBe(false);
  });
});

describe('isValidSpiderSequence', () => {
  it('accepts a same-suit descending run', () => {
    expect(isValidSpiderSequence(pile('9S', '8S', '7S'))).toBe(true);
  });

  it('accepts a single card', () => {
    expect(isValidSpiderSequence(pile('9S'))).toBe(true);
  });

  it('rejects a mixed-suit run, even though it could be built that way', () => {
    // Landing a mixed run is legal; picking one up as a unit is not.
    expect(isValidSpiderSequence(pile('9S', '8H', '7S'))).toBe(false);
  });

  it('rejects a run that skips a rank', () => {
    expect(isValidSpiderSequence(pile('9S', '7S'))).toBe(false);
  });
});

describe('checkForCompletedSequence', () => {
  it('spots a full king-to-ace suit at the foot of a column', () => {
    expect(checkForCompletedSequence(fullSuit('spades'))).toBe(true);
  });

  it('spots one sitting on top of unrelated cards', () => {
    const column = [...pile('3H', '9C'), ...fullSuit('spades')];
    expect(checkForCompletedSequence(column)).toBe(true);
  });

  it('ignores a column with fewer than thirteen cards', () => {
    expect(checkForCompletedSequence(fullSuit('spades').slice(1))).toBe(false);
    expect(checkForCompletedSequence([])).toBe(false);
  });

  it('refuses a run interrupted by another suit', () => {
    const mixed = fullSuit('spades');
    mixed[5] = card('8', 'hearts');
    expect(checkForCompletedSequence(mixed)).toBe(false);
  });

  it('refuses a run that is still partly face down', () => {
    const hidden = fullSuit('spades');
    hidden[0] = card('K', 'spades', false);
    expect(checkForCompletedSequence(hidden)).toBe(false);
  });

  it('refuses thirteen cards that do not start at a king', () => {
    const column = [card('A', 'spades'), ...fullSuit('spades').slice(0, 12)];
    expect(checkForCompletedSequence(column)).toBe(false);
  });
});
