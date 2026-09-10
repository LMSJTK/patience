import { Card } from '../cards';
import * as klondike from './klondike';
import * as freecell from './freecell';
import * as spider from './spider';
import * as fortythieves from './fortythieves';
import * as missmilligan from './missmilligan';
import { isCardExposed } from './pyramid';

/**
 * What could be played from here, best first.
 *
 * One module for all six games so that "best" means the same thing in each:
 * a card going up beats a card that uncovers something, which beats a card
 * merely moved about, which beats turning the stock over. Left to six separate
 * implementations that ordering would drift, and a hint that suggests shuffling
 * two kings while an ace sits waiting is worse than no hint at all.
 *
 * Enumerating every move also answers the other question a player has: whether
 * there is anything left to do. An empty list on a board that is not won means
 * the game is dead, and the sooner that is said the better.
 */

export interface Hint {
  /** The cards that would move. The first is the one to look at. */
  cards: string[];
  /** The pile they would move to, named as the board names its drop targets. */
  target: string;
  /** Higher is a better suggestion. */
  score: number;
}

/** A card going up. Always worth doing, so always suggested first. */
const TO_FOUNDATION = 100;
/** A move that turns a card over, which is what actually opens a game up. */
const REVEALS = 70;
/** Emptying a column, or getting a card out of the waste. */
const FREES_SPACE = 50;
/** A legal move that changes little. Better than nothing, offered last. */
const SHUFFLE = 20;
/** Turning the stock over, when nothing on the table can be played. */
const STOCK = 5;

const top = (pile: Card[]): Card | undefined => pile[pile.length - 1];
const byScore = (a: Hint, b: Hint) => b.score - a.score;

/** Does moving from this index leave a face-down card on top? */
function wouldReveal(column: Card[], cardIndex: number): boolean {
  return cardIndex > 0 && !column[cardIndex - 1].isFaceUp;
}

/** Moving a whole column onto an empty one achieves nothing. */
function pointless(column: Card[], cardIndex: number, target: Card[]): boolean {
  return cardIndex === 0 && target.length === 0;
}

// ---------------------------------------------------------------- Klondike

export interface KlondikeLike {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

export function klondikeHints(state: KlondikeLike): Hint[] {
  const hints: Hint[] = [];

  const toFoundation = (card: Card, cards: string[]) => {
    for (let f = 0; f < state.foundations.length; f++) {
      if (klondike.canMoveToFoundation(top(state.foundations[f]), card)) {
        hints.push({ cards, target: `foundation-${f}`, score: TO_FOUNDATION });
        return;
      }
    }
  };

  const wasteCard = top(state.waste);
  if (wasteCard) {
    toFoundation(wasteCard, [wasteCard.id]);
    for (let t = 0; t < state.tableau.length; t++) {
      if (klondike.canMoveToTableau(top(state.tableau[t]), wasteCard)) {
        hints.push({ cards: [wasteCard.id], target: `tableau-${t}`, score: FREES_SPACE });
      }
    }
  }

  for (let i = 0; i < state.tableau.length; i++) {
    const column = state.tableau[i];
    const card = top(column);
    if (card) toFoundation(card, [card.id]);

    for (let j = 0; j < column.length; j++) {
      if (!column[j].isFaceUp) continue;
      const run = column.slice(j);
      for (let t = 0; t < state.tableau.length; t++) {
        if (t === i) continue;
        const target = state.tableau[t];
        if (pointless(column, j, target)) continue;
        if (!klondike.canMoveToTableau(top(target), run[0])) continue;
        hints.push({
          cards: run.map((c) => c.id),
          target: `tableau-${t}`,
          score: wouldReveal(column, j) ? REVEALS : SHUFFLE,
        });
      }
    }
  }

  if (state.stock.length > 0 || state.waste.length > 1) {
    hints.push({ cards: [], target: 'stock', score: STOCK });
  }

  return hints.sort(byScore);
}

// ---------------------------------------------------------------- FreeCell

export interface FreecellLike {
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
}

export function freecellHints(state: FreecellLike): Hint[] {
  const hints: Hint[] = [];
  const emptyCells = state.freeCells.filter((c) => c === null).length;
  const emptyColumns = state.tableau.filter((col) => col.length === 0).length;

  const toFoundation = (card: Card) => {
    for (let f = 0; f < state.foundations.length; f++) {
      if (freecell.canMoveToFoundation(top(state.foundations[f]), card)) {
        hints.push({ cards: [card.id], target: `foundation-${f}`, score: TO_FOUNDATION });
        return true;
      }
    }
    return false;
  };

  state.freeCells.forEach((card) => {
    if (!card) return;
    if (!toFoundation(card)) {
      for (let t = 0; t < state.tableau.length; t++) {
        if (freecell.canMoveToTableau(top(state.tableau[t]), card)) {
          hints.push({ cards: [card.id], target: `tableau-${t}`, score: FREES_SPACE });
        }
      }
    }
  });

  for (let i = 0; i < state.tableau.length; i++) {
    const column = state.tableau[i];
    const card = top(column);
    if (card) toFoundation(card);

    for (let j = 0; j < column.length; j++) {
      const run = column.slice(j);
      if (!freecell.isValidSequence(run)) continue;
      for (let t = 0; t < state.tableau.length; t++) {
        if (t === i) continue;
        const target = state.tableau[t];
        if (pointless(column, j, target)) continue;
        if (!freecell.canMoveToTableau(top(target), run[0])) continue;
        const movable = freecell.getMaxMoveCount(emptyCells, emptyColumns, target.length === 0);
        if (run.length > movable) continue;
        hints.push({
          cards: run.map((c) => c.id),
          target: `tableau-${t}`,
          score: target.length === 0 ? FREES_SPACE : SHUFFLE,
        });
      }
    }

    // Parking a card costs a cell, so it is the last thing to suggest.
    if (card && emptyCells > 0) {
      const cell = state.freeCells.indexOf(null);
      hints.push({ cards: [card.id], target: `freecell-${cell}`, score: STOCK });
    }
  }

  return hints.sort(byScore);
}

// ------------------------------------------------------------------ Spider

export interface SpiderLike {
  stock: Card[];
  tableau: Card[][];
}

export function spiderHints(state: SpiderLike): Hint[] {
  const hints: Hint[] = [];

  for (let i = 0; i < state.tableau.length; i++) {
    const column = state.tableau[i];
    for (let j = 0; j < column.length; j++) {
      if (!column[j].isFaceUp) continue;
      const run = column.slice(j);
      if (!spider.isValidSpiderSequence(run)) continue;
      for (let t = 0; t < state.tableau.length; t++) {
        if (t === i) continue;
        const target = state.tableau[t];
        if (pointless(column, j, target)) continue;
        if (!spider.canMoveToTableau(top(target), run[0])) continue;
        // A move that completes a suit is the whole point of the game.
        const completes =
          target.length + run.length >= 13 &&
          spider.checkForCompletedSequence([...target, ...run]);
        hints.push({
          cards: run.map((c) => c.id),
          target: `tableau-${t}`,
          score: completes ? TO_FOUNDATION : wouldReveal(column, j) ? REVEALS : SHUFFLE,
        });
      }
    }
  }

  // Spider only deals onto a board with no empty columns, so a deal is only
  // ever a real option when there is nowhere it would be refused.
  if (state.stock.length > 0 && !state.tableau.some((col) => col.length === 0)) {
    hints.push({ cards: [], target: 'stock', score: STOCK });
  }

  return hints.sort(byScore);
}

// ----------------------------------------------------------- Forty Thieves

export interface FortyThievesLike {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

export function fortyThievesHints(state: FortyThievesLike): Hint[] {
  const hints: Hint[] = [];
  const emptyColumns = state.tableau.filter((col) => col.length === 0).length;

  const toFoundation = (card: Card) => {
    for (let f = 0; f < state.foundations.length; f++) {
      if (fortythieves.canMoveToFoundation(top(state.foundations[f]), card)) {
        hints.push({ cards: [card.id], target: `foundation-${f}`, score: TO_FOUNDATION });
        return;
      }
    }
  };

  const wasteCard = top(state.waste);
  if (wasteCard) {
    toFoundation(wasteCard);
    for (let t = 0; t < state.tableau.length; t++) {
      if (fortythieves.canMoveToTableau(top(state.tableau[t]), wasteCard)) {
        hints.push({ cards: [wasteCard.id], target: `tableau-${t}`, score: FREES_SPACE });
      }
    }
  }

  for (let i = 0; i < state.tableau.length; i++) {
    const column = state.tableau[i];
    const card = top(column);
    if (card) toFoundation(card);

    for (let j = 0; j < column.length; j++) {
      const run = column.slice(j);
      if (!fortythieves.isValidFortyThievesSequence(run)) continue;
      for (let t = 0; t < state.tableau.length; t++) {
        if (t === i) continue;
        const target = state.tableau[t];
        if (pointless(column, j, target)) continue;
        if (!fortythieves.canMoveToTableau(top(target), run[0])) continue;
        const movable = fortythieves.getMaxMoveCount(emptyColumns, target.length === 0);
        if (run.length > movable) continue;
        hints.push({
          cards: run.map((c) => c.id),
          target: `tableau-${t}`,
          score: target.length === 0 ? FREES_SPACE : SHUFFLE,
        });
      }
    }
  }

  if (state.stock.length > 0) {
    hints.push({ cards: [], target: 'stock', score: STOCK });
  }

  return hints.sort(byScore);
}

// ----------------------------------------------------------- Miss Milligan

export interface MissMilliganLike {
  stock: Card[];
  foundations: Card[][];
  tableau: Card[][];
  pocket: Card[];
  isTabbyCat: boolean;
}

export function missMilliganHints(state: MissMilliganLike): Hint[] {
  const hints: Hint[] = [];

  const toFoundation = (card: Card, cards: string[]) => {
    for (let f = 0; f < state.foundations.length; f++) {
      if (missmilligan.canMoveToFoundation(top(state.foundations[f]), card)) {
        hints.push({ cards, target: `foundation-${f}`, score: TO_FOUNDATION });
        return;
      }
    }
  };

  // The pocket holds cards set aside, so emptying it is progress.
  const pocketCard = top(state.pocket);
  if (pocketCard) {
    toFoundation(pocketCard, [pocketCard.id]);
    for (let t = 0; t < state.tableau.length; t++) {
      if (missmilligan.canMoveToTableau(top(state.tableau[t]), pocketCard, state.isTabbyCat)) {
        hints.push({ cards: [pocketCard.id], target: `tableau-${t}`, score: FREES_SPACE });
      }
    }
  }

  for (let i = 0; i < state.tableau.length; i++) {
    const column = state.tableau[i];
    const card = top(column);
    if (card) toFoundation(card, [card.id]);

    for (let j = 0; j < column.length; j++) {
      const run = column.slice(j);
      if (!missmilligan.isValidMissMilliganSequence(run)) continue;
      for (let t = 0; t < state.tableau.length; t++) {
        if (t === i) continue;
        const target = state.tableau[t];
        if (pointless(column, j, target)) continue;
        if (!missmilligan.canMoveToTableau(top(target), run[0], state.isTabbyCat)) continue;
        hints.push({
          cards: run.map((c) => c.id),
          target: `tableau-${t}`,
          score: target.length === 0 ? FREES_SPACE : SHUFFLE,
        });
      }
    }
  }

  if (state.stock.length > 0) {
    hints.push({ cards: [], target: 'stock', score: STOCK });
  }

  return hints.sort(byScore);
}

// ----------------------------------------------------------------- Pyramid

export interface PyramidLike {
  stock: Card[];
  waste: Card[];
  pyramid: (Card | null)[];
}

/**
 * Pyramid pairs cards that add to thirteen, and kings go alone.
 *
 * There are no piles to move between, so a hint here is simply the cards to
 * click and there is no destination to name.
 */
export function pyramidHints(state: PyramidLike): Hint[] {
  const hints: Hint[] = [];

  /** Every card that can be picked up right now: the pyramid's exposed cards
   *  and whatever is on top of the waste. */
  const available: { card: Card; inPyramid: boolean }[] = [];
  state.pyramid.forEach((card, index) => {
    if (card && isCardExposed(index, state.pyramid)) available.push({ card, inPyramid: true });
  });
  const wasteCard = top(state.waste);
  if (wasteCard) available.push({ card: wasteCard, inPyramid: false });

  for (const { card } of available) {
    if (card.value === 13) {
      hints.push({ cards: [card.id], target: '', score: TO_FOUNDATION });
    }
  }

  for (let a = 0; a < available.length; a++) {
    for (let b = a + 1; b < available.length; b++) {
      if (available[a].card.value + available[b].card.value !== 13) continue;
      hints.push({
        cards: [available[a].card.id, available[b].card.id],
        target: '',
        // A pair that clears two pyramid cards beats one that spends the waste.
        score: available[a].inPyramid && available[b].inPyramid ? REVEALS : FREES_SPACE,
      });
    }
  }

  if (state.stock.length > 0) {
    hints.push({ cards: [], target: 'stock', score: STOCK });
  }

  return hints.sort(byScore);
}
