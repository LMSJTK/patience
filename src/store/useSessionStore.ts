import { create } from 'zustand';

/**
 * The clock and the scoreline for the game on the table right now.
 *
 * These belong to neither side of the app on its own. The page owns the timer,
 * because the timer has to survive a board re-rendering; the win screen lives
 * inside the board, because it replaces it. This is the one small piece of
 * state they both need, so it sits between them rather than being threaded
 * through six boards that do not otherwise care.
 *
 * Nothing here is persisted. Best times live in useGameStore with the rest of
 * a player's record; what a single sitting produced is gone when it ends.
 */

export interface GameResult {
  /** How long the game took. */
  seconds: number;
  /** How many moves it took. */
  moves: number;
  /**
   * The best time for this game before this one, or null when this is the
   * first win. Captured before the record is updated, so the panel can say
   * what was beaten rather than showing the new time twice.
   */
  previousBest: number | null;
}

interface SessionState {
  /** Seconds on the clock, for the game in progress. */
  seconds: number;
  /** How the last game ended, or null while one is being played. */
  result: GameResult | null;

  setSeconds: (seconds: number) => void;
  recordWin: (result: GameResult) => void;
  /** A fresh deal clears the last result so a stale scoreline cannot show. */
  startNewGame: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  seconds: 0,
  result: null,

  setSeconds: (seconds) => set({ seconds }),
  recordWin: (result) => set({ result }),
  startNewGame: () => set({ seconds: 0, result: null }),
}));

/** m:ss, the way a game clock reads. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * How much faster one time was than another, in words.
 *
 * A gap is a length, not a point on a clock, so "9 seconds" rather than
 * "00:09" — the second reads as a time of day and makes the reader convert.
 */
export function describeGap(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s.toString().padStart(2, '0')}s`;
}
