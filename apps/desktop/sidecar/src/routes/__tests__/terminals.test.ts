/**
 * Terminal Routes Tests - Phase 2
 *
 * Tests for the terminal HTTP and WebSocket API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { terminalRoutes } from '../terminals.js';
import type { TerminalService } from '../../services/terminal.js';

describe('Terminal Routes', () => {
  let app: FastifyInstance;
  let mockTerminalService: TerminalService;

  beforeEach(async () => {
    mockTerminalService = {
      createTerminal: vi.fn().mockResolvedValue('session-123'),
      getSession: vi.fn().mockReturnValue({
        id: 'session-123',
        sandboxId: 'sandbox-1',
        containerId: 'container-abc',
        createdAt: Date.now(),
      }),
      attachWebSocket: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      closeTerminal: vi.fn(),
      listSessions: vi.fn().mockReturnValue([]),
      getSessionsBySandbox: vi.fn().mockReturnValue([]),
      closeAll: vi.fn(),
    } as unknown as TerminalService;

    app = Fastify();
    await app.register(websocket);
    app.decorate('terminalService', mockTerminalService);
    await app.register(terminalRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/terminals', () => {
    it('should create a new terminal session', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals',
        payload: {
          sandboxId: 'sandbox-1',
          containerId: 'container-abc',
        },
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        sessionId: 'session-123',
      });
      expect(mockTerminalService.createTerminal).toHaveBeenCalledWith(
        'sandbox-1',
        'container-abc',
        undefined
      );
    });

    it('should accept optional cols and rows', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals',
        payload: {
          sandboxId: 'sandbox-1',
          containerId: 'container-abc',
          cols: 120,
          rows: 40,
        },
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(mockTerminalService.createTerminal).toHaveBeenCalledWith(
        'sandbox-1',
        'container-abc',
        { cols: 120, rows: 40 }
      );
    });

    it('should return 400 when sandboxId is missing', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals',
        payload: {
          containerId: 'container-abc',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when containerId is missing', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals',
        payload: {
          sandboxId: 'sandbox-1',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });

    it('should return 500 when creation fails', async () => {
      // Arrange
      mockTerminalService.createTerminal = vi.fn().mockRejectedValue(
        new Error('Failed to spawn PTY')
      );

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals',
        payload: {
          sandboxId: 'sandbox-1',
          containerId: 'container-abc',
        },
      });

      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toContain('Failed to spawn PTY');
    });
  });

  describe('GET /api/terminals', () => {
    it('should return list of all terminal sessions', async () => {
      // Arrange
      mockTerminalService.listSessions = vi.fn().mockReturnValue([
        { id: 'session-1', sandboxId: 'sandbox-1', containerId: 'c-1', createdAt: 1000 },
        { id: 'session-2', sandboxId: 'sandbox-2', containerId: 'c-2', createdAt: 2000 },
      ]);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/terminals',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
    });
  });

  describe('GET /api/terminals/sandbox/:sandboxId', () => {
    it('should return terminal sessions for specific sandbox', async () => {
      // Arrange
      mockTerminalService.getSessionsBySandbox = vi.fn().mockReturnValue([
        { id: 'session-1', sandboxId: 'sandbox-1', containerId: 'c-1', createdAt: 1000 },
      ]);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/terminals/sandbox/sandbox-1',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(1);
      expect(mockTerminalService.getSessionsBySandbox).toHaveBeenCalledWith('sandbox-1');
    });
  });

  describe('GET /api/terminals/:sessionId', () => {
    it('should return terminal session details', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/terminals/session-123',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: 'session-123',
        sandboxId: 'sandbox-1',
      });
    });

    it('should return 404 when session not found', async () => {
      // Arrange
      mockTerminalService.getSession = vi.fn().mockReturnValue(undefined);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/terminals/non-existent',
      });

      // Assert
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/terminals/:sessionId/resize', () => {
    it('should resize terminal', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals/session-123/resize',
        payload: {
          cols: 120,
          rows: 40,
        },
      });

      // Assert
      expect(response.statusCode).toBe(204);
      expect(mockTerminalService.resize).toHaveBeenCalledWith('session-123', 120, 40);
    });

    it('should return 400 when cols/rows missing', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/terminals/session-123/resize',
        payload: {},
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/terminals/:sessionId', () => {
    it('should close terminal session', async () => {
      // Act
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/terminals/session-123',
      });

      // Assert
      expect(response.statusCode).toBe(204);
      expect(mockTerminalService.closeTerminal).toHaveBeenCalledWith('session-123');
    });
  });
});
