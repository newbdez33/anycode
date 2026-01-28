import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DockerService } from '../docker.js';
import type { CredentialService } from '../credentials.js';
import type { SandboxConfig } from '../../types/index.js';

// Mock dockerode
const mockContainer = {
  id: 'mock-container-id-12345',
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
};

const mockDocker = {
  createContainer: vi.fn().mockResolvedValue(mockContainer),
  getContainer: vi.fn().mockReturnValue(mockContainer),
  listContainers: vi.fn().mockResolvedValue([]),
  ping: vi.fn().mockResolvedValue(undefined),
};

vi.mock('dockerode', () => ({
  default: vi.fn().mockImplementation(() => mockDocker),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234-5678-9abc-def012345678'),
}));

describe('DockerService', () => {
  let dockerService: DockerService;
  let mockCredentialService: CredentialService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockContainer.start.mockResolvedValue(undefined);
    mockContainer.stop.mockResolvedValue(undefined);
    mockContainer.remove.mockResolvedValue(undefined);
    mockDocker.createContainer.mockResolvedValue(mockContainer);
    mockDocker.listContainers.mockResolvedValue([]);
    mockDocker.ping.mockResolvedValue(undefined);

    mockCredentialService = {
      readCredentials: vi.fn().mockResolvedValue({
        access: 'test-access-token',
      }),
      isExpired: vi.fn().mockReturnValue(false),
      clearCache: vi.fn(),
      getStatus: vi.fn(),
    } as unknown as CredentialService;

    dockerService = new DockerService(mockCredentialService);
  });

  describe('createSandbox', () => {
    it('should create a sandbox container with correct configuration', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
        branch: 'feature-branch',
      };

      // Act
      const result = await dockerService.createSandbox(config);

      // Assert
      expect(result).toEqual({
        id: 'test-uuid-1234-5678-9abc-def012345678',
        containerId: 'mock-container-id-12345',
        status: 'running',
        projectId: 'proj-123',
        createdAt: expect.any(Number),
      });
    });

    it('should throw error when no credentials available', async () => {
      // Arrange
      mockCredentialService.readCredentials = vi.fn().mockResolvedValue(null);
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act & Assert
      await expect(dockerService.createSandbox(config)).rejects.toThrow(
        'No credentials found'
      );
    });

    it('should inject credentials as environment variables', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining([
            'ANTHROPIC_API_KEY=test-access-token',
            'SANDBOX_ID=test-uuid-1234-5678-9abc-def012345678',
            'PROJECT_ID=proj-123',
          ]),
        })
      );
    });

    it('should include branch in environment when provided', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
        branch: 'develop',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining(['GIT_BRANCH=develop']),
        })
      );
    });

    it('should set resource limits on container', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Memory: 4 * 1024 * 1024 * 1024, // 4GB
            NanoCpus: 2_000_000_000, // 2 CPU
          }),
        })
      );
    });

    it('should mount project path to /workspace', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/my/project/path',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Binds: ['/my/project/path:/workspace:rw'],
          }),
        })
      );
    });

    it('should set security options', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            SecurityOpt: ['no-new-privileges:true'],
            CapDrop: ['ALL'],
            CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
          }),
        })
      );
    });

    it('should set correct labels for filtering', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Labels: {
            app: 'anycode-sandbox',
            sandbox_id: 'test-uuid-1234-5678-9abc-def012345678',
            project_id: 'proj-123',
          },
        })
      );
    });

    it('should start the container after creation', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockContainer.start).toHaveBeenCalled();
    });
  });

  describe('destroySandbox', () => {
    it('should stop and remove the container', async () => {
      // Act
      await dockerService.destroySandbox('test-container-id');

      // Assert
      expect(mockDocker.getContainer).toHaveBeenCalledWith('test-container-id');
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('should handle already stopped container gracefully', async () => {
      // Arrange
      mockContainer.stop.mockRejectedValue(new Error('container already stopped'));

      // Act & Assert - should not throw
      await expect(
        dockerService.destroySandbox('test-container-id')
      ).resolves.not.toThrow();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });

  describe('listSandboxes', () => {
    it('should return list of sandbox containers', async () => {
      // Arrange
      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container-1',
          State: 'running',
          Created: 1706400000,
          Labels: {
            app: 'anycode-sandbox',
            sandbox_id: 'sandbox-1',
            project_id: 'proj-1',
          },
        },
        {
          Id: 'container-2',
          State: 'exited',
          Created: 1706400100,
          Labels: {
            app: 'anycode-sandbox',
            sandbox_id: 'sandbox-2',
            project_id: 'proj-2',
          },
        },
      ]);

      // Act
      const result = await dockerService.listSandboxes();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'sandbox-1',
        containerId: 'container-1',
        status: 'running',
        projectId: 'proj-1',
        createdAt: 1706400000000,
      });
    });

    it('should filter by anycode-sandbox label', async () => {
      // Act
      await dockerService.listSandboxes();

      // Assert
      expect(mockDocker.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: { label: ['app=anycode-sandbox'] },
      });
    });

    it('should filter out containers without sandbox_id', async () => {
      // Arrange
      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container-1',
          State: 'running',
          Labels: {
            app: 'anycode-sandbox',
            sandbox_id: 'sandbox-1',
            project_id: 'proj-1',
          },
        },
        {
          Id: 'container-2',
          State: 'running',
          Labels: {
            app: 'anycode-sandbox',
            // Missing sandbox_id
            project_id: 'proj-2',
          },
        },
      ]);

      // Act
      const result = await dockerService.listSandboxes();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sandbox-1');
    });
  });

  describe('checkConnection', () => {
    it('should return true when Docker is available', async () => {
      // Arrange
      mockDocker.ping.mockResolvedValue(undefined);

      // Act
      const result = await dockerService.checkConnection();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when Docker is not available', async () => {
      // Arrange
      mockDocker.ping.mockRejectedValue(new Error('Cannot connect'));

      // Act
      const result = await dockerService.checkConnection();

      // Assert
      expect(result).toBe(false);
    });
  });
});
