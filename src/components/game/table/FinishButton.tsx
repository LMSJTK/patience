import { FastForward } from 'lucide-react';
import React from 'react';

export interface FinishButtonProps {
  /** Whether the run-out is already going. */
  finishing: boolean;
  onClick: () => void;
}

/**
 * Offered only when pressing it really does finish the game, which each store
 * establishes by simulating the run-out first. It is never shown as a guess,
 * so it never disappoints.
 */
export function FinishButton({ finishing, onClick }: FinishButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={finishing}
      className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-60 transition-colors text-xs sm:text-sm font-medium"
    >
      <FastForward className="w-3 h-3 sm:w-4 sm:h-4" />
      {finishing ? 'Finishing…' : 'Finish'}
    </button>
  );
}
