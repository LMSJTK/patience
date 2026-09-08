#!/usr/bin/env node
/**
 * Measure how long a card takes to move, and how it gets there.
 *
 * Deals Klondike until an ace is face-up on a tableau column, then clicks it
 * to the foundation while sampling its position every animation frame. Prints
 * how far along the card is at each moment and when it finally settles.
 *
 * This is the number Phase 2 has to move: a click-move currently settles
 * around 512 ms, and should land under 250 ms.
 *
 *   npm run dev
 *   node scripts/trace-move.mjs
 *
 * Options: --url <base>  --json <file>  --width <px>  --height <px>
 */
import { writeFileSync } from 'node:fs';
import { baseUrl, flag, launch, useFixedDeal, waitForBoard } from './lib/browser.mjs';

const url = baseUrl();
const width = Number(flag('width', '1920'));
const height = Number(flag('height', '1080'));
const jsonOut = flag('json', null);

/** Read the board's structure: the foundations, and the top card of each column. */
function readBoard() {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const rows = Array.from(document.querySelector('main > div').children);
  const foundations = Array.from(rows[1].children[1].children).map(box);
  const columns = Array.from(rows[2].children).map((col, i) => {
    const cards = Array.from(col.children);
    const top = cards[cards.length - 1];
    const suit = top
      ? ['heart', 'diamond', 'club', 'spade'].find((s) => top.querySelector(`svg.lucide-${s}`))
      : null;
    return { index: i, count: cards.length, label: top ? top.textContent.trim() : '', suit, rect: top ? box(top) : null };
  });
  return { foundations, columns };
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width, height } });

// Deal until an ace is sitting face-up somewhere we can click it. Each attempt
// uses a different pinned deal so the search is still reproducible.
let board = null;
let ace = null;
for (let attempt = 0; attempt < 25 && !ace; attempt++) {
  await useFixedDeal(page, 0.1 + attempt * 0.03);
  await page.goto(`${url}/play/klondike`, { waitUntil: 'domcontentloaded' });
  await waitForBoard(page);
  board = await page.evaluate(readBoard);
  ace = board.columns.find((c) => c.label === 'AA');
}
if (!ace) {
  console.error('No face-up ace turned up in 25 deals; nothing to trace.');
  await browser.close();
  process.exit(1);
}

const start = { ...ace.rect };
const target = board.foundations[0];
console.log(`Tracing the ace of ${ace.suit}s: column ${ace.index} at x=${start.x}, foundation at x=${target.x}`);

// Sample the card's position on every animation frame for 800 ms.
await page.evaluate((suit) => {
  window.__samples = [];
  window.__done = false;
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now() - t0;
    const el = Array.from(document.querySelectorAll('div')).find(
      (e) => e.textContent === 'AA' && e.className.includes('bg-white') && e.querySelector('svg.lucide-' + suit)
    );
    if (el) {
      const r = el.getBoundingClientRect();
      window.__samples.push({ t: Math.round(now), x: Math.round(r.x), y: Math.round(r.y) });
    }
    if (now < 800) requestAnimationFrame(tick);
    else window.__done = true;
  };
  requestAnimationFrame(tick);
}, ace.suit);

await page.mouse.click(start.x + start.w / 2, start.y + start.h / 2);
await page.waitForFunction(() => window.__done, null, { timeout: 5000 });
const samples = await page.evaluate(() => window.__samples);

const from = samples[0].x;
const to = samples[samples.length - 1].x;
const distance = to - from;
if (Math.abs(distance) < 5) {
  console.error('The card never moved. It may have had nowhere legal to go.');
  await browser.close();
  process.exit(1);
}

const progress = samples.map((s) => ({ ...s, pct: Math.round(((s.x - from) / distance) * 1000) / 10 }));
const reach = (pct) => progress.find((p) => p.pct >= pct)?.t ?? null;
const settled = progress.find((p) => p.pct >= 99.5)?.t ?? null;

console.log('\n  time    progress');
for (const p of progress.filter((_, i) => i % 3 === 0 || i === progress.length - 1)) {
  const bar = '#'.repeat(Math.max(0, Math.round(p.pct / 2.5)));
  console.log(`  ${String(p.t).padStart(4)}ms  ${String(p.pct).padStart(5)}%  ${bar}`);
}

console.log('\nmilestones');
for (const pct of [5, 25, 50, 75, 90]) console.log(`  ${String(pct).padStart(3)}% at ${reach(pct)}ms`);
console.log(`  settled at ${settled}ms`);
console.log(settled != null && settled <= 250 ? '\nPASS: settles within 250ms' : '\nSLOW: target is 250ms');

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ suit: ace.suit, from, to, samples: progress, settled }, null, 2) + '\n');
  console.log(`\nwrote ${jsonOut}`);
}

await browser.close();
