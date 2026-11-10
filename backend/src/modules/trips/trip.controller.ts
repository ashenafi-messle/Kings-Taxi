import { Request, Response } from 'express';
import { tripService } from './trip.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';

export class TripController {
  /**
   * POST /api/v1/trips/:rideId/start
   */
  async startJourney(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      const { rideId } = req.params;
      const { latitude, longitude, accuracy } = req.body;

      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }

      if (latitude === undefined || longitude === undefined) {
        ApiResponse.badRequest(res, 'Driver initial latitude and longitude are required to start journey');
        return;
      }

      const started = await tripService.startJourney(rideId, driverId, {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: accuracy ? Number(accuracy) : undefined,
      });

      ApiResponse.success(res, started, 'Journey started successfully. GPS tracking session active.');
    } catch (err: any) {
      logger.error({ err }, 'Failed to start journey');
      const msg = err.message || '';
      if (msg.startsWith('RIDE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('UNAUTHORIZED_DRIVER')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('CANNOT_START')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to start journey');
    }
  }

  /**
   * POST /api/v1/trips/:rideId/location
   */
  async ingestLocation(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      const { rideId } = req.params;
      const { samples } = req.body;

      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }

      const sampleList = Array.isArray(samples) ? samples : [req.body];
      const result = await tripService.ingestLocationSamples(rideId, driverId, sampleList);

      ApiResponse.success(res, result, 'Location samples ingested successfully');
    } catch (err: any) {
      logger.error({ err }, 'Failed to ingest location samples');
      const msg = err.message || '';
      if (msg.startsWith('NO_ACTIVE_SESSION')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('UNAUTHORIZED_DRIVER')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to ingest location samples');
    }
  }

  /**
   * POST /api/v1/trips/:rideId/change-destination
   */
  async changeDestination(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      const { rideId } = req.params;
      const { newDestination, newLatitude, newLongitude } = req.body;

      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      if (!newDestination || newLatitude === undefined || newLongitude === undefined) {
        ApiResponse.badRequest(res, 'newDestination, newLatitude, and newLongitude are required');
        return;
      }

      const result = await tripService.requestDestinationChange(rideId, passengerId, {
        newDestination,
        newLatitude: Number(newLatitude),
        newLongitude: Number(newLongitude),
      });

      ApiResponse.success(
        res,
        result,
        'Destination change proposal submitted to driver with updated fare calculation'
      );
    } catch (err: any) {
      logger.error({ err }, 'Failed to request destination change');
      const msg = err.message || '';
      if (msg.startsWith('RIDE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('FORBIDDEN')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('CANNOT_CHANGE')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to request destination change');
    }
  }

  /**
   * POST /api/v1/trips/:rideId/destination-change/respond
   */
  async respondDestinationChange(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      const { rideId } = req.params;
      const { revisionId, approve } = req.body;

      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }

      if (!revisionId || approve === undefined) {
        ApiResponse.badRequest(res, 'revisionId and approve (boolean) are required');
        return;
      }

      const result = await tripService.respondToDestinationChange(rideId, driverId, revisionId, Boolean(approve));
      ApiResponse.success(
        res,
        result,
        approve ? 'Destination change approved and applied' : 'Destination change rejected'
      );
    } catch (err: any) {
      logger.error({ err }, 'Failed to respond to destination change');
      const msg = err.message || '';
      if (msg.startsWith('RIDE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('UNAUTHORIZED_DRIVER')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('REVISION_NOT_PENDING')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to respond to destination change');
    }
  }

  /**
   * POST /api/v1/trips/:rideId/complete
   */
  async completeJourney(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      const { rideId } = req.params;

      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }

      const result = await tripService.completeJourney(rideId, driverId);
      ApiResponse.success(res, result, 'Journey completed successfully. Final fare calculated.');
    } catch (err: any) {
      logger.error({ err }, 'Failed to complete journey');
      const msg = err.message || '';
      if (msg.startsWith('RIDE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('UNAUTHORIZED_DRIVER')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('CANNOT_COMPLETE')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to complete journey');
    }
  }

  /**
   * GET /api/v1/trips/:rideId/receipt
   */
  async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { rideId } = req.params;
      const receipt = await tripService.getCompletedRideReceipt(rideId);
      if (!receipt) {
        ApiResponse.notFound(res, 'Receipt not found');
        return;
      }
      ApiResponse.success(res, receipt, 'Receipt retrieved successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to get receipt');
      ApiResponse.serverError(res, 'Unable to retrieve receipt');
    }
  }
}

export const tripController = new TripController();
