import { beforeEach, describe, expect, it } from 'vitest';
import { useDailyStore } from './useDailyStore';

const reset = () => useDailyStore.setState({ completed: {} });

/** Mark a day as having had something finished on it. */
const on = (day: string, id = 'klondike:easy') =>
  useDailyStore.getState().complete(`${day}:${id}`);

describe('completions', () => {
  beforeEach(reset);

  it('records one', () => {
    on('2026-09-10');
    expect(useDailyStore.getState().isComplete('2026-09-10:klondike:easy')).toBe(true);
  });

  it('does not know about one that never happened', () => {
    expect(useDailyStore.getState().isComplete('2026-09-10:spider:hard')).toBe(false);
  });

  it('is idempotent, so replaying a challenge changes nothing', () => {
    on('2026-09-10');
    const first = useDailyStore.getState().completed;
    on('2026-09-10');
    expect(useDailyStore.getState().completed).toBe(first);
  });
});

describe('the streak', () => {
  beforeEach(reset);

  it('is nothing when nothing has been played', () => {
    expect(useDailyStore.getState().streak('2026-09-10')).toBe(0);
  });

  it('counts consecutive days', () => {
    on('2026-09-08');
    on('2026-09-09');
    on('2026-09-10');
    expect(useDailyStore.getState().streak('2026-09-10')).toBe(3);
  });

  it('survives today not being done yet, because the day is not over', () => {
    on('2026-09-08');
    on('2026-09-09');
    expect(useDailyStore.getState().streak('2026-09-10')).toBe(2);
  });

  it('breaks once a whole day has passed with nothing on it', () => {
    on('2026-09-07');
    on('2026-09-08');
    expect(useDailyStore.getState().streak('2026-09-10')).toBe(0);
  });

  it('counts a day once however many of its challenges were finished', () => {
    on('2026-09-10', 'klondike:easy');
    on('2026-09-10', 'spider:medium');
    on('2026-09-10', 'pyramid:hard');
    expect(useDailyStore.getState().streak('2026-09-10')).toBe(1);
  });

  it('runs back across a month boundary', () => {
    on('2026-08-30');
    on('2026-08-31');
    on('2026-09-01');
    expect(useDailyStore.getState().streak('2026-09-01')).toBe(3);
  });

  it('ignores days after today, so a clock set forward cannot inflate it', () => {
    on('2026-09-11');
    on('2026-09-12');
    expect(useDailyStore.getState().streak('2026-09-10')).toBe(0);
  });
});
