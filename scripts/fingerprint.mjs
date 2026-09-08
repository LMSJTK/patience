#!/usr/bin/env node
/**
 * Record what every board renders, as JSON.
 *
 * Run it before and after a change that is meant to be invisible, then diff
 * the two files. The deal is pinned, so any difference is the change's doing.
 *
 *   npm run dev
 *   node scripts/fingerprint.mjs --out before.json
 *   ...make the change...
 *   node scripts/fingerprint.mjs --out after.json
 *   diff before.json after.json
 *
 * Options: --url <base>  --out <file>  --width <px>  --height <px>
 */
import { writeFileSync } from 'node:fs';
import { GAMES, baseUrl, flag, launch, useFixedDeal, waitForBoard } from './lib/browser.mjs';

/**
 * Describe every card and pile on screen: what it is, where it is, how big.
 * Runs in the page, so it sees the same DOM a player does.
 */
function readBoard() {
  const round = (n) => Math.round(n);
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) };
  };
  const suitOf = (el) => {
    for (const s of ['heart', 'diamond', 'club', 'spade']) {
      if (el.querySelector(`svg.lucide-${s}`)) return s;
    }
    return null;
  };

  // A card is a positioned div carrying either a face or a back.
  const cards = Array.from(document.querySelectorAll('main div')).filter(
    (el) => el.className.includes('rounded-lg') || el.className.includes('rounded-xl')
  );

  const faces = [];
  const backs = [];
  for (const el of cards) {
    const b = box(el);
    if (b.w === 0 || b.h === 0) continue;
    if (el.className.includes('bg-white')) {
      faces.push({ rank: (el.textContent || '').trim().slice(0, 3), suit: suitOf(el), ...b });
    } else if (el.querySelector('img') || el.className.includes('from-indigo-500')) {
      backs.push(b);
    }
  }

  const sortBox = (a, b) => a.y - b.y || a.x - b.x;
  faces.sort(sortBox);
  backs.sort(sortBox);

  return {
    viewport: { w: innerWidth, h: innerHeight },
    faceUp: faces,
    faceDown: backs,
    counts: { faceUp: faces.length, faceDown: backs.length },
    // The board container, whose width is the max-w-* cap in effect.
    table: document.querySelector('main > div') ? box(document.querySelector('main > div')) : null,
  };
}

const url = baseUrl();
const out = flag('out', 'fingerprint.json');
const width = Number(flag('width', '1280'));
const height = Number(flag('height', '900'));

const browser = await launch();
const page = await browser.newPage({ viewport: { width, height } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message)));

await useFixedDeal(page);

const result = { width, height, games: {} };
for (const game of GAMES) {
  await page.goto(`${url}/play/${game}`, { waitUntil: 'domcontentloaded' });
  await waitForBoard(page);
  result.games[game] = await page.evaluate(readBoard);
  const n = result.games[game].counts;
  console.log(`${game.padEnd(13)} ${n.faceUp} face up, ${n.faceDown} face down`);
}

result.pageErrors = pageErrors;
if (pageErrors.length) console.error('\npage errors:', pageErrors);

writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(`\nwrote ${out}`);
await browser.close();
process.exit(pageErrors.length ? 1 : 0);
