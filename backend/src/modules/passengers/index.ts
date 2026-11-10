import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';
import { subcityController } from '../subcities/subcity.controller';
import { driverController } from '../drivers/driver.controller';
import { bookingController } from '../bookings/booking.controller';
import { tripController } from '../trips/trip.controller';
import { authenticateToken } from '../../core/middleware/auth.middleware';

/**
 * Kings Taxi — Passenger Transportation Module
 */
export const passengerRouter = Router();

passengerRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'passengers',
      status: 'operational',
      description: 'Passenger ride discovery, bookings, and journey management',
    },
    'Passenger service status operational'
  );
});

// Subcity & Driver Discovery
passengerRouter.get('/subcities', (req, res) => subcityController.listActive(req, res));
passengerRouter.get('/drivers', (req, res) => driverController.getAvailableDrivers(req, res));

// Fare Estimation
passengerRouter.post('/rides/estimate', (req, res) => bookingController.estimate(req, res));

// Ride Booking & Lifecycle
passengerRouter.post('/rides', authenticateToken, (req, res) => bookingController.createRide(req, res));
passengerRouter.get('/rides', authenticateToken, (req, res) => bookingController.getPassengerRides(req, res));
passengerRouter.get('/rides/:id', authenticateToken, (req, res) => bookingController.getRideById(req, res));
passengerRouter.post('/rides/:id/cancel', authenticateToken, (req, res) => bookingController.cancelRide(req, res));

// Mid-Journey Destination Change
passengerRouter.post('/rides/:rideId/change-destination', authenticateToken, (req, res) =>
  tripController.changeDestination(req, res)
);
