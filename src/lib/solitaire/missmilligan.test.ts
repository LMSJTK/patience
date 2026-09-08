import { describe, expect, it } from 'vitest';
import { card, pile } from '../../test/factory';
import {
  canMoveToFoundation,
  canMoveToTableau,
  isValidMissMilliganSequence,
} from './missmilligan';

describe('miss milligan tableau', () => {
  it('opens an empty column to kings only under standard rules', () => {
    expect(canMoveToTableau(undefined, card('K', 'spades'))).toBe(true);
    expect(canMoveToTableau(undefined, card('Q', 'spades'))).toBe(false);
  });

  it('opens an empty column to anything once tabby cat is on', () => {
    expect(canMoveToTableau(undefined, card('7', 'hearts'), true)).toBe(true);
    expect(canMoveToTableau(undefined, card('K', 'spades'), true)).toBe(true);
  });

  it('builds down in alternating colours', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'hearts'))).toBe(true);
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'clubs'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('6', 'hearts'))).toBe(false);
  });

  it('applies the same build rule whether or not tabby cat is on', () => {
    // Tabby cat only relaxes empty columns, never the build itself.
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'clubs'), true)).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'hearts'), true)).toBe(true);
  });
});

describe('miss milligan foundation', () => {
  it('starts at the ace and climbs in suit', () => {
    expect(canMoveToFoundation(undefined, card('A', 'spades'))).toBe(true);
    expect(canMoveToFoundation(undefined, card('2', 'spades'))).toBe(false);
    expect(canMoveToFoundation(card('A', 'spades'), card('2', 'spades'))).toBe(true);
    expect(canMoveToFoundation(card('A', 'spades'), card('2', 'clubs'))).toBe(false);
  });
});

describe('isValidMissMilliganSequence', () => {
  it('accepts an alternating descending run', () => {
    expect(isValidMissMilliganSequence(pile('9H', '8S', '7D'))).toBe(true);
  });

  it('accepts a single card', () => {
    expect(isValidMissMilliganSequence(pile('9H'))).toBe(true);
  });

  it('rejects a same-colour neighbour', () => {
    expect(isValidMissMilliganSequence(pile('9H', '8D', '7S'))).toBe(false);
  });

  it('rejects a run that skips a rank', () => {
    expect(isValidMissMilliganSequence(pile('9H', '7S'))).toBe(false);
  });
});
