import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { sandboxRoutes } from '../sandboxes.js';
import type { DockerService } from '../../services/docker.js';

describe('Sandbox Routes', () => {
  let app: FastifyInstance;
  let mockDockerService: DockerService;

  beforeEach(async () => {
    mockDockerService = {
      createSandbox: vi.fn(),
      destroySandbox: vi.fn(),
      listSandboxes: vi.fn(),
      checkConnection: vi.fn(),
    } as unknown as DockerService;

    app = Fastify();
    app.decorate('dockerService', mockDockerService);
    await app.register(sandboxRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/sandboxes', () => {
    it('should return list of sandboxes', async () => {
      // Arrange
      const mockSandboxes = [
        { id: 'sb-1', containerId: 'c-1', status: 'running', projectId: 'p-1' },
        { id: 'sb-2', containerId: 'c-2', status: 'exited', projectId: 'p-2' },
      ];
      mockDockerService.listSandboxes = vi.fn().mockResolvedValue(mockSandboxes);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/sandboxes',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(mockSandboxes);
    });

    it('should return empty array when no sandboxes', async () => {
      // Arrange
      mockDockerService.listSandboxes = vi.fn().mockResolvedValue([]);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/sandboxes',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });

  describe('POST /api/sandboxes', () => {
    it('should create a new sandbox', async () => {
      // Arrange
      const mockSandbox = {
        id: 'new-sandbox',
        containerId: 'new-container',
        status: 'running',
        projectId: 'proj-123',
      };
      mockDockerService.createSandbox = vi.fn().mockResolvedValue(mockSandbox);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectId: 'proj-123',
          projectPath: '/path/to/project',
          branch: 'main',
        },
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual(mockSandbox);
      expect(mockDockerService.createSandbox).toHaveBeenCalledWith({
        projectId: 'proj-123',
        projectPath: '/path/to/project',
        branch: 'main',
      });
    });

    it('should validate required projectId', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectPath: '/path/to/project',
          // missing projectId
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it('should validate required projectPath', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectId: 'proj-123',
          // missing projectPath
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it('should return 500 when creation fails', async () => {
      // Arrange
      mockDockerService.createSandbox = vi.fn().mockRejectedValue(
        new Error('No credentials found')
      );

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectId: 'proj-123',
          projectPath: '/path/to/project',
        },
      });

      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toContain('No credentials found');
    });

    it('should accept optional branch parameter', async () => {
      // Arrange
      const mockSandbox = {
        id: 'new-sandbox',
        containerId: 'new-container',
        status: 'running',
        projectId: 'proj-123',
      };
      mockDockerService.createSandbox = vi.fn().mockResolvedValue(mockSandbox);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectId: 'proj-123',
          projectPath: '/path/to/project',
          // No branch - should be optional
        },
      });

      // Assert
      expect(response.statusCode).toBe(201);
    });
  });

  describe('DELETE /api/sandboxes/:containerId', () => {
    it('should destroy a sandbox', async () => {
      // Arrange
      mockDockerService.destroySandbox = vi.fn().mockResolvedValue(undefined);

      // Act
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/sandboxes/container-123',
      });

      // Assert
      expect(response.statusCode).toBe(204);
      expect(mockDockerService.destroySandbox).toHaveBeenCalledWith('container-123');
    });

    it('should return 500 when destroy fails', async () => {
      // Arrange
      mockDockerService.destroySandbox = vi.fn().mockRejectedValue(
        new Error('Container not found')
      );

      // Act
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/sandboxes/container-123',
      });

      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toContain('Container not found');
    });
  });

  describe('GET /api/sandboxes/docker-status', () => {
    it('should return connected true when Docker is available', async () => {
      // Arrange
      mockDockerService.checkConnection = vi.fn().mockResolvedValue(true);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/sandboxes/docker-status',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ connected: true });
    });

    it('should return connected false when Docker is not available', async () => {
      // Arrange
      mockDockerService.checkConnection = vi.fn().mockResolvedValue(false);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/sandboxes/docker-status',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ connected: false });
    });
  });
});
