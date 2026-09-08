import { Settings, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { getMaxMoveCount, isValidFortyThievesSequence } from '../../lib/solitaire/fortythieves';
import { FortyThievesLocation, useFortyThievesStore } from '../../store/useFortyThievesStore';
import PlayingCard from './PlayingCard';
import {
  CardTable,
  DraggableCard,
  DroppableArea,
  Ladder,
  WinScreen,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type FortyThievesTarget = { type: 'tableau' | 'foundation'; index: number };

/** Ten columns of two decks, so cards overlap tightly. */
const SPACING: Ladder = [12, 16, 20, 24];
const HEIGHT: Ladder = [72, 96, 112, 144];

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
    history,
  } = useFortyThievesStore();

  const [showSettings, setShowSettings] = useState(false);
  const { cardSpacing, cardHeight } = useTableMetrics(SPACING, HEIGHT);

  const dealSeed = useDealSeed();
  const onDrop = useGameSounds(useFortyThievesStore, handleDrop);

  useEffect(() => {
    initGame(false, dealSeed);
  }, [initGame, dealSeed]);

  // The destination is unknown while a card is in the air, so allow the most
  // permissive limit here: the one for moving onto an occupied column.
  // handleDrop applies the strict rule once the target is known. Josephine
  // lifts the limit entirely.
  const emptyTableauCols = tableau.filter((col) => col.length === 0).length;
  const maxMove = isJosephine ? Infinity : getMaxMoveCount(emptyTableauCols, false);

  if (isWon) {
    return <WinScreen xp={200} onPlayAgain={() => initGame(isJosephine)} />;
  }

  return (
    <CardTable<FortyThievesLocation, FortyThievesTarget>
      onDrop={onDrop}
      cardSpacing={cardSpacing}
      className="max-w-7xl"
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
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
        >
          <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" /> Undo
        </button>
      </div>

      {/* Top Row: Stock, Waste, and Foundations */}
      <div className="flex justify-between items-start gap-2 sm:gap-8">
        <div className="flex gap-2 sm:gap-4">
          {/* Stock */}
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div
              className={cn(
                'relative w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20',
                stock.length > 0 ? 'cursor-pointer hover:border-white/40' : 'opacity-50'
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
          <div className="relative w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-white/10 bg-black/10">
            {waste.map((card, i) => {
              const isTop = i === waste.length - 1;
              return isTop ? (
                <DraggableCard
                  key={card.id}
                  card={card}
                  location={{ type: 'waste' } as FortyThievesLocation}
                  cardsToDrag={[card]}
                  className="absolute inset-0"
                  onClick={() => autoMoveCard({ type: 'waste' })}
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
              className="w-10 h-15 sm:w-14 sm:h-20 md:w-18 md:h-26 lg:w-20 lg:h-28 rounded-lg border-2 border-white/20 bg-black/20 relative"
              onClick={() => {
                if (col.length > 0) autoMoveCard({ type: 'foundation', index: i });
              }}
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
            className="w-12 sm:w-16 md:w-20 lg:w-24 rounded-lg sm:rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{ height: col.length > 0 ? (col.length - 1) * cardSpacing + cardHeight : cardHeight }}
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
                  style={{ top: j * cardSpacing, zIndex: j }}
                  onClick={(e) => {
                    e.stopPropagation();
                    autoMoveCard({ type: 'tableau', index: i, cardIndex: j });
                  }}
                />
              );
            })}
          </DroppableArea>
        ))}
      </div>
    </CardTable>
  );
}
