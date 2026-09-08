import { describe, expect, it } from 'vitest';
import { card } from '../../test/factory';
import { canMoveToFoundation, canMoveToTableau } from './klondike';

describe('klondike tableau', () => {
  it('opens an empty column to kings only', () => {
    expect(canMoveToTableau(undefined, card('K', 'spades'))).toBe(true);
    expect(canMoveToTableau(undefined, card('Q', 'spades'))).toBe(false);
    expect(canMoveToTableau(undefined, card('A', 'hearts'))).toBe(false);
  });

  it('builds down in alternating colours', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'hearts'))).toBe(true);
    expect(canMoveToTableau(card('8', 'hearts'), card('7', 'clubs'))).toBe(true);
  });

  it('refuses a same-colour build', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('7', 'clubs'))).toBe(false);
    expect(canMoveToTableau(card('8', 'hearts'), card('7', 'diamonds'))).toBe(false);
  });

  it('refuses anything that is not exactly one lower', () => {
    expect(canMoveToTableau(card('8', 'spades'), card('6', 'hearts'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('9', 'hearts'))).toBe(false);
    expect(canMoveToTableau(card('8', 'spades'), card('8', 'hearts'))).toBe(false);
  });
});

describe('klondike foundation', () => {
  it('opens an empty foundation to aces only', () => {
    expect(canMoveToFoundation(undefined, card('A', 'hearts'))).toBe(true);
    expect(canMoveToFoundation(undefined, card('2', 'hearts'))).toBe(false);
    expect(canMoveToFoundation(undefined, card('K', 'hearts'))).toBe(false);
  });

  it('builds up in a single suit', () => {
    expect(canMoveToFoundation(card('A', 'hearts'), card('2', 'hearts'))).toBe(true);
    expect(canMoveToFoundation(card('Q', 'spades'), card('K', 'spades'))).toBe(true);
  });

  it('refuses a different suit, even at the right rank', () => {
    expect(canMoveToFoundation(card('A', 'hearts'), card('2', 'diamonds'))).toBe(false);
    expect(canMoveToFoundation(card('A', 'hearts'), card('2', 'spades'))).toBe(false);
  });

  it('refuses a gap or a step backwards', () => {
    expect(canMoveToFoundation(card('A', 'hearts'), card('3', 'hearts'))).toBe(false);
    expect(canMoveToFoundation(card('5', 'hearts'), card('4', 'hearts'))).toBe(false);
  });
});
