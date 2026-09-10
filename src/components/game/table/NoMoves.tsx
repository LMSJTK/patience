import { CircleAlert } from 'lucide-react';
import React from 'react';

export interface NoMovesProps {
  /** Step back to before the move that closed the game out. */
  onUndo: () => void;
  /** Give up on this one. */
  onNewDeal: () => void;
}

/**
 * Said out loud when a game has run out of moves.
 *
 * Not every deal can be won, and a player who does not know that spends a
 * long time hunting for a move that was never there. The two ways out are
 * offered rather than described, because both are one click away anyway and
 * the point is to make them obvious.
 *
 * It sits over the board rather than replacing it, so the position that
 * caused it stays visible — usually a player wants to see where it went wrong
 * before undoing.
 */
export function NoMoves({ onUndo, onNewDeal }: NoMovesProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl bg-slate-900/95 px-5 py-3 shadow-2xl shadow-black/50 ring-1 ring-white/15">
        <span className="flex items-center gap-2 text-sm text-amber-200">
          <CircleAlert className="h-4 w-4 shrink-0" />
          No moves left
        </span>
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 sm:text-sm"
          >
            Undo
          </button>
          <button
            onClick={onNewDeal}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-green-900 transition-colors hover:bg-green-100 sm:text-sm"
          >
            New deal
          </button>
        </div>
      </div>
    </div>
  );
}
