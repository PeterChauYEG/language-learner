import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { mcpStrategy } from './mcp/mcp.strategy.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Wire the MCP Streamable HTTP transport onto the same HTTP adapter and
  // mount it before the app starts listening.
  mcpStrategy.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcpStrategy });
  await app.startAllMicroservices();

  await app.listen(process.env['PORT'] ?? 3000);
}
await bootstrap();
