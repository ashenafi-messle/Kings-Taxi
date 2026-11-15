import { prisma, disconnectPrisma } from '../core/database/prisma';
import { checkDatabaseHealth } from '../core/database/health';
import { env } from './env';

export { prisma, disconnectPrisma, checkDatabaseHealth };

export const databaseConfig = {
  url: env.DATABASE_URL,
  isDevTunnel: env.DATABASE_URL.includes(':5433') || env.DATABASE_URL.includes(':15433'),
  connectionTimeoutMs: 2000,
};

