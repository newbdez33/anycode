import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createSandboxSchema = z.object({
  projectId: z.string().min(1),
  projectPath: z.string().min(1),
  branch: z.string().optional(),
});

export const sandboxRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/sandboxes - List all sandboxes
  app.get('/api/sandboxes', async (request, reply) => {
    const sandboxes = await app.dockerService.listSandboxes();
    return reply.send(sandboxes);
  });

  // POST /api/sandboxes - Create a new sandbox
  app.post('/api/sandboxes', async (request, reply) => {
    const parseResult = createSandboxSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
    }

    try {
      const sandbox = await app.dockerService.createSandbox(parseResult.data);
      return reply.status(201).send(sandbox);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  // DELETE /api/sandboxes/:containerId - Destroy a sandbox
  app.delete<{ Params: { containerId: string } }>(
    '/api/sandboxes/:containerId',
    async (request, reply) => {
      const { containerId } = request.params;

      try {
        await app.dockerService.destroySandbox(containerId);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    }
  );

  // GET /api/sandboxes/docker-status - Check Docker connection
  app.get('/api/sandboxes/docker-status', async (request, reply) => {
    const connected = await app.dockerService.checkConnection();
    return reply.send({ connected });
  });
};
