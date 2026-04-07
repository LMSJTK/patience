import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameType = 'klondike' | 'freecell' | 'spider' | 'pyramid' | 'fortythieves' | 'missmilligan';

export interface GameStats {
  level: number;
  xp: number;
  highScores: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface GameStore {
  stats: Record<GameType, GameStats>;
  cardBack: string;
  customCardBacks: string[];
  addXp: (game: GameType, amount: number) => void;
  setCardBack: (url: string) => void;
  addCustomCardBack: (url: string) => void;
  updateHighScore: (game: GameType, difficulty: 'easy' | 'medium' | 'hard', score: number) => void;
  updateStats: (game: GameType, partialStats: Partial<GameStats>) => void;
  setStats: (stats: Record<GameType, GameStats>) => void;
}

const initialStats: Record<GameType, GameStats> = {
  klondike: { level: 1, xp: 0, highScores: { easy: 0, medium: 0, hard: 0 } },
  freecell: { level: 1, xp: 0, highScores: { easy: 0, medium: 0, hard: 0 } },
  spider: { level: 1, xp: 0, highScores: { easy: 0, medium: 0, hard: 0 } },
  pyramid: { level: 1, xp: 0, highScores: { easy: 0, medium: 0, hard: 0 } },
  fortythieves: { level: 1, xp: 0, highScores: { easy: 0, medium: 0, hard: 0 } },
  missmilligan: { level: 1, xp: 0, highScores: { easy: 0, medium: 0, hard: 0 } },
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      stats: initialStats,
      cardBack: 'default',
      customCardBacks: [],
      addXp: (game, amount) => set((state) => {
        const currentStats = state.stats[game];
        let newXp = currentStats.xp + amount;
        let newLevel = currentStats.level;
        
        while (newXp >= newLevel * 100) {
          newXp -= newLevel * 100;
          newLevel++;
        }

        return {
          stats: {
            ...state.stats,
            [game]: {
              ...currentStats,
              xp: newXp,
              level: newLevel,
            }
          }
        };
      }),
      setCardBack: (url) => set({ cardBack: url }),
      addCustomCardBack: (url) => set((state) => ({ customCardBacks: [...state.customCardBacks, url] })),
      setStats: (stats) => set({ stats: { ...initialStats, ...stats } }),
      updateStats: (game, partialStats) => set((state) => ({
        stats: {
          ...state.stats,
          [game]: {
            ...state.stats[game],
            ...partialStats
          }
        }
      })),
      updateHighScore: (game, difficulty, score) => set((state) => {
        const currentScore = state.stats[game].highScores[difficulty];
        if (score > currentScore) {
          return {
            stats: {
              ...state.stats,
              [game]: {
                ...state.stats[game],
                highScores: {
                  ...state.stats[game].highScores,
                  [difficulty]: score
                }
              }
            }
          };
        }
        return state;
      }),
    }),
    {
      name: 'patience-game-storage',
    }
  )
);
