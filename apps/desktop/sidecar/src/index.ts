import { createServer } from './server.js';
import { logger } from './lib/logger.js';

const PORT = parseInt(process.env.PORT || '19876', 10);
const HOST = process.env.HOST || '127.0.0.1';

async function main() {
  const server = await createServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    logger.info(`Sidecar server running at http://${HOST}:${PORT}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
