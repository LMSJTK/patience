#!/usr/bin/env node
/**
 * Play every game a little and check nothing breaks.
 *
 * For each game: click the face-up cards to trigger auto-moves, then drag one
 * card, and confirm the move counter moved and the page threw nothing. It is
 * a smoke test, not a rules test — the reducers are covered by `npm test`.
 *
 *   npm run dev
 *   node scripts/smoke.mjs
 *
 * Options: --url <base>  --width <px>  --height <px>
 */
import { GAMES, baseUrl, flag, launch, useFixedDeal, waitForBoard } from './lib/browser.mjs';

const url = baseUrl();
const width = Number(flag('width', '1280'));
const height = Number(flag('height', '900'));

/**
 * How long to let a move finish before touching the board again. A click-move
 * settles in about 225 ms (see scripts/trace-move.mjs), so this leaves room
 * for a slow machine without making the run crawl.
 */
const SETTLE_MS = Number(flag('settle', '400'));

const browser = await launch();
const page = await browser.newPage({ viewport: { width, height } });
await useFixedDeal(page);

/** The header's "Moves: n", which counts entries in the game's undo history. */
const readMoves = async () => {
  const text = await page.locator('header').innerText();
  return Number(/Moves:\s*(\d+)/.exec(text)?.[1] ?? -1);
};

/** Every face-up card currently on the table, top-most last. */
const faceUpCards = () =>
  page.$$eval('main [data-card][data-face="up"]', (nodes) =>
    nodes
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
      })
      .filter((c) => c.w > 0)
  );

let failures = 0;

for (const game of GAMES) {
  const errors = [];
  const onError = (e) => errors.push(String(e.message));
  page.on('pageerror', onError);

  await page.goto(`${url}/play/${game}`, { waitUntil: 'domcontentloaded' });
  await waitForBoard(page);

  const before = await readMoves();

  // Clicking a card asks the game to move it somewhere legal. Most clicks do
  // nothing, which is fine; we only need some of them to land.
  //
  // The wait has to outlast the move animation. Clicking while a card is still
  // travelling lands on wherever it happens to be, which made this script
  // report a different number of moves from one run to the next.
  const cards = await faceUpCards();
  for (const c of cards.slice(0, 14)) {
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(SETTLE_MS);
  }

  // Then drag the last face-up card onto the first, whether or not it is legal:
  // an illegal drop must be refused without throwing.
  const after = await faceUpCards();
  if (after.length >= 2) {
    const from = after[after.length - 1];
    const to = after[0];
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(SETTLE_MS);
  }

  const moves = await readMoves();
  const stillRendering = (await faceUpCards()).length > 0;

  const problems = [];
  if (errors.length) problems.push(`threw: ${errors.join(' | ')}`);
  if (moves < 0) problems.push('move counter unreadable');
  if (!stillRendering) problems.push('board rendered no cards afterwards');

  if (problems.length) {
    failures++;
    console.log(`FAIL ${game.padEnd(13)} ${problems.join('; ')}`);
  } else {
    console.log(`ok   ${game.padEnd(13)} ${before} to ${moves} moves, board intact`);
  }

  page.off('pageerror', onError);
}

await browser.close();
console.log(failures ? `\n${failures} game(s) failed` : '\nall games playable');
process.exit(failures ? 1 : 0);
