import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Vehicle & Fleet Management Module
 *
 * Responsibilities:
 * - Vehicle registration, plate number uniqueness
 * - Inspection & verification lifecycle
 * - Vehicle categories: STANDARD_SEDAN, COMFORT_VAN, EXECUTIVE, MINIVAN_TOUR
 * - Seating capacity and active status
 */

export const vehicleRouter = Router();

vehicleRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'vehicles',
      status: 'operational',
      description: 'Vehicle fleet registry, verification, and inspection services',
    },
    'Vehicle service status operational'
  );
});

