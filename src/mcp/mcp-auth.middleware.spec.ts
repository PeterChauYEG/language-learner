import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mcpAuthMiddleware } from './mcp-auth.middleware.js';

describe('mcpAuthMiddleware', () => {
  const originalKey = process.env['MCP_API_KEY'];

  let next: NextFunction;
  let res: Response;

  function makeRequest(opts: { authorization?: string; key?: string }): Request {
    return {
      headers: opts.authorization ? { authorization: opts.authorization } : {},
      query: opts.key ? { key: opts.key } : {},
    } as unknown as Request;
  }

  beforeEach(() => {
    process.env['MCP_API_KEY'] = 'secret-key';
    next = vi.fn();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env['MCP_API_KEY'];
    } else {
      process.env['MCP_API_KEY'] = originalKey;
    }
  });

  it('rejects a request with no credentials', () => {
    mcpAuthMiddleware(makeRequest({}), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request with the wrong key', () => {
    mcpAuthMiddleware(makeRequest({ authorization: 'Bearer wrong-key' }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a request with the correct Authorization bearer header', () => {
    mcpAuthMiddleware(makeRequest({ authorization: 'Bearer secret-key' }), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a request with the correct key query parameter', () => {
    mcpAuthMiddleware(makeRequest({ key: 'secret-key' }), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('fails open when MCP_API_KEY is unset', () => {
    delete process.env['MCP_API_KEY'];

    mcpAuthMiddleware(makeRequest({}), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
