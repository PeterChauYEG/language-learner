import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_DUE_REVIEWS_LIMIT, HARDCODED_USER_ID, TutorService } from './tutor.service.js';

describe('TutorService', () => {
  let tutorService: TutorService;
  let prisma: {
    userProfile: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    lessonPlan: { findUnique: ReturnType<typeof vi.fn> };
    userVocabProgress: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      userProfile: { findUnique: vi.fn(), create: vi.fn() },
      lessonPlan: { findUnique: vi.fn() },
      userVocabProgress: { count: vi.fn(), findMany: vi.fn() },
    };

    const app: TestingModule = await Test.createTestingModule({
      providers: [TutorService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    tutorService = app.get<TutorService>(TutorService);
  });

  describe('findOrCreateUser', () => {
    it('returns the existing hardcoded user without creating one', async () => {
      const existing = { id: HARDCODED_USER_ID };
      prisma.userProfile.findUnique.mockResolvedValue(existing);

      const result = await tutorService.findOrCreateUser();

      expect(result).toBe(existing);
      expect(prisma.userProfile.create).not.toHaveBeenCalled();
    });

    it('creates the hardcoded user when it does not exist yet', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      const created = { id: HARDCODED_USER_ID };
      prisma.userProfile.create.mockResolvedValue(created);

      const result = await tutorService.findOrCreateUser();

      expect(result).toBe(created);
      expect(prisma.userProfile.create).toHaveBeenCalledWith({ data: { id: HARDCODED_USER_ID } });
    });
  });

  describe('getUserState', () => {
    it('combines the user profile, lesson plan, and due review count', async () => {
      const userProfile = { id: HARDCODED_USER_ID };
      prisma.userProfile.findUnique.mockResolvedValue(userProfile);
      const lessonPlan = { userId: HARDCODED_USER_ID, activeSituations: [], focusVocabIds: [] };
      prisma.lessonPlan.findUnique.mockResolvedValue(lessonPlan);
      prisma.userVocabProgress.count.mockResolvedValue(3);

      const result = await tutorService.getUserState();

      expect(result).toEqual({ userProfile, lessonPlan, dueReviewCount: 3 });
      expect(prisma.userVocabProgress.count).toHaveBeenCalledWith({
        where: { userId: HARDCODED_USER_ID, nextReviewAt: { lte: expect.any(Date) } },
      });
    });

    it('returns a null lesson plan when the user has none yet', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ id: HARDCODED_USER_ID });
      prisma.lessonPlan.findUnique.mockResolvedValue(null);
      prisma.userVocabProgress.count.mockResolvedValue(0);

      const result = await tutorService.getUserState();

      expect(result.lessonPlan).toBeNull();
      expect(result.dueReviewCount).toBe(0);
    });
  });

  describe('getDueReviews', () => {
    it('queries due reviews ordered by nextReviewAt ascending, defaulting the limit', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ id: HARDCODED_USER_ID });
      const rows = [{ userId: HARDCODED_USER_ID, vocabId: 1, vocab: { id: 1, word: '猫' } }];
      prisma.userVocabProgress.findMany.mockResolvedValue(rows);

      const result = await tutorService.getDueReviews();

      expect(result).toBe(rows);
      expect(prisma.userVocabProgress.findMany).toHaveBeenCalledWith({
        where: { userId: HARDCODED_USER_ID, nextReviewAt: { lte: expect.any(Date) } },
        orderBy: { nextReviewAt: 'asc' },
        take: DEFAULT_DUE_REVIEWS_LIMIT,
        include: { vocab: true },
      });
    });

    it('passes a custom limit through to the query', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ id: HARDCODED_USER_ID });
      prisma.userVocabProgress.findMany.mockResolvedValue([]);

      await tutorService.getDueReviews(5);

      expect(prisma.userVocabProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });
});
