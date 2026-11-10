import { Router, Request, Response } from 'express';
import { bookingController } from './booking.controller';
import { authenticateToken } from '../../core/middleware/auth.middleware';
import { ApiResponse } from '../../core/response/apiResponse';

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

// Fare estimation
bookingRouter.post('/estimate', (req, res) => bookingController.estimate(req, res));

// Authenticated passenger booking endpoints
bookingRouter.post('/', authenticateToken, (req, res) => bookingController.createRide(req, res));
bookingRouter.get('/', authenticateToken, (req, res) => bookingController.getPassengerRides(req, res));
bookingRouter.get('/:id', authenticateToken, (req, res) => bookingController.getRideById(req, res));
bookingRouter.post('/:id/cancel', authenticateToken, (req, res) => bookingController.cancelRide(req, res));

