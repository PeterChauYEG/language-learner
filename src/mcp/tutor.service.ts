import { Injectable } from '@nestjs/common';

import type {
  JlptLevel,
  LessonPlan,
  UserProfile,
  UserVocabProgress,
  Vocab,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * No auth system yet (see UserProfile schema comment) - every MCP tool in
 * this controller operates on a single hardcoded user.
 */
export const HARDCODED_USER_ID = 1;

export const DEFAULT_DUE_REVIEWS_LIMIT = 20;

export const DEFAULT_SEARCH_VOCAB_LIMIT = 20;

export interface UserState {
  userProfile: UserProfile;
  lessonPlan: LessonPlan | null;
  dueReviewCount: number;
}

export type DueReview = UserVocabProgress & { vocab: Vocab };

@Injectable()
export class TutorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the hardcoded user's row, creating it on first access since
   * there's no signup flow yet.
   */
  async findOrCreateUser(): Promise<UserProfile> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { id: HARDCODED_USER_ID },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.userProfile.create({
      data: { id: HARDCODED_USER_ID },
    });
  }

  /**
   * UserProfile + its LessonPlan (if any) + a count of reviews that are due
   * (nextReviewAt <= now) for the hardcoded user.
   */
  async getUserState(): Promise<UserState> {
    const userProfile = await this.findOrCreateUser();
    const now = new Date();

    const [lessonPlan, dueReviewCount] = await Promise.all([
      this.prisma.lessonPlan.findUnique({ where: { userId: userProfile.id } }),
      this.prisma.userVocabProgress.count({
        where: { userId: userProfile.id, nextReviewAt: { lte: now } },
      }),
    ]);

    return { userProfile, lessonPlan, dueReviewCount };
  }

  /**
   * UserVocabProgress rows (joined with Vocab) due for review
   * (nextReviewAt <= now), most overdue first, for the hardcoded user.
   */
  async getDueReviews(limit: number = DEFAULT_DUE_REVIEWS_LIMIT): Promise<DueReview[]> {
    await this.findOrCreateUser();
    const now = new Date();

    return this.prisma.userVocabProgress.findMany({
      where: { userId: HARDCODED_USER_ID, nextReviewAt: { lte: now } },
      orderBy: { nextReviewAt: 'asc' },
      take: limit,
      include: { vocab: true },
    });
  }

  /**
   * Candidate new vocab for introduction to the hardcoded user: `Vocab`
   * rows that don't have a `UserVocabProgress` row yet (i.e. never
   * introduced/reviewed), optionally filtered by JLPT level, ordered by
   * frequency rank (most common first, unranked rows last) then id, up to
   * `limit` items.
   *
   * `situationTag` is intentionally unused for now - there's no
   * situation-tagging on `Vocab` rows yet, so it's accepted by the tool for
   * forward compatibility but is a no-op filter until a later enrichment
   * ticket adds situation tags to vocab.
   */
  async searchVocab(
    level?: JlptLevel,
    limit: number = DEFAULT_SEARCH_VOCAB_LIMIT,
  ): Promise<Vocab[]> {
    await this.findOrCreateUser();

    return this.prisma.vocab.findMany({
      where: {
        ...(level ? { jlptLevel: level } : {}),
        progress: { none: { userId: HARDCODED_USER_ID } },
      },
      orderBy: [{ frequencyRank: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }
}
