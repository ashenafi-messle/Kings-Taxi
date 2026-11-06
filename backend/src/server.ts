import { createServer } from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './core/logging/logger';
import { disconnectPrisma } from './core/database/prisma';

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      prefix: env.API_PREFIX,
      docsUrl: `http://localhost:${env.PORT}${env.API_PREFIX}/docs`,
    },
    `🚀 Kings Taxi Central Backend listening on port ${env.PORT}`
  );
});

// Graceful Shutdown Handler
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('[Shutdown] HTTP server closed.');

    try {
      await disconnectPrisma();
      logger.info('[Shutdown] Database connections cleanly terminated.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, '[Shutdown] Error during database disconnection.');
      process.exit(1);
    }
  });

  // Force shutdown after timeout if pending requests hang
  setTimeout(() => {
    logger.error('[Shutdown] Forceful shutdown initiated after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  logger.fatal({ err: reason }, '[Process] Unhandled Promise Rejection');
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, '[Process] Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

