import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSoundEnabled, setSoundVolume } from '../lib/sound';

interface SettingsStore {
  /**
   * The user's own Gemini API key, used for AI card back generation.
   *
   * Deliberately kept out of useGameStore: that store is mirrored to Firestore
   * on every change, and this value should never leave the browser it was
   * entered in.
   */
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;

  /** Whether card sounds play at all. */
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;

  /** How loud they are, 0 to 1. */
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key.trim() }),

      soundEnabled: true,
      setSoundEnabled: (on) => {
        setSoundEnabled(on);
        set({ soundEnabled: on });
      },

      soundVolume: 0.6,
      setSoundVolume: (volume) => {
        const clamped = Math.min(1, Math.max(0, volume));
        setSoundVolume(clamped);
        set({ soundVolume: clamped });
      },
    }),
    {
      name: 'patience-settings',
      // The sound module holds its own copy of these so that playSound stays
      // synchronous and dependency-free. Push the saved values into it once
      // they come back from storage, or a muted player hears sound on reload.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setSoundEnabled(state.soundEnabled);
        setSoundVolume(state.soundVolume);
      },
    }
  )
);
