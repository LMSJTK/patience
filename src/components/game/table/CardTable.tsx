import { DndContext, PointerSensor, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { DragPayload } from './DraggableCard';

/**
 * The ids of the cards currently in the player's hand.
 *
 * A drag moves a card and everything stacked on it, but only the card that was
 * grabbed hears from dnd-kit. The rest read this to know they are travelling
 * too.
 */
const DraggingCards = createContext<ReadonlySet<string> | null>(null);

export function useDraggingCards(): ReadonlySet<string> | null {
  return useContext(DraggingCards);
}

/** How long a refused card takes to slide back where it came from. */
export const RETURN_MS = 180;

export interface CardTableProps<L, T> {
  /** Called when a drag ends over a pile. The store decides if it is legal. */
  onDrop: (from: L, to: T) => void;
  /** Layout classes for the board itself. */
  className?: string;
  /** Carries the card size down to every card and pile below. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * The drag surface every game plays on.
 *
 * The card under the pointer is the real card, not a copy of it. dnd-kit's
 * DragOverlay draws a second card and hides the first, so on release the copy
 * vanished and the original faded in somewhere else — the card blinked. Here
 * the pointer offset is written to two CSS custom properties on this
 * container, and the cards being carried read them. Nothing re-renders while
 * the pointer moves, and there is only ever one of each card.
 */
export function CardTable<L, T>({ onDrop, className, style, children }: CardTableProps<L, T>) {
  const container = useRef<HTMLDivElement>(null);
  const [carrying, setCarrying] = useState<ReadonlySet<string> | null>(null);
  const release = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(release.current), []);

  const setOffset = (x: number, y: number) => {
    const el = container.current;
    if (!el) return;
    el.style.setProperty('--drag-x', `${x}px`);
    el.style.setProperty('--drag-y', `${y}px`);
  };

  /**
   * Put the cards down. The offset goes to zero first: a card that was refused
   * is still where it was dropped, so it slides home rather than jumping. Only
   * once that has run does the set clear.
   */
  const finish = () => {
    setOffset(0, 0);
    window.clearTimeout(release.current);
    release.current = window.setTimeout(() => setCarrying(null), RETURN_MS + 40);
  };

  // A few pixels of travel before a drag starts, so a click stays a click.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  return (
    <DndContext
      sensors={sensors}
      // The pile the card overlaps most, rather than whatever sits under the
      // pointer, which is more forgiving when a card is grabbed by its corner.
      collisionDetection={rectIntersection}
      onDragStart={(event) => {
        const payload = event.active.data.current as DragPayload<L> | undefined;
        window.clearTimeout(release.current);
        setOffset(0, 0);
        setCarrying(new Set(payload?.cards.map((c) => c.id) ?? []));
      }}
      onDragMove={(event) => setOffset(event.delta.x, event.delta.y)}
      onDragEnd={(event) => {
        finish();
        const payload = event.active.data.current as DragPayload<L> | undefined;
        if (event.over && payload) onDrop(payload.location, event.over.data.current as T);
      }}
      // An escaped or interrupted drag puts the cards back the same way.
      onDragCancel={finish}
    >
      <DraggingCards.Provider value={carrying}>
        <div
          ref={container}
          className={cn('w-full mx-auto flex flex-col gap-4 sm:gap-8 p-2 sm:p-4', className)}
          style={style}
        >
          {children}
        </div>
      </DraggingCards.Provider>
    </DndContext>
  );
}
