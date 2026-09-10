import { GameType } from '../store/useGameStore';
import { MAX_SEED } from './rng';

/**
 * The three challenges everyone gets today.
 *
 * Everything here is worked out from the date, so two people opening the app
 * on the same day are offered the same three games with the same cards, and
 * neither the server nor the other player needs to be involved. That is the
 * whole point of having seeded the shuffle in the first place.
 *
 * The date is the player's own local one. A challenge that changes at
 * midnight UTC would roll over mid-evening for some people and mid-morning
 * for others, which is a strange thing for a daily to do.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** What a win on each tier is worth. */
export const DAILY_XP: Record<Difficulty, number> = { easy: 50, medium: 100, hard: 250 };

const GAMES: GameType[] = ['klondike', 'freecell', 'spider', 'pyramid', 'fortythieves', 'missmilligan'];

export interface Challenge {
  /** Stable for this day and tier, so a completion can be recorded against it. */
  id: string;
  game: GameType;
  difficulty: Difficulty;
  xp: number;
  /** The deal to play. */
  seed: number;
  /** The game's own settings for this tier, as URL parameters. */
  options: Record<string, string>;
}

/** Today where the player is, as YYYY-MM-DD. */
export function todayKey(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day before a given key, for walking a streak backwards. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

/**
 * A number from a string, spread evenly enough for a deal.
 *
 * FNV-1a: short, and it does not clump the way a naive shift-and-add hash
 * does on strings that differ only in their last character — which every one
 * of these does.
 */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The deal for one challenge. The same everywhere, for as long as the day lasts. */
export function dailySeed(day: string, game: GameType, difficulty: Difficulty): number {
  return hash(`${day}:${game}:${difficulty}`) % MAX_SEED;
}

/**
 * How each game is set up for a tier.
 *
 * Only Klondike and Spider have a difficulty setting of their own. For the
 * rest the tier decides the reward and nothing else, which is honest: a
 * Pyramid deal is as hard as it is.
 */
export function optionsFor(game: GameType, difficulty: Difficulty): Record<string, string> {
  if (game === 'klondike') {
    return { draw: difficulty === 'easy' ? '1' : '3' };
  }
  if (game === 'spider') {
    return { suits: difficulty === 'easy' ? '1' : difficulty === 'medium' ? '2' : '4' };
  }
  return {};
}

/** The id a completion is recorded against. */
export function challengeId(day: string, game: GameType, difficulty: Difficulty): string {
  return `${day}:${game}:${difficulty}`;
}

/** The three challenges for a day, easiest first. */
export function challengesFor(day: string): Challenge[] {
  const offset = hash(day);
  return DIFFICULTIES.map((difficulty, tier) => {
    // A different game per tier, and a different set from one day to the next.
    const game = GAMES[(offset + tier * 2 + 1) % GAMES.length];
    return {
      id: challengeId(day, game, difficulty),
      game,
      difficulty,
      xp: DAILY_XP[difficulty],
      seed: dailySeed(day, game, difficulty),
      options: optionsFor(game, difficulty),
    };
  });
}

/** Where a challenge's Play button goes. */
export function challengeHref(challenge: Challenge): string {
  const params = new URLSearchParams({
    deal: String(challenge.seed),
    daily: challenge.id,
    ...challenge.options,
  });
  return `/play/${challenge.game}?${params.toString()}`;
}
