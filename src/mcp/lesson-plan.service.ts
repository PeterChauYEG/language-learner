import { Injectable } from '@nestjs/common';

import type { LessonPlan } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LessonPlanPatch } from './lesson-plan.schema.js';

/**
 * No auth system yet (see `UserProfile` schema comment), so every MCP tool
 * in this epic operates on a single hardcoded user.
 */
export const HARDCODED_USER_ID = 1;

@Injectable()
export class LessonPlanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies a typed patch to the hardcoded user's `LessonPlan` row,
   * upserting it if it doesn't exist yet. Only the fields present on the
   * patch are touched - e.g. a patch with only `set_focus_vocab` leaves
   * `activeSituations` untouched.
   *
   * `set_focus_vocab` ids are validated against `Vocab` first; any id that
   * doesn't resolve to a real row is silently dropped rather than failing
   * the whole call.
   */
  async applyPatch(patch: LessonPlanPatch): Promise<LessonPlan> {
    // The hardcoded user may not have a `UserProfile` row yet (no sign-up
    // flow exists); create it on first use so the FK on
    // `LessonPlan.userId` is satisfied.
    await this.prisma.userProfile.upsert({
      where: { id: HARDCODED_USER_ID },
      create: { id: HARDCODED_USER_ID },
      update: {},
    });

    const existing = await this.prisma.lessonPlan.findUnique({
      where: { userId: HARDCODED_USER_ID },
    });

    const currentSituations = existing?.activeSituations ?? [];
    const currentFocusVocabIds = existing?.focusVocabIds ?? [];

    let activeSituations = currentSituations;
    if (patch.add_situations && patch.add_situations.length > 0) {
      activeSituations = Array.from(new Set([...activeSituations, ...patch.add_situations]));
    }
    if (patch.remove_situations && patch.remove_situations.length > 0) {
      const toRemove = new Set(patch.remove_situations);
      activeSituations = activeSituations.filter((situation) => !toRemove.has(situation));
    }

    let focusVocabIds = currentFocusVocabIds;
    if (patch.set_focus_vocab) {
      focusVocabIds = await this.resolveExistingVocabIds(patch.set_focus_vocab);
    }

    return this.prisma.lessonPlan.upsert({
      where: { userId: HARDCODED_USER_ID },
      create: {
        userId: HARDCODED_USER_ID,
        activeSituations,
        focusVocabIds,
      },
      update: {
        activeSituations,
        focusVocabIds,
      },
    });
  }

  /**
   * Filters `vocabIds` down to the ones that actually exist in `Vocab`,
   * preserving the caller's order. Unknown ids are dropped rather than
   * erroring the whole `update_lesson_plan` call.
   */
  private async resolveExistingVocabIds(vocabIds: number[]): Promise<number[]> {
    if (vocabIds.length === 0) {
      return [];
    }

    const found = await this.prisma.vocab.findMany({
      where: { id: { in: vocabIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((vocab) => vocab.id));

    return vocabIds.filter((id) => foundIds.has(id));
  }
}
