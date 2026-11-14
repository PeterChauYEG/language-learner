import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VocabProgressStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SrsService } from '../srs/srs.service.js';
import { RecordExposureController } from './record-exposure.controller.js';

describe('RecordExposureController', () => {
  let controller: RecordExposureController;
  let prisma: { userProfile: { upsert: ReturnType<typeof vi.fn> } };
  let srsService: { recordExposure: ReturnType<typeof vi.fn> };

  const recordExposureResult = {
    status: VocabProgressStatus.LEARNING,
    interval: 1,
    easeFactor: 2.5,
    nextReviewAt: new Date('2024-01-02T00:00:00.000Z'),
    lastResult: 4,
    lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = { userProfile: { upsert: vi.fn().mockResolvedValue({ id: 1 }) } };
    srsService = { recordExposure: vi.fn().mockResolvedValue(recordExposureResult) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordExposureController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: SrsService, useValue: srsService },
      ],
    }).compile();

    controller = module.get(RecordExposureController);
  });

  it('ensures the hardcoded user profile exists before recording', async () => {
    await controller.recordExposure({ vocab_id: 42, quality: 4 });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  });

  it('delegates to SrsService.recordExposure with the hardcoded user id', async () => {
    await controller.recordExposure({ vocab_id: 42, quality: 4 });

    expect(srsService.recordExposure).toHaveBeenCalledWith(1, 42, 4);
  });

  it('returns the SRS result as tool content', async () => {
    const response = await controller.recordExposure({ vocab_id: 42, quality: 4 });

    expect(response).toEqual({
      content: [{ type: 'text', text: JSON.stringify(recordExposureResult) }],
    });
  });
});
