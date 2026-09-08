import { Card } from '../cards';
import { canMoveToFoundation, canMoveToTableau } from './klondike';

/**
 * Finishing a Klondike game that has already been won in all but name.
 *
 * Once no card is face down, everything left is reachable — the stock recycles
 * without limit — so the remaining moves are bookkeeping. This works out
 * whether that bookkeeping actually completes, and what the next move is.
 *
 * Foundation-only play is not enough on its own. A column holding the ace of
 * spades under the two of spades can never be unpicked by foundation moves:
 * the two cannot go up before the ace, and the ace is buried beneath it. So
 * the routine also makes the one kind of tableau move that helps — one that
 * immediately frees a card the foundations want.
 */

export interface AutoPlayState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

export type AutoMove =
  | { kind: 'toFoundation'; from: 'waste' | number; foundation: number }
  | { kind: 'unblock'; from: number; to: number }
  | { kind: 'draw' };

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

/** No card is face down, so nothing is hidden from the player or from us. */
export function isFullyRevealed(state: AutoPlayState): boolean {
  return !state.tableau.some((col) => col.some((card) => !card.isFaceUp));
}

/**
 * The next move to make, or null when there is nothing useful left to do.
 *
 * Order matters: play upward whenever possible, then unblock, then turn the
 * stock over. Anything else risks shuffling cards around forever.
 */
export function nextAutoMove(state: AutoPlayState): AutoMove | null {
  // 1. Anything that can go up, goes up.
  const wasteCard = top(state.waste);
  if (wasteCard) {
    const f = foundationFor(state, wasteCard);
    if (f !== -1) return { kind: 'toFoundation', from: 'waste', foundation: f };
  }
  for (let i = 0; i < state.tableau.length; i++) {
    const card = top(state.tableau[i]);
    if (!card) continue;
    const f = foundationFor(state, card);
    if (f !== -1) return { kind: 'toFoundation', from: i, foundation: f };
  }

  // 2. Move a card off a column only when it frees one the foundations want.
  for (let from = 0; from < state.tableau.length; from++) {
    const col = state.tableau[from];
    if (col.length < 2) continue;
    const moving = col[col.length - 1];
    const beneath = col[col.length - 2];
    if (foundationFor(state, beneath) === -1) continue;

    for (let to = 0; to < state.tableau.length; to++) {
      if (to === from) continue;
      if (canMoveToTableau(top(state.tableau[to]), moving)) {
        return { kind: 'unblock', from, to };
      }
    }
  }

  // 3. Turn the stock over to bring the rest within reach.
  if (state.stock.length > 0 || state.waste.length > 0) return { kind: 'draw' };

  return null;
}

/** Apply a move, returning fresh arrays so the caller's state is untouched. */
export function applyAutoMove(state: AutoPlayState, move: AutoMove, drawCount = 1): AutoPlayState {
  const next: AutoPlayState = {
    stock: [...state.stock],
    waste: [...state.waste],
    foundations: state.foundations.map((col) => [...col]),
    tableau: state.tableau.map((col) => [...col]),
  };

  if (move.kind === 'toFoundation') {
    const card = move.from === 'waste' ? next.waste.pop() : next.tableau[move.from].pop();
    if (card) next.foundations[move.foundation].push(card);
    return next;
  }

  if (move.kind === 'unblock') {
    const card = next.tableau[move.from].pop();
    if (card) next.tableau[move.to].push(card);
    return next;
  }

  // draw
  if (next.stock.length === 0) {
    next.stock = [...next.waste].reverse().map((c) => ({ ...c, isFaceUp: false }));
    next.waste = [];
    return next;
  }
  const amount = Math.min(drawCount, next.stock.length);
  const drawn = next.stock.slice(-amount).reverse().map((c) => ({ ...c, isFaceUp: true }));
  next.stock = next.stock.slice(0, -amount);
  next.waste = [...next.waste, ...drawn];
  return next;
}

/**
 * Whether running the routine to exhaustion actually empties the board.
 *
 * Simulated in full rather than guessed at, so the button is only ever offered
 * when pressing it finishes the game. Turning the stock over makes no progress
 * by itself, so a run of draws longer than the pile is treated as going round
 * in circles.
 */
export function willAutoCompleteClear(state: AutoPlayState, drawCount = 1): boolean {
  if (!isFullyRevealed(state)) return false;

  let current = state;
  let fruitlessDraws = 0;

  // Every card can need at most one move up plus one unblock, and turning the
  // stock over between them; this is far above what any real game needs.
  for (let step = 0; step < 2000; step++) {
    if (cardsRemaining(current) === 0) return true;

    const move = nextAutoMove(current);
    if (!move) return false;

    if (move.kind === 'draw') {
      fruitlessDraws++;
      // One pass through the whole pile without a single card going up means
      // nothing new will come within reach.
      if (fruitlessDraws > current.stock.length + current.waste.length + 1) return false;
    } else {
      fruitlessDraws = 0;
    }

    current = applyAutoMove(current, move, drawCount);
  }

  return false;
}
