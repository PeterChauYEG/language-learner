import { McpController, Tool } from '@rekog/mcp-nest';
import { Payload } from '@nestjs/microservices';

import { PrismaService } from '../prisma/prisma.service.js';
import type { LogSessionParameters } from './log-session.schema.js';
import { logSessionParameters } from './log-session.schema.js';

/**
 * No auth system yet (see `UserProfile` in schema.prisma), so every MCP
 * tool in this epic operates on a single hardcoded user.
 */
const HARDCODED_USER_ID = 1;

@McpController()
export class LogSessionController {
  constructor(private readonly prisma: PrismaService) {}

  @Tool({
    name: 'log_session',
    description:
      'Logs a completed conversation session for the current user, recording the ' +
      'situation practiced, an optional summary, and the vocab ids introduced ' +
      'and/or reviewed during the session.',
    parameters: logSessionParameters,
  })
  async logSession(
    @Payload()
    {
      situation,
      summary,
      words_introduced: wordsIntroduced,
      words_reviewed: wordsReviewed,
    }: LogSessionParameters,
  ) {
    // The hardcoded user may not have a `UserProfile` row yet (no sign-up
    // flow exists); create it on first use so the FK on
    // `ConversationSession.userId` is satisfied.
    await this.prisma.userProfile.upsert({
      where: { id: HARDCODED_USER_ID },
      create: { id: HARDCODED_USER_ID },
      update: {},
    });

    const session = await this.prisma.conversationSession.create({
      data: {
        userId: HARDCODED_USER_ID,
        situation,
        summary: summary ?? null,
        wordsIntroduced: wordsIntroduced ?? [],
        wordsReviewed: wordsReviewed ?? [],
      },
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            id: session.id,
            userId: session.userId,
            situation: session.situation,
            startedAt: session.startedAt,
            summary: session.summary,
            wordsIntroduced: session.wordsIntroduced,
            wordsReviewed: session.wordsReviewed,
          }),
        },
      ],
    };
  }
}
