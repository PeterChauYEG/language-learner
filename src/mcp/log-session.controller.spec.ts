import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { LogSessionController } from './log-session.controller.js';

describe('LogSessionController', () => {
  let controller: LogSessionController;
  let prisma: {
    userProfile: { upsert: ReturnType<typeof vi.fn> };
    conversationSession: { create: ReturnType<typeof vi.fn> };
  };

  const sessionResult = {
    id: 7,
    userId: 1,
    situation: 'ordering coffee',
    startedAt: new Date('2024-01-01T00:00:00.000Z'),
    summary: 'practiced ordering a latte',
    wordsIntroduced: [1, 2],
    wordsReviewed: [3],
  };

  beforeEach(async () => {
    prisma = {
      userProfile: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
      conversationSession: { create: vi.fn().mockResolvedValue(sessionResult) },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogSessionController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(LogSessionController);
  });

  it('ensures the hardcoded user profile exists before logging', async () => {
    await controller.logSession({ situation: 'ordering coffee' });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  });

  it('creates a ConversationSession row with the hardcoded user id and provided fields', async () => {
    await controller.logSession({
      situation: 'ordering coffee',
      summary: 'practiced ordering a latte',
      words_introduced: [1, 2],
      words_reviewed: [3],
    });

    expect(prisma.conversationSession.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        situation: 'ordering coffee',
        summary: 'practiced ordering a latte',
        wordsIntroduced: [1, 2],
        wordsReviewed: [3],
      },
    });
  });

  it('defaults optional word-id lists to empty arrays when omitted', async () => {
    await controller.logSession({ situation: 'ordering coffee' });

    expect(prisma.conversationSession.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        situation: 'ordering coffee',
        summary: null,
        wordsIntroduced: [],
        wordsReviewed: [],
      },
    });
  });

  it('returns the created session as tool content', async () => {
    const response = await controller.logSession({ situation: 'ordering coffee' });

    expect(response).toEqual({
      content: [{ type: 'text', text: JSON.stringify(sessionResult) }],
    });
  });
});
