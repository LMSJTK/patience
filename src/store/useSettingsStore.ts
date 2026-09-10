import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSoundEnabled, setSoundVolume } from '../lib/sound';

export type AnimationSpeed = 'instant' | 'quick' | 'normal';

/** What each speed does to a duration. Instant is not zero: see SPEED_FACTOR. */
export const SPEED_FACTOR: Record<AnimationSpeed, number> = {
  instant: 0,
  quick: 0.6,
  normal: 1,
};

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

  /**
   * How quickly a card travels, as a multiplier on every duration.
   *
   * Not a free-text number: three settings a player can actually tell apart
   * are more useful than a slider whose middle they will never find again.
   */
  animationSpeed: AnimationSpeed;
  setAnimationSpeed: (speed: AnimationSpeed) => void;

  /**
   * Whether one click sends a card somewhere, or two.
   *
   * A single click is quicker and is what this has always done; a double click
   * is what Windows Solitaire does, and stops a mis-click playing a card you
   * were only picking up.
   */
  clickToMove: 'single' | 'double';
  setClickToMove: (mode: 'single' | 'double') => void;

  /** Foundations on the left, for a left-handed player or a left-thumbed phone. */
  leftHanded: boolean;
  setLeftHanded: (on: boolean) => void;

  /** A bigger rank and pip, for reading the board from further away. */
  largePrint: boolean;
  setLargePrint: (on: boolean) => void;
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

      animationSpeed: 'normal',
      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

      clickToMove: 'single',
      setClickToMove: (mode) => set({ clickToMove: mode }),

      leftHanded: false,
      setLeftHanded: (on) => set({ leftHanded: on }),

      largePrint: false,
      setLargePrint: (on) => set({ largePrint: on }),
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
