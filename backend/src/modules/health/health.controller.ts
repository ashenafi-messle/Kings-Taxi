import { Request, Response } from 'express';
import { HealthService } from './health.service';
import { ApiResponse } from '../../core/response/apiResponse';

export class HealthController {
  static getHealth(_req: Request, res: Response): void {
    const liveness = HealthService.getLiveness();
    ApiResponse.success(res, liveness, 200);
  }

  static getLive(_req: Request, res: Response): void {
    const liveness = HealthService.getLiveness();
    res.status(200).json({ status: 'ok', timestamp: liveness.timestamp });
  }

  static async getReady(_req: Request, res: Response): Promise<void> {
    const readiness = await HealthService.getReadiness();
    const statusCode = readiness.status === 'healthy' ? 200 : 503;

    if (statusCode === 200) {
      ApiResponse.success(res, readiness, 200);
    } else {
      ApiResponse.error(
        res,
        'DEPENDENCY_UNAVAILABLE',
        'One or more critical system dependencies (PostgreSQL) are currently offline or unreachable',
        503,
        readiness.checks
      );
    }
  }
}

