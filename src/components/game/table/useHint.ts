import { useCallback, useEffect, useRef, useState } from 'react';
import { Hint } from '../../../lib/solitaire/hints';
import { ShownHint } from './hintContext';

/**
 * Asking the game what to play, and being told when there is nothing.
 *
 * The store does the thinking; this decides what to do with the answer. Two
 * things, really: show the best move for a couple of seconds, and cycle to the
 * next one if the player asks again — the first suggestion is not always the
 * one they wanted, and a hint button that gives the same answer forever is a
 * hint button people stop pressing.
 */

/** The bits of a store this needs. Every game store has them. */
export interface Hintable {
  hints: () => Hint[];
}

export interface HintableStore<S> {
  getState: () => S;
}

/** How long a suggestion stays on screen. Long enough to look, not to nag. */
const SHOWN_MS = 2600;

export interface Hints {
  /** The move being pointed at, for the table to pass down. */
  shown: ShownHint | null;
  /** Show the next suggestion. */
  next: () => void;
  /** True when the game cannot go on: no moves, and not a win. */
  stuck: boolean;
}

/**
 * @param store the game's zustand store
 * @param moves the move count, so a played move clears the last suggestion
 * @param isWon a finished game is not a stuck one
 */
export function useHint<S extends Hintable>(
  store: HintableStore<S>,
  moves: number,
  isWon: boolean
): Hints {
  const [shown, setShown] = useState<ShownHint | null>(null);
  const [stuck, setStuck] = useState(false);
  const cycle = useRef(0);
  const clear = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(clear.current), []);

  // A suggestion is about the board as it was. Once anything moves it is at
  // best stale and at worst pointing at a card that is no longer there.
  useEffect(() => {
    window.clearTimeout(clear.current);
    setShown(null);
    cycle.current = 0;
  }, [moves]);

  // Whether the game is over is worth knowing without being asked. Checked
  // after a move rather than on every render, and never at the deal: a board
  // nobody has touched always has something to do, and an empty board — the
  // moment before the cards arrive — would otherwise look dead.
  useEffect(() => {
    if (isWon || moves === 0) {
      setStuck(false);
      return;
    }
    setStuck(store.getState().hints().length === 0);
  }, [moves, isWon, store]);

  const next = useCallback(() => {
    const hints = store.getState().hints();
    if (hints.length === 0) {
      setStuck(true);
      return;
    }
    const hint = hints[cycle.current % hints.length];
    cycle.current += 1;

    window.clearTimeout(clear.current);
    setShown({ cards: new Set(hint.cards), target: hint.target });
    clear.current = window.setTimeout(() => setShown(null), SHOWN_MS);
  }, [store]);

  return { shown, next, stuck };
}
