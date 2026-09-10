import { Redo2, Undo2 } from 'lucide-react';
import React from 'react';

export interface UndoRedoProps {
  /** Whether there is anything to step back into. */
  canUndo: boolean;
  /** Whether anything has been undone to step forward into. */
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const button =
  'flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg ' +
  'hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm';

/**
 * Stepping back and forward through a game.
 *
 * Redo shows only once there is something to step forward into. A button that
 * is disabled for almost the whole of every game is furniture, and the row is
 * narrow enough on a phone as it is.
 */
export function UndoRedo({ canUndo, canRedo, onUndo, onRedo }: UndoRedoProps) {
  return (
    <div className="flex gap-2">
      <button onClick={onUndo} disabled={!canUndo} className={button} title="Undo (Ctrl+Z)">
        <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" /> Undo
      </button>
      {canRedo && (
        <button onClick={onRedo} className={button} title="Redo (Ctrl+Y)">
          <Redo2 className="w-3 h-3 sm:w-4 sm:h-4" /> Redo
        </button>
      )}
    </div>
  );
}
