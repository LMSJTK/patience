import { createContext, useContext } from 'react';

/**
 * The move currently being pointed at.
 *
 * Lives in a context of its own rather than being threaded down as props,
 * because a hint has to reach two things at once — the cards to move and the
 * pile to move them to — that sit in different parts of every board. Six
 * boards would each have needed the same two props plumbed through several
 * layers of markup to say the same thing.
 *
 * Its own module, not CardTable's, so that a card can read it without the
 * card and the table importing each other.
 */
export interface ShownHint {
  /** Ids of the cards to pick up. */
  cards: ReadonlySet<string>;
  /** The pile to put them on, named as boards name their drop targets. */
  target: string;
}

export const HintContext = createContext<ShownHint | null>(null);

/** The hint on screen, or null. */
export function useShownHint(): ShownHint | null {
  return useContext(HintContext);
}

/** Whether this card is one the current hint is pointing at. */
export function useIsHinted(cardId: string): boolean {
  return useShownHint()?.cards.has(cardId) ?? false;
}

/**
 * Whether this pile is where the current hint says to play.
 *
 * A hint with no target — Pyramid's, which names two cards to click and no
 * destination — matches nothing rather than everything.
 */
export function useIsHintTarget(pileId: string): boolean {
  const hint = useShownHint();
  return hint !== null && hint.target !== '' && hint.target === pileId;
}
