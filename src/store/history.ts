/**
 * Undo, redo and the move count, for stores that remember whole states.
 *
 * Every game keeps its history the same way — a stack of snapshots of the
 * whole board — so the stepping back and forward is the same in all six, and
 * the rules about what a new move does to a redo stack are easy to get subtly
 * wrong in one place out of six. It is written once here instead.
 *
 * Snapshots are opaque: this knows nothing about cards, only that a game can
 * be photographed and put back.
 */

export interface Timeline<S> {
  /** Where the game has been, oldest first. The last entry is one step back. */
  history: S[];
  /** Steps that were undone, and can be walked forward into again. */
  future: S[];
  /**
   * Moves played. Undo and redo each count as one, and it never goes down —
   * which is what everyone who has played Microsoft's version expects, and is
   * why this is not simply the length of the history.
   */
  moves: number;
}

/** A game that has not been played yet. */
export function freshTimeline<S>(): Timeline<S> {
  return { history: [], future: [], moves: 0 };
}

/**
 * Record a move. Merge the result into whatever else the move changed.
 *
 * Playing on abandons anything that was undone: the game went one way, and
 * the road not taken is gone. Keeping it would let a redo drop cards back
 * onto a board they no longer fit.
 */
export function played<S>(timeline: Timeline<S>, snapshot: S): Timeline<S> {
  return {
    history: [...timeline.history, snapshot],
    future: [],
    moves: timeline.moves + 1,
  };
}

/** A step taken, and the timeline it leaves behind. */
export interface Step<S> extends Timeline<S> {
  /** The state to restore. */
  restored: S;
}

/** One step back, or null when the game is already at the deal. */
export function stepBack<S>(timeline: Timeline<S>, current: S): Step<S> | null {
  if (timeline.history.length === 0) return null;
  const history = [...timeline.history];
  const restored = history.pop()!;
  return {
    restored,
    history,
    future: [...timeline.future, current],
    moves: timeline.moves + 1,
  };
}

/** One step forward again, or null when nothing has been undone. */
export function stepForward<S>(timeline: Timeline<S>, current: S): Step<S> | null {
  if (timeline.future.length === 0) return null;
  const future = [...timeline.future];
  const restored = future.pop()!;
  return {
    restored,
    history: [...timeline.history, current],
    future,
    moves: timeline.moves + 1,
  };
}
