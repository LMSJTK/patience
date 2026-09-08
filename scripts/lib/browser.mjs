import { chromium } from 'playwright';

/**
 * Launch Chromium.
 *
 * Honours CHROMIUM_PATH so a machine that already has a browser (a CI image,
 * a sandbox) does not have to download another one. Otherwise Playwright uses
 * the browser it manages: run `npx playwright install chromium` once.
 */
export async function launch() {
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  try {
    return await chromium.launch({ executablePath });
  } catch (cause) {
    throw new Error(
      `Could not start Chromium. Run "npx playwright install chromium", or set ` +
        `CHROMIUM_PATH to an existing browser.\n${cause.message}`
    );
  }
}

/**
 * Pin the deal.
 *
 * Deals are seeded from randomSeed(), which draws once from Math.random. Fix
 * that and every game deals the same cards on every run, which is what lets
 * two runs of these scripts be compared.
 */
export async function useFixedDeal(page, value = 0.4242424242) {
  await page.addInitScript((v) => {
    Math.random = () => v;
  }, value);
}

/**
 * A fingerprint of where every card is and how big it is, right now.
 *
 * Cards only — not the empty pile frames. The frames are laid out before a
 * single card exists, so including them makes an undealt board look settled.
 */
function cardGeometry() {
  const cards = Array.from(document.querySelectorAll('main div')).filter(
    (el) =>
      el.className.includes('rounded') &&
      (el.className.includes('bg-white') ||
        el.className.includes('from-indigo-500') ||
        el.querySelector('img'))
  );
  if (cards.length === 0) return '';
  return cards
    .map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
    })
    .join('|');
}

/**
 * Wait until the board has stopped moving.
 *
 * Cards are dealt with a staggered entry animation, so a board is not ready to
 * measure the moment it appears. Waiting a fixed time is not enough either:
 * under load the deal starts later and a timeout catches cards mid-flight, at
 * the wrong size. Polling until two readings agree is load-independent.
 */
export async function waitForBoard(page, { settleMs = 250, timeoutMs = 15000 } = {}) {
  await page.waitForSelector('main > div', { timeout: timeoutMs });

  const deadline = Date.now() + timeoutMs;
  let previous = null;
  while (Date.now() < deadline) {
    const current = await page.evaluate(cardGeometry);
    if (current && current === previous) return;
    previous = current;
    await page.waitForTimeout(settleMs);
  }
  throw new Error('The board never stopped moving; something is animating forever.');
}

export const GAMES = [
  'klondike',
  'freecell',
  'spider',
  'pyramid',
  'fortythieves',
  'missmilligan',
];

/** Read the base URL from argv or fall back to the dev server. */
export function baseUrl(argv = process.argv) {
  const i = argv.indexOf('--url');
  return i !== -1 ? argv[i + 1] : 'http://127.0.0.1:3000';
}

/** Read a named string flag from argv. */
export function flag(name, fallback = null, argv = process.argv) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : fallback;
}
