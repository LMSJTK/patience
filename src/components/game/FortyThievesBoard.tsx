import { Settings } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { getMaxMoveCount, isValidFortyThievesSequence } from '../../lib/solitaire/fortythieves';
import { FortyThievesLocation, useFortyThievesStore } from '../../store/useFortyThievesStore';
import PlayingCard from './PlayingCard';
import {
  CardTable,
  DraggableCard,
  DroppableArea,
  UndoRedo,
  WinScreen,
  HintButton,
  NoMoves,
  useHint,
  useKeyboard,
  useMoveClick,
  useDealOptions,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type FortyThievesTarget = { type: 'tableau' | 'foundation'; index: number };

/** Ten columns of two decks, starting four deep. */
const SHAPE = { columns: 10, typicalColumn: 8 };

/** Every pile is one card's worth of space. */
const slot = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function FortyThievesBoard() {
  const {
    stock,
    waste,
    foundations,
    tableau,
    isJosephine,
    initGame,
    drawCard,
    autoMoveCard,
    isWon,
    handleDrop,
    undo,
    redo,
    history,
    future,
    moves,
    seed,
  } = useFortyThievesStore();

  const [showSettings, setShowSettings] = useState(false);
  const { cardHeight, fanFor, style: tableStyle } = useTableMetrics(SHAPE);

  const dealSeed = useDealSeed();
  const options = useDealOptions();
  const { onDrop, dealDelayOf } = useGameSounds(useFortyThievesStore, handleDrop);
  const { shown: hint, next: showHint, stuck } = useHint(useFortyThievesStore, moves, isWon);
  const stockHinted = hint?.target === 'stock';
  const onMove = useMoveClick();
  const leftHanded = useSettingsStore((state) => state.leftHanded);
  useKeyboard({
    undo,
    redo,
    hint: showHint,
    newDeal: () => initGame(isJosephine),
    stock: drawCard,
  });

  useEffect(() => {
    initGame(options.josephine ?? false, dealSeed);
  }, [initGame, dealSeed, options.josephine]);

  // The destination is unknown while a card is in the air, so allow the most
  // permissive limit here: the one for moving onto an occupied column.
  // handleDrop applies the strict rule once the target is known. Josephine
  // lifts the limit entirely.
  const emptyTableauCols = tableau.filter((col) => col.length === 0).length;
  const maxMove = isJosephine ? Infinity : getMaxMoveCount(emptyTableauCols, false);

  if (isWon) {
    return <WinScreen
        xp={200}
        onNewDeal={() => initGame(isJosephine)}
        onReplay={() => initGame(isJosephine, seed)}
      />;
  }

  return (
    <CardTable<FortyThievesLocation, FortyThievesTarget>
      onDrop={onDrop}
      style={tableStyle}
      hint={hint}
    >
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 sm:gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs sm:text-sm"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" /> Options
          </button>
          {showSettings && (
            <div className="flex items-center gap-4 bg-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
              <label className="flex items-center gap-2 text-[10px] sm:text-sm text-white">
                <input
                  type="checkbox"
                  checked={isJosephine}
                  onChange={(e) => initGame(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600"
                />
                Josephine
              </label>
            </div>
          )}
        </div>
        <HintButton onClick={showHint} />
        <UndoRedo
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      {/* Top Row: Stock, Waste, and Foundations */}
      <div className={cn('flex justify-between items-start gap-2 sm:gap-8', leftHanded && 'flex-row-reverse')}>
        <div className="flex gap-2 sm:gap-4">
          {/* Stock */}
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div
              className={cn(
                'relative rounded-xl border-2 border-white/20 bg-black/20',
                stock.length > 0 ? 'cursor-pointer hover:border-white/40' : 'opacity-50',
                stockHinted && 'ring-4 ring-sky-400 ring-inset'
              )}
              onClick={drawCard}
            >
              {stock.length > 0 && (
                <PlayingCard card={stock[stock.length - 1]} className="absolute w-full h-full shadow-lg" />
              )}
            </div>
            <span className="text-slate-300 text-[10px] sm:text-sm font-medium">{stock.length}</span>
          </div>

          {/* Waste */}
          <div style={slot}
              className="relative rounded-xl border-2 border-white/10 bg-black/10">
            {waste.map((card, i) => {
              const isTop = i === waste.length - 1;
              return isTop ? (
                <DraggableCard
                  key={card.id}
                  card={card}
                  location={{ type: 'waste' } as FortyThievesLocation}
                  cardsToDrag={[card]}
                  className="absolute inset-0"
                  {...onMove(() => autoMoveCard({ type: 'waste' }))}
                />
              ) : (
                <PlayingCard key={card.id} card={card} className="absolute inset-0 pointer-events-none" />
              );
            })}
          </div>
        </div>

        {/* Foundations */}
        <div className="flex gap-1 sm:gap-2 md:gap-4 flex-wrap justify-end max-w-[60%]">
          {foundations.map((col, i) => (
            <DroppableArea
              key={`foundation-${i}`}
              id={`foundation-${i}`}
              data={{ type: 'foundation', index: i } as FortyThievesTarget}
              style={{ width: 'calc(var(--card-w) * 0.84)', height: 'calc(var(--card-h) * 0.84)' }}
              className="rounded-lg border-2 border-white/20 bg-black/20 relative"
              {...onMove(() => {
                if (col.length > 0) autoMoveCard({ type: 'foundation', index: i });
              })}
            >
              {col.map((card) => (
                <PlayingCard key={card.id} card={card} className="absolute inset-0 pointer-events-none" />
              ))}
            </DroppableArea>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex justify-between gap-0.5 sm:gap-1 md:gap-2">
        {tableau.map((col, i) => (
          <DroppableArea
            key={`tableau-${i}`}
            id={`tableau-${i}`}
            data={{ type: 'tableau', index: i } as FortyThievesTarget}
            className="rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{ width: 'var(--card-w)', height: col.length > 0 ? (col.length - 1) * fanFor(col.length) + cardHeight : cardHeight }}
          >
            {col.map((card, j) => {
              const run = col.slice(j);
              return (
                <DraggableCard
                  key={card.id}
                  card={card}
                  location={{ type: 'tableau', index: i, cardIndex: j } as FortyThievesLocation}
                  cardsToDrag={run}
                  canDrag={isValidFortyThievesSequence(run) && run.length <= maxMove}
                  dealDelay={dealDelayOf(card.id)}
                  style={{ top: j * fanFor(col.length), zIndex: j }}
                  {...onMove((e) => {
                    e.stopPropagation();
                    autoMoveCard({ type: 'tableau', index: i, cardIndex: j });
                  })}
                />
              );
            })}
          </DroppableArea>
        ))}
      </div>
      {stuck && <NoMoves onUndo={undo} onNewDeal={() => initGame(isJosephine)} />}
    </CardTable>
  );
}
