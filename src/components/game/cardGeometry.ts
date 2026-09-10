/**
 * The proportions of a card, as fractions of its width.
 *
 * Shared by the card that draws itself and the table that decides how far
 * apart to fan a column. They have to agree: the table's job is to leave
 * enough of each covered card showing to read it, and it can only do that if
 * it knows how much of the card the rank and pip take up. Keeping the numbers
 * in one place is what stops a fan being tuned to a card face that has since
 * changed.
 */

/** Space above the rank. */
export const FACE_PADDING = 0.06;
/** Height of the rank itself, set with no leading. */
export const RANK_SIZE = 0.19;
/** Gap between the rank and the pip below it. */
export const RANK_PIP_GAP = 0.02;
/** The small suit pip under the rank. */
export const CORNER_PIP = 0.13;
/** The faint watermark suit behind the face. */
export const CENTRE_PIP = 0.5;
/** Corner radius. */
export const CARD_RADIUS = 0.09;
/**
 * How far in the patterned border sits on the back of a card. Nothing to do
 * with the corner depth below — a back has no rank to read — it just belongs
 * with the rest of a card's proportions.
 */
export const BACK_INSET = 0.07;

/**
 * A little more than the parts add up to.
 *
 * A font's line box is slightly taller than its size and an icon's box is
 * slightly taller than its glyph, so the drawn corner runs a pixel or two past
 * the sum of these fractions. Measured against the rendered card, the shortfall
 * is under 5%; 10% covers it at every size.
 */
const RENDERED_SLACK = 1.1;

/**
 * How much bigger the corner gets in large print.
 *
 * Only the rank and the pip grow. The card does not, because a bigger card
 * means fewer of them on screen, which is the opposite of what someone
 * squinting at the board wants.
 */
export const LARGE_PRINT_SCALE = 1.35;

/** The rank and pip sizes actually in use. */
export function rankSize(largePrint: boolean): number {
  return largePrint ? RANK_SIZE * LARGE_PRINT_SCALE : RANK_SIZE;
}

export function cornerPip(largePrint: boolean): number {
  return largePrint ? CORNER_PIP * LARGE_PRINT_SCALE : CORNER_PIP;
}

/**
 * How far down a card its rank and pip reach.
 *
 * A covered card must show at least this much to be identifiable, so this is
 * the floor on how tightly a column may be fanned. Large print pushes it
 * further down, and the fan has to know: a rank the table has not been told
 * about is a rank the next card sits on top of.
 */
export function cornerDepth(largePrint = false): number {
  return (FACE_PADDING + rankSize(largePrint) + RANK_PIP_GAP + cornerPip(largePrint)) * RENDERED_SLACK;
}

/** The ordinary corner depth, for callers with no setting to consult. */
export const CORNER_DEPTH = cornerDepth(false);

/** A playing card is half again as tall as it is wide, and so is the art. */
export const CARD_RATIO = 1.5;

/** The same depth measured against card height, which is how fans are expressed. */
export function cornerDepthOfHeight(largePrint = false): number {
  return cornerDepth(largePrint) / CARD_RATIO;
}

export const CORNER_DEPTH_OF_HEIGHT = cornerDepthOfHeight(false);
