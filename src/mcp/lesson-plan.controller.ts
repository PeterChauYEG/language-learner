import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';

import type { LessonPlanPatch } from './lesson-plan.schema.js';
import { lessonPlanPatchSchema } from './lesson-plan.schema.js';
import { LessonPlanService } from './lesson-plan.service.js';

@McpController()
export class LessonPlanController {
  constructor(private readonly lessonPlanService: LessonPlanService) {}

  @Tool({
    name: 'update_lesson_plan',
    description:
      "Applies a typed patch to the current user's lesson plan: add_situations " +
      '(appended to active situations, deduped), remove_situations (removed from ' +
      'active situations), and/or set_focus_vocab (replaces the focus vocab id list ' +
      'entirely; unknown vocab ids are silently dropped). The lesson plan row is ' +
      'created if it does not exist yet. Fields omitted from the patch are left ' +
      'untouched.',
    parameters: lessonPlanPatchSchema,
  })
  async updateLessonPlan(@Payload() patch: LessonPlanPatch) {
    const lessonPlan = await this.lessonPlanService.applyPatch(patch);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            userId: lessonPlan.userId,
            activeSituations: lessonPlan.activeSituations,
            focusVocabIds: lessonPlan.focusVocabIds,
            updatedAt: lessonPlan.updatedAt,
          }),
        },
      ],
    };
  }
}
