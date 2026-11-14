import { z } from 'zod';

/**
 * Typed patch shape for `update_lesson_plan`. All fields are optional, but
 * the tool is intentionally never a free-form overwrite of the
 * `LessonPlan` row - each field describes a specific mutation:
 *
 * - `addSituations` is appended to `activeSituations` (deduped).
 * - `removeSituations` is removed from `activeSituations`.
 * - `setFocusVocabIds` replaces `focusVocabIds` entirely, after dropping any
 *   ids that don't resolve to a real `Vocab` row.
 */
export const lessonPlanPatchSchema = z.object({
  add_situations: z.array(z.string()).optional(),
  remove_situations: z.array(z.string()).optional(),
  set_focus_vocab: z.array(z.number().int()).optional(),
});

export type LessonPlanPatch = z.infer<typeof lessonPlanPatchSchema>;
