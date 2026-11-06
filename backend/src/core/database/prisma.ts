import { PrismaClient } from '@prisma/client';
import { logger } from '../logging/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClientInstance: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prismaClientInstance ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClientInstance = prisma;
}

// Log internal prisma errors safely
// @ts-ignore prisma event binding
prisma.$on('error', (e: any) => {
  logger.error({ err: e }, '[Prisma Database Error]');
});

export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('[Prisma] Disconnected from database pool');
  } catch (err) {
    logger.error({ err }, '[Prisma] Error disconnecting from database');
  }
}

