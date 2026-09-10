import { useSearchParams } from 'react-router-dom';

/**
 * A game's own settings, taken from the URL.
 *
 * `?deal=` alone says which cards; this says how they are played. Klondike on
 * draw three is a different game from Klondike on draw one, so a link that
 * carries only the deal number reproduces the cards and not the challenge —
 * which is exactly what a daily challenge needs it to do.
 *
 * Anything unrecognised is ignored and the game uses its own default, so a
 * mistyped link still gives a playable game.
 */
export interface DealOptions {
  /** Klondike: how many cards a draw turns over. */
  draw?: 1 | 3;
  /** Spider: how many suits are in play. */
  suits?: 1 | 2 | 4;
  /** Spider: whether part-sequences may be moved. */
  relaxed?: boolean;
  /** Forty Thieves: the Josephine variant. */
  josephine?: boolean;
  /** Miss Milligan: the Tabby Cat variant. */
  tabby?: boolean;
}

const oneOf = <T extends number>(value: string | null, allowed: T[]): T | undefined => {
  const n = Number(value);
  return allowed.includes(n as T) ? (n as T) : undefined;
};

const flag = (value: string | null): boolean | undefined =>
  value === null ? undefined : value === '1' || value === 'true';

export function useDealOptions(): DealOptions {
  const [params] = useSearchParams();
  return {
    draw: oneOf(params.get('draw'), [1, 3]),
    suits: oneOf(params.get('suits'), [1, 2, 4]),
    relaxed: flag(params.get('relaxed')),
    josephine: flag(params.get('josephine')),
    tabby: flag(params.get('tabby')),
  };
}

/** The daily challenge this game is being played for, if any. */
export function useDailyChallenge(): string | null {
  const [params] = useSearchParams();
  return params.get('daily');
}
