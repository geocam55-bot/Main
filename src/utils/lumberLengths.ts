/**
 * Lumber Length Selection Utility
 * 
 * Standard lumber is available in 2-foot increments starting at 8':
 *   8', 10', 12', 14', 16'
 * 
 * This module provides functions to:
 * - Select the correct default lumber length for a given span
 * - Calculate board combinations for spans exceeding 16'
 * - Determine deck board spans based on board pattern/orientation
 */

/** Standard lumber lengths available (in feet) */
export const STANDARD_LUMBER_LENGTHS = [8, 10, 12, 14, 16] as const;
export type StandardLumberLength = (typeof STANDARD_LUMBER_LENGTHS)[number];

/**
 * Select the minimum standard lumber length that covers a given span.
 * Returns the smallest standard length >= span (rounded up).
 * If the span exceeds 16', returns 16 (use getLumberCombination for multi-board spans).
 *
 * Examples:
 *   selectLumberLength(7.5) → 8
 *   selectLumberLength(8)   → 8
 *   selectLumberLength(9)   → 10
 *   selectLumberLength(13)  → 14
 *   selectLumberLength(20)  → 16 (max single board)
 */
export function selectLumberLength(spanFeet: number): number {
  const rounded = Math.ceil(spanFeet);
  for (const len of STANDARD_LUMBER_LENGTHS) {
    if (len >= rounded) return len;
  }
  return 16; // Max single board length
}

/**
 * For spans that may exceed a single board length, calculate the combination
 * of standard lumber lengths needed to cover the span.
 *
 * Uses a greedy approach: as many 16' boards as possible, then fills the
 * remainder with the smallest standard length that fits.
 *
 * Examples:
 *   getLumberCombination(10)  → [{ length: 10, count: 1 }]
 *   getLumberCombination(24)  → [{ length: 16, count: 1 }, { length: 8, count: 1 }]
 *   getLumberCombination(32)  → [{ length: 16, count: 2 }]
 *   getLumberCombination(36)  → [{ length: 16, count: 2 }, { length: 8, count: 1 }]  (spans 36', needs 32+8=40 linear ft)
 */
export function getLumberCombination(
  spanFeet: number
): { length: number; count: number }[] {
  const rounded = Math.ceil(spanFeet);
  if (rounded <= 0) return [];

  // Single board covers the span
  if (rounded <= 16) {
    return [{ length: selectLumberLength(rounded), count: 1 }];
  }

  // Multi-board: use 16' boards then fill remainder
  const fullBoards = Math.floor(rounded / 16);
  const remainder = rounded - fullBoards * 16;

  const result: { length: number; count: number }[] = [];

  if (fullBoards > 0) {
    result.push({ length: 16, count: fullBoards });
  }

  if (remainder > 0) {
    const fillLength = selectLumberLength(remainder);
    // If fill length is also 16, merge with full boards
    if (fillLength === 16 && result.length > 0) {
      result[0].count += 1;
    } else {
      result.push({ length: fillLength, count: 1 });
    }
  }

  return result;
}

/**
 * Human-readable description of the lumber combination for a span.
 *
 * Examples:
 *   getLumberLengthDescription(12) → "12'"
 *   getLumberLengthDescription(24) → "16' + 8'"
 *   getLumberLengthDescription(32) → "2x 16'"
 */
export function getLumberLengthDescription(spanFeet: number): string {
  const combo = getLumberCombination(spanFeet);
  if (combo.length === 0) return "0'";

  return combo
    .map(({ length, count }) =>
      count > 1 ? `${count}x ${length}'` : `${length}'`
    )
    .join(' + ');
}

/**
 * Total number of individual boards required per span when combining lengths.
 *
 * Examples:
 *   getBoardsPerSpan(12) → 1
 *   getBoardsPerSpan(24) → 2  (16' + 8')
 *   getBoardsPerSpan(32) → 2  (2x 16')
 */
export function getBoardsPerSpan(spanFeet: number): number {
  const combo = getLumberCombination(spanFeet);
  return combo.reduce((total, { count }) => total + count, 0);
}

/**
 * Determine the deck board span based on board pattern and deck dimensions.
 *
 * - perpendicular: boards run perpendicular to the house → span = length (depth)
 * - parallel:      boards run parallel to the house      → span = width
 * - diagonal:      boards run at 45 degrees              → span ≈ sqrt(w² + l²)
 */
export function getDeckBoardSpan(
  width: number,
  length: number,
  pattern: 'perpendicular' | 'parallel' | 'diagonal'
): number {
  switch (pattern) {
    case 'perpendicular':
      return length;
    case 'parallel':
      return width;
    case 'diagonal':
      return Math.ceil(Math.sqrt(width * width + length * length));
    default:
      return length;
  }
}

/**
 * Determine which dimension is perpendicular to the deck boards
 * (i.e., the dimension that determines how many rows of boards are needed).
 *
 * - perpendicular: boards span the length, rows measured across width
 * - parallel:      boards span the width, rows measured across length
 * - diagonal:      longest dimension * sqrt(2) approximation
 */
export function getDeckBoardCoverageDimension(
  width: number,
  length: number,
  pattern: 'perpendicular' | 'parallel' | 'diagonal'
): number {
  switch (pattern) {
    case 'perpendicular':
      return width; // rows span the width
    case 'parallel':
      return length; // rows span the length
    case 'diagonal':
      // Diagonal requires more rows; approximate using longer side * 1.41
      return Math.max(width, length) * 1.41;
    default:
      return width;
  }
}
