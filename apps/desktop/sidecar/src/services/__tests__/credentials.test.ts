import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CredentialService } from '../credentials.js';

// Mock keytar
vi.mock('keytar', () => ({
  default: {
    getPassword: vi.fn(),
    setPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

// Mock os
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(() => {
    service = new CredentialService();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('readCredentials', () => {
    it('should return null when no credentials exist', async () => {
      // Arrange
      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(null);

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toBeNull();
    });

    it('should read credentials from Keychain when available', async () => {
      // Arrange
      const mockCredentials = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toEqual(mockCredentials);
      expect(keytar.default.getPassword).toHaveBeenCalledWith(
        'Claude Code-credentials',
        'default'
      );
    });

    it('should fall back to file when Keychain fails', async () => {
      // Arrange
      const mockCredentials = {
        accessToken: 'file-access-token',
        refreshToken: 'file-refresh-token',
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(null);

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockCredentials));

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toEqual({
        access: 'file-access-token',
        refresh: 'file-refresh-token',
        expires: undefined,
      });
    });

    it('should use cache within TTL', async () => {
      // Arrange
      const mockCredentials = {
        access: 'cached-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act - first call
      await service.readCredentials();
      // Act - second call within TTL
      await service.readCredentials();

      // Assert - keytar should only be called once
      expect(keytar.default.getPassword).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      // Arrange
      const mockCredentials = {
        access: 'test-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act - first call
      await service.readCredentials();

      // Fast forward time past TTL (61 seconds)
      vi.advanceTimersByTime(61 * 1000);

      // Act - second call after TTL
      await service.readCredentials();

      // Assert - keytar should be called twice
      expect(keytar.default.getPassword).toHaveBeenCalledTimes(2);
    });

    it('should handle Keychain returning invalid JSON', async () => {
      // Arrange
      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue('invalid json');

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('should return false when no expiry is set', () => {
      // Arrange
      const creds = { access: 'token' };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(false);
    });

    it('should return false when token is not expired', () => {
      // Arrange
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(false);
    });

    it('should return true when token is expired', () => {
      // Arrange
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
      };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(true);
    });

    it('should return true when token expires within buffer time (5 min)', () => {
      // Arrange
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
      };

      // Act & Assert - within 5 minute buffer, should be considered expired
      expect(service.isExpired(creds)).toBe(true);
    });

    it('should return false when token expires after buffer time', () => {
      // Arrange
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
      };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the credential cache', async () => {
      // Arrange
      const mockCredentials = { access: 'test-token' };
      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      await service.readCredentials();

      // Act
      service.clearCache();
      await service.readCredentials();

      // Assert - keytar should be called twice (cache was cleared)
      expect(keytar.default.getPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatus', () => {
    it('should return logged in status when credentials exist and valid', async () => {
      // Arrange
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const mockCredentials = {
        access: 'test-token',
        expires: expiresAt,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act
      const status = await service.getStatus();

      // Assert
      expect(status).toEqual({
        loggedIn: true,
        expired: false,
        expiresAt: expiresAt,
      });
    });

    it('should return not logged in when no credentials', async () => {
      // Arrange
      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(null);

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const status = await service.getStatus();

      // Assert
      expect(status).toEqual({
        loggedIn: false,
        expired: false,
        expiresAt: null,
      });
    });

    it('should indicate expired credentials', async () => {
      // Arrange
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
      const expiresAt = Math.floor(Date.now() / 1000) - 60; // expired
      const mockCredentials = {
        access: 'expired-token',
        expires: expiresAt,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act
      const status = await service.getStatus();

      // Assert
      expect(status).toEqual({
        loggedIn: true,
        expired: true,
        expiresAt: expiresAt,
      });
    });
  });
});
