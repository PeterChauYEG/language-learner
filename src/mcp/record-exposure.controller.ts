import { McpController, Tool } from '@rekog/mcp-nest';
import { Payload } from '@nestjs/microservices';
import { z } from 'zod';

import { PrismaService } from '../prisma/prisma.service.js';
import { SrsService } from '../srs/srs.service.js';

/**
 * No auth system yet (see `UserProfile` in schema.prisma), so every MCP
 * tool in this epic operates on a single hardcoded user.
 */
const HARDCODED_USER_ID = 1;

const recordExposureParameters = z.object({
  vocab_id: z.number().int(),
  quality: z.number().int().min(0).max(5),
});

@McpController()
export class RecordExposureController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly srsService: SrsService,
  ) {}

  @Tool({
    name: 'record_exposure',
    description:
      "Records a single SRS review exposure for the current user's vocab item, updating its " +
      'spaced-repetition schedule (interval/ease factor/next review date) and learning status.',
    parameters: recordExposureParameters,
  })
  async recordExposure(
    @Payload() { vocab_id: vocabId, quality }: z.infer<typeof recordExposureParameters>,
  ) {
    // The hardcoded user may not have a `UserProfile` row yet (no sign-up
    // flow exists); create it on first use so the FK on
    // `UserVocabProgress.userId` is satisfied.
    await this.prisma.userProfile.upsert({
      where: { id: HARDCODED_USER_ID },
      create: { id: HARDCODED_USER_ID },
      update: {},
    });

    const result = await this.srsService.recordExposure(HARDCODED_USER_ID, vocabId, quality);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
    };
  }
}
