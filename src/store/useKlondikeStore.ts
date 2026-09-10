import { create } from 'zustand';
import { freshTimeline, played, stepBack, stepForward } from './history';
import { Hint, klondikeHints } from '../lib/solitaire/hints';
import { Card, createDeck, revealTop, shuffleDeck } from '../lib/cards';
import { mulberry32, randomSeed } from '../lib/rng';
import { canMoveToFoundation, canMoveToTableau } from '../lib/solitaire/klondike';
import { nextAutoMove, willAutoCompleteClear } from '../lib/solitaire/klondikeAuto';
import { useGameStore } from './useGameStore';
import { ScoreEvent, ScoringMode, scoreFor, startingScore, stockPasses } from '../lib/scoring';
import { useSettingsStore } from './useSettingsStore';

export type CardLocation = 
  | { type: 'waste' }
  | { type: 'tableau', index: number, cardIndex: number }
  | { type: 'foundation', index: number };

interface GameStateSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  /** Stepping back has to put the score back too. */
  score: number;
  stockPasses: number;
}

interface KlondikeState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  drawCount: 1 | 3;
  selectedLocation: CardLocation | null;
  isWon: boolean;
  /** The number this deal was shuffled from. Replaying it reproduces these cards. */
  seed: number;
  /** Points under the scoring in force, or 0 when none is. */
  score: number;
  /** How the score is being kept, fixed for the length of a deal. */
  scoring: ScoringMode;
  /** Times the stock has been turned over. Vegas limits it; nothing else does. */
  stockPasses: number;
  /**
   * True once this deal has paid out XP. Undo clears isWon so the board is
   * playable again, but must not clear this, or a win could be banked twice.
   * Only initGame resets it.
   */
  xpAwarded: boolean;
  /** Undo, redo and the move count. */
  history: GameStateSnapshot[];
  future: GameStateSnapshot[];
  moves: number;
  
  initGame: (drawCount: 1 | 3, seed?: number) => void;
  drawCard: () => void;
  selectCard: (location: CardLocation) => void;
  handleDrop: (from: CardLocation, to: { type: 'tableau' | 'foundation', index: number }) => void;
  autoMoveCard: (location: CardLocation) => void;
  undo: () => void;
  /** Walk forward into a move that was undone. */
  redo: () => void;
  /**
   * Every move available right now, best first. Empty means the game is
   * stuck, which is worth telling the player rather than leaving them to
   * discover it.
   */
  hints: () => Hint[];
  checkWin: () => void;
  /** True when pressing Finish would actually finish the game. */
  canAutoComplete: () => boolean;
  /** Play one forced move. False when there is nothing left to do. */
  autoCompleteStep: () => boolean;
}

const cloneState = (state: Partial<KlondikeState>): GameStateSnapshot => ({
  stock: state.stock ? state.stock.map(c => ({...c})) : [],
  waste: state.waste ? state.waste.map(c => ({...c})) : [],
  foundations: state.foundations ? state.foundations.map(col => col.map(c => ({...c}))) : [[], [], [], []],
  tableau: state.tableau ? state.tableau.map(col => col.map(c => ({...c}))) : [[], [], [], [], [], [], []],
  score: state.score ?? 0,
  stockPasses: state.stockPasses ?? 0,
});

export const useKlondikeStore = create<KlondikeState>((set, get) => ({
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  drawCount: 1,
  selectedLocation: null,
  isWon: false,
  xpAwarded: false,
  seed: 0,
  score: 0,
  scoring: 'none',
  stockPasses: 0,
  ...freshTimeline<GameStateSnapshot>(),

  initGame: (drawCount, seed = randomSeed()) => {
    const scoring = useSettingsStore.getState().scoring;
    const deck = shuffleDeck(createDeck(), mulberry32(seed));
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    
    let cardIndex = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck[cardIndex++];
        if (i === j) card.isFaceUp = true;
        tableau[j].push(card);
      }
    }

    set({
      stock: deck.slice(cardIndex),
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      drawCount,
      selectedLocation: null,
      isWon: false,
      xpAwarded: false,
      seed,
      // Read once per deal: changing the scoring mid-game would mean a total
      // that no sequence of moves could have produced.
      scoring,
      score: startingScore(scoring),
      stockPasses: 0,
      ...freshTimeline<GameStateSnapshot>(),
    });
  },

  drawCard: () => set((state) => {
    const snapshot = cloneState(state);

    if (state.stock.length === 0) {
      if (state.waste.length === 0) return state;
      // Vegas is harder because the deck only comes round so many times.
      if (state.stockPasses >= stockPasses(state.scoring, state.drawCount)) return state;
      const newStock = [...state.waste].reverse().map(c => ({ ...c, isFaceUp: false }));
      return {
        stock: newStock,
        waste: [],
        selectedLocation: null,
        stockPasses: state.stockPasses + 1,
        ...played(state, snapshot),
      };
    }

    const drawAmount = Math.min(state.drawCount, state.stock.length);
    const drawnCards = state.stock.slice(-drawAmount).reverse().map(c => ({ ...c, isFaceUp: true }));
    
    return {
      stock: state.stock.slice(0, -drawAmount),
      waste: [...state.waste, ...drawnCards],
      selectedLocation: null,
      ...played(state, snapshot),
    };
  }),

  selectCard: (location) => {
    // We will replace selectCard usage with autoMoveCard for single clicks
    // but keep it for compatibility if needed.
    get().autoMoveCard(location);
  },

  autoMoveCard: (location) => {
    const state = get();
    let movingCards: Card[] = [];
    
    if (location.type === 'waste') {
      if (state.waste.length === 0) return;
      movingCards = [state.waste[state.waste.length - 1]];
    } else if (location.type === 'tableau') {
      const col = state.tableau[location.index];
      movingCards = col.slice(location.cardIndex);
    } else if (location.type === 'foundation') {
      const col = state.foundations[location.index];
      if (col.length === 0) return;
      movingCards = [col[col.length - 1]];
    }

    if (movingCards.length === 0) return;
    const firstMovingCard = movingCards[0];

    // Try foundation first (only if moving a single card)
    if (movingCards.length === 1) {
      for (let i = 0; i < 4; i++) {
        const targetCol = state.foundations[i];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          get().handleDrop(location, { type: 'foundation', index: i });
          return;
        }
      }
    }

    // Try tableau
    for (let i = 0; i < 7; i++) {
      // Don't move to same column
      if (location.type === 'tableau' && location.index === i) continue;
      
      const targetCol = state.tableau[i];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
      if (canMoveToTableau(targetCard, firstMovingCard)) {
        // If moving a King from an empty column to another empty column, skip
        if (firstMovingCard.rank === 'K' && !targetCard && location.type === 'tableau' && location.cardIndex === 0) {
          continue;
        }
        get().handleDrop(location, { type: 'tableau', index: i });
        return;
      }
    }
  },

  handleDrop: (from, to) => {
    set((state) => {
      let movingCards: Card[] = [];
      let newWaste = [...state.waste];
      let newTableau = state.tableau.map(col => [...col]);
      let newFoundations = state.foundations.map(col => [...col]);

      if (from.type === 'waste') {
        if (newWaste.length === 0) return state;
        movingCards = [newWaste[newWaste.length - 1]];
      } else if (from.type === 'tableau') {
        const col = newTableau[from.index];
        movingCards = col.slice(from.cardIndex);
      } else if (from.type === 'foundation') {
        const col = newFoundations[from.index];
        if (col.length === 0) return state;
        movingCards = [col[col.length - 1]];
      }

      if (movingCards.length === 0) return state;

      const firstMovingCard = movingCards[0];
      let isValid = false;

      if (to.type === 'tableau') {
        const targetCol = newTableau[to.index];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToTableau(targetCard, firstMovingCard)) {
          isValid = true;
          newTableau[to.index] = [...targetCol, ...movingCards];
        }
      } else if (to.type === 'foundation') {
        if (movingCards.length > 1) return state;
        
        const targetCol = newFoundations[to.index];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          isValid = true;
          newFoundations[to.index] = [...targetCol, ...movingCards];
        }
      }

      if (isValid) {
        const snapshot = cloneState(state);
        const events: ScoreEvent[] = [];
        if (to.type === 'foundation') events.push('toFoundation');
        if (from.type === 'waste' && to.type === 'tableau') events.push('wasteToTableau');
        if (from.type === 'foundation') events.push('fromFoundation');

        if (from.type === 'waste') {
          newWaste.pop();
        } else if (from.type === 'tableau') {
          const before = newTableau[from.index].length;
          newTableau[from.index] = newTableau[from.index].slice(0, from.cardIndex);
          const column = newTableau[from.index];
          const hidden = column.length > 0 && !column[column.length - 1].isFaceUp;
          revealTop(column);
          if (hidden && before > from.cardIndex) events.push('reveal');
        } else if (from.type === 'foundation') {
          newFoundations[from.index].pop();
        }

        const gained = events.reduce((n, event) => n + scoreFor(state.scoring, event), 0);

        return {
          waste: newWaste,
          tableau: newTableau,
          foundations: newFoundations,
          selectedLocation: null,
          score: state.score + gained,
          ...played(state, snapshot),
        };
      }

      return state;
    });
    
    get().checkWin();
  },

  undo: () => set((state) => {
    const step = stepBack<GameStateSnapshot>(state, cloneState(state));
    if (!step) return state;
    const { restored, ...timeline } = step;
    return {
      ...restored,
      ...timeline,
      selectedLocation: null,
      isWon: false,
    };
  }),

  redo: () => set((state) => {
    const step = stepForward<GameStateSnapshot>(state, cloneState(state));
    if (!step) return state;
    const { restored, ...timeline } = step;
    return {
      ...restored,
      ...timeline,
      selectedLocation: null,
      isWon: false,
    };
  }),

  canAutoComplete: () => {
    const state = get();
    if (state.isWon) return false;
    // Simulated in full rather than guessed at, so the button never appears
    // on a board it cannot actually finish. Cheap until the endgame: the
    // check bails immediately while any card is still face down.
    return willAutoCompleteClear(state, state.drawCount);
  },

  autoCompleteStep: () => {
    const state = get();
    if (state.isWon) return false;

    const move = nextAutoMove(state);
    if (!move) return false;

    if (move.kind === 'draw') {
      get().drawCard();
      return true;
    }

    const from: CardLocation =
      move.kind === 'toFoundation' && move.from === 'waste'
        ? { type: 'waste' }
        : {
            type: 'tableau',
            index: move.kind === 'toFoundation' ? (move.from as number) : move.from,
            cardIndex:
              state.tableau[move.kind === 'toFoundation' ? (move.from as number) : move.from]
                .length - 1,
          };

    if (move.kind === 'toFoundation') {
      get().handleDrop(from, { type: 'foundation', index: move.foundation });
    } else {
      get().handleDrop(from, { type: 'tableau', index: move.to });
    }
    return true;
  },

  hints: () => klondikeHints(get()),

  checkWin: () => {
    const state = get();
    if (state.xpAwarded) return;
    
    const isWon = state.foundations.every(col => col.length === 13);
    if (isWon) {
      set({ isWon: true, xpAwarded: true });
      useGameStore.getState().addXp('klondike', 100);
    }
  }
}));
