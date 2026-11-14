import { Module } from '@nestjs/common';
import { MCP_STRATEGY } from '@rekog/mcp-nest';

import { mcpStrategy } from './mcp.strategy.js';
import { TutorController } from './tutor.controller.js';
import { TutorService } from './tutor.service.js';

// Exposes the Streamable HTTP MCP server (POST /mcp) along with the tutor
// tools (get_user_state, get_due_reviews) registered on TutorController.
@Module({
  controllers: [TutorController],
  providers: [{ provide: MCP_STRATEGY, useValue: mcpStrategy }, TutorService],
})
export class McpModule {}
