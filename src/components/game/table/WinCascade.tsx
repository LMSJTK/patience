import React, { useEffect, useRef } from 'react';
import { createDeck } from '../../../lib/cards';

/**
 * The cards falling off the foundations at the end of a game.
 *
 * The oldest celebration in computer solitaire, and still the best one: cards
 * launch from the finished piles, bounce off the bottom of the screen and
 * scatter, each leaving a trail of itself behind. The trail is the whole
 * effect and it comes for free — the canvas is simply never cleared, so every
 * frame a card was drawn in stays drawn.
 *
 * Everything is painted rather than laid out. Fifty-two DOM nodes bouncing at
 * sixty frames a second would fight the browser for layout; one canvas does
 * not, and it can leave a trail, which DOM nodes cannot.
 */

/** Fraction of speed kept after hitting the floor. */
const BOUNCE = 0.78;
/** Downward acceleration, in pixels per frame squared. */
const GRAVITY = 0.42;
/** A new card leaves the pile this often. */
const LAUNCH_EVERY_MS = 110;
/** However long the cards take, the celebration ends by here. */
const MAX_MS = 22000;

interface Faller {
  rank: string;
  suit: string;
  red: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

/** Draw one card face: white, rounded, rank and pip in the corner. */
function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Faller,
  w: number,
  h: number
) {
  const r = w * 0.09;
  const x = card.x;
  const y = card.y;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = '#fdfdfb';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.stroke();

  ctx.fillStyle = card.red ? '#c4302b' : '#15201a';
  ctx.textBaseline = 'top';
  ctx.font = `600 ${Math.round(w * 0.3)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(card.rank, x + w * 0.1, y + h * 0.05);
  ctx.font = `${Math.round(w * 0.26)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(GLYPH[card.suit] ?? '', x + w * 0.1, y + h * 0.3);
}

export interface WinCascadeProps {
  /** Stops the animation early — a click anywhere, or the panel being dismissed. */
  stopped?: boolean;
}

export function WinCascade({ stopped = false }: WinCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stoppedRef = useRef(stopped);
  stoppedRef.current = stopped;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Someone who has asked for less movement gets a still, empty screen
    // rather than fifty-two cards ricocheting across it.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cardW = Math.max(44, Math.min(96, width / 16));
    const cardH = cardW * 1.5;

    // One pile per suit, as the foundations are, and the kings come off first:
    // the aces went up last, so they are underneath.
    const bySuit = new Map<string, Faller[]>();
    for (const card of createDeck()) {
      const pile = bySuit.get(card.suit) ?? [];
      pile.push({
        rank: card.rank,
        suit: card.suit,
        red: card.color === 'red',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      });
      bySuit.set(card.suit, pile);
    }
    // Alternating colours across the table, rather than both reds on one side
    // and both blacks on the other, which is how the deck happens to be built.
    const order = ['hearts', 'clubs', 'diamonds', 'spades'];
    const piles = order
      .map((suit) => bySuit.get(suit))
      .filter((pile): pile is Faller[] => pile !== undefined)
      .map((pile) => pile.reverse());

    const spread = Math.min(width * 0.55, piles.length * cardW * 1.7);
    const left = (width - spread) / 2;

    // Round-robin, so all four piles are falling at once rather than one suit
    // emptying before the next begins.
    const waiting: Faller[] = [];
    for (let depth = 0; depth < 13; depth++) {
      piles.forEach((pile, i) => {
        const card = pile[depth];
        if (!card) return;
        card.x = left + (spread / piles.length) * i;
        card.y = height * (0.12 + Math.random() * 0.05);
        // Away from the middle, so the screen fills outwards from the centre.
        card.vx = (i < piles.length / 2 ? -1 : 1) * (1.4 + Math.random() * 4);
        card.vy = -(0.5 + Math.random() * 3);
        waiting.push(card);
      });
    }

    const flying: Faller[] = [];
    const started = performance.now();
    let lastLaunch = 0;
    let frame = 0;

    const step = (now: number) => {
      const elapsed = now - started;

      if (stoppedRef.current || elapsed > MAX_MS) return;

      if (waiting.length && elapsed - lastLaunch >= LAUNCH_EVERY_MS) {
        flying.push(waiting.shift()!);
        lastLaunch = elapsed;
      }

      for (let i = flying.length - 1; i >= 0; i--) {
        const card = flying[i];
        card.vy += GRAVITY;
        card.x += card.vx;
        card.y += card.vy;

        if (card.y + cardH > height) {
          card.y = height - cardH;
          card.vy = -card.vy * BOUNCE;
          // A card that has stopped bouncing would sit there juddering.
          if (Math.abs(card.vy) < 2) card.vy = -6 - Math.random() * 3;
        }

        drawCard(ctx, card, cardW, cardH);

        if (card.x < -cardW * 1.5 || card.x > width + cardW * 0.5) flying.splice(i, 1);
      }

      if (waiting.length === 0 && flying.length === 0) return;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
