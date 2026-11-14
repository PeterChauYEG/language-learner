import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

import { TutorService } from './tutor.service.js';

const getDueReviewsSchema = z.object({
  limit: z.number().int().positive().optional(),
});

type GetDueReviewsInput = z.infer<typeof getDueReviewsSchema>;

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
}
