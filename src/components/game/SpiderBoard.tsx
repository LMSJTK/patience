import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { isValidSpiderSequence } from '../../lib/solitaire/spider';
import { SpiderLocation, useSpiderStore } from '../../store/useSpiderStore';
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
  useDealOptions,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type SpiderTarget = { type: 'tableau'; index: number };

/** Ten columns, and Spider cascades get long. */
const SHAPE = { columns: 10, typicalColumn: 12 };

/** Every pile is one card's worth of space. */
const slot = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function SpiderBoard() {
  const {
    stock,
    tableau,
    completedSets,
    suitCount,
    isRelaxed,
    initGame,
    dealCards,
    autoMoveCard,
    isWon,
    handleDrop,
    undo,
    redo,
    history,
    future,
    moves,
    seed,
  } = useSpiderStore();

  const [showSettings, setShowSettings] = useState(false);
  const { cardHeight, fanFor, style: tableStyle } = useTableMetrics(SHAPE);

  const dealSeed = useDealSeed();
  const options = useDealOptions();
  const { onDrop, dealDelayOf } = useGameSounds(useSpiderStore, handleDrop);
  const { shown: hint, next: showHint, stuck } = useHint(useSpiderStore, moves, isWon);
  const stockHinted = hint?.target === 'stock';
  useKeyboard({
    undo,
    redo,
    hint: showHint,
    newDeal: () => initGame(suitCount, isRelaxed),
    stock: dealCards,
  });

  useEffect(() => {
    initGame(options.suits ?? 1, options.relaxed ?? false, dealSeed);
  }, [initGame, dealSeed, options.suits, options.relaxed]);

  if (isWon) {
    return <WinScreen
        xp={100 * suitCount}
        onNewDeal={() => initGame(suitCount, isRelaxed)}
        onReplay={() => initGame(suitCount, isRelaxed, seed)}
      />;
  }

  return (
    <CardTable<SpiderLocation, SpiderTarget>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 bg-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
              <select
                value={suitCount}
                onChange={(e) => initGame(Number(e.target.value) as 1 | 2 | 4, isRelaxed)}
                className="bg-slate-700 text-white px-2 py-1 rounded text-xs sm:text-sm"
              >
                <option value={1}>1 Suit (Easy)</option>
                <option value={2}>2 Suits (Medium)</option>
                <option value={4}>4 Suits (Hard)</option>
              </select>
              <label className="flex items-center gap-2 text-[10px] sm:text-sm text-white">
                <input
                  type="checkbox"
                  checked={isRelaxed}
                  onChange={(e) => initGame(suitCount, e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600"
                />
                Relaxed
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

      {/* Top Row: Stock and Completed Sets */}
      <div className="flex justify-between items-start">
        {/* Stock */}
        <div className="flex gap-2">
          <div
            className={cn(
              'w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20 relative',
              stock.length > 0 ? 'cursor-pointer hover:border-white/40' : 'opacity-50',
              stockHinted && 'ring-4 ring-sky-400 ring-inset'
            )}
            onClick={dealCards}
          >
            {stock.length > 0 && (
              <div className="absolute inset-0">
                {Array.from({ length: Math.ceil(stock.length / 10) }).map((_, i) => (
                  <PlayingCard
                    key={i}
                    card={stock[i * 10]}
                    className="absolute w-full h-full shadow-sm"
                    style={{ left: i * 2, top: i * 1 }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center text-slate-300 text-[10px] sm:text-sm">
            <span>Deals: {Math.ceil(stock.length / 10)}</span>
            {stock.length > 0 && !isRelaxed && tableau.some((col) => col.length === 0) && (
              <span className="text-red-400 text-[8px] sm:text-xs max-w-[60px] sm:max-w-[100px]">
                Empty columns!
              </span>
            )}
          </div>
        </div>

        {/* Completed Sets */}
        <div className="flex gap-0.5 sm:gap-1 md:gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-12 sm:w-12 sm:h-18 md:w-16 md:h-24 rounded border border-white/20 bg-black/20 relative overflow-hidden"
            >
              {i < completedSets && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center">
                  <span className="text-sm sm:text-xl md:text-2xl font-bold text-white">K</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex justify-between gap-0.5 sm:gap-1 md:gap-2">
        {tableau.map((col, i) => (
          <DroppableArea
            key={`tableau-${i}`}
            id={`tableau-${i}`}
            data={{ type: 'tableau', index: i } as SpiderTarget}
            className="rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{ width: 'var(--card-w)', height: col.length > 0 ? (col.length - 1) * fanFor(col.length) + cardHeight : cardHeight }}
          >
            {/* Face up or face down, a tableau card is the same element, so a
                card that turns over rotates rather than being replaced. */}
            {col.map((card, j) => (
              <DraggableCard
                key={card.id}
                card={card}
                location={{ type: 'tableau', index: i, cardIndex: j } as SpiderLocation}
                cardsToDrag={col.slice(j)}
                canDrag={card.isFaceUp && isValidSpiderSequence(col.slice(j))}
                dealDelay={dealDelayOf(card.id)}
                style={{ top: j * fanFor(col.length), zIndex: j }}
                onClick={
                  card.isFaceUp
                    ? (e) => {
                        e.stopPropagation();
                        autoMoveCard({ type: 'tableau', index: i, cardIndex: j });
                      }
                    : undefined
                }
              />
            ))}
          </DroppableArea>
        ))}
      </div>
      {stuck && <NoMoves onUndo={undo} onNewDeal={() => initGame(suitCount, isRelaxed)} />}
    </CardTable>
  );
}
