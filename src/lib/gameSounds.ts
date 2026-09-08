import { Card } from './cards';
import { SoundName } from './sound';

/**
 * The parts of a game's state that decide what a move sounds like.
 *
 * Every game keeps a move history and a won flag; the rest varies, so it is
 * all optional and the rules below check before they look.
 */
export interface SoundableState {
  history: unknown[];
  isWon: boolean;
  tableau?: Card[][];
  foundations?: Card[][];
  /** Spider counts finished suits instead of filling foundations. */
  completedSets?: number;
  stock?: Card[];
  waste?: Card[];
  /** Pyramid clears a pyramid rather than building columns. */
  pyramid?: (Card | null)[];
}

/** What a state change should sound like. */
export interface SoundPlan {
  sounds: SoundName[];
  /** Set when a fresh hand was dealt: how many cards went out. */
  dealCount?: number;
}

function faceDownCount(tableau?: Card[][]): number {
  if (!tableau) return 0;
  let n = 0;
  for (const col of tableau) for (const card of col) if (!card.isFaceUp) n++;
  return n;
}

function tableauSize(tableau?: Card[][]): number {
  if (!tableau) return 0;
  let n = 0;
  for (const col of tableau) n += col.length;
  return n;
}

function foundationTotal(foundations?: Card[][]): number {
  if (!foundations) return 0;
  let n = 0;
  for (const col of foundations) n += col.length;
  return n;
}

/** How many foundations hold a complete ace-to-king run. */
function completedFoundations(foundations?: Card[][]): number {
  if (!foundations) return 0;
  return foundations.filter((col) => col.length === 13).length;
}

/**
 * A cheap stand-in for "these are different cards".
 *
 * Comparing the first card on the table and how many cards are in play is
 * enough to tell a fresh hand from the same hand rewound, without walking
 * every card on every state change.
 */
function dealSignature(state: SoundableState): string {
  const first =
    state.tableau?.[0]?.[0]?.id ?? state.pyramid?.[0]?.id ?? state.stock?.[0]?.id ?? '';
  return `${first}:${tableauSize(state.tableau)}:${state.stock?.length ?? 0}`;
}

/** How many cards a fresh hand put on the table. */
function cardsDealt(state: SoundableState): number {
  const pyramid = state.pyramid?.filter((c) => c !== null).length ?? 0;
  return tableauSize(state.tableau) + pyramid;
}

/**
 * What a state change should sound like.
 *
 * Derived from the state rather than fired by the stores, so the games stay
 * free of audio and one set of rules covers all six.
 */
export function soundsForTransition(prev: SoundableState, next: SoundableState): SoundPlan {
  // Winning is the whole story; nothing else needs to be heard under it.
  if (next.isWon && !prev.isWon) return { sounds: ['win'] };

  // A fresh hand empties the history and puts different cards on the table.
  // Rewinding to the start empties it too, but deals nothing new.
  if (next.history.length === 0 && dealSignature(next) !== dealSignature(prev)) {
    return { sounds: [], dealCount: cardsDealt(next) };
  }

  if (next.history.length < prev.history.length) return { sounds: ['undo'] };
  if (next.history.length === prev.history.length) return { sounds: [] };

  const sounds: SoundName[] = [];

  const wentToFoundation = foundationTotal(next.foundations) > foundationTotal(prev.foundations);
  const stockChanged = (next.stock?.length ?? 0) !== (prev.stock?.length ?? 0);
  const wasteChanged = (next.waste?.length ?? 0) !== (prev.waste?.length ?? 0);
  const tableauChanged =
    faceDownCount(next.tableau) !== faceDownCount(prev.tableau) ||
    tableauSize(next.tableau) !== tableauSize(prev.tableau);

  // Turning the stock over, rather than playing a card, is its own sound.
  const isStockMove = (stockChanged || wasteChanged) && !tableauChanged && !wentToFoundation;
  sounds.push(isStockMove ? 'draw' : 'place');

  // A card uncovered by the move gets turned over: one fewer face-down card.
  if (faceDownCount(next.tableau) < faceDownCount(prev.tableau)) sounds.push('flip');

  // A suit finished, either as a filled foundation or a cleared Spider run.
  const finished =
    completedFoundations(next.foundations) > completedFoundations(prev.foundations) ||
    (next.completedSets ?? 0) > (prev.completedSets ?? 0);
  if (finished) sounds.push('complete');

  return { sounds };
}

/** How long to wait before each sound, so they read as one event, not a chord. */
export const SOUND_DELAYS_MS: Partial<Record<SoundName, number>> = {
  flip: 90,
  complete: 140,
};
