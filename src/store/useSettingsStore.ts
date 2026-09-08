import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key.trim() }),
    }),
    {
      name: 'patience-settings',
    }
  )
);
