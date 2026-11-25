import { PrismaClient } from '@prisma/client';
import '../../config/env';
import { logger } from '../logging/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClientInstance: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prismaClientInstance ||
  new PrismaClient({
    datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
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

/**
 * Robust detection of database unreachable / network failure / SSH tunnel drop conditions.
 * Only flags genuine network connectivity and initialization failures.
 * Never flags query, schema, validation, or constraint errors (P2xxx).
 */
export function isDbConnectionError(err: any): boolean {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || '');
  const code = String(err.code || '');

  return (
    name === 'PrismaClientInitializationError' ||
    code.startsWith('P1') ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EADDRNOTAVAIL' ||
    code === 'EHOSTUNREACH' ||
    msg.includes("Can't reach database server") ||
    msg.includes('connection timed out') ||
    msg.includes('Connection refused') ||
    msg.includes('connect ECONNREFUSED') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('Server has closed the connection')
  );
}


