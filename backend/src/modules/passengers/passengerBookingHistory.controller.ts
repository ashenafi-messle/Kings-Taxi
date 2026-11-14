import { Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import {
  passengerBookingHistoryService,
  PassengerBookingHistoryQuery,
} from './passengerBookingHistory.service';

export class PassengerBookingHistoryController {
  /**
   * GET /api/v1/passengers/bookings
   * Returns unified, merged, and chronologically sorted booking history for the authenticated passenger.
   */
  async listBookings(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const query: PassengerBookingHistoryQuery = {
        type: req.query.type as any,
        status: req.query.status as string,
        paymentStatus: req.query.paymentStatus as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sort: req.query.sort as any,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
      };

      const result = await passengerBookingHistoryService.getUnifiedBookings(passengerId, query);
      ApiResponse.success(res, result, 'Passenger booking history retrieved successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to retrieve passenger booking history');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve booking history');
    }
  }

  /**
   * GET /api/v1/passengers/bookings/:type/:id
   * Returns deep booking details for a specific booking with strict IDOR passenger ownership verification.
   */
  async getBookingDetail(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const { type, id } = req.params;
      if (!type || !id) {
        ApiResponse.badRequest(res, 'Booking type and ID are required');
        return;
      }

      const detail = await passengerBookingHistoryService.getBookingDetail(passengerId, type, id);

      if (!detail) {
        ApiResponse.notFound(res, `Booking record not found for reference or ID "${id}"`);
        return;
      }

      ApiResponse.success(res, detail, 'Booking details retrieved successfully');
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') {
        ApiResponse.forbidden(res, err.message || 'Access denied to this booking');
        return;
      }
      if (err.message && err.message.startsWith('Invalid booking type')) {
        ApiResponse.badRequest(res, err.message);
        return;
      }

      logger.error({ err, path: req.originalUrl }, 'Failed to retrieve booking detail');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve booking detail');
    }
  }

  /**
   * GET /api/v1/passengers/recent-activities
   * GET /api/v1/passenger/recent-activities
   * Returns normalized recent activity items for the authenticated passenger's home dashboard.
   */
  async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const limit = Math.max(1, Math.min(20, req.query.limit ? parseInt(req.query.limit as string, 10) : 5));
      const result = await passengerBookingHistoryService.getRecentActivities(passengerId, limit);
      ApiResponse.success(res, result, 'Passenger recent activities retrieved successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to retrieve passenger recent activities');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve recent activities');
    }
  }
}

export const passengerBookingHistoryController = new PassengerBookingHistoryController();

