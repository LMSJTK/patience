import { Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { CardLocation, useKlondikeStore } from '../../store/useKlondikeStore';
import PlayingCard from './PlayingCard';
import {
  CardTable,
  DraggableCard,
  DroppableArea,
  UndoRedo,
  FinishButton,
  WinScreen,
  useAutoComplete,
  HintButton,
  NoMoves,
  useHint,
  useKeyboard,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type KlondikeTarget = { type: 'tableau' | 'foundation'; index: number };

/** Seven columns; nine cards is a working depth, and deeper ones fan tighter. */
const SHAPE = { columns: 7, typicalColumn: 9 };

/** Every pile is one card's worth of space. */
const slot = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function KlondikeBoard() {
  const {
    stock,
    waste,
    foundations,
    tableau,
    initGame,
    drawCard,
    selectCard,
    isWon,
    handleDrop,
    undo,
    redo,
    history,
    future,
    moves,
    canAutoComplete,
    seed,
    drawCount,
  } = useKlondikeStore();

  const [showSettings, setShowSettings] = useState(false);
  const { cardHeight, cardSpacing, fanFor, style: tableStyle } = useTableMetrics(SHAPE);

  const dealSeed = useDealSeed();
  const { onDrop, dealDelayOf } = useGameSounds(useKlondikeStore, handleDrop);
  const { shown: hint, next: showHint, stuck } = useHint(useKlondikeStore, moves, isWon);
  const stockHinted = hint?.target === 'stock';
  useKeyboard({
    undo,
    redo,
    hint: showHint,
    newDeal: () => initGame(drawCount),
    stock: drawCard,
  });
  const { finishing, start: startFinishing } = useAutoComplete(useKlondikeStore, seed);

  useEffect(() => {
    initGame(1, dealSeed);
  }, [initGame, dealSeed]);

  if (isWon) {
    return <WinScreen
        xp={100}
        onNewDeal={() => initGame(drawCount)}
        onReplay={() => initGame(drawCount, seed)}
      />;
  }

  const canFinish = canAutoComplete();

  return (
    <CardTable<CardLocation, KlondikeTarget>
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
            <div className="flex items-center gap-2 sm:gap-4 bg-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
              <select
                value={drawCount}
                onChange={(e) => initGame(Number(e.target.value) as 1 | 3)}
                className="bg-slate-700 text-white px-2 py-1 rounded text-xs sm:text-sm"
              >
                <option value={1}>Draw 1</option>
                <option value={3}>Draw 3</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 sm:gap-4">
          {canFinish && <FinishButton finishing={finishing} onClick={startFinishing} />}
          <HintButton onClick={showHint} />
          <UndoRedo
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={undo}
          onRedo={redo}
        />
        </div>
      </div>

      {/* Top Row: Stock, Waste, Foundations */}
      <div className="flex justify-between gap-2">
        <div className="flex gap-2 sm:gap-4">
          {/* Stock */}
          <div
            style={slot}
            className={cn(
              'rounded-xl border-2 border-white/20 bg-black/20 cursor-pointer relative',
              stockHinted && 'ring-4 ring-sky-400 ring-inset'
            )}
            onClick={drawCard}
          >
            {stock.length > 0 && <PlayingCard card={stock[stock.length - 1]} className="absolute inset-0" />}
          </div>

          {/* Waste */}
          <div style={slot} className="rounded-xl border-2 border-white/10 relative">
            {waste.map((card, i) => {
              const offset = Math.min(i * (cardSpacing / 2), cardSpacing);
              const isTop = i === waste.length - 1;
              if (isTop) {
                return (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    location={{ type: 'waste' } as CardLocation}
                    cardsToDrag={[card]}
                    style={{ left: offset }}
                    onClick={() => selectCard({ type: 'waste' })}
                  />
                );
              }
              return <PlayingCard key={card.id} card={card} className="absolute top-0" style={{ left: offset }} />;
            })}
          </div>
        </div>

        {/* Foundations */}
        <div className="flex gap-1 sm:gap-2 md:gap-4">
          {foundations.map((col, i) => (
            <DroppableArea
              key={`foundation-${i}`}
              id={`foundation-${i}`}
              data={{ type: 'foundation', index: i } as KlondikeTarget}
              style={slot}
              className="rounded-xl border-2 border-white/20 bg-black/20 relative"
              onClick={() => selectCard({ type: 'foundation', index: i })}
            >
              {col.map((card) => (
                <PlayingCard key={card.id} card={card} className="absolute inset-0 pointer-events-none" />
              ))}
            </DroppableArea>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex justify-between gap-1 sm:gap-2 md:gap-4">
        {tableau.map((col, i) => (
          <DroppableArea
            key={`tableau-${i}`}
            id={`tableau-${i}`}
            data={{ type: 'tableau', index: i } as KlondikeTarget}
            className="rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{
              width: 'var(--card-w)',
              height: col.length > 0 ? (col.length - 1) * fanFor(col.length) + cardHeight : cardHeight,
            }}
            onClick={() => {
              if (col.length === 0) selectCard({ type: 'tableau', index: i, cardIndex: 0 });
            }}
          >
            {/* Face up or face down, a tableau card is the same element. It has
                to be: a card that turns over is animated by rotating the node
                you are already looking at, and swapping one component for
                another replaces that node instead. */}
            {col.map((card, j) => (
              <DraggableCard
                key={card.id}
                card={card}
                location={{ type: 'tableau', index: i, cardIndex: j } as CardLocation}
                cardsToDrag={col.slice(j)}
                dealDelay={dealDelayOf(card.id)}
                style={{ top: j * fanFor(col.length), zIndex: j }}
                onClick={
                  card.isFaceUp
                    ? (e) => {
                        e.stopPropagation();
                        selectCard({ type: 'tableau', index: i, cardIndex: j });
                      }
                    : undefined
                }
              />
            ))}
          </DroppableArea>
        ))}
      </div>
      {stuck && <NoMoves onUndo={undo} onNewDeal={() => initGame(drawCount)} />}
    </CardTable>
  );
}
