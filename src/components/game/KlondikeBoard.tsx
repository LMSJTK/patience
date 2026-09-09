import { FastForward, Settings, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CardLocation, useKlondikeStore } from '../../store/useKlondikeStore';
import PlayingCard from './PlayingCard';
import {
  CardTable,
  DraggableCard,
  DroppableArea,
  WinScreen,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type KlondikeTarget = { type: 'tableau' | 'foundation'; index: number };

/** Seven columns, and a column can reach about nineteen cards in a long game. */
const SHAPE = { columns: 7, deepestColumn: 19 };

/** Every pile is one card's worth of space. */
const slot = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function KlondikeBoard() {
  const {
    stock,
    waste,
    foundations,
    tableau,
    initGame,
    selectCard,
    isWon,
    handleDrop,
    undo,
    history,
    canAutoComplete,
  } = useKlondikeStore();

  const [showSettings, setShowSettings] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const { cardSpacing, cardHeight, style: tableStyle } = useTableMetrics(SHAPE);

  const dealSeed = useDealSeed();
  const { onDrop, dealDelayOf } = useGameSounds(useKlondikeStore, handleDrop);

  useEffect(() => {
    initGame(1, dealSeed);
  }, [initGame, dealSeed]);

  // Play the rest out one move at a time. Slower than the move animation on
  // purpose: the cascade is the reward for winning, so it should be watchable.
  useEffect(() => {
    if (!finishing) return;
    const id = window.setInterval(() => {
      if (!useKlondikeStore.getState().autoCompleteStep()) setFinishing(false);
    }, 130);
    return () => window.clearInterval(id);
  }, [finishing]);

  // A new deal cancels a finish that is still running.
  useEffect(() => {
    setFinishing(false);
  }, [dealSeed]);

  if (isWon) {
    return <WinScreen xp={100} onPlayAgain={() => initGame(useKlondikeStore.getState().drawCount)} />;
  }

  const canFinish = canAutoComplete();

  return (
    <CardTable<CardLocation, KlondikeTarget>
      onDrop={onDrop}
      style={tableStyle}
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
                value={useKlondikeStore.getState().drawCount}
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
          {canFinish && (
            <button
              onClick={() => setFinishing(true)}
              disabled={finishing}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-60 transition-colors text-xs sm:text-sm font-medium"
            >
              <FastForward className="w-3 h-3 sm:w-4 sm:h-4" />
              {finishing ? 'Finishing…' : 'Finish'}
            </button>
          )}
          <button
          onClick={undo}
          disabled={history.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
        >
          <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" /> Undo
          </button>
        </div>
      </div>

      {/* Top Row: Stock, Waste, Foundations */}
      <div className="flex justify-between gap-2">
        <div className="flex gap-2 sm:gap-4">
          {/* Stock */}
          <div
            style={slot}
            className="rounded-xl border-2 border-white/20 bg-black/20 cursor-pointer relative"
            onClick={useKlondikeStore.getState().drawCard}
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
              height: col.length > 0 ? (col.length - 1) * cardSpacing + cardHeight : cardHeight,
            }}
            onClick={() => {
              if (col.length === 0) selectCard({ type: 'tableau', index: i, cardIndex: 0 });
            }}
          >
            {col.map((card, j) => {
              if (card.isFaceUp) {
                return (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    location={{ type: 'tableau', index: i, cardIndex: j } as CardLocation}
                    cardsToDrag={col.slice(j)}
                    dealDelay={dealDelayOf(card.id)}
                style={{ top: j * cardSpacing, zIndex: j }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectCard({ type: 'tableau', index: i, cardIndex: j });
                    }}
                  />
                );
              }
              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  className="absolute w-full"
                  dealDelay={dealDelayOf(card.id)}
                style={{ top: j * cardSpacing, zIndex: j }}
                />
              );
            })}
          </DroppableArea>
        ))}
      </div>
    </CardTable>
  );
}
