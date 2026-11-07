import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Driver Management Module
 *
 * Responsibilities:
 * - Driver onboarding and verification review
 * - Driver availability toggle (ONLINE, OFFLINE, BUSY)
 * - Telematics location pings (currentLatitude, currentLongitude)
 * - Driver profile, ratings, and vehicle assignment
 */

export const driverRouter = Router();

driverRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'drivers',
      status: 'operational',
      description: 'Driver management, verification, and availability services',
    },
    'Driver service status operational'
  );
});

