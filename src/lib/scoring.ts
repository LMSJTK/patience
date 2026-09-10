/**
 * Keeping score, the two ways Klondike players expect.
 *
 * Only Klondike. Standard and Vegas are conventions of this one game — there
 * is no agreed way to score Spider or Pyramid, and inventing one would be
 * worse than leaving the counter off.
 *
 * The rules are pure functions of what just happened, so the store can call
 * them as moves land without keeping any scoring state beyond the running
 * total.
 */

export type ScoringMode = 'none' | 'standard' | 'vegas';

/** What the board just did, as far as the score is concerned. */
export type ScoreEvent =
  | 'toFoundation'
  | 'wasteToTableau'
  | 'reveal'
  | 'fromFoundation';

/**
 * Vegas is played for money, so the game opens in debt: fifty-two dollars for
 * the deck, five back for every card you get home. Eleven cards clears the
 * buy-in and a full board is worth $208.
 */
export const VEGAS_BUY_IN = -52;

export function startingScore(mode: ScoringMode): number {
  return mode === 'vegas' ? VEGAS_BUY_IN : 0;
}

/** What an event is worth. */
export function scoreFor(mode: ScoringMode, event: ScoreEvent): number {
  if (mode === 'vegas') {
    // Nothing but cards going home counts, and nothing takes money off you
    // that the buy-in has not already taken.
    return event === 'toFoundation' ? 5 : 0;
  }
  if (mode !== 'standard') return 0;

  switch (event) {
    case 'toFoundation':
      return 10;
    case 'wasteToTableau':
      return 5;
    case 'reveal':
      return 5;
    case 'fromFoundation':
      return -15;
  }
}

/**
 * How many times the stock may be turned over.
 *
 * Vegas limits it, which is the whole reason it is harder: one pass on draw
 * three, where every card is reachable, and three on draw one, where two
 * cards in every three are not. Infinity elsewhere, which is what this game
 * has always allowed.
 */
export function stockPasses(mode: ScoringMode, drawCount: 1 | 3): number {
  if (mode !== 'vegas') return Infinity;
  return drawCount === 3 ? 1 : 3;
}

/**
 * The bonus for finishing quickly, added to a standard score at the win.
 *
 * The formula is Microsoft's, and it dominates the move score by design — a
 * two-minute win is worth several thousand and a twenty-minute one a few
 * hundred, which is what makes standard scoring a race. Games under half a
 * minute get nothing, so a board that was already solved cannot be farmed.
 */
export function timeBonus(mode: ScoringMode, seconds: number): number {
  if (mode !== 'standard' || seconds < 30) return 0;
  return Math.floor(700000 / seconds / 10) * 10;
}

/** How a score reads: dollars in Vegas, plain points otherwise. */
export function formatScore(mode: ScoringMode, score: number): string {
  if (mode !== 'vegas') return String(score);
  return score < 0 ? `-$${Math.abs(score)}` : `$${score}`;
}
