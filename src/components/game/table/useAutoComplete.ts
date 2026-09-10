import { useEffect, useState } from 'react';

/**
 * Playing out a game that is already decided.
 *
 * Two games offer this so far and the rest will, so the timer that drives it
 * and the rules about when it stops live here rather than in each board. A
 * game joins in by giving its store the two methods below; the hard part —
 * knowing whether the routine will actually clear the board — stays with the
 * store, because only it knows the rules.
 */

/** The bit of a zustand store this hook needs. */
export interface AutoCompletableStore<S> {
  getState: () => S;
}

export interface AutoCompletable {
  /** True when pressing Finish would actually finish the game. */
  canAutoComplete: () => boolean;
  /** Play one forced move. False when there is nothing left to do. */
  autoCompleteStep: () => boolean;
}

/**
 * One move every this many milliseconds.
 *
 * Slower than the move animation on purpose. The run-out is the reward for
 * winning, so it should be watchable rather than over in a blink.
 */
const STEP_MS = 130;

export interface AutoComplete {
  /** Whether it is running right now. */
  finishing: boolean;
  start: () => void;
}

/**
 * @param store the game's zustand store
 * @param seed the deal currently on the table. A new deal cancels a run that
 *   is still going — the store's own seed rather than the one in the URL,
 *   because that one does not change when a player deals a fresh random hand.
 */
export function useAutoComplete<S extends AutoCompletable>(
  store: AutoCompletableStore<S>,
  seed: number
): AutoComplete {
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!finishing) return;
    const id = window.setInterval(() => {
      if (!store.getState().autoCompleteStep()) setFinishing(false);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [finishing, store]);

  useEffect(() => {
    setFinishing(false);
  }, [seed]);

  return { finishing, start: () => setFinishing(true) };
}
