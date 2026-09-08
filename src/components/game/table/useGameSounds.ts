import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../../../lib/cards';
import { SOUND_DELAYS_MS, SoundableState, soundsForTransition } from '../../../lib/gameSounds';
import { DEAL_TOTAL_MS, dealStepMs, playDealSequence, playSound } from '../../../lib/sound';

/** The bits of a zustand store this hook needs. Every game store has them. */
export interface SoundableStore<S extends SoundableState> {
  getState: () => S;
  subscribe: (listener: (state: S, prev: S) => void) => () => void;
}

export interface GameSounds<F> {
  /** The drop handler, wrapped so a refused move is answered. */
  onDrop: F;
  /**
   * How long this card should wait before appearing, in seconds, or undefined
   * when no hand is going out. Cards only animate in during a deal; a card
   * arriving because it was played should not drop in from nowhere.
   */
  dealDelayOf: (cardId: string) => number | undefined;
}

/**
 * The order cards go out in: across the columns, then down.
 *
 * That is how Klondike is actually dealt — one card to each column, then
 * another to all but the first — and it reads as dealing for the other games
 * too, which simply place their rows in turn.
 */
function dealOrder(state: SoundableState): Map<string, number> {
  const order = new Map<string, number>();

  // Pyramid has no columns; its cards go out in pyramid order, which is
  // already the order they should appear in.
  if (!state.tableau) {
    let i = 0;
    for (const card of state.pyramid ?? []) if (card) order.set(card.id, i++);
    return order;
  }

  const tableau = state.tableau;
  const deepest = tableau.reduce((n, col) => Math.max(n, col.length), 0);
  let n = 0;
  for (let row = 0; row < deepest; row++) {
    for (let col = 0; col < tableau.length; col++) {
      const card = tableau[col][row];
      if (card) order.set(card.id, n++);
    }
  }
  return order;
}

/**
 * Give a game its sounds, and the timing for its dealing animation.
 *
 * Both are derived from state changes rather than fired by the stores, so the
 * games stay free of presentation and one set of rules covers all six. The
 * exception is a refused move, which by definition changes nothing: for that,
 * pass the store's drop handler and use the wrapped one returned here.
 *
 *   const { onDrop, dealDelayOf } = useGameSounds(useKlondikeStore, handleDrop);
 */
export function useGameSounds<S extends SoundableState, F extends (...args: never[]) => void>(
  store: SoundableStore<S>,
  onDrop?: F
): GameSounds<F> {
  const timers = useRef<number[]>([]);
  const [deal, setDeal] = useState<{ order: Map<string, number>; startedAt: number } | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((next, prev) => {
      const plan = soundsForTransition(prev, next);

      if (plan.dealCount) {
        playDealSequence(plan.dealCount);
        // Hold the order only while the hand is going out. Once it clears,
        // cards that mount because they were played animate normally.
        setDeal({ order: dealOrder(next), startedAt: performance.now() });
        timers.current.push(window.setTimeout(() => setDeal(null), DEAL_TOTAL_MS + 500));
      }

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

  const dealDelayOf = useCallback(
    (cardId: string): number | undefined => {
      if (!deal) return undefined;
      const index = deal.order.get(cardId);
      if (index === undefined) return undefined;

      // Spread over the same window the sound uses, so the two line up
      // whether the hand is 28 cards or 54.
      const due = index * dealStepMs(deal.order.size);
      const remaining = due - (performance.now() - deal.startedAt);

      // A card whose turn has already passed is on the table. If it mounts
      // again it is because it was played, and it should simply be there
      // rather than dropping in a second time.
      return remaining > 0 ? remaining / 1000 : undefined;
    },
    [deal]
  );

  // A drop the game refuses leaves the state untouched, so nothing downstream
  // can notice it. Comparing the move count either side of the call can.
  const wrapped = useCallback(
    ((...args: never[]) => {
      if (!onDrop) return;
      const before = store.getState().history.length;
      onDrop(...args);
      if (store.getState().history.length === before) playSound('invalid');
    }) as F,
    [store, onDrop]
  );

  return { onDrop: wrapped, dealDelayOf };
}
