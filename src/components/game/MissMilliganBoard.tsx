import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { isValidMissMilliganSequence } from '../../lib/solitaire/missmilligan';
import { MissMilliganLocation, useMissMilliganStore } from '../../store/useMissMilliganStore';
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
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type MissMilliganTarget = { type: 'tableau' | 'foundation' | 'pocket'; index?: number };

/** Eight columns of two decks. */
const SHAPE = { columns: 8, typicalColumn: 10 };

/** Every pile is one card's worth of space. */
const slot = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function MissMilliganBoard() {
  const {
    stock,
    pocket,
    foundations,
    tableau,
    isTabbyCat,
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
  } = useMissMilliganStore();

  const [showSettings, setShowSettings] = useState(false);
  const { cardHeight, fanFor, style: tableStyle } = useTableMetrics(SHAPE);

  const dealSeed = useDealSeed();
  const { onDrop, dealDelayOf } = useGameSounds(useMissMilliganStore, handleDrop);
  const { shown: hint, next: showHint, stuck } = useHint(useMissMilliganStore, moves, isWon);
  const stockHinted = hint?.target === 'stock';
  useKeyboard({
    undo,
    redo,
    hint: showHint,
    newDeal: () => initGame(isTabbyCat),
    stock: dealCards,
  });

  useEffect(() => {
    initGame(false, dealSeed);
  }, [initGame, dealSeed]);

  if (isWon) {
    return <WinScreen
        xp={250}
        onNewDeal={() => initGame(isTabbyCat)}
        onReplay={() => initGame(isTabbyCat, seed)}
      />;
  }

  return (
    <CardTable<MissMilliganLocation, MissMilliganTarget>
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
                  checked={isTabbyCat}
                  onChange={(e) => initGame(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600"
                />
                Tabby Cat
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

      {/* Top Row: Stock, Pocket, and Foundations */}
      <div className="flex justify-between items-start gap-2 sm:gap-8">
        <div className="flex gap-2 sm:gap-4">
          {/* Stock */}
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div
              className={cn(
                'relative rounded-xl border-2 border-white/20 bg-black/20',
                stock.length > 0 ? 'cursor-pointer hover:border-white/40' : 'opacity-50',
                stockHinted && 'ring-4 ring-sky-400 ring-inset'
              )}
              onClick={dealCards}
            >
              {stock.length > 0 && (
                <div className="absolute inset-0">
                  {Array.from({ length: Math.ceil(stock.length / 8) }).map((_, i) => (
                    <PlayingCard
                      key={i}
                      card={stock[i * 8]}
                      className="absolute w-full h-full shadow-sm"
                      style={{ left: i * 2, top: i * 1 }}
                    />
                  ))}
                </div>
              )}
            </div>
            <span className="text-slate-300 text-[10px] sm:text-sm font-medium">{stock.length}</span>
          </div>

          {/* Pocket (Waive) - Only visible/usable when stock is empty */}
          {stock.length === 0 && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <DroppableArea
                id="pocket"
                data={{ type: 'pocket' } as MissMilliganTarget}
                style={slot}
              className="relative rounded-xl border-2 border-dashed border-yellow-400/50 bg-black/20"
              >
                {pocket.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-yellow-400/50 text-[10px] sm:text-sm font-medium">
                    Pocket
                  </div>
                ) : (
                  pocket.map((card, j) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      location={{ type: 'pocket', cardIndex: j } as MissMilliganLocation}
                      cardsToDrag={pocket.slice(j)}
                      canDrag={isValidMissMilliganSequence(pocket.slice(j))}
                      dealDelay={dealDelayOf(card.id)}
                      style={{ top: j * fanFor(pocket.length), zIndex: j }}
                      onClick={(e) => {
                        e.stopPropagation();
                        autoMoveCard({ type: 'pocket', cardIndex: j });
                      }}
                    />
                  ))
                )}
              </DroppableArea>
              <span className="text-yellow-400/80 text-[10px] sm:text-sm font-medium">Pocket</span>
            </div>
          )}
        </div>

        {/* Foundations */}
        <div className="flex gap-1 sm:gap-2 md:gap-4 flex-wrap justify-end max-w-[60%]">
          {foundations.map((col, i) => (
            <DroppableArea
              key={`foundation-${i}`}
              id={`foundation-${i}`}
              data={{ type: 'foundation', index: i } as MissMilliganTarget}
              style={{ width: 'calc(var(--card-w) * 0.84)', height: 'calc(var(--card-h) * 0.84)' }}
              className="rounded-lg border-2 border-white/20 bg-black/20 relative"
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
            data={{ type: 'tableau', index: i } as MissMilliganTarget}
            className="rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{ width: 'var(--card-w)', height: col.length > 0 ? (col.length - 1) * fanFor(col.length) + cardHeight : cardHeight }}
          >
            {col.map((card, j) => (
              <DraggableCard
                key={card.id}
                card={card}
                location={{ type: 'tableau', index: i, cardIndex: j } as MissMilliganLocation}
                cardsToDrag={col.slice(j)}
                canDrag={isValidMissMilliganSequence(col.slice(j))}
                dealDelay={dealDelayOf(card.id)}
                style={{ top: j * fanFor(col.length), zIndex: j }}
                onClick={(e) => {
                  e.stopPropagation();
                  autoMoveCard({ type: 'tableau', index: i, cardIndex: j });
                }}
              />
            ))}
          </DroppableArea>
        ))}
      </div>
      {stuck && <NoMoves onUndo={undo} onNewDeal={() => initGame(isTabbyCat)} />}
    </CardTable>
  );
}
