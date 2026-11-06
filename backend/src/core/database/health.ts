import { prisma } from './prisma';

export interface DatabaseHealthResult {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

export async function checkDatabaseHealth(timeoutMs = 2000): Promise<DatabaseHealthResult> {
  const start = Date.now();

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database health check timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    const queryPromise = prisma.$queryRaw`SELECT 1 as ping`;

    await Promise.race([queryPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    return {
      status: 'up',
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      status: 'down',
      latencyMs,
      error: err.message || 'Database unreachable',
    };
  }
}

