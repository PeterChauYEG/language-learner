import { McpStrategy, StreamableHttpTransport } from '@rekog/mcp-nest';

// The strategy is the whole MCP server configuration. It is created once,
// wired into the HTTP adapter and microservices in main.ts, and shared with
// AppModule (as the MCP_STRATEGY provider) for any future dynamic tool/
// resource/prompt registration.
export const mcpStrategy = new McpStrategy({
  name: 'language-learner-mcp',
  version: '0.0.1',
  transports: [
    new StreamableHttpTransport({
      endpoint: '/mcp',
    }),
  ],
});
