import { Request, Response } from 'express';
import { driverService } from './driver.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { DriverAvailabilityStatus } from '@prisma/client';

export class DriverController {
  /**
   * GET /api/v1/drivers/available?subcityId=...
   * Also mounted on /api/v1/passengers/drivers
   */
  async getAvailableDrivers(req: Request, res: Response): Promise<void> {
    try {
      const subcityId = req.query.subcityId as string | undefined;
      const drivers = await driverService.getAvailableDriversBySubcity(subcityId);
      ApiResponse.success(res, drivers, 'Available drivers retrieved successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to get available drivers');
      ApiResponse.serverError(res, 'Unable to retrieve available drivers');
    }
  }

  /**
   * GET /api/v1/drivers/:id/public
   */
  async getPublicDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const driver = await driverService.getPublicDriverById(id);
      if (!driver) {
        ApiResponse.notFound(res, 'Driver not found or not eligible');
        return;
      }
      ApiResponse.success(res, driver, 'Driver details retrieved');
    } catch (err) {
      logger.error({ err }, 'Failed to get driver details');
      ApiResponse.serverError(res, 'Unable to retrieve driver details');
    }
  }

  async getMyAvailability(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const state = await driverService.getMyAvailability(driverId);
      ApiResponse.success(res, state, 'Driver availability retrieved');
    } catch (err: any) {
      ApiResponse.error(res, err.code || 'AVAILABILITY_ERROR', err.message || 'Unable to get availability', err.statusCode || 500);
    }
  }

  async goOnline(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const updated = await driverService.goOnline(driverId);
      ApiResponse.success(res, updated, 'Driver is now online and available');
    } catch (err: any) {
      ApiResponse.error(res, err.code || 'AVAILABILITY_ERROR', err.message || 'Unable to go online', err.statusCode || 400);
    }
  }

  async goOffline(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }
      const updated = await driverService.goOffline(driverId);
      ApiResponse.success(res, updated, 'Driver is now offline');
    } catch (err: any) {
      ApiResponse.error(res, err.code || 'AVAILABILITY_ERROR', err.message || 'Unable to go offline', err.statusCode || 400);
    }
  }

  /**
   * POST /api/v1/drivers/me/availability
   */
  async updateAvailability(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      const { status } = req.body;

      if (!driverId) {
        ApiResponse.unauthorized(res, 'Driver authentication required');
        return;
      }

      if (!Object.values(DriverAvailabilityStatus).includes(status)) {
        ApiResponse.badRequest(res, `Invalid status. Must be one of: ${Object.values(DriverAvailabilityStatus).join(', ')}`);
        return;
      }

      const updated = await driverService.updateAvailability(driverId, status);
      ApiResponse.success(res, updated, `Driver availability updated to ${status}`);
    } catch (err) {
      logger.error({ err }, 'Failed to update driver availability');
      ApiResponse.serverError(res, 'Unable to update availability');
    }
  }
}

export const driverController = new DriverController();
