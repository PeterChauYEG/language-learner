import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SrsModule } from './srs/srs.module.js';

@Module({
  imports: [PrismaModule, SrsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
