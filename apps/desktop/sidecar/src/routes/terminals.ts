/**
 * Terminal Routes - Phase 2
 *
 * HTTP and WebSocket API endpoints for terminal management.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { TerminalService } from '../services/terminal.js';
import { logger } from '../lib/logger.js';

// Request schemas
const CreateTerminalSchema = z.object({
  sandboxId: z.string().min(1),
  containerId: z.string().min(1),
  cols: z.number().int().min(1).optional(),
  rows: z.number().int().min(1).optional(),
});

const ResizeTerminalSchema = z.object({
  cols: z.number().int().min(1),
  rows: z.number().int().min(1),
});

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    terminalService: TerminalService;
  }
}

export const terminalRoutes: FastifyPluginAsync = async (server) => {
  const terminalService = server.terminalService;

  // POST /api/terminals - Create a new terminal session
  server.post('/api/terminals', async (request, reply) => {
    const parseResult = CreateTerminalSchema.safeParse(request.body);

    if (!parseResult.success) {
      reply.code(400);
      return { error: 'Invalid request', details: parseResult.error.issues };
    }

    const { sandboxId, containerId, cols, rows } = parseResult.data;

    try {
      const sessionId = await terminalService.createTerminal(
        sandboxId,
        containerId,
        cols || rows ? { cols, rows } : undefined
      );

      reply.code(201);
      return { sessionId };
    } catch (error) {
      logger.error({ error }, 'Failed to create terminal');
      reply.code(500);
      return { error: error instanceof Error ? error.message : 'Failed to create terminal' };
    }
  });

  // GET /api/terminals - List all terminal sessions
  server.get('/api/terminals', async () => {
    return terminalService.listSessions();
  });

  // GET /api/terminals/sandbox/:sandboxId - Get terminals for a sandbox
  server.get<{ Params: { sandboxId: string } }>(
    '/api/terminals/sandbox/:sandboxId',
    async (request) => {
      return terminalService.getSessionsBySandbox(request.params.sandboxId);
    }
  );

  // GET /api/terminals/:sessionId - Get terminal session details
  server.get<{ Params: { sessionId: string } }>(
    '/api/terminals/:sessionId',
    async (request, reply) => {
      const session = terminalService.getSession(request.params.sessionId);

      if (!session) {
        reply.code(404);
        return { error: 'Session not found' };
      }

      return session;
    }
  );

  // POST /api/terminals/:sessionId/resize - Resize terminal
  server.post<{ Params: { sessionId: string } }>(
    '/api/terminals/:sessionId/resize',
    async (request, reply) => {
      const parseResult = ResizeTerminalSchema.safeParse(request.body);

      if (!parseResult.success) {
        reply.code(400);
        return { error: 'Invalid request', details: parseResult.error.issues };
      }

      const { cols, rows } = parseResult.data;
      const { sessionId } = request.params;

      try {
        await terminalService.resize(sessionId, cols, rows);
        reply.code(204);
      } catch (error) {
        reply.code(404);
        return { error: 'Session not found' };
      }
    }
  );

  // DELETE /api/terminals/:sessionId - Close terminal session
  server.delete<{ Params: { sessionId: string } }>(
    '/api/terminals/:sessionId',
    async (request, reply) => {
      terminalService.closeTerminal(request.params.sessionId);
      reply.code(204);
    }
  );

  // WebSocket endpoint for terminal I/O
  server.get<{ Params: { sessionId: string } }>(
    '/ws/terminals/:sessionId',
    { websocket: true },
    async (connection, request) => {
      const { sessionId } = request.params;
      const session = terminalService.getSession(sessionId);

      if (!session) {
        connection.close(4004, 'Session not found');
        return;
      }

      logger.info({ sessionId }, 'WebSocket connection established');

      try {
        // Attach WebSocket to terminal session and start exec
        await terminalService.attachWebSocket(sessionId, connection);

        // Send connection confirmation after exec is started
        connection.send(JSON.stringify({ type: 'connected', sessionId }));
      } catch (error) {
        logger.error({ sessionId, error }, 'Failed to attach WebSocket');
        connection.send(
          JSON.stringify({ type: 'error', message: 'Failed to start terminal' })
        );
        connection.close(4005, 'Failed to start terminal');
      }
    }
  );
};
