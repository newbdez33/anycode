/**
 * Terminal Service Tests - Phase 2
 *
 * Tests for the terminal service that manages PTY sessions
 * connected to Docker containers via node-pty.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock node-pty - must use factory function without external references
vi.mock('node-pty', () => {
  const mockPty = {
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  };
  return {
    spawn: vi.fn().mockReturnValue(mockPty),
    __mockPty: mockPty,
  };
});

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-session-uuid'),
}));

// Import after mocking
import { TerminalService } from '../terminal.js';
import * as ptyModule from 'node-pty';

// Get mock reference
const mockPty = (ptyModule as any).__mockPty;

describe('TerminalService', () => {
  let terminalService: TerminalService;

  beforeEach(() => {
    terminalService = new TerminalService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any sessions
    terminalService.closeAll();
  });

  describe('createTerminal', () => {
    it('should create a new terminal session and return session ID', async () => {
      // Act
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Assert
      expect(sessionId).toBe('test-session-uuid');
    });

    it('should spawn PTY with docker exec command', async () => {
      // Arrange
      const pty = await import('node-pty');

      // Act
      await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Assert
      expect(pty.spawn).toHaveBeenCalledWith(
        'docker',
        ['exec', '-it', 'container-abc123', '/bin/bash'],
        expect.objectContaining({
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
        })
      );
    });

    it('should allow custom cols and rows', async () => {
      // Arrange
      const pty = await import('node-pty');

      // Act
      await terminalService.createTerminal('sandbox-1', 'container-abc123', {
        cols: 120,
        rows: 40,
      });

      // Assert
      expect(pty.spawn).toHaveBeenCalledWith(
        'docker',
        expect.any(Array),
        expect.objectContaining({
          cols: 120,
          rows: 40,
        })
      );
    });

    it('should store session in internal map', async () => {
      // Act
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Assert
      const session = terminalService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.sandboxId).toBe('sandbox-1');
      expect(session?.containerId).toBe('container-abc123');
    });

    it('should register onData callback on PTY', async () => {
      // Act
      await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Assert
      expect(mockPty.onData).toHaveBeenCalled();
    });

    it('should register onExit callback on PTY', async () => {
      // Act
      await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Assert
      expect(mockPty.onExit).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Act
      const session = terminalService.getSession(sessionId);

      // Assert
      expect(session).toBeDefined();
      expect(session?.sandboxId).toBe('sandbox-1');
    });

    it('should return undefined for non-existent session', () => {
      // Act
      const session = terminalService.getSession('non-existent-id');

      // Assert
      expect(session).toBeUndefined();
    });
  });

  describe('attachWebSocket', () => {
    it('should attach WebSocket to terminal session', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');
      const mockWs = new EventEmitter() as any;
      mockWs.readyState = 1; // WebSocket.OPEN
      mockWs.send = vi.fn();
      mockWs.close = vi.fn();

      // Act - should not throw
      expect(() => {
        terminalService.attachWebSocket(sessionId, mockWs);
      }).not.toThrow();

      // Assert - session still exists
      const session = terminalService.getSession(sessionId);
      expect(session).toBeDefined();
    });

    it('should throw error for non-existent session', () => {
      // Arrange
      const mockWs = new EventEmitter() as any;

      // Act & Assert
      expect(() => {
        terminalService.attachWebSocket('non-existent', mockWs);
      }).toThrow('Session not found');
    });

    it('should set up WebSocket message handler', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');
      const mockWs = new EventEmitter() as any;
      mockWs.readyState = 1;
      mockWs.send = vi.fn();
      mockWs.close = vi.fn();
      mockWs.on = vi.fn();

      // Act
      terminalService.attachWebSocket(sessionId, mockWs);

      // Assert
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('write', () => {
    it('should write data to PTY', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Act
      terminalService.write(sessionId, 'ls -la\n');

      // Assert
      expect(mockPty.write).toHaveBeenCalledWith('ls -la\n');
    });

    it('should throw error for non-existent session', () => {
      // Act & Assert
      expect(() => {
        terminalService.write('non-existent', 'data');
      }).toThrow('Session not found');
    });
  });

  describe('resize', () => {
    it('should resize PTY', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Act
      terminalService.resize(sessionId, 120, 40);

      // Assert
      expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
    });

    it('should throw error for non-existent session', () => {
      // Act & Assert
      expect(() => {
        terminalService.resize('non-existent', 80, 24);
      }).toThrow('Session not found');
    });
  });

  describe('closeTerminal', () => {
    it('should kill PTY process', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Act
      terminalService.closeTerminal(sessionId);

      // Assert
      expect(mockPty.kill).toHaveBeenCalled();
    });

    it('should close attached WebSocket', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');
      const mockWs = new EventEmitter() as any;
      mockWs.readyState = 1;
      mockWs.send = vi.fn();
      mockWs.close = vi.fn();
      mockWs.on = vi.fn();
      terminalService.attachWebSocket(sessionId, mockWs);

      // Act
      terminalService.closeTerminal(sessionId);

      // Assert
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should remove session from map', async () => {
      // Arrange
      const sessionId = await terminalService.createTerminal('sandbox-1', 'container-abc123');

      // Act
      terminalService.closeTerminal(sessionId);

      // Assert
      expect(terminalService.getSession(sessionId)).toBeUndefined();
    });

    it('should handle closing non-existent session gracefully', () => {
      // Act & Assert - should not throw
      expect(() => {
        terminalService.closeTerminal('non-existent');
      }).not.toThrow();
    });
  });

  describe('listSessions', () => {
    it('should return empty array when no sessions', () => {
      // Act
      const sessions = terminalService.listSessions();

      // Assert
      expect(sessions).toEqual([]);
    });

    it('should return all active sessions', async () => {
      // Arrange
      vi.mocked((await import('uuid')).v4)
        .mockReturnValueOnce('session-1')
        .mockReturnValueOnce('session-2');

      await terminalService.createTerminal('sandbox-1', 'container-1');
      await terminalService.createTerminal('sandbox-2', 'container-2');

      // Act
      const sessions = terminalService.listSessions();

      // Assert
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain('session-1');
      expect(sessions.map(s => s.id)).toContain('session-2');
    });
  });

  describe('getSessionsBySandbox', () => {
    it('should return sessions for specific sandbox', async () => {
      // Arrange
      vi.mocked((await import('uuid')).v4)
        .mockReturnValueOnce('session-1')
        .mockReturnValueOnce('session-2')
        .mockReturnValueOnce('session-3');

      await terminalService.createTerminal('sandbox-1', 'container-1');
      await terminalService.createTerminal('sandbox-1', 'container-1');
      await terminalService.createTerminal('sandbox-2', 'container-2');

      // Act
      const sessions = terminalService.getSessionsBySandbox('sandbox-1');

      // Assert
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.sandboxId === 'sandbox-1')).toBe(true);
    });
  });
});
