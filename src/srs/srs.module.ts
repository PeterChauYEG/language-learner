import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { SrsService } from './srs.service.js';

@Module({
  imports: [PrismaModule],
  providers: [SrsService],
  exports: [SrsService],
})
export class SrsModule {}
