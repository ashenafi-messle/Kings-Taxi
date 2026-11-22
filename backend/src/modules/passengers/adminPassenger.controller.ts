import { Request, Response } from 'express';
import { adminPassengerService } from './adminPassenger.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';

export class AdminPassengerController {
  /**
   * GET /api/v1/admin/passengers
   */
  async listPassengers(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        accountStatus,
        isVerified,
        city,
        fromDate,
        toDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await adminPassengerService.listPassengers({
        search: search as string,
        accountStatus: accountStatus as string,
        isVerified: isVerified as string,
        city: city as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      ApiResponse.success(res, result, 'Passengers retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to list passengers');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve passengers');
    }
  }

  /**
   * GET /api/v1/admin/passengers/stats
   */
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminPassengerService.getPassengerStatistics();
      ApiResponse.success(res, stats, 'Passenger statistics retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to retrieve passenger statistics');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve passenger statistics');
    }
  }

  /**
   * GET /api/v1/admin/passengers/:passengerId
   */
  async getPassengerById(req: Request, res: Response): Promise<void> {
    try {
      const { passengerId } = req.params;
      const passenger = await adminPassengerService.getPassengerById(passengerId);
      ApiResponse.success(res, passenger, 'Passenger details retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to get passenger details');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve passenger details');
    }
  }

  /**
   * GET /api/v1/admin/passengers/:passengerId/rides
   */
  async getPassengerRides(req: Request, res: Response): Promise<void> {
    try {
      const { passengerId } = req.params;
      const { page, limit, status } = req.query;

      const rides = await adminPassengerService.getPassengerRides(passengerId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        status: status as string,
      });

      ApiResponse.success(res, rides, 'Passenger rides retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to get passenger rides');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve passenger rides');
    }
  }

  /**
   * GET /api/v1/admin/passengers/:passengerId/bookings
   */
  async getPassengerBookings(req: Request, res: Response): Promise<void> {
    try {
      const { passengerId } = req.params;
      const { page, limit, type } = req.query;

      const bookings = await adminPassengerService.getPassengerBookings(passengerId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        type: type as string,
      });

      ApiResponse.success(res, bookings, 'Passenger bookings retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to get passenger bookings');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve passenger bookings');
    }
  }

  /**
   * GET /api/v1/admin/passengers/:passengerId/payments
   */
  async getPassengerPayments(req: Request, res: Response): Promise<void> {
    try {
      const { passengerId } = req.params;
      const { page, limit, status } = req.query;

      const payments = await adminPassengerService.getPassengerPayments(passengerId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        status: status as string,
      });

      ApiResponse.success(res, payments, 'Passenger payments retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to get passenger payments');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve passenger payments');
    }
  }

  /**
   * PATCH /api/v1/admin/passengers/:passengerId/status
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { passengerId } = req.params;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await adminPassengerService.updatePassengerStatus(
        passengerId,
        req.body,
        adminIdentifier,
        { ipAddress, userAgent }
      );

      ApiResponse.success(res, updated, 'Passenger account status updated successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'VALIDATION_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminPassengerController] Failed to update passenger status');
      ApiResponse.serverError(res, err.message || 'Unable to update passenger status');
    }
  }
}

export const adminPassengerController = new AdminPassengerController();
