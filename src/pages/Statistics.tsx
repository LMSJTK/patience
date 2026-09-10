import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Trash2 } from 'lucide-react';
import { GameType } from '../store/useGameStore';
import { GameRecord, totalOf, useRecordStore, winRate } from '../store/useRecordStore';
import { DIFFICULTIES, Difficulty } from '../lib/daily';
import { formatTime } from '../store/useSessionStore';
import { cn } from '../lib/utils';

const GAMES: { id: GameType; name: string }[] = [
  { id: 'klondike', name: 'Klondike' },
  { id: 'freecell', name: 'FreeCell' },
  { id: 'spider', name: 'Spider' },
  { id: 'pyramid', name: 'Pyramid' },
  { id: 'fortythieves', name: 'Forty Thieves' },
  { id: 'missmilligan', name: 'Miss Milligan' },
];

/** Only Klondike and Spider are played at more than one difficulty. */
const TIERS: Partial<Record<GameType, Difficulty[]>> = {
  klondike: ['easy', 'hard'],
  spider: DIFFICULTIES,
};

const dash = '—';

function Figure({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className={cn('font-mono text-2xl tabular-nums', muted ? 'text-slate-600' : 'text-white')}>
        {value}
      </span>
    </div>
  );
}

function Row({ tier, record }: { tier: string; record: GameRecord }) {
  const rate = winRate(record);
  return (
    <tr className="border-t border-slate-800">
      <td className="py-2 pr-4 capitalize text-slate-300">{tier}</td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">{record.played}</td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">{record.won}</td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">
        {rate === null ? dash : `${rate}%`}
      </td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">
        {record.bestTime === null ? dash : formatTime(record.bestTime)}
      </td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">
        {record.fewestMoves === null ? dash : record.fewestMoves}
      </td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">
        {record.bestStreak === 0 ? dash : record.bestStreak}
      </td>
    </tr>
  );
}

/**
 * Everything the player has done, per game and difficulty.
 *
 * The numbers only start from the day the record was added, so a long-standing
 * player's page begins empty. Saying so is better than showing zeroes that
 * look like a loss of data.
 */
export default function Statistics() {
  const records = useRecordStore((state) => state.records);
  const clear = useRecordStore((state) => state.clear);
  const [confirming, setConfirming] = useState(false);

  const total = totalOf(records);
  const overall = winRate(total);
  const anything = total.played > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center gap-4 border-b border-slate-800 bg-slate-950 p-4">
        <Link to="/" className="rounded-full p-2 transition-colors hover:bg-slate-800">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          Statistics
        </h1>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <section className="mb-10 flex flex-wrap gap-x-10 gap-y-6 rounded-2xl border border-slate-800 bg-slate-800/40 p-6">
          <Figure label="Played" value={String(total.played)} muted={!anything} />
          <Figure label="Won" value={String(total.won)} muted={!anything} />
          <Figure label="Win rate" value={overall === null ? dash : `${overall}%`} muted={!anything} />
          <Figure
            label="Best time"
            value={total.bestTime === null ? dash : formatTime(total.bestTime)}
            muted={total.bestTime === null}
          />
          <Figure
            label="Longest streak"
            value={total.bestStreak === 0 ? dash : String(total.bestStreak)}
            muted={total.bestStreak === 0}
          />
        </section>

        {!anything && (
          <p className="mb-10 rounded-xl border border-slate-800 bg-slate-800/30 px-5 py-4 text-sm text-slate-400">
            Nothing here yet. A game counts once you have made a move in it, and counts as lost if you
            start another before finishing it.
          </p>
        )}

        <div className="space-y-8">
          {GAMES.map((game) => {
            const tiers = TIERS[game.id] ?? (['medium'] as Difficulty[]);
            const rows = tiers.map((tier) => ({
              tier,
              record: records[`${game.id}:${tier}`],
            }));
            const played = rows.reduce((n, r) => n + (r.record?.played ?? 0), 0);

            return (
              <section key={game.id}>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <h2 className="text-lg font-semibold">{game.name}</h2>
                  <Link
                    to={`/play/${game.id}`}
                    className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
                  >
                    Play
                  </Link>
                </div>
                {played === 0 ? (
                  <p className="rounded-lg border border-slate-800 px-4 py-3 text-sm text-slate-500">
                    Not played yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[34rem] text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-widest text-slate-500">
                          <th className="py-2 pl-4 pr-4 text-left font-medium">
                            {tiers.length > 1 ? 'Difficulty' : ''}
                          </th>
                          <th className="py-2 pr-4 text-right font-medium">Played</th>
                          <th className="py-2 pr-4 text-right font-medium">Won</th>
                          <th className="py-2 pr-4 text-right font-medium">Rate</th>
                          <th className="py-2 pr-4 text-right font-medium">Best time</th>
                          <th className="py-2 pr-4 text-right font-medium">Fewest moves</th>
                          <th className="py-2 pr-4 text-right font-medium">Best streak</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr>td:first-child]:pl-4">
                        {rows.map(({ tier, record }) => (
                          <Row
                            key={tier}
                            tier={tiers.length > 1 ? tier : 'All'}
                            record={record ?? { played: 0, won: 0, bestTime: null, fewestMoves: null, currentStreak: 0, bestStreak: 0 }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {anything && (
          <div className="mt-12 border-t border-slate-800 pt-6">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-400">Clear every figure on this page?</span>
                <button
                  onClick={() => {
                    clear();
                    setConfirming(false);
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
                >
                  Clear it
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
              >
                <Trash2 className="h-4 w-4" /> Reset statistics
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
