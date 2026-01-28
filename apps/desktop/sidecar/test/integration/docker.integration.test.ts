/**
 * Docker Service Integration Tests
 *
 * These tests run against a real Docker daemon and create actual containers.
 * They are slower than unit tests and require Docker to be running.
 *
 * Run with: pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Docker from 'dockerode';
import { DockerService } from '../../src/services/docker.js';
import type { CredentialService } from '../../src/services/credentials.js';

describe('DockerService Integration', () => {
  let docker: Docker;
  let dockerService: DockerService;
  let mockCredentialService: CredentialService;
  const createdContainers: string[] = [];

  // Check if Docker is available
  async function isDockerAvailable(): Promise<boolean> {
    try {
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  beforeAll(async () => {
    docker = new Docker();

    // Verify Docker is available
    const available = await isDockerAvailable();
    if (!available) {
      console.warn('Docker is not available. Skipping integration tests.');
    }
  });

  beforeEach(() => {
    // Create mock credential service
    mockCredentialService = {
      readCredentials: async () => ({
        access: 'test-integration-token',
        refresh: 'test-refresh-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      }),
      isExpired: () => false,
      clearCache: () => {},
      getStatus: async () => ({
        loggedIn: true,
        expired: false,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }),
    } as unknown as CredentialService;

    dockerService = new DockerService(mockCredentialService);
  });

  afterAll(async () => {
    // Cleanup all created containers
    for (const containerId of createdContainers) {
      try {
        const container = docker.getContainer(containerId);
        await container.stop().catch(() => {});
        await container.remove({ force: true }).catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('checkConnection', () => {
    it('should return true when Docker is running', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Act
      const result = await dockerService.checkConnection();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('createSandbox', () => {
    it('should create and start a real container', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Check if sandbox image exists
      const images = await docker.listImages({
        filters: { reference: ['anycode/sandbox:latest'] },
      });

      if (images.length === 0) {
        console.log('Skipping: anycode/sandbox:latest image not found. Run build.sh first.');
        return;
      }

      // Arrange
      const config = {
        projectId: 'integration-test-project',
        projectPath: '/tmp',
      };

      // Act
      const sandbox = await dockerService.createSandbox(config);
      createdContainers.push(sandbox.containerId);

      // Assert
      expect(sandbox).toMatchObject({
        id: expect.any(String),
        containerId: expect.any(String),
        status: 'running',
        projectId: 'integration-test-project',
      });

      // Verify container was created with correct configuration
      // Note: Container may exit immediately since /bin/bash without TTY exits
      const container = docker.getContainer(sandbox.containerId);
      const info = await container.inspect();

      // Check the container was created (may or may not be running)
      expect(info.Id).toBe(sandbox.containerId);
      expect(info.Config.Image).toBe('anycode/sandbox:latest');

      // Check labels
      expect(info.Config.Labels).toMatchObject({
        app: 'anycode-sandbox',
        sandbox_id: sandbox.id,
        project_id: 'integration-test-project',
      });

      // Cleanup
      await dockerService.destroySandbox(sandbox.containerId);
      // Remove from cleanup list since we already destroyed it
      const idx = createdContainers.indexOf(sandbox.containerId);
      if (idx > -1) createdContainers.splice(idx, 1);
    }, 60000); // 60s timeout for container operations

    it('should set correct labels on container', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Check if sandbox image exists
      const images = await docker.listImages({
        filters: { reference: ['anycode/sandbox:latest'] },
      });

      if (images.length === 0) {
        console.log('Skipping: anycode/sandbox:latest image not found');
        return;
      }

      // Arrange
      const config = {
        projectId: 'label-test-project',
        projectPath: '/tmp',
      };

      // Act
      const sandbox = await dockerService.createSandbox(config);
      createdContainers.push(sandbox.containerId);

      // Assert
      const container = docker.getContainer(sandbox.containerId);
      const info = await container.inspect();

      expect(info.Config.Labels).toMatchObject({
        app: 'anycode-sandbox',
        sandbox_id: sandbox.id,
        project_id: 'label-test-project',
      });

      // Cleanup
      await dockerService.destroySandbox(sandbox.containerId);
      const idx = createdContainers.indexOf(sandbox.containerId);
      if (idx > -1) createdContainers.splice(idx, 1);
    }, 60000);

    it('should set resource limits on container', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Check if sandbox image exists
      const images = await docker.listImages({
        filters: { reference: ['anycode/sandbox:latest'] },
      });

      if (images.length === 0) {
        console.log('Skipping: anycode/sandbox:latest image not found');
        return;
      }

      // Arrange
      const config = {
        projectId: 'resource-test-project',
        projectPath: '/tmp',
      };

      // Act
      const sandbox = await dockerService.createSandbox(config);
      createdContainers.push(sandbox.containerId);

      // Assert
      const container = docker.getContainer(sandbox.containerId);
      const info = await container.inspect();

      expect(info.HostConfig.Memory).toBe(4 * 1024 * 1024 * 1024); // 4GB
      expect(info.HostConfig.NanoCpus).toBe(2_000_000_000); // 2 CPU

      // Cleanup
      await dockerService.destroySandbox(sandbox.containerId);
      const idx = createdContainers.indexOf(sandbox.containerId);
      if (idx > -1) createdContainers.splice(idx, 1);
    }, 60000);
  });

  describe('destroySandbox', () => {
    it('should stop and remove a running container', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Check if sandbox image exists
      const images = await docker.listImages({
        filters: { reference: ['anycode/sandbox:latest'] },
      });

      if (images.length === 0) {
        console.log('Skipping: anycode/sandbox:latest image not found');
        return;
      }

      // Arrange - Create a sandbox first
      const config = {
        projectId: 'destroy-test-project',
        projectPath: '/tmp',
      };
      const sandbox = await dockerService.createSandbox(config);
      createdContainers.push(sandbox.containerId);

      // Act
      await dockerService.destroySandbox(sandbox.containerId);

      // Assert - Container should not exist
      const container = docker.getContainer(sandbox.containerId);
      await expect(container.inspect()).rejects.toThrow();

      // Remove from cleanup list
      const idx = createdContainers.indexOf(sandbox.containerId);
      if (idx > -1) createdContainers.splice(idx, 1);
    }, 60000);
  });

  describe('listSandboxes', () => {
    it('should list only anycode sandbox containers', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Check if sandbox image exists
      const images = await docker.listImages({
        filters: { reference: ['anycode/sandbox:latest'] },
      });

      if (images.length === 0) {
        console.log('Skipping: anycode/sandbox:latest image not found');
        return;
      }

      // Arrange - Create a sandbox
      const config = {
        projectId: 'list-test-project',
        projectPath: '/tmp',
      };
      const sandbox = await dockerService.createSandbox(config);
      createdContainers.push(sandbox.containerId);

      // Act
      const sandboxes = await dockerService.listSandboxes();

      // Assert
      expect(sandboxes.some((s) => s.id === sandbox.id)).toBe(true);
      const found = sandboxes.find((s) => s.id === sandbox.id);
      expect(found).toMatchObject({
        id: sandbox.id,
        containerId: sandbox.containerId,
        projectId: 'list-test-project',
      });

      // Cleanup
      await dockerService.destroySandbox(sandbox.containerId);
      const idx = createdContainers.indexOf(sandbox.containerId);
      if (idx > -1) createdContainers.splice(idx, 1);
    }, 60000);

    it('should not include non-anycode containers', async () => {
      // Skip if Docker is not available
      const available = await isDockerAvailable();
      if (!available) {
        console.log('Skipping: Docker not available');
        return;
      }

      // Act
      const sandboxes = await dockerService.listSandboxes();

      // Assert - All returned sandboxes should have sandbox_id
      for (const sandbox of sandboxes) {
        expect(sandbox.id).toBeTruthy();
      }
    });
  });
});
