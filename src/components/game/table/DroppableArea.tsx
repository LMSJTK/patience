import { useDroppable } from '@dnd-kit/core';
import React from 'react';
import { cn } from '../../../lib/utils';

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
 * A pile a card can be dropped onto. Highlights while a card is over it.
 *
 * The highlight follows the pointer rather than the dragged card, because
 * that is what dnd-kit's pointerWithin reports. Phase 2 switches to deciding
 * by overlap, which is more forgiving when a card is grabbed by its corner.
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

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && 'ring-4 ring-yellow-400 ring-inset')}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
