import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { mcpAuthMiddleware } from './mcp/mcp-auth.middleware.js';
import { mcpStrategy } from './mcp/mcp.strategy.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (!process.env['MCP_API_KEY']) {
    console.warn('MCP_API_KEY not set — /mcp is running with no auth');
  }

  // Must be registered before the MCP transport mounts its own routes below,
  // since those routes are attached directly to the HTTP adapter rather than
  // through a Nest controller/guard that could otherwise gate them.
  app.use('/mcp', mcpAuthMiddleware);

  // Wire the MCP Streamable HTTP transport onto the same HTTP adapter and
  // mount it before the app starts listening.
  mcpStrategy.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcpStrategy });
  await app.startAllMicroservices();

  await app.listen(process.env['PORT'] ?? 3000);
}
await bootstrap();
