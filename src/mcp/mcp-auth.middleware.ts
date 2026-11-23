import type { NextFunction, Request, Response } from 'express';

const BEARER_PREFIX = 'Bearer ';

// Guards the public `/mcp` endpoint with a shared-secret check. Mounted
// directly via `app.use('/mcp', mcpAuthMiddleware)` in main.ts, ahead of
// `mcpStrategy.setHttpAdapter(...)`, since the MCP transport registers its
// routes straight onto the HTTP adapter rather than through a Nest
// controller/guard.
export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env['MCP_API_KEY'];

  if (!expectedKey) {
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  const bearerKey =
    typeof authHeader === 'string' && authHeader.startsWith(BEARER_PREFIX)
      ? authHeader.slice(BEARER_PREFIX.length)
      : undefined;

  const rawQueryKey = req.query['key'];
  const queryKey = typeof rawQueryKey === 'string' ? rawQueryKey : undefined;

  if (bearerKey === expectedKey || queryKey === expectedKey) {
    next();
    return;
  }

  res.status(401).json({ error: 'unauthorized' });
}
