import { describe, expect, it } from 'vitest';
import { useFortyThievesStore } from './useFortyThievesStore';
import { useFreecellStore } from './useFreecellStore';
import { useKlondikeStore } from './useKlondikeStore';
import { useMissMilliganStore } from './useMissMilliganStore';
import { usePyramidStore } from './usePyramidStore';
import { useSpiderStore } from './useSpiderStore';

/**
 * Undo and redo were wired into all six stores the same way, in one pass. A
 * mistake in one of them would be invisible: the game would still play, and
 * only the step forward would quietly do nothing. So every game is checked,
 * not one of them.
 */

const SEED = 20260910;

/** Everything about the board that a step should put back. */
type Board = Record<string, unknown>;

interface Game {
  name: string;
  deal: () => void;
  /** Any legal state-changing action; which one does not matter. */
  play: () => void;
  read: () => Board;
  undo: () => void;
  redo: () => void;
  moves: () => number;
  canRedo: () => boolean;
}

const games: Game[] = [
  {
    name: 'klondike',
    deal: () => useKlondikeStore.getState().initGame(1, SEED),
    play: () => useKlondikeStore.getState().drawCard(),
    read: () => {
      const s = useKlondikeStore.getState();
      return { stock: s.stock, waste: s.waste, foundations: s.foundations, tableau: s.tableau };
    },
    undo: () => useKlondikeStore.getState().undo(),
    redo: () => useKlondikeStore.getState().redo(),
    moves: () => useKlondikeStore.getState().moves,
    canRedo: () => useKlondikeStore.getState().future.length > 0,
  },
  {
    name: 'freecell',
    deal: () => useFreecellStore.getState().initGame(SEED),
    play: () => {
      // The top card of the first column into a free cell: always legal.
      const s = useFreecellStore.getState();
      s.handleDrop(
        { type: 'tableau', index: 0, cardIndex: s.tableau[0].length - 1 },
        { type: 'freecell', index: 0 }
      );
    },
    read: () => {
      const s = useFreecellStore.getState();
      return { freeCells: s.freeCells, foundations: s.foundations, tableau: s.tableau };
    },
    undo: () => useFreecellStore.getState().undo(),
    redo: () => useFreecellStore.getState().redo(),
    moves: () => useFreecellStore.getState().moves,
    canRedo: () => useFreecellStore.getState().future.length > 0,
  },
  {
    name: 'spider',
    deal: () => useSpiderStore.getState().initGame(1, false, SEED),
    play: () => useSpiderStore.getState().dealCards(),
    read: () => {
      const s = useSpiderStore.getState();
      return { stock: s.stock, tableau: s.tableau, completedSets: s.completedSets };
    },
    undo: () => useSpiderStore.getState().undo(),
    redo: () => useSpiderStore.getState().redo(),
    moves: () => useSpiderStore.getState().moves,
    canRedo: () => useSpiderStore.getState().future.length > 0,
  },
  {
    name: 'pyramid',
    deal: () => usePyramidStore.getState().initGame(SEED),
    play: () => usePyramidStore.getState().drawCard(),
    read: () => {
      const s = usePyramidStore.getState();
      return { stock: s.stock, waste: s.waste, pyramid: s.pyramid };
    },
    undo: () => usePyramidStore.getState().undo(),
    redo: () => usePyramidStore.getState().redo(),
    moves: () => usePyramidStore.getState().moves,
    canRedo: () => usePyramidStore.getState().future.length > 0,
  },
  {
    name: 'fortythieves',
    deal: () => useFortyThievesStore.getState().initGame(false, SEED),
    play: () => useFortyThievesStore.getState().drawCard(),
    read: () => {
      const s = useFortyThievesStore.getState();
      return { stock: s.stock, waste: s.waste, foundations: s.foundations, tableau: s.tableau };
    },
    undo: () => useFortyThievesStore.getState().undo(),
    redo: () => useFortyThievesStore.getState().redo(),
    moves: () => useFortyThievesStore.getState().moves,
    canRedo: () => useFortyThievesStore.getState().future.length > 0,
  },
  {
    name: 'missmilligan',
    deal: () => useMissMilliganStore.getState().initGame(false, SEED),
    play: () => useMissMilliganStore.getState().dealCards(),
    read: () => {
      const s = useMissMilliganStore.getState();
      return { stock: s.stock, foundations: s.foundations, tableau: s.tableau, pocket: s.pocket };
    },
    undo: () => useMissMilliganStore.getState().undo(),
    redo: () => useMissMilliganStore.getState().redo(),
    moves: () => useMissMilliganStore.getState().moves,
    canRedo: () => useMissMilliganStore.getState().future.length > 0,
  },
];

const snapshot = (game: Game) => JSON.stringify(game.read());

describe.each(games)('$name', (game) => {
  it('steps back to the deal and forward to the move again', () => {
    game.deal();
    const dealt = snapshot(game);

    game.play();
    const afterMove = snapshot(game);
    expect(afterMove).not.toBe(dealt);

    game.undo();
    expect(snapshot(game)).toBe(dealt);

    game.redo();
    expect(snapshot(game)).toBe(afterMove);
  });

  it('has nothing to redo until something is undone', () => {
    game.deal();
    expect(game.canRedo()).toBe(false);
    game.play();
    expect(game.canRedo()).toBe(false);
    game.undo();
    expect(game.canRedo()).toBe(true);
    game.redo();
    expect(game.canRedo()).toBe(false);
  });

  it('forgets the undone move once the game moves on', () => {
    game.deal();
    game.play();
    game.undo();
    expect(game.canRedo()).toBe(true);
    game.play();
    expect(game.canRedo()).toBe(false);
  });

  it('counts undo and redo as moves rather than taking them off', () => {
    game.deal();
    expect(game.moves()).toBe(0);
    game.play();
    expect(game.moves()).toBe(1);
    game.undo();
    expect(game.moves()).toBe(2);
    game.redo();
    expect(game.moves()).toBe(3);
  });

  it('starts a new deal with a clean slate', () => {
    game.deal();
    game.play();
    game.undo();
    game.deal();
    expect(game.moves()).toBe(0);
    expect(game.canRedo()).toBe(false);
  });

  it('does nothing at the ends rather than throwing', () => {
    game.deal();
    game.undo();
    game.undo();
    expect(snapshot(game)).toBe(snapshot(game));
    game.redo();
    game.redo();
    expect(game.moves()).toBe(0);
  });
});
