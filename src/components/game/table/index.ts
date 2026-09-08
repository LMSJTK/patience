/**
 * The shared card table.
 *
 * Everything here was previously copied into each of the five drag-and-drop
 * boards. Keeping it in one place is what makes the Phase 2 rendering rewrite
 * a single change rather than five.
 */
export { CardTable } from './CardTable';
export type { CardTableProps } from './CardTable';
export { DraggableCard } from './DraggableCard';
export type { DragPayload, DraggableCardProps } from './DraggableCard';
export { DroppableArea } from './DroppableArea';
export type { DroppableAreaProps } from './DroppableArea';
export { useDealSeed } from './useDealSeed';
export { useGameSounds } from './useGameSounds';
export type { SoundableStore } from './useGameSounds';
export { useTableMetrics } from './useTableMetrics';
export type { Ladder, TableMetrics } from './useTableMetrics';
export { WinScreen } from './WinScreen';
export type { WinScreenProps } from './WinScreen';
