import { useSearchParams } from 'react-router-dom';
import { parseSeed } from '../../../lib/rng';

/**
 * The deal to open, taken from `?deal=` in the URL.
 *
 * Returns undefined when the URL asks for nothing usable, which leaves the
 * game to deal a fresh random hand. Anything unparseable is treated as absent
 * rather than as deal zero, so a mistyped link still gives a playable game.
 *
 * This is what makes `/play/klondike?deal=8675309` open the same cards for
 * two different people.
 */
export function useDealSeed(): number | undefined {
  const [params] = useSearchParams();
  return parseSeed(params.get('deal')) ?? undefined;
}
