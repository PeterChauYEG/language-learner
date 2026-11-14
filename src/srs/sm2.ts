/**
 * SM-2 spaced-repetition calculation.
 *
 * Pure, side-effect-free implementation of the SM-2 algorithm used to
 * schedule the next review of a learning item. This module has no I/O and
 * no dependency on persistence (Prisma, DB, etc.) - callers are expected to
 * load the current state, call `calculateSm2`, and persist the result
 * themselves.
 *
 * @see https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
 */

/** Minimum ease factor allowed by the SM-2 algorithm. */
export const MIN_EASE_FACTOR = 1.3;

/** Quality score below which a review is considered "failed". */
export const FAILING_QUALITY_THRESHOLD = 3;

export interface Sm2Input {
  /** Current interval, in whole days, since the previous review. */
  interval: number;
  /** Current ease factor (>= MIN_EASE_FACTOR). */
  easeFactor: number;
  /** Quality of the recall, on a 0 (complete blackout) to 5 (perfect) scale. */
  quality: number;
  /**
   * Reference point in time the new interval is measured from. Defaults to
   * the current time; tests should always pass an explicit value so results
   * stay deterministic.
   */
  now?: Date;
}

export interface Sm2Result {
  /** New interval, in whole days, until the next review. */
  interval: number;
  /** New ease factor (>= MIN_EASE_FACTOR). */
  easeFactor: number;
  /** Timestamp of the next scheduled review (`now` + `interval` days). */
  nextReviewAt: Date;
}

/**
 * Calculates the next interval, ease factor, and review date for an item
 * using the SM-2 algorithm.
 *
 * Rules:
 * - `quality` is clamped to the valid [0, 5] range.
 * - A failing quality score (< 3) resets the interval to 1 day.
 * - A passing quality score on a brand-new item (`interval` of 0) sets the
 *   interval to 1 day; the second passing review sets it to 6 days; every
 *   subsequent passing review multiplies the previous interval by the
 *   (updated) ease factor, rounded to the nearest whole day.
 * - The ease factor is always recalculated from the quality score and
 *   floored at `MIN_EASE_FACTOR`.
 */
export function calculateSm2(input: Sm2Input): Sm2Result {
  const quality = Math.min(5, Math.max(0, input.quality));
  const now = input.now ?? new Date();

  const easeFactor = calculateEaseFactor(input.easeFactor, quality);
  const interval = calculateInterval(input.interval, quality, easeFactor);

  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { interval, easeFactor, nextReviewAt };
}

function calculateEaseFactor(currentEaseFactor: number, quality: number): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const newEaseFactor = currentEaseFactor + delta;

  return Math.max(MIN_EASE_FACTOR, roundToTwoDecimals(newEaseFactor));
}

function calculateInterval(currentInterval: number, quality: number, easeFactor: number): number {
  if (quality < FAILING_QUALITY_THRESHOLD) {
    return 1;
  }

  if (currentInterval <= 0) {
    return 1;
  }

  if (currentInterval === 1) {
    return 6;
  }

  return Math.round(currentInterval * easeFactor);
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
