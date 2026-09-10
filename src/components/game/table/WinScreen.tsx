import { Trophy } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { describeGap, formatTime, useSessionStore } from '../../../store/useSessionStore';
import { WinCascade } from './WinCascade';

export interface WinScreenProps {
  /** XP this game awards, so the number matches what the store banked. */
  xp: number;
  /** Deal a fresh hand. */
  onNewDeal: () => void;
  /** Deal these same cards again, for another go at the time. */
  onReplay: () => void;
}

/** How long the cascade runs alone before the panel fades in over it. */
const PANEL_DELAY_MS = 1400;

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[11px] uppercase tracking-widest text-green-300/60">{label}</span>
      <span className={`font-mono tabular-nums ${strong ? 'text-2xl text-yellow-300' : 'text-2xl text-white'}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * What a player sees on winning.
 *
 * The cards come off the foundations first and the numbers arrive a moment
 * later, over the top. Putting the panel up straight away would cover the one
 * part of this a player actually wants to watch.
 */
export function WinScreen({ xp, onNewDeal, onReplay }: WinScreenProps) {
  const result = useSessionStore((state) => state.result);
  const [showPanel, setShowPanel] = useState(false);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    // With the cascade suppressed there is nothing to wait for, so the numbers
    // arrive immediately rather than after a pause with an empty screen.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShowPanel(true);
      return;
    }
    const id = window.setTimeout(() => setShowPanel(true), PANEL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const beatenBy =
    result && result.previousBest !== null && result.seconds < result.previousBest
      ? result.previousBest - result.seconds
      : null;
  const isFirstWin = result !== null && result.previousBest === null;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      onClick={() => {
        setStopped(true);
        setShowPanel(true);
      }}
    >
      <WinCascade stopped={stopped} />

      <div
        className={`relative z-30 flex flex-col items-center gap-6 rounded-2xl bg-green-950 px-10 py-8 shadow-2xl shadow-black/50 ring-1 ring-white/15 transition-opacity duration-500 ${
          showPanel ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <Trophy className="w-14 h-14 text-yellow-400" />
          <h2 className="text-3xl font-bold text-white">You Won!</h2>
        </div>

        {result && (
          <div className="flex items-start gap-8 sm:gap-10">
            <Stat label="Time" value={formatTime(result.seconds)} strong={beatenBy !== null || isFirstWin} />
            <Stat label="Moves" value={String(result.moves)} />
            <Stat
              label="Best"
              value={result.previousBest === null ? '—' : formatTime(result.previousBest)}
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-1 text-sm">
          {beatenBy !== null && (
            <span className="text-yellow-300 font-medium">
              New best time, {describeGap(beatenBy)} faster
            </span>
          )}
          {isFirstWin && (
            <span className="text-yellow-300 font-medium">First win — that is the time to beat</span>
          )}
          <span className="text-green-300/70">+{xp} XP</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onNewDeal}
            className="px-5 py-2.5 bg-white text-green-900 font-bold rounded-xl hover:bg-green-100 transition-colors"
          >
            New deal
          </button>
          <button
            onClick={onReplay}
            className="px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl ring-1 ring-white/20 hover:bg-white/20 transition-colors"
          >
            Replay this deal
          </button>
        </div>
      </div>
    </div>
  );
}
