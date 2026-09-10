import { Lightbulb } from 'lucide-react';
import React from 'react';

export interface HintButtonProps {
  onClick: () => void;
}

/**
 * Ask the game what to play.
 *
 * Always offered, even on a stuck board: pressing it there is how a player
 * finds out the game is over, and a button that disappears exactly when it is
 * wanted teaches nothing.
 */
export function HintButton({ onClick }: HintButtonProps) {
  return (
    <button
      onClick={onClick}
      title="Hint (H)"
      className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs sm:text-sm"
    >
      <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" /> Hint
    </button>
  );
}
