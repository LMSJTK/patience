import { useDroppable } from '@dnd-kit/core';
import React from 'react';
import { cn } from '../../../lib/utils';
import { useIsHintTarget } from './hintContext';

export interface DroppableAreaProps<T> {
  /**
   * Declared because TypeScript does not apply JSX's implicit key handling
   * to a generic component, so a keyed element fails to typecheck without it.
   */
  key?: React.Key;
  /** Unique among the drop targets on one board, e.g. "foundation-2". */
  id: string;
  /** Handed to the store as the destination when a card lands here. */
  data: T;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * A pile a card can be dropped onto.
 *
 * Highlights twice over: yellow while a card is being held over it, and a
 * steady blue while a hint is pointing at it. Different colours because they
 * mean different things — one is where the card would land if you let go, the
 * other is a suggestion you have not acted on.
 */
export function DroppableArea<T>({
  id,
  data,
  className,
  style,
  children,
  onClick,
}: DroppableAreaProps<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: data as Record<string, unknown>,
  });
  const hinted = useIsHintTarget(id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        hinted && 'ring-4 ring-sky-400 ring-inset',
        isOver && 'ring-4 ring-yellow-400 ring-inset'
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
