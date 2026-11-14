import { Module } from '@nestjs/common';
import { MCP_STRATEGY } from '@rekog/mcp-nest';

import { SrsModule } from '../srs/srs.module.js';
import { LessonPlanController } from './lesson-plan.controller.js';
import { LessonPlanService } from './lesson-plan.service.js';
import { mcpStrategy } from './mcp.strategy.js';
import { RecordExposureController } from './record-exposure.controller.js';
import { TutorController } from './tutor.controller.js';
import { TutorService } from './tutor.service.js';

// Exposes the base Streamable HTTP MCP server (POST /mcp) plus all
// `@McpController()` tool controllers registered below: tutor tools
// (get_user_state, get_due_reviews), record_exposure, and update_lesson_plan.
@Module({
  imports: [SrsModule],
  controllers: [TutorController, RecordExposureController, LessonPlanController],
  providers: [{ provide: MCP_STRATEGY, useValue: mcpStrategy }, TutorService, LessonPlanService],
})
export class McpModule {}
