import { Trophy } from 'lucide-react';
import React from 'react';

export interface WinScreenProps {
  /** XP this game awards, so the number matches what the store banked. */
  xp: number;
  onPlayAgain: () => void;
}

/**
 * What a player sees on winning.
 *
 * Phase 3 replaces this with the card cascade and a results panel carrying
 * time, moves and best time. For now it is the one screen all six games share.
 */
export function WinScreen({ xp, onPlayAgain }: WinScreenProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
      <Trophy className="w-24 h-24 text-yellow-400" />
      <h2 className="text-4xl font-bold text-white">You Won!</h2>
      <p className="text-xl text-green-200">+{xp} XP</p>
      <button
        onClick={onPlayAgain}
        className="px-6 py-3 bg-white text-green-900 font-bold rounded-xl hover:bg-green-100 transition-colors"
      >
        Play Again
      </button>
    </div>
  );
}
