import type { FastifyPluginAsync } from 'fastify';

export const credentialRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/credentials - Get credential status
  app.get('/api/credentials', async (request, reply) => {
    const status = await app.credentialService.getStatus();
    return reply.send(status);
  });

  // POST /api/credentials/refresh - Refresh credentials from source
  app.post('/api/credentials/refresh', async (request, reply) => {
    app.credentialService.clearCache();
    const status = await app.credentialService.getStatus();
    return reply.send(status);
  });
};
