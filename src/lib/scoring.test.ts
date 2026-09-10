import { describe, expect, it } from 'vitest';
import {
  ScoringMode,
  VEGAS_BUY_IN,
  formatScore,
  scoreFor,
  startingScore,
  stockPasses,
  timeBonus,
} from './scoring';

describe('with no scoring', () => {
  it('starts at nothing and stays there', () => {
    expect(startingScore('none')).toBe(0);
    for (const event of ['toFoundation', 'wasteToTableau', 'reveal', 'fromFoundation'] as const) {
      expect(scoreFor('none', event)).toBe(0);
    }
  });

  it('lets the stock come round for ever, as this game always has', () => {
    expect(stockPasses('none', 1)).toBe(Infinity);
    expect(stockPasses('none', 3)).toBe(Infinity);
  });
});

describe('standard', () => {
  it('pays for cards played and turned over', () => {
    expect(scoreFor('standard', 'toFoundation')).toBe(10);
    expect(scoreFor('standard', 'wasteToTableau')).toBe(5);
    expect(scoreFor('standard', 'reveal')).toBe(5);
  });

  it('takes points off for pulling a card back down', () => {
    expect(scoreFor('standard', 'fromFoundation')).toBe(-15);
  });

  it('starts at nothing', () => {
    expect(startingScore('standard')).toBe(0);
  });

  it('cannot be farmed by playing a card up and down', () => {
    // Up is +10, back down is -15: the round trip loses five points.
    const round = scoreFor('standard', 'toFoundation') + scoreFor('standard', 'fromFoundation');
    expect(round).toBeLessThan(0);
  });
});

describe('the time bonus', () => {
  it('rewards a fast game far more than a slow one', () => {
    const fast = timeBonus('standard', 120);
    const slow = timeBonus('standard', 1200);
    expect(fast).toBeGreaterThan(slow * 5);
  });

  it('gives nothing for a game that was over in seconds', () => {
    // Otherwise a board set up to be already solved would be worth a fortune.
    expect(timeBonus('standard', 29)).toBe(0);
    expect(timeBonus('standard', 0)).toBe(0);
  });

  it('falls as the clock runs', () => {
    let previous = Infinity;
    for (const seconds of [30, 60, 120, 300, 600, 1800]) {
      const bonus = timeBonus('standard', seconds);
      expect(bonus).toBeLessThan(previous);
      previous = bonus;
    }
  });

  it('belongs to standard scoring alone', () => {
    expect(timeBonus('vegas', 120)).toBe(0);
    expect(timeBonus('none', 120)).toBe(0);
  });
});

describe('vegas', () => {
  it('opens in debt for the deck', () => {
    expect(startingScore('vegas')).toBe(VEGAS_BUY_IN);
    expect(VEGAS_BUY_IN).toBe(-52);
  });

  it('pays five a card home and nothing else', () => {
    expect(scoreFor('vegas', 'toFoundation')).toBe(5);
    expect(scoreFor('vegas', 'wasteToTableau')).toBe(0);
    expect(scoreFor('vegas', 'reveal')).toBe(0);
  });

  it('does not take money off for pulling a card back down', () => {
    // The buy-in has already taken it; charging twice would be a double loss.
    expect(scoreFor('vegas', 'fromFoundation')).toBe(0);
  });

  it('takes eleven cards to clear the buy-in', () => {
    const after = (cards: number) => startingScore('vegas') + cards * scoreFor('vegas', 'toFoundation');
    expect(after(10)).toBeLessThan(0);
    expect(after(11)).toBeGreaterThanOrEqual(0);
    // A full board, so a won game is always worth something.
    expect(after(52)).toBe(208);
  });

  it('limits the stock, which is what makes it hard', () => {
    expect(stockPasses('vegas', 3)).toBe(1);
    expect(stockPasses('vegas', 1)).toBe(3);
  });
});

describe('formatScore', () => {
  it('writes Vegas in dollars, including the debt', () => {
    expect(formatScore('vegas', -52)).toBe('-$52');
    expect(formatScore('vegas', 208)).toBe('$208');
    expect(formatScore('vegas', 0)).toBe('$0');
  });

  it('writes everything else plainly', () => {
    expect(formatScore('standard', 420)).toBe('420');
    expect(formatScore('none', 0)).toBe('0');
  });
});

describe('a whole standard game', () => {
  it('adds up the way a player would count it', () => {
    const mode: ScoringMode = 'standard';
    let score = startingScore(mode);
    // Thirteen cards up, four cards turned over, one card pulled back down.
    for (let i = 0; i < 13; i++) score += scoreFor(mode, 'toFoundation');
    for (let i = 0; i < 4; i++) score += scoreFor(mode, 'reveal');
    score += scoreFor(mode, 'fromFoundation');
    expect(score).toBe(130 + 20 - 15);
  });
});
