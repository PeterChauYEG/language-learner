import type { PrismaService } from '../prisma/prisma.service.js';
import { HARDCODED_USER_ID, LessonPlanService } from './lesson-plan.service.js';

type MockPrisma = {
  lessonPlan: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  vocab: {
    findMany: ReturnType<typeof vi.fn>;
  };
  userProfile: {
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe('LessonPlanService', () => {
  let prisma: MockPrisma;
  let service: LessonPlanService;

  beforeEach(() => {
    prisma = {
      lessonPlan: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      vocab: {
        findMany: vi.fn(),
      },
      userProfile: {
        upsert: vi.fn(),
      },
    };
    service = new LessonPlanService(prisma as unknown as PrismaService);
  });

  it('creates a new lesson plan row when none exists yet', async () => {
    prisma.lessonPlan.findUnique.mockResolvedValue(null);
    prisma.lessonPlan.upsert.mockResolvedValue({
      userId: HARDCODED_USER_ID,
      activeSituations: ['konbini'],
      focusVocabIds: [],
      updatedAt: new Date(),
    });

    await service.applyPatch({ add_situations: ['konbini'] });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: HARDCODED_USER_ID },
      create: { id: HARDCODED_USER_ID },
      update: {},
    });
    expect(prisma.lessonPlan.upsert).toHaveBeenCalledWith({
      where: { userId: HARDCODED_USER_ID },
      create: {
        userId: HARDCODED_USER_ID,
        activeSituations: ['konbini'],
        focusVocabIds: [],
      },
      update: {
        activeSituations: ['konbini'],
        focusVocabIds: [],
      },
    });
  });

  it('appends and dedupes add_situations against the existing row', async () => {
    prisma.lessonPlan.findUnique.mockResolvedValue({
      userId: HARDCODED_USER_ID,
      activeSituations: ['konbini'],
      focusVocabIds: [1, 2],
      updatedAt: new Date(),
    });
    prisma.lessonPlan.upsert.mockResolvedValue({});

    await service.applyPatch({ add_situations: ['konbini', 'restaurant'] });

    expect(prisma.lessonPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { activeSituations: ['konbini', 'restaurant'], focusVocabIds: [1, 2] },
      }),
    );
  });

  it('removes remove_situations from the existing row', async () => {
    prisma.lessonPlan.findUnique.mockResolvedValue({
      userId: HARDCODED_USER_ID,
      activeSituations: ['konbini', 'restaurant'],
      focusVocabIds: [1, 2],
      updatedAt: new Date(),
    });
    prisma.lessonPlan.upsert.mockResolvedValue({});

    await service.applyPatch({ remove_situations: ['konbini'] });

    expect(prisma.lessonPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { activeSituations: ['restaurant'], focusVocabIds: [1, 2] },
      }),
    );
  });

  it('replaces focusVocabIds without touching activeSituations when only set_focus_vocab is given', async () => {
    prisma.lessonPlan.findUnique.mockResolvedValue({
      userId: HARDCODED_USER_ID,
      activeSituations: ['konbini'],
      focusVocabIds: [1, 2],
      updatedAt: new Date(),
    });
    prisma.vocab.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
    prisma.lessonPlan.upsert.mockResolvedValue({});

    await service.applyPatch({ set_focus_vocab: [3, 4] });

    expect(prisma.lessonPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { activeSituations: ['konbini'], focusVocabIds: [3, 4] },
      }),
    );
  });

  it('drops set_focus_vocab ids that do not resolve to a real Vocab row', async () => {
    prisma.lessonPlan.findUnique.mockResolvedValue({
      userId: HARDCODED_USER_ID,
      activeSituations: [],
      focusVocabIds: [],
      updatedAt: new Date(),
    });
    prisma.vocab.findMany.mockResolvedValue([{ id: 3 }]);
    prisma.lessonPlan.upsert.mockResolvedValue({});

    await service.applyPatch({ set_focus_vocab: [3, 999] });

    expect(prisma.vocab.findMany).toHaveBeenCalledWith({
      where: { id: { in: [3, 999] } },
      select: { id: true },
    });
    expect(prisma.lessonPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { activeSituations: [], focusVocabIds: [3] },
      }),
    );
  });
});
