import { Module } from '@nestjs/common';
import { MCP_STRATEGY } from '@rekog/mcp-nest';

import { SrsModule } from '../srs/srs.module.js';
import { mcpStrategy } from './mcp.strategy.js';
import { RecordExposureController } from './record-exposure.controller.js';

// Exposes the base Streamable HTTP MCP server plus any `@McpController()`
// tool controllers registered below.
@Module({
  imports: [SrsModule],
  controllers: [RecordExposureController],
  providers: [{ provide: MCP_STRATEGY, useValue: mcpStrategy }],
})
export class McpModule {}
