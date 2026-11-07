import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Booking & Transportation Module (Phase 4 Architectural Boundary)
 *
 * Responsibilities:
 * - Ride request dispatch & driver matching
 * - Trip state machine progression (DRAFT -> REQUESTED -> DRIVER_ASSIGNED -> TRIP_STARTED -> TRIP_COMPLETED)
 * - Hotel transport & heritage tour contract reservations
 * - Passenger trip ratings & driver feedback
 */

export const bookingRouter = Router();

bookingRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'bookings',
      status: 'operational',
      description: 'Transportation booking, ride requests, and dispatch services',
    },
    'Booking service status operational'
  );
});

export interface IBookingService {
  // Phase 4 implementation contract
}
