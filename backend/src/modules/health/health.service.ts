import { checkDatabaseHealth, DatabaseHealthResult } from '../../core/database/health';

export interface LivenessStatus {
  status: 'ok';
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  nodeVersion: string;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export interface ReadinessStatus {
  status: 'healthy' | 'unhealthy';
  service: string;
  timestamp: string;
  checks: {
    database: DatabaseHealthResult;
  };
}

export class HealthService {
  static getLiveness(): LivenessStatus {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      service: 'kings-taxi-central-backend',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memoryUsageMb: {
        rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      },
    };
  }

  static async getReadiness(): Promise<ReadinessStatus> {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.status === 'up';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'kings-taxi-central-backend',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
      },
    };
  }
}

