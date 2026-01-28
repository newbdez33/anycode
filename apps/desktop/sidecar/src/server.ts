import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { logger } from './lib/logger.js';
import { credentialRoutes } from './routes/credentials.js';
import { sandboxRoutes } from './routes/sandboxes.js';
import { CredentialService } from './services/credentials.js';
import { DockerService } from './services/docker.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    credentialService: CredentialService;
    dockerService: DockerService;
  }
}

export async function createServer() {
  const server = Fastify({
    logger: false, // We use our own logger
  });

  // Register plugins
  await server.register(cors, {
    origin: true,
  });

  await server.register(websocket);

  // Initialize services
  const credentialService = new CredentialService();
  const dockerService = new DockerService(credentialService);

  // Decorate server with services
  server.decorate('credentialService', credentialService);
  server.decorate('dockerService', dockerService);

  // Register routes
  await server.register(credentialRoutes);
  await server.register(sandboxRoutes);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    logger.error(error, 'Request error');
    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message,
    });
  });

  return server;
}
