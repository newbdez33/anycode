import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { credentialRoutes } from '../credentials.js';
import type { CredentialService } from '../../services/credentials.js';

describe('Credential Routes', () => {
  let app: FastifyInstance;
  let mockCredentialService: CredentialService;

  beforeEach(async () => {
    mockCredentialService = {
      readCredentials: vi.fn(),
      isExpired: vi.fn(),
      clearCache: vi.fn(),
      getStatus: vi.fn(),
    } as unknown as CredentialService;

    app = Fastify();
    app.decorate('credentialService', mockCredentialService);
    await app.register(credentialRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/credentials', () => {
    it('should return logged in status when credentials exist', async () => {
      // Arrange
      mockCredentialService.getStatus = vi.fn().mockResolvedValue({
        loggedIn: true,
        expired: false,
        expiresAt: 1706500000,
      });

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/credentials',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        loggedIn: true,
        expired: false,
        expiresAt: 1706500000,
      });
    });

    it('should return not logged in when no credentials', async () => {
      // Arrange
      mockCredentialService.getStatus = vi.fn().mockResolvedValue({
        loggedIn: false,
        expired: false,
        expiresAt: null,
      });

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/credentials',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        loggedIn: false,
        expired: false,
        expiresAt: null,
      });
    });

    it('should indicate expired credentials', async () => {
      // Arrange
      mockCredentialService.getStatus = vi.fn().mockResolvedValue({
        loggedIn: true,
        expired: true,
        expiresAt: 1706400000,
      });

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/credentials',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        loggedIn: true,
        expired: true,
        expiresAt: 1706400000,
      });
    });
  });

  describe('POST /api/credentials/refresh', () => {
    it('should clear cache and re-read credentials', async () => {
      // Arrange
      mockCredentialService.getStatus = vi.fn().mockResolvedValue({
        loggedIn: true,
        expired: false,
        expiresAt: 1706500000,
      });

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/credentials/refresh',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(mockCredentialService.clearCache).toHaveBeenCalled();
      expect(mockCredentialService.getStatus).toHaveBeenCalled();
    });
  });
});
