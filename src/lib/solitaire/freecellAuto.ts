import { Card } from '../cards';
import { canMoveToFoundation, canMoveToTableau } from './freecell';

/**
 * Finishing a FreeCell game that has already been won in all but name.
 *
 * The condition differs from Klondike's. Every card is face up from the deal,
 * so there is nothing to reveal and no stock to turn over — what stands
 * between a solved-looking board and a solved one is only whether the cards
 * happen to be stacked in an order the foundations will accept.
 *
 * Foundation-only play is not enough on its own, for the same reason it is not
 * in Klondike: a two sitting on its own ace buries the card that has to go up
 * first. So the routine also moves a single blocking card out of the way, to
 * another column or to a free cell, but only when doing so immediately frees a
 * card the foundations want. That keeps every move forced, which is what makes
 * the simulation below trustworthy.
 */

export interface AutoPlayState {
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
}

export type AutoMove =
  | { kind: 'toFoundation'; from: { type: 'freecell' | 'tableau'; index: number }; foundation: number }
  | { kind: 'unblock'; from: number; to: { type: 'freecell' | 'tableau'; index: number } };

const top = (pile: Card[]): Card | undefined => pile[pile.length - 1];

/** Where this card could go up, or -1. */
function foundationFor(state: AutoPlayState, card: Card): number {
  for (let i = 0; i < state.foundations.length; i++) {
    if (canMoveToFoundation(top(state.foundations[i]), card)) return i;
  }
  return -1;
}

/** Every card still to be played. */
export function cardsRemaining(state: AutoPlayState): number {
  const onFoundations = state.foundations.reduce((n, col) => n + col.length, 0);
  return 52 - onFoundations;
}

/**
 * The next move to make, or null when there is nothing useful left to do.
 *
 * Order matters: play upward whenever possible, and only unblock when nothing
 * can. Anything else risks shuffling cards around forever.
 */
export function nextAutoMove(state: AutoPlayState): AutoMove | null {
  // 1. Anything that can go up, goes up. Free cells first, so they empty out
  //    and stay available for the unblocking below.
  for (let i = 0; i < state.freeCells.length; i++) {
    const card = state.freeCells[i];
    if (!card) continue;
    const f = foundationFor(state, card);
    if (f !== -1) return { kind: 'toFoundation', from: { type: 'freecell', index: i }, foundation: f };
  }
  for (let i = 0; i < state.tableau.length; i++) {
    const card = top(state.tableau[i]);
    if (!card) continue;
    const f = foundationFor(state, card);
    if (f !== -1) return { kind: 'toFoundation', from: { type: 'tableau', index: i }, foundation: f };
  }

  // 2. Move a card off a column only when it frees one the foundations want.
  //    A column is preferred over a free cell: cells are the scarce resource,
  //    and a card parked in one has to come out again later.
  for (let from = 0; from < state.tableau.length; from++) {
    const col = state.tableau[from];
    if (col.length < 2) continue;
    const moving = col[col.length - 1];
    const beneath = col[col.length - 2];
    if (foundationFor(state, beneath) === -1) continue;

    for (let to = 0; to < state.tableau.length; to++) {
      if (to === from) continue;
      if (canMoveToTableau(top(state.tableau[to]), moving)) {
        return { kind: 'unblock', from, to: { type: 'tableau', index: to } };
      }
    }
    const cell = state.freeCells.indexOf(null);
    if (cell !== -1) {
      return { kind: 'unblock', from, to: { type: 'freecell', index: cell } };
    }
  }

  return null;
}

/** Apply a move, returning fresh arrays so the caller's state is untouched. */
export function applyAutoMove(state: AutoPlayState, move: AutoMove): AutoPlayState {
  const next: AutoPlayState = {
    freeCells: [...state.freeCells],
    foundations: state.foundations.map((col) => [...col]),
    tableau: state.tableau.map((col) => [...col]),
  };

  const lift = (place: { type: 'freecell' | 'tableau'; index: number }): Card | undefined => {
    if (place.type === 'freecell') {
      const card = next.freeCells[place.index] ?? undefined;
      next.freeCells[place.index] = null;
      return card;
    }
    return next.tableau[place.index].pop();
  };

  if (move.kind === 'toFoundation') {
    const card = lift(move.from);
    if (card) next.foundations[move.foundation].push(card);
    return next;
  }

  const card = lift({ type: 'tableau', index: move.from });
  if (!card) return next;
  if (move.to.type === 'freecell') next.freeCells[move.to.index] = card;
  else next.tableau[move.to.index].push(card);
  return next;
}

/**
 * Whether running the routine to exhaustion actually empties the board.
 *
 * Simulated in full rather than guessed at, so the button is only ever offered
 * when pressing it finishes the game. Every unblock exposes a card that goes
 * up on the very next step, so the foundations grow at least every other move
 * and the loop cannot run away; the step cap is a backstop, not the mechanism.
 *
 * The search is greedy: it takes the first unblocking move it finds rather
 * than trying alternatives. A board that only a cleverer order could finish is
 * therefore reported as unfinishable, which is the right way to be wrong — the
 * button stays hidden and the player keeps playing.
 */
export function willAutoCompleteClear(state: AutoPlayState): boolean {
  let current = state;

  for (let step = 0; step < 200; step++) {
    if (cardsRemaining(current) === 0) return true;
    const move = nextAutoMove(current);
    if (!move) return false;
    current = applyAutoMove(current, move);
  }

  return false;
}
