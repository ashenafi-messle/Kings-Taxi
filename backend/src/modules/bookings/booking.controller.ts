import { Request, Response } from 'express';
import { bookingService } from './booking.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';

export class BookingController {
  /**
   * POST /api/v1/bookings/estimate
   * Also accessible via /api/v1/passengers/rides/estimate
   */
  async estimate(req: Request, res: Response): Promise<void> {
    try {
      const { pickupLatitude, pickupLongitude, destinationLatitude, destinationLongitude, vehicleType } = req.body;
      if (
        pickupLatitude === undefined ||
        pickupLongitude === undefined ||
        destinationLatitude === undefined ||
        destinationLongitude === undefined
      ) {
        ApiResponse.badRequest(res, 'Pickup and destination coordinates are required for fare estimation');
        return;
      }

      const estimate = await bookingService.estimate({
        pickupLatitude: Number(pickupLatitude),
        pickupLongitude: Number(pickupLongitude),
        destinationLatitude: Number(destinationLatitude),
        destinationLongitude: Number(destinationLongitude),
        vehicleType,
      });

      ApiResponse.success(res, estimate, 'Fare estimate calculated successfully');
    } catch (err: any) {
      logger.error({ err }, 'Failed to calculate fare estimate');
      ApiResponse.serverError(res, err.message || 'Unable to calculate fare estimate');
    }
  }

  /**
   * POST /api/v1/bookings
   * Also accessible via POST /api/v1/passengers/rides
   */
  async createRide(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const {
        driverId,
        subcityId,
        pickupLocation,
        pickupLatitude,
        pickupLongitude,
        destinationLocation,
        destinationLatitude,
        destinationLongitude,
        passengerContactPhone,
        additionalInstructions,
      } = req.body;

      if (!driverId || !subcityId || !pickupLocation || !destinationLocation || !passengerContactPhone) {
        ApiResponse.badRequest(res, 'Driver, subcity, pickup, destination, and active contact phone number are required');
        return;
      }

      const ride = await bookingService.createRideRequest(passengerId, {
        driverId,
        subcityId,
        pickupLocation,
        pickupLatitude: Number(pickupLatitude),
        pickupLongitude: Number(pickupLongitude),
        destinationLocation,
        destinationLatitude: Number(destinationLatitude),
        destinationLongitude: Number(destinationLongitude),
        passengerContactPhone,
        additionalInstructions,
      });

      ApiResponse.created(res, ride, 'Ride booked successfully');
    } catch (err: any) {
      logger.error({ err }, 'Failed to create ride');
      const msg = err.message || '';
      if (
        msg.startsWith('INVALID_PHONE') ||
        msg.startsWith('INVALID_COORDINATES') ||
        msg.startsWith('INVALID_ROUTE') ||
        msg.startsWith('DRIVER_NOT_IN_SUBCITY') ||
        msg.startsWith('DRIVER_UNAVAILABLE') ||
        msg.startsWith('NO_ACTIVE_VEHICLE')
      ) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('DRIVER_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to create ride request');
    }
  }

  /**
   * GET /api/v1/bookings
   * Also accessible via GET /api/v1/passengers/rides
   */
  async getPassengerRides(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await bookingService.getPassengerRides(passengerId, page, limit);
      ApiResponse.success(res, result, 'Passenger rides retrieved successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to get passenger rides');
      ApiResponse.serverError(res, 'Unable to retrieve rides');
    }
  }

  /**
   * GET /api/v1/bookings/:id
   * Also accessible via GET /api/v1/passengers/rides/:id
   */
  async getRideById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = { id: req.user?.sub || '', role: req.user?.role || 'PASSENGER' };

      const ride = await bookingService.getRideById(id, user);
      if (!ride) {
        ApiResponse.notFound(res, 'Ride not found');
        return;
      }

      ApiResponse.success(res, ride, 'Ride details retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Failed to get ride by ID');
      if (err.message?.startsWith('FORBIDDEN')) {
        ApiResponse.forbidden(res, 'You do not have access to this ride');
        return;
      }
      ApiResponse.serverError(res, 'Unable to retrieve ride');
    }
  }

  /**
   * POST /api/v1/bookings/:id/cancel
   * Also accessible via POST /api/v1/passengers/rides/:id/cancel
   */
  async cancelRide(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      const { id } = req.params;
      const { reason } = req.body;

      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const cancelled = await bookingService.cancelRide(id, passengerId, reason);
      ApiResponse.success(res, cancelled, 'Ride cancelled successfully');
    } catch (err: any) {
      logger.error({ err }, 'Failed to cancel ride');
      const msg = err.message || '';
      if (msg.startsWith('RIDE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('FORBIDDEN')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('CANNOT_CANCEL')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to cancel ride');
    }
  }
}

export const bookingController = new BookingController();
