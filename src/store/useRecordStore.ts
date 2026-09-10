import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameType } from './useGameStore';
import { Difficulty } from '../lib/daily';

/**
 * A player's record: what they have played, won, and how quickly.
 *
 * Separate from useGameStore, which keeps levels, XP and a single best time
 * and is synced to Firestore in a shape the rest of the app already depends
 * on. Bolting six more fields onto that would mean migrating everyone's
 * stored profile to add numbers nobody has yet.
 *
 * A game counts as played from its first move, not from being opened: nobody
 * wants a loss on their record for glancing at a board. It counts as lost
 * when the next one starts without it having been won, which is the only
 * moment a player can be said to have given up on it.
 */

export interface GameRecord {
  played: number;
  won: number;
  /** Seconds, or null if never won. */
  bestTime: number | null;
  /** Moves in the most efficient win, or null. */
  fewestMoves: number | null;
  currentStreak: number;
  bestStreak: number;
}

export const emptyRecord = (): GameRecord => ({
  played: 0,
  won: 0,
  bestTime: null,
  fewestMoves: null,
  currentStreak: 0,
  bestStreak: 0,
});

/** `klondike:easy` — a game at one difficulty. */
export type RecordKey = string;

export const recordKey = (game: GameType, difficulty: Difficulty): RecordKey =>
  `${game}:${difficulty}`;

interface RecordState {
  records: { [key: string]: GameRecord | undefined };
  /** The game on the table, if one has been started and not yet finished. */
  inProgress: { key: RecordKey } | null;

  /** The player made their first move. */
  start: (game: GameType, difficulty: Difficulty) => void;
  /** They finished it. */
  win: (game: GameType, difficulty: Difficulty, result: { seconds: number; moves: number }) => void;
  get: (game: GameType, difficulty: Difficulty) => GameRecord;
  /** Wipe the record, from the statistics page. */
  clear: () => void;
}

const update = (
  records: { [key: string]: GameRecord | undefined },
  key: RecordKey,
  change: (record: GameRecord) => GameRecord
) => ({ ...records, [key]: change(records[key] ?? emptyRecord()) });

export const useRecordStore = create<RecordState>()(
  persist(
    (set, get) => ({
      records: {},
      inProgress: null,

      start: (game, difficulty) => {
        const key = recordKey(game, difficulty);
        set((state) => {
          // Starting a game while another is unfinished means that one was
          // given up on. It counts as a loss and the streak ends there.
          let records = state.records;
          const abandoned = state.inProgress;
          if (abandoned) {
            records = update(records, abandoned.key, (r) => ({ ...r, currentStreak: 0 }));
          }
          records = update(records, key, (r) => ({ ...r, played: r.played + 1 }));
          return { records, inProgress: { key } };
        });
      },

      win: (game, difficulty, { seconds, moves }) => {
        const key = recordKey(game, difficulty);
        set((state) => {
          // A game the player never touched cannot be won; and a win only
          // counts once, however many times the win screen re-renders.
          if (state.inProgress?.key !== key) return state;
          const records = update(state.records, key, (r) => {
            const streak = r.currentStreak + 1;
            return {
              ...r,
              won: r.won + 1,
              // A time of zero means the clock never ran, which is not a record.
              bestTime: seconds > 0 && (r.bestTime === null || seconds < r.bestTime) ? seconds : r.bestTime,
              fewestMoves: r.fewestMoves === null || moves < r.fewestMoves ? moves : r.fewestMoves,
              currentStreak: streak,
              bestStreak: Math.max(r.bestStreak, streak),
            };
          });
          return { records, inProgress: null };
        });
      },

      get: (game, difficulty) => get().records[recordKey(game, difficulty)] ?? emptyRecord(),

      clear: () => set({ records: {}, inProgress: null }),
    }),
    { name: 'patience-record' }
  )
);

/** Everything added together, for a line at the top of the page. */
export function totalOf(records: { [key: string]: GameRecord | undefined }): GameRecord {
  return Object.values(records).reduce<GameRecord>((sum, r) => {
    if (!r) return sum;
    return {
      played: sum.played + r.played,
      won: sum.won + r.won,
      bestTime: r.bestTime === null ? sum.bestTime : sum.bestTime === null ? r.bestTime : Math.min(sum.bestTime, r.bestTime),
      fewestMoves:
        r.fewestMoves === null ? sum.fewestMoves : sum.fewestMoves === null ? r.fewestMoves : Math.min(sum.fewestMoves, r.fewestMoves),
      currentStreak: Math.max(sum.currentStreak, r.currentStreak),
      bestStreak: Math.max(sum.bestStreak, r.bestStreak),
    };
  }, emptyRecord());
}

/** Wins as a percentage, or null when nothing has been played. */
export function winRate(record: GameRecord): number | null {
  return record.played === 0 ? null : Math.round((record.won / record.played) * 100);
}
