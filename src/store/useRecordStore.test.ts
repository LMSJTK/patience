import { beforeEach, describe, expect, it } from 'vitest';
import { emptyRecord, totalOf, useRecordStore, winRate } from './useRecordStore';

const reset = () => useRecordStore.setState({ records: {}, inProgress: null });
const store = () => useRecordStore.getState();
const record = () => store().get('klondike', 'easy');

/** Start a game and win it. */
const playAndWin = (seconds = 60, moves = 100) => {
  store().start('klondike', 'easy');
  store().win('klondike', 'easy', { seconds, moves });
};

describe('playing', () => {
  beforeEach(reset);

  it('counts a game from its first move', () => {
    expect(record().played).toBe(0);
    store().start('klondike', 'easy');
    expect(record().played).toBe(1);
  });

  it('counts a win', () => {
    playAndWin();
    expect(record()).toMatchObject({ played: 1, won: 1 });
  });

  it('files a difficulty separately, so a draw-three win is not a draw-one one', () => {
    store().start('klondike', 'hard');
    expect(store().get('klondike', 'hard').played).toBe(1);
    expect(store().get('klondike', 'easy').played).toBe(0);
  });

  it('will not record a win for a game that was never started', () => {
    store().win('klondike', 'easy', { seconds: 30, moves: 40 });
    expect(record().won).toBe(0);
  });

  it('records a win once, however many times it is reported', () => {
    // The win screen renders more than once; the record should not care.
    playAndWin();
    store().win('klondike', 'easy', { seconds: 60, moves: 100 });
    expect(record().won).toBe(1);
  });
});

describe('records', () => {
  beforeEach(reset);

  it('keeps the best time and the fewest moves, which need not be the same game', () => {
    playAndWin(120, 80);
    playAndWin(90, 150);
    expect(record().bestTime).toBe(90);
    expect(record().fewestMoves).toBe(80);
  });

  it('does not take a time of zero as a record nothing could beat', () => {
    playAndWin(0, 40);
    expect(record().bestTime).toBeNull();
    expect(record().fewestMoves).toBe(40);
  });
});

describe('streaks', () => {
  beforeEach(reset);

  it('builds while games are won', () => {
    playAndWin();
    playAndWin();
    playAndWin();
    expect(record()).toMatchObject({ currentStreak: 3, bestStreak: 3 });
  });

  it('ends when a game is given up on', () => {
    playAndWin();
    playAndWin();
    // Start one, then start another without finishing it.
    store().start('klondike', 'easy');
    store().start('klondike', 'easy');
    expect(record().currentStreak).toBe(0);
    expect(record().bestStreak).toBe(2);
  });

  it('remembers the best one after it ends', () => {
    playAndWin();
    playAndWin();
    playAndWin();
    store().start('klondike', 'easy');
    store().start('klondike', 'easy');
    playAndWin();
    expect(record()).toMatchObject({ currentStreak: 1, bestStreak: 3 });
  });

  it('counts an abandoned game as played', () => {
    store().start('klondike', 'easy');
    store().start('klondike', 'easy');
    expect(record().played).toBe(2);
    expect(record().won).toBe(0);
  });
});

describe('winRate', () => {
  it('is nothing when nothing has been played', () => {
    expect(winRate(emptyRecord())).toBeNull();
  });

  it('rounds to a whole percent', () => {
    expect(winRate({ ...emptyRecord(), played: 3, won: 1 })).toBe(33);
    expect(winRate({ ...emptyRecord(), played: 4, won: 1 })).toBe(25);
  });
});

describe('totalOf', () => {
  beforeEach(reset);

  it('adds up games and wins across every game and tier', () => {
    playAndWin(100, 60);
    store().start('spider', 'hard');
    store().win('spider', 'hard', { seconds: 400, moves: 300 });
    store().start('freecell', 'medium');

    const total = totalOf(store().records);
    expect(total.played).toBe(3);
    expect(total.won).toBe(2);
    expect(winRate(total)).toBe(67);
  });

  it('takes the best time and fewest moves rather than adding them up', () => {
    playAndWin(100, 60);
    store().start('spider', 'hard');
    store().win('spider', 'hard', { seconds: 40, moves: 300 });
    const total = totalOf(store().records);
    expect(total.bestTime).toBe(40);
    expect(total.fewestMoves).toBe(60);
  });

  it('has nothing to show for an empty record', () => {
    expect(totalOf({})).toEqual(emptyRecord());
  });
});
