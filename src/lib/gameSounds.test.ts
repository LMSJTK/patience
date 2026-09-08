import { describe, expect, it } from 'vitest';
import { card } from '../test/factory';
import { SoundableState, soundsForTransition } from './gameSounds';

const base: SoundableState = { history: [], isWon: false };
/** A state with `moves` entries in the history, plus whatever else is given. */
const at = (moves: number, extra: Partial<SoundableState> = {}): SoundableState => ({
  ...base,
  history: new Array(moves).fill(0),
  ...extra,
});

describe('soundsForTransition', () => {
  it('plays nothing when nothing happened', () => {
    expect(soundsForTransition(at(3), at(3)).sounds).toEqual([]);
  });

  it('plays a placement for an ordinary move', () => {
    const prev = at(1, { tableau: [[card('8', 'spades')], [card('7', 'hearts')]] });
    const next = at(2, { tableau: [[card('8', 'spades'), card('7', 'hearts')], []] });
    expect(soundsForTransition(prev, next).sounds).toEqual(['place']);
  });

  it('plays a draw when only the stock and waste moved', () => {
    const tableau = [[card('8', 'spades')]];
    const prev = at(1, { tableau, stock: [card('2', 'hearts', false)], waste: [] });
    const next = at(2, { tableau, stock: [], waste: [card('2', 'hearts')] });
    expect(soundsForTransition(prev, next).sounds).toEqual(['draw']);
  });

  it('plays a placement, not a draw, when a card leaves the waste for the table', () => {
    const prev = at(1, { tableau: [[card('8', 'spades')]], waste: [card('7', 'hearts')] });
    const next = at(2, { tableau: [[card('8', 'spades'), card('7', 'hearts')]], waste: [] });
    expect(soundsForTransition(prev, next).sounds).toEqual(['place']);
  });

  it('adds a flip when the move uncovered a card', () => {
    const prev = at(1, {
      tableau: [[card('K', 'clubs', false), card('7', 'hearts')], [card('8', 'spades')]],
    });
    const next = at(2, {
      tableau: [[card('K', 'clubs', true)], [card('8', 'spades'), card('7', 'hearts')]],
    });
    expect(soundsForTransition(prev, next).sounds).toEqual(['place', 'flip']);
  });

  it('adds a completion when a foundation fills up', () => {
    const full = Array.from({ length: 13 }, () => card('A', 'hearts'));
    const prev = at(1, { foundations: [full.slice(0, 12)] });
    const next = at(2, { foundations: [full] });
    expect(soundsForTransition(prev, next).sounds).toEqual(['place', 'complete']);
  });

  it('adds a completion when Spider clears a suit', () => {
    const prev = at(1, { completedSets: 2, tableau: [[card('K', 'spades')]] });
    const next = at(2, { completedSets: 3, tableau: [[]] });
    expect(soundsForTransition(prev, next).sounds).toContain('complete');
  });

  it('plays undo when the history shrinks', () => {
    expect(soundsForTransition(at(4), at(3)).sounds).toEqual(['undo']);
  });

  it('plays the win over everything else', () => {
    const full = Array.from({ length: 13 }, () => card('A', 'hearts'));
    const prev = at(50, { foundations: [full.slice(0, 12)], isWon: false });
    const next = at(51, { foundations: [full], isWon: true });
    expect(soundsForTransition(prev, next).sounds).toEqual(['win']);
  });

  it('does not replay the win while the board sits won', () => {
    expect(soundsForTransition(at(51, { isWon: true }), at(51, { isWon: true })).sounds).toEqual([]);
  });

  it('reports a deal, with the number of cards that went out', () => {
    const prev = at(30, { tableau: [[card('K', 'clubs')]] });
    const next = at(0, {
      tableau: [[card('2', 'hearts', false), card('3', 'clubs', true)], [card('4', 'spades', true)]],
    });
    const plan = soundsForTransition(prev, next);
    expect(plan.dealCount).toBe(3);
    expect(plan.sounds).toEqual([]);
  });

  it('reports a deal even when the previous game had no moves either', () => {
    // Opening a game twice in a row: the history is 0 both sides, so only the
    // cards themselves say a fresh hand went out.
    const prev = at(0, { tableau: [[card('K', 'clubs')]] });
    const next = at(0, { tableau: [[card('5', 'hearts')], [card('9', 'spades')]] });
    expect(soundsForTransition(prev, next).dealCount).toBe(2);
  });

  it('still plays undo when the move being taken back was the first one', () => {
    const tableau = [[card('K', 'clubs', true)]];
    expect(soundsForTransition(at(1, { tableau }), at(0, { tableau })).sounds).toEqual(['undo']);
  });

  it('treats a re-deal after a single move as a deal, not an undo', () => {
    const prev = at(1, { tableau: [[card('K', 'clubs', true)]] });
    const next = at(0, {
      tableau: [[card('2', 'hearts', false), card('3', 'clubs', false), card('4', 'spades', true)]],
    });
    const plan = soundsForTransition(prev, next);
    expect(plan.sounds).toEqual([]);
    expect(plan.dealCount).toBe(3);
  });

  it('does not mistake rewinding to the start for a fresh deal', () => {
    // Undoing the only move leaves the same cards on the table, just rearranged.
    const tableau = [[card('K', 'clubs', true)], [card('9', 'hearts', true)]];
    const prev = at(1, { tableau });
    const next = at(0, { tableau });
    const plan = soundsForTransition(prev, next);
    expect(plan.sounds).toEqual(['undo']);
    expect(plan.dealCount).toBeUndefined();
  });

  it('copes with a game that has no tableau or foundations, like Pyramid', () => {
    const prev = at(1, { pyramid: [card('5', 'hearts'), null], stock: [card('2', 'clubs', false)] });
    const next = at(2, { pyramid: [null, null], stock: [card('2', 'clubs', false)] });
    expect(soundsForTransition(prev, next).sounds).toEqual(['place']);
  });
});
