import { describe, expect, it } from 'vitest';
import { MAX_SEED } from './rng';
import {
  challengeHref,
  challengeId,
  challengesFor,
  dailySeed,
  optionsFor,
  previousDay,
  todayKey,
} from './daily';

describe('todayKey', () => {
  it('is the local date, not the UTC one', () => {
    // Late evening on the 9th somewhere behind UTC is still the 9th there,
    // and a daily that rolled over mid-evening would be a strange daily.
    const evening = new Date(2026, 8, 9, 23, 30);
    expect(todayKey(evening)).toBe('2026-09-09');
  });

  it('pads to a sortable shape', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('previousDay', () => {
  it('steps back a day', () => {
    expect(previousDay('2026-09-10')).toBe('2026-09-09');
  });

  it('steps back over a month boundary', () => {
    expect(previousDay('2026-09-01')).toBe('2026-08-31');
  });

  it('steps back over a year boundary', () => {
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });
});

describe('dailySeed', () => {
  it('is the same for everyone on the same day', () => {
    expect(dailySeed('2026-09-10', 'klondike', 'easy')).toBe(
      dailySeed('2026-09-10', 'klondike', 'easy')
    );
  });

  it('differs by day, by game and by tier', () => {
    const a = dailySeed('2026-09-10', 'klondike', 'easy');
    expect(dailySeed('2026-09-11', 'klondike', 'easy')).not.toBe(a);
    expect(dailySeed('2026-09-10', 'spider', 'easy')).not.toBe(a);
    expect(dailySeed('2026-09-10', 'klondike', 'hard')).not.toBe(a);
  });

  it('is always a usable deal number', () => {
    for (let d = 1; d <= 60; d++) {
      const day = `2026-09-${d.toString().padStart(2, '0')}`;
      const seed = dailySeed(day, 'freecell', 'medium');
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(MAX_SEED);
    }
  });

  it('does not clump on consecutive days', () => {
    // A naive shift-and-add hash gives near-identical numbers for strings
    // differing only in the last character, which is every date in a month.
    const seeds = new Set<number>();
    for (let d = 1; d <= 28; d++) {
      seeds.add(dailySeed(`2026-02-${d.toString().padStart(2, '0')}`, 'klondike', 'easy'));
    }
    expect(seeds.size).toBe(28);
  });
});

describe('challengesFor', () => {
  it('offers three, easiest first', () => {
    const day = challengesFor('2026-09-10');
    expect(day.map((c) => c.difficulty)).toEqual(['easy', 'medium', 'hard']);
  });

  it('gives the same three every time it is asked', () => {
    expect(challengesFor('2026-09-10')).toEqual(challengesFor('2026-09-10'));
  });

  it('offers three different games, so a day is not all Klondike', () => {
    for (let d = 1; d <= 31; d++) {
      const day = `2026-07-${d.toString().padStart(2, '0')}`;
      const games = challengesFor(day).map((c) => c.game);
      expect(new Set(games).size).toBe(3);
    }
  });

  it('changes from one day to the next', () => {
    const a = challengesFor('2026-09-10').map((c) => c.game).join();
    const b = challengesFor('2026-09-11').map((c) => c.game).join();
    expect(a).not.toBe(b);
  });

  it('names its completions after the day, game and tier', () => {
    const [easy] = challengesFor('2026-09-10');
    expect(easy.id).toBe(challengeId('2026-09-10', easy.game, 'easy'));
  });
});

describe('optionsFor', () => {
  it('makes a hard Klondike draw three', () => {
    expect(optionsFor('klondike', 'easy')).toEqual({ draw: '1' });
    expect(optionsFor('klondike', 'hard')).toEqual({ draw: '3' });
  });

  it('adds suits to Spider as the tier rises', () => {
    expect(optionsFor('spider', 'easy')).toEqual({ suits: '1' });
    expect(optionsFor('spider', 'medium')).toEqual({ suits: '2' });
    expect(optionsFor('spider', 'hard')).toEqual({ suits: '4' });
  });

  it('leaves games with no difficulty setting alone', () => {
    expect(optionsFor('pyramid', 'hard')).toEqual({});
  });
});

describe('challengeHref', () => {
  it('carries the deal, the challenge and the settings', () => {
    const challenge = challengesFor('2026-09-10').find((c) => c.game === 'klondike');
    if (!challenge) return; // not every day offers Klondike
    const url = new URL(challengeHref(challenge), 'https://example.test');
    expect(url.pathname).toBe('/play/klondike');
    expect(url.searchParams.get('deal')).toBe(String(challenge.seed));
    expect(url.searchParams.get('daily')).toBe(challenge.id);
    expect(url.searchParams.get('draw')).toBe(challenge.difficulty === 'easy' ? '1' : '3');
  });
});
