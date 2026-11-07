import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Trip Lifecycle & Telematics Module
 *
 * Responsibilities:
 * - Active trip progression: ACCEPTED -> ARRIVED_AT_PICKUP -> IN_TRANSIT -> COMPLETED
 * - Real-time route polyline tracking
 * - Actual distance & duration calculation
 * - Passenger rating & feedback collection
 */

export const tripRouter = Router();

tripRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'trips',
      status: 'operational',
      description: 'Trip lifecycle, telematics, and passenger feedback services',
    },
    'Trip service status operational'
  );
});

