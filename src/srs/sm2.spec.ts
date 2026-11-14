import { describe, expect, it } from 'vitest';

import { MIN_EASE_FACTOR, calculateSm2 } from './sm2.js';

describe('calculateSm2', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('schedules a brand-new item for 1 day out on a passing first review', () => {
    const result = calculateSm2({ interval: 0, easeFactor: 2.5, quality: 4, now });

    expect(result.interval).toBe(1);
    expect(result.nextReviewAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
    expect(result.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
  });

  it('sets the second passing interval to 6 days, then grows by ease factor on subsequent reviews', () => {
    const second = calculateSm2({ interval: 1, easeFactor: 2.5, quality: 4, now });
    expect(second.interval).toBe(6);

    const third = calculateSm2({
      interval: second.interval,
      easeFactor: second.easeFactor,
      quality: 4,
      now,
    });
    expect(third.interval).toBe(Math.round(second.interval * third.easeFactor));
    expect(third.interval).toBeGreaterThan(second.interval);
  });

  it('resets the interval to 1 day on a failed review (quality below 3)', () => {
    const result = calculateSm2({ interval: 30, easeFactor: 2.3, quality: 1, now });

    expect(result.interval).toBe(1);
    expect(result.nextReviewAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
  });

  it('never lowers the ease factor below the SM-2 floor, even on repeated failures', () => {
    const first = calculateSm2({ interval: 10, easeFactor: 1.3, quality: 0, now });
    expect(first.easeFactor).toBe(MIN_EASE_FACTOR);

    const second = calculateSm2({
      interval: first.interval,
      easeFactor: first.easeFactor,
      quality: 0,
      now,
    });
    expect(second.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('handles the minimum boundary quality score (0) as a hard fail', () => {
    const result = calculateSm2({ interval: 20, easeFactor: 2.5, quality: 0, now });

    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeLessThan(2.5);
    expect(result.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
  });

  it('handles the maximum boundary quality score (5) as a perfect pass', () => {
    const result = calculateSm2({ interval: 10, easeFactor: 2.5, quality: 5, now });

    expect(result.interval).toBeGreaterThan(10);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it('clamps out-of-range quality scores into the valid 0-5 range', () => {
    const low = calculateSm2({ interval: 10, easeFactor: 2.5, quality: -5, now });
    const zero = calculateSm2({ interval: 10, easeFactor: 2.5, quality: 0, now });
    expect(low).toEqual(zero);

    const high = calculateSm2({ interval: 10, easeFactor: 2.5, quality: 100, now });
    const five = calculateSm2({ interval: 10, easeFactor: 2.5, quality: 5, now });
    expect(high).toEqual(five);
  });

  it('defaults `now` to the current time when not provided', () => {
    const before = Date.now();
    const result = calculateSm2({ interval: 0, easeFactor: 2.5, quality: 4 });
    const after = Date.now();

    expect(result.nextReviewAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.nextReviewAt.getTime()).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 1000);
  });
});
