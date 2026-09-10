import { beforeEach, describe, expect, it } from 'vitest';
import { describeGap, formatTime, useSessionStore } from './useSessionStore';

describe('formatTime', () => {
  it('reads as a game clock', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(9)).toBe('00:09');
    expect(formatTime(75)).toBe('01:15');
    expect(formatTime(600)).toBe('10:00');
  });

  it('keeps counting past an hour rather than wrapping', () => {
    // A game left open all afternoon should not report four minutes.
    expect(formatTime(3725)).toBe('62:05');
  });
});

describe('describeGap', () => {
  it('says seconds in words, because a gap is a length not a clock time', () => {
    expect(describeGap(9)).toBe('9 seconds');
    expect(describeGap(59)).toBe('59 seconds');
  });

  it('does not say "1 seconds"', () => {
    expect(describeGap(1)).toBe('1 second');
  });

  it('switches to minutes once there are some', () => {
    expect(describeGap(60)).toBe('1m');
    expect(describeGap(124)).toBe('2m 04s');
  });
});

describe('the session', () => {
  beforeEach(() => {
    useSessionStore.getState().startNewGame();
  });

  it('starts with a clock at zero and no result', () => {
    expect(useSessionStore.getState().seconds).toBe(0);
    expect(useSessionStore.getState().result).toBeNull();
  });

  it('keeps the result of the game just won', () => {
    useSessionStore.getState().recordWin({ seconds: 84, moves: 130, previousBest: 99 });
    expect(useSessionStore.getState().result).toEqual({
      seconds: 84,
      moves: 130,
      previousBest: 99,
    });
  });

  it('forgets the last result when a new game is dealt', () => {
    // Otherwise the panel could flash last game's numbers over this one.
    useSessionStore.getState().setSeconds(40);
    useSessionStore.getState().recordWin({ seconds: 40, moves: 12, previousBest: null });
    useSessionStore.getState().startNewGame();
    expect(useSessionStore.getState().result).toBeNull();
    expect(useSessionStore.getState().seconds).toBe(0);
  });
});
