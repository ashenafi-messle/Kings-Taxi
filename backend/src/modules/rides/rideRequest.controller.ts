import { Request, Response } from 'express';
import { rideRequestService } from './rideRequest.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';

export class RideRequestController {
  async createRequest(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }
      const created = await rideRequestService.createRideRequest(passengerId, req.body || {});
      ApiResponse.success(res, created, 'Ride request submitted successfully', 201);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'RIDE_REQUEST_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[RideRequestController] Create error');
      ApiResponse.serverError(res, 'Unable to submit ride request');
    }
  }

  async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const updated = await rideRequestService.acceptRideRequest(driverId, req.params.requestId);
      ApiResponse.success(res, updated, 'Ride request accepted');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'RIDE_ACCEPT_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[RideRequestController] Accept error');
      ApiResponse.serverError(res, 'Unable to accept ride request');
    }
  }

  async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const updated = await rideRequestService.rejectRideRequest(
        driverId,
        req.params.requestId,
        req.body?.reason
      );
      ApiResponse.success(res, updated, 'Ride request rejected');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'RIDE_REJECT_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[RideRequestController] Reject error');
      ApiResponse.serverError(res, 'Unable to reject ride request');
    }
  }

  async cancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }
      const updated = await rideRequestService.cancelRideRequest(
        passengerId,
        req.params.requestId,
        req.body?.reason
      );
      ApiResponse.success(res, updated, 'Ride request cancelled');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'RIDE_CANCEL_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[RideRequestController] Cancel error');
      ApiResponse.serverError(res, 'Unable to cancel ride request');
    }
  }

  async getDriverPending(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const list = await rideRequestService.getDriverPendingRequests(driverId);
      ApiResponse.success(res, list, 'Pending ride requests retrieved');
    } catch (err: any) {
      logger.error({ err: err?.message }, '[RideRequestController] Driver pending error');
      ApiResponse.serverError(res, 'Unable to retrieve pending ride requests');
    }
  }

  async getDriverCurrent(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const current = await rideRequestService.getDriverCurrentRequest(driverId);
      ApiResponse.success(res, current, 'Current ride request retrieved');
    } catch (err: any) {
      logger.error({ err: err?.message }, '[RideRequestController] Driver current error');
      ApiResponse.serverError(res, 'Unable to retrieve current ride request');
    }
  }

  async getDriverHistory(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const history = await rideRequestService.getDriverRequestHistory(driverId, page, limit);
      ApiResponse.success(res, history, 'Driver ride request history retrieved');
    } catch (err: any) {
      logger.error({ err: err?.message }, '[RideRequestController] Driver history error');
      ApiResponse.serverError(res, 'Unable to retrieve ride request history');
    }
  }

  async getPassengerCurrent(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }
      const current = await rideRequestService.getPassengerCurrentRequest(passengerId);
      ApiResponse.success(res, current, 'Current passenger ride request retrieved');
    } catch (err: any) {
      logger.error({ err: err?.message }, '[RideRequestController] Passenger current error');
      ApiResponse.serverError(res, 'Unable to retrieve current ride request');
    }
  }

  async getPassengerById(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }
      const item = await rideRequestService.getPassengerRequestById(passengerId, req.params.requestId);
      ApiResponse.success(res, item, 'Ride request retrieved');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[RideRequestController] Passenger getById error');
      ApiResponse.serverError(res, 'Unable to retrieve ride request');
    }
  }
}

export const rideRequestController = new RideRequestController();
