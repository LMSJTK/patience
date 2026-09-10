import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { previousDay, todayKey } from '../lib/daily';

/**
 * Which daily challenges have been completed, and how many days in a row.
 *
 * Kept in the browser rather than on a server: the challenges are worked out
 * from the date, so nothing needs to be fetched to know what today's are, and
 * a record of having finished them is only interesting to the person who did.
 * Signing in syncs the rest of a player's record; this rides along with it.
 *
 * It also gives the `daily_streak` achievement the number it has always
 * claimed to award and never had.
 */

interface DailyState {
  /** Challenge ids that have been won, as `YYYY-MM-DD:game:difficulty`. */
  completed: Record<string, true>;

  complete: (challengeId: string) => void;
  isComplete: (challengeId: string) => boolean;
  /** Days in a row ending today, or yesterday if today is not done yet. */
  streak: (today?: string) => number;
}

/** Was anything at all finished on this day? */
function anyOn(completed: Record<string, true>, day: string): boolean {
  const prefix = `${day}:`;
  return Object.keys(completed).some((id) => id.startsWith(prefix));
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      completed: {},

      complete: (challengeId) =>
        set((state) =>
          state.completed[challengeId]
            ? state
            : { completed: { ...state.completed, [challengeId]: true } }
        ),

      isComplete: (challengeId) => get().completed[challengeId] === true,

      streak: (today = todayKey()) => {
        const { completed } = get();
        // Today not being done yet does not break a streak — the day is not
        // over. It only breaks once a whole day has passed with nothing on it.
        let day = anyOn(completed, today) ? today : previousDay(today);
        let run = 0;
        while (anyOn(completed, day)) {
          run++;
          day = previousDay(day);
        }
        return run;
      },
    }),
    { name: 'patience-daily' }
  )
);
