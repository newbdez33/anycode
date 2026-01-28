/**
 * Terminal Service - Phase 2
 *
 * Manages terminal sessions connected to Docker containers using Docker exec API.
 * Uses Dockerode's exec stream which provides proper TTY support without node-pty.
 */

import Docker from 'dockerode';
import { v4 as uuid } from 'uuid';
import type { WebSocket } from 'ws';
import { logger } from '../lib/logger.js';
import type { Duplex } from 'stream';

export interface TerminalOptions {
  cols?: number;
  rows?: number;
  shell?: string;
}

export interface TerminalSession {
  id: string;
  sandboxId: string;
  containerId: string;
  shell: string;
  exec?: Docker.Exec;
  stream?: Duplex;
  ws?: WebSocket;
  createdAt: number;
  cols: number;
  rows: number;
}

export interface TerminalSessionInfo {
  id: string;
  sandboxId: string;
  containerId: string;
  createdAt: number;
}

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Create a new terminal session (just registers it, exec starts on WebSocket connect)
   */
  async createTerminal(
    sandboxId: string,
    containerId: string,
    options?: TerminalOptions
  ): Promise<string> {
    const sessionId = uuid();
    const cols = options?.cols ?? 80;
    const rows = options?.rows ?? 24;
    const shell = options?.shell ?? '/bin/bash';

    logger.info({ sessionId, sandboxId, containerId }, 'Creating terminal session');

    // Verify container exists and is running
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      if (!info.State.Running) {
        throw new Error('Container is not running');
      }
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to verify container');
      throw new Error(
        `Failed to create terminal: ${error instanceof Error ? error.message : 'Container not found'}`
      );
    }

    const session: TerminalSession = {
      id: sessionId,
      sandboxId,
      containerId,
      shell,
      createdAt: Date.now(),
      cols,
      rows,
    };

    this.sessions.set(sessionId, session);

    logger.info({ sessionId }, 'Terminal session created');

    return sessionId;
  }

  /**
   * Get a terminal session by ID
   */
  getSession(sessionId: string): TerminalSessionInfo | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    return {
      id: session.id,
      sandboxId: session.sandboxId,
      containerId: session.containerId,
      createdAt: session.createdAt,
    };
  }

  /**
   * Attach a WebSocket to a terminal session and start the exec
   */
  async attachWebSocket(sessionId: string, ws: WebSocket): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Close any existing stream/exec first
    if (session.stream) {
      logger.info({ sessionId }, 'Closing existing stream');
      session.stream.end();
      session.stream = undefined;
      session.exec = undefined;
    }

    session.ws = ws;

    try {
      const container = this.docker.getContainer(session.containerId);

      // Create exec instance
      const exec = await container.exec({
        Cmd: [session.shell],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Env: ['TERM=xterm-256color'],
      });

      session.exec = exec;

      // Start the exec and get the stream
      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true,
      });

      session.stream = stream;

      // Resize to initial dimensions
      await exec.resize({ h: session.rows, w: session.cols });

      // Forward Docker stream output to WebSocket
      stream.on('data', (chunk: Buffer) => {
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(JSON.stringify({ type: 'output', data: chunk.toString() }));
        }
      });

      stream.on('end', () => {
        logger.info({ sessionId }, 'Docker exec stream ended');
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(JSON.stringify({ type: 'exit' }));
        }
        this.sessions.delete(sessionId);
      });

      stream.on('error', (error: Error) => {
        logger.error({ sessionId, error }, 'Docker exec stream error');
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      // Handle WebSocket messages
      ws.on('message', (data: Buffer | string) => {
        this.handleWsMessage(sessionId, data);
      });

      ws.on('close', () => {
        logger.info({ sessionId }, 'WebSocket closed');
        // End the stream when WebSocket closes
        if (session.stream) {
          session.stream.end();
        }
        this.sessions.delete(sessionId);
      });

      logger.info({ sessionId }, 'WebSocket attached and exec started');
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to start exec stream');
      this.sessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Write data to the terminal
   */
  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      throw new Error('Session not found or not started');
    }

    session.stream.write(data);
  }

  /**
   * Resize the terminal
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.exec) {
      throw new Error('Session not found');
    }

    try {
      await session.exec.resize({ h: rows, w: cols });
      session.cols = cols;
      session.rows = rows;
      logger.debug({ sessionId, cols, rows }, 'Terminal resized');
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to resize terminal');
    }
  }

  /**
   * Close a terminal session
   */
  closeTerminal(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    logger.info({ sessionId }, 'Closing terminal session');

    // End the stream
    if (session.stream) {
      session.stream.end();
    }

    // Close WebSocket
    if (session.ws) {
      session.ws.close();
    }

    this.sessions.delete(sessionId);
  }

  /**
   * List all active terminal sessions
   */
  listSessions(): TerminalSessionInfo[] {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      sandboxId: session.sandboxId,
      containerId: session.containerId,
      createdAt: session.createdAt,
    }));
  }

  /**
   * Get sessions for a specific sandbox
   */
  getSessionsBySandbox(sandboxId: string): TerminalSessionInfo[] {
    return this.listSessions().filter((s) => s.sandboxId === sandboxId);
  }

  /**
   * Close all terminal sessions
   */
  closeAll(): void {
    for (const sessionId of this.sessions.keys()) {
      this.closeTerminal(sessionId);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleWsMessage(sessionId: string, rawData: Buffer | string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) return;

    try {
      const data = typeof rawData === 'string' ? rawData : rawData.toString();
      const message = JSON.parse(data);

      switch (message.type) {
        case 'input':
          session.stream.write(message.data);
          break;

        case 'resize':
          if (message.cols && message.rows) {
            this.resize(sessionId, message.cols, message.rows);
          }
          break;

        case 'ping':
          session.ws?.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          logger.warn({ sessionId, type: message.type }, 'Unknown message type');
      }
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to parse WebSocket message');
    }
  }
}

// Export singleton instance
export const terminalService = new TerminalService();
