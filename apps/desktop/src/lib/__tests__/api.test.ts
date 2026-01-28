import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getCredentialStatus', () => {
    it('should return credential status when logged in', async () => {
      // Arrange
      const mockResponse = {
        loggedIn: true,
        expired: false,
        expiresAt: 1706500000,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await api.getCredentialStatus();

      // Assert
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:19876/api/credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return credential status when not logged in', async () => {
      // Arrange
      const mockResponse = {
        loggedIn: false,
        expired: false,
        expiresAt: null,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await api.getCredentialStatus();

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDockerStatus', () => {
    it('should return docker connected status', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ connected: true }),
      } as Response);

      // Act
      const result = await api.getDockerStatus();

      // Assert
      expect(result).toEqual({ connected: true });
    });
  });

  describe('listSandboxes', () => {
    it('should return list of sandboxes', async () => {
      // Arrange
      const mockSandboxes = [
        { id: 'sb-1', containerId: 'c-1', status: 'running', projectId: 'p-1' },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSandboxes,
      } as Response);

      // Act
      const result = await api.listSandboxes();

      // Assert
      expect(result).toEqual(mockSandboxes);
    });
  });

  describe('createSandbox', () => {
    it('should create sandbox with correct payload', async () => {
      // Arrange
      const mockSandbox = {
        id: 'sb-new',
        containerId: 'c-new',
        status: 'running',
        projectId: 'p-1',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockSandbox,
      } as Response);

      // Act
      const result = await api.createSandbox({
        projectId: 'p-1',
        projectPath: '/path/to/project',
        branch: 'main',
      });

      // Assert
      expect(result).toEqual(mockSandbox);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:19876/api/sandboxes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            projectId: 'p-1',
            projectPath: '/path/to/project',
            branch: 'main',
          }),
        })
      );
    });
  });

  describe('destroySandbox', () => {
    it('should delete sandbox', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => undefined,
      } as Response);

      // Act
      await api.destroySandbox('container-123');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:19876/api/sandboxes/container-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error on non-ok response', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      } as Response);

      // Act & Assert
      await expect(api.getCredentialStatus()).rejects.toThrow('Internal Server Error');
    });

    it('should handle JSON parse error gracefully', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('JSON parse error');
        },
      } as Response);

      // Act & Assert
      await expect(api.getCredentialStatus()).rejects.toThrow('Unknown error');
    });
  });
});
