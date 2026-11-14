import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { SrsModule } from '../src/srs/srs.module.js';
import { SrsService } from '../src/srs/srs.service.js';

/**
 * Integration test against a real local Postgres (started via
 * `docker compose up -d postgres`, see docker-compose.yml). Confirms
 * SrsService.recordExposure round-trips through user_vocab_progress: the
 * first call starts from the schema defaults (interval=0, easeFactor=2.5),
 * and the second call picks up exactly where the first left off.
 */
describe('SrsService (e2e)', () => {
  let moduleRef: TestingModule;
  let srsService: SrsService;
  let prisma: PrismaService;

  const userId = -1;
  const vocabId = -1;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [SrsModule],
    }).compile();

    srsService = moduleRef.get(SrsService);
    prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();

    // Fixtures for the foreign keys on UserVocabProgress. Use a fixed
    // negative id range so this never collides with real seeded data.
    await prisma.userVocabProgress.deleteMany({ where: { userId } });
    await prisma.userProfile.deleteMany({ where: { id: userId } });
    await prisma.vocab.deleteMany({ where: { id: vocabId } });

    await prisma.userProfile.create({ data: { id: userId } });
    await prisma.vocab.create({
      data: { id: vocabId, word: 'test', reading: 'test', meaning: 'test' },
    });
  });

  beforeEach(async () => {
    // Each test starts from a clean slate (no progress row) so "first
    // exposure" behavior is actually exercised in both tests.
    await prisma.userVocabProgress.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.userVocabProgress.deleteMany({ where: { userId } });
    await prisma.userProfile.deleteMany({ where: { id: userId } });
    await prisma.vocab.deleteMany({ where: { id: vocabId } });
    await prisma.onModuleDestroy();
    await moduleRef.close();
  });

  it('starts a brand-new item from the schema defaults on first exposure', async () => {
    const first = await srsService.recordExposure(userId, vocabId, 4);

    // interval=0, easeFactor=2.5 is the implicit starting state, so a
    // passing first review should land on calculateSm2's "brand new" branch:
    // interval -> 1 day. A quality-4 review leaves the ease factor exactly
    // at 2.5 per calculateSm2's formula (delta is 0 for quality 4), so this
    // only checks it never drops below the starting value.
    expect(first.interval).toBe(1);
    expect(first.easeFactor).toBeGreaterThanOrEqual(2.5);
    expect(first.lastResult).toBe(4);
    expect(first.status).toBe('LEARNING');

    const row = await prisma.userVocabProgress.findUnique({
      where: { userId_vocabId: { userId, vocabId } },
    });
    expect(row?.interval).toBe(1);
    expect(row?.lastSeenAt).not.toBeNull();
  });

  it("grows the interval from the first call's persisted result on the second exposure", async () => {
    const first = await srsService.recordExposure(userId, vocabId, 4);
    const second = await srsService.recordExposure(userId, vocabId, 4);

    // Second consecutive pass takes interval 1 -> 6 per calculateSm2, proving
    // the second call read back the first call's persisted state rather than
    // starting over from defaults.
    expect(second.interval).toBe(6);
    expect(second.interval).toBeGreaterThan(first.interval);
    expect(second.easeFactor).toBeGreaterThanOrEqual(first.easeFactor);

    const row = await prisma.userVocabProgress.findUnique({
      where: { userId_vocabId: { userId, vocabId } },
    });
    expect(row?.interval).toBe(6);
    expect(row?.status).toBe('KNOWN');
  });
});
