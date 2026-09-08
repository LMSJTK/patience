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

/** Wait until a board has laid its cards out. */
export async function waitForBoard(page) {
  await page.waitForSelector('main > div', { timeout: 15000 });
  await page.waitForTimeout(600);
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
