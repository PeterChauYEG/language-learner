import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

import { TutorService } from './tutor.service.js';

const getDueReviewsSchema = z.object({
  limit: z.number().int().positive().optional(),
});

type GetDueReviewsInput = z.infer<typeof getDueReviewsSchema>;

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

const searchVocabSchema = z.object({
  level: z.enum(JLPT_LEVELS).optional(),
  // Accepted but currently a no-op - see TutorService.searchVocab.
  situation_tag: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

type SearchVocabInput = z.infer<typeof searchVocabSchema>;

/**
 * MCP tools backing the language-learning tutor: current state of the
 * (single, hardcoded) user and their due spaced-repetition reviews.
 */
@McpController()
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Tool({
    name: 'get_user_state',
    description:
      "Returns the user's profile, their lesson plan (if any), and a count of vocab reviews currently due.",
    parameters: z.object({}),
  })
  async getUserState() {
    const state = await this.tutorService.getUserState();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(state) }],
    };
  }

  @Tool({
    name: 'get_due_reviews',
    description:
      'Returns the vocab items due for review (nextReviewAt <= now), most overdue first, up to `limit` items.',
    parameters: getDueReviewsSchema,
  })
  async getDueReviews(@Payload() { limit }: GetDueReviewsInput) {
    const dueReviews = await this.tutorService.getDueReviews(limit);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(dueReviews) }],
    };
  }

  @Tool({
    name: 'search_vocab',
    description:
      'Returns candidate new vocab for introduction to the user: Vocab rows not yet in the ' +
      "user's progress, optionally filtered by JLPT `level` (N5-N1), up to `limit` items " +
      '(default 20). `situation_tag` is accepted but currently ignored - there is no ' +
      'situation-tagging on vocab yet.',
    parameters: searchVocabSchema,
  })
  async searchVocab(@Payload() { level, limit }: SearchVocabInput) {
    const candidates = await this.tutorService.searchVocab(level, limit);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(candidates) }],
    };
  }
}
