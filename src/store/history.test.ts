import { describe, expect, it } from 'vitest';
import { Timeline, freshTimeline, played, stepBack, stepForward } from './history';

/** Snapshots are opaque to the timeline, so a string stands in for a board. */
const at = (partial: Partial<Timeline<string>> = {}): Timeline<string> => ({
  ...freshTimeline<string>(),
  ...partial,
});

describe('a fresh game', () => {
  it('has nowhere to go', () => {
    const t = freshTimeline<string>();
    expect(t.history).toEqual([]);
    expect(t.future).toEqual([]);
    expect(t.moves).toBe(0);
    expect(stepBack(t, 'now')).toBeNull();
    expect(stepForward(t, 'now')).toBeNull();
  });
});

describe('played', () => {
  it('remembers where the game was and counts the move', () => {
    const t = played(freshTimeline<string>(), 'a');
    expect(t.history).toEqual(['a']);
    expect(t.moves).toBe(1);
  });

  it('throws away anything that was undone', () => {
    // The game went one way; the road not taken is gone. Keeping it would let
    // a redo drop cards back onto a board they no longer fit.
    const t = played(at({ history: ['a'], future: ['b', 'c'], moves: 3 }), 'd');
    expect(t.future).toEqual([]);
    expect(t.history).toEqual(['a', 'd']);
  });
});

describe('stepping back and forward', () => {
  it('restores the previous state and keeps the one it left', () => {
    const step = stepBack(at({ history: ['a', 'b'], moves: 2 }), 'now');
    expect(step).not.toBeNull();
    expect(step!.restored).toBe('b');
    expect(step!.history).toEqual(['a']);
    expect(step!.future).toEqual(['now']);
  });

  it('walks forward into what was undone', () => {
    const step = stepForward(at({ history: ['a'], future: ['b'], moves: 3 }), 'now');
    expect(step!.restored).toBe('b');
    expect(step!.history).toEqual(['a', 'now']);
    expect(step!.future).toEqual([]);
  });

  it('counts an undo and a redo as moves, the way Microsoft does', () => {
    const back = stepBack(at({ history: ['a'], moves: 5 }), 'now')!;
    expect(back.moves).toBe(6);
    const forward = stepForward(back, 'earlier')!;
    expect(forward.moves).toBe(7);
  });

  it('never lets the move count fall', () => {
    // The old counter was the length of the history, so undoing lowered it.
    let t: Timeline<string> = freshTimeline();
    const counts: number[] = [];
    t = played(t, 'a');
    counts.push(t.moves);
    t = played(t, 'b');
    counts.push(t.moves);
    t = { ...stepBack(t, 'c')! };
    counts.push(t.moves);
    t = { ...stepBack(t, 'b')! };
    counts.push(t.moves);
    t = played(t, 'a');
    counts.push(t.moves);
    expect(counts).toEqual([1, 2, 3, 4, 5]);
  });

  it('takes a game back and forward through the same states', () => {
    let t: Timeline<string> = freshTimeline();
    let board = 'deal';
    for (const move of ['one', 'two', 'three']) {
      t = played(t, board);
      board = move;
    }
    expect(board).toBe('three');

    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const step = stepBack(t, board)!;
      board = step.restored;
      t = step;
      seen.push(board);
    }
    expect(seen).toEqual(['two', 'one', 'deal']);
    expect(stepBack(t, board)).toBeNull();

    const again: string[] = [];
    for (let i = 0; i < 3; i++) {
      const step = stepForward(t, board)!;
      board = step.restored;
      t = step;
      again.push(board);
    }
    expect(again).toEqual(['one', 'two', 'three']);
    expect(stepForward(t, board)).toBeNull();
  });
});
