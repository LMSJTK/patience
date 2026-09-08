import { useCallback, useEffect, useRef } from 'react';
import { SOUND_DELAYS_MS, SoundableState, soundsForTransition } from '../../../lib/gameSounds';
import { playDealSequence, playSound } from '../../../lib/sound';

/** The bits of a zustand store this hook needs. Every game store has them. */
export interface SoundableStore<S extends SoundableState> {
  getState: () => S;
  subscribe: (listener: (state: S, prev: S) => void) => () => void;
}

/**
 * Give a game its sounds.
 *
 * Sounds are derived from state changes rather than fired by the stores, so
 * the games stay free of audio and one set of rules covers all six. The
 * exception is a refused move, which by definition changes nothing: for that,
 * pass the store's drop handler and use the wrapped one it returns.
 *
 *   const onDrop = useGameSounds(useKlondikeStore, handleDrop);
 */
export function useGameSounds<S extends SoundableState, F extends (...args: never[]) => void>(
  store: SoundableStore<S>,
  onDrop?: F
): F {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const unsubscribe = store.subscribe((next, prev) => {
      const plan = soundsForTransition(prev, next);
      if (plan.dealCount) playDealSequence(plan.dealCount);
      for (const name of plan.sounds) {
        const delay = SOUND_DELAYS_MS[name];
        if (delay) {
          // A flip belongs just after the card lands, not on top of it.
          timers.current.push(window.setTimeout(() => playSound(name), delay));
        } else {
          playSound(name);
        }
      }
    });
    return () => {
      unsubscribe();
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [store]);

  // A drop the game refuses leaves the state untouched, so nothing downstream
  // can notice it. Comparing the move count either side of the call can.
  return useCallback(
    ((...args: never[]) => {
      if (!onDrop) return;
      const before = store.getState().history.length;
      onDrop(...args);
      if (store.getState().history.length === before) playSound('invalid');
    }) as F,
    [store, onDrop]
  );
}
