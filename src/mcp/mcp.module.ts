import { Module } from '@nestjs/common';
import { MCP_STRATEGY } from '@rekog/mcp-nest';

import { mcpStrategy } from './mcp.strategy.js';

// No tools/resources/prompts are registered yet - this just exposes the base
// Streamable HTTP MCP server so a client can complete the initialize
// handshake against POST /mcp.
@Module({
  providers: [{ provide: MCP_STRATEGY, useValue: mcpStrategy }],
})
export class McpModule {}
