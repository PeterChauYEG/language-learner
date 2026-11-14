import { Injectable } from '@nestjs/common';

import { VocabProgressStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { calculateSm2 } from './sm2.js';

/**
 * Starting state for an item that has never been reviewed before, matching
 * the `UserVocabProgress` schema's `@default` values.
 */
const DEFAULT_INTERVAL = 0;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Number of consecutive passing (quality >= 4) reviews required before an
 * item is promoted from LEARNING to KNOWN.
 *
 * There's no dedicated "consecutive streak" column on `UserVocabProgress`,
 * so this uses `interval` as a proxy: per `calculateSm2`, an item only
 * reaches an interval of 6+ days after its *second* consecutive passing
 * review (1 day -> 6 days -> grows from there). Requiring interval >= 6
 * days on a passing review is therefore a reasonable stand-in for "a few
 * consecutive good reviews" without needing a schema change. Any failing
 * review (quality < 4) resets the interval to 1 day via `calculateSm2`,
 * which naturally demotes the item back to LEARNING on the next write.
 */
const KNOWN_INTERVAL_THRESHOLD_DAYS = 6;
const KNOWN_QUALITY_THRESHOLD = 4;

@Injectable()
export class SrsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a single review exposure for (userId, vocabId) and persists the
   * resulting SM-2 schedule.
   *
   * On first exposure (no existing row), the starting state is
   * interval=0/easeFactor=2.5, matching the schema defaults. The new
   * interval/easeFactor/nextReviewAt come straight from `calculateSm2`;
   * lastResult/lastSeenAt are stamped with this review's quality and time.
   *
   * Status transition (see KNOWN_INTERVAL_THRESHOLD_DAYS above for the
   * reasoning): KNOWN once quality>=4 pushes the interval to 6+ days
   * (i.e. after a couple of consecutive good reviews), LEARNING otherwise -
   * including on the very first review and on any failing review, since a
   * fail resets the interval back down to 1 day.
   */
  async recordExposure(
    userId: number,
    vocabId: number,
    quality: number,
  ): Promise<{
    status: VocabProgressStatus;
    interval: number;
    easeFactor: number;
    nextReviewAt: Date;
    lastResult: number;
    lastSeenAt: Date;
  }> {
    const existing = await this.prisma.userVocabProgress.findUnique({
      where: { userId_vocabId: { userId, vocabId } },
    });

    const currentInterval = existing?.interval ?? DEFAULT_INTERVAL;
    const currentEaseFactor = existing?.easeFactor ?? DEFAULT_EASE_FACTOR;

    const now = new Date();
    const result = calculateSm2({
      interval: currentInterval,
      easeFactor: currentEaseFactor,
      quality,
      now,
    });

    const status =
      quality >= KNOWN_QUALITY_THRESHOLD && result.interval >= KNOWN_INTERVAL_THRESHOLD_DAYS
        ? VocabProgressStatus.KNOWN
        : VocabProgressStatus.LEARNING;

    const data = {
      status,
      interval: result.interval,
      easeFactor: result.easeFactor,
      nextReviewAt: result.nextReviewAt,
      lastResult: quality,
      lastSeenAt: now,
    };

    const saved = await this.prisma.userVocabProgress.upsert({
      where: { userId_vocabId: { userId, vocabId } },
      create: { userId, vocabId, ...data },
      update: data,
    });

    return {
      status: saved.status,
      interval: saved.interval,
      easeFactor: saved.easeFactor,
      nextReviewAt: saved.nextReviewAt,
      lastResult: saved.lastResult ?? quality,
      lastSeenAt: saved.lastSeenAt ?? now,
    };
  }
}
