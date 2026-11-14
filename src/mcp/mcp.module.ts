import { Module } from '@nestjs/common';
import { MCP_STRATEGY } from '@rekog/mcp-nest';

import { SrsModule } from '../srs/srs.module.js';
import { LessonPlanController } from './lesson-plan.controller.js';
import { LessonPlanService } from './lesson-plan.service.js';
import { mcpStrategy } from './mcp.strategy.js';
import { RecordExposureController } from './record-exposure.controller.js';

// Exposes the base Streamable HTTP MCP server plus any `@McpController()`
// tool controllers registered below.
@Module({
  imports: [SrsModule],
  controllers: [RecordExposureController, LessonPlanController],
  providers: [{ provide: MCP_STRATEGY, useValue: mcpStrategy }, LessonPlanService],
})
export class McpModule {}
