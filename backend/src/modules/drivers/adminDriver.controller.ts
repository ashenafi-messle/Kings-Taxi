import { Request, Response } from 'express';
import { adminDriverService } from './adminDriver.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';

export class AdminDriverController {
  async listDrivers(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        verificationStatus,
        accountStatus,
        availabilityStatus,
        city,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await adminDriverService.listDrivers({
        search: search as string,
        verificationStatus: verificationStatus as string,
        accountStatus: accountStatus as string,
        availabilityStatus: availabilityStatus as string,
        city: city as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      ApiResponse.success(res, result, 'Drivers retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminDriverController] Failed to list drivers');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve drivers');
    }
  }

  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminDriverService.getDriverStatistics();
      ApiResponse.success(res, stats, 'Driver statistics retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminDriverController] Failed to retrieve driver statistics');
      ApiResponse.serverError(res, 'Unable to retrieve driver statistics');
    }
  }

  async getDriverById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const driver = await adminDriverService.getDriverById(id);
      ApiResponse.success(res, driver, 'Driver details retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminDriverController] Failed to get driver details');
      ApiResponse.serverError(res, 'Unable to retrieve driver details');
    }
  }

  async createDriver(req: Request, res: Response): Promise<void> {
    try {
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const driver = await adminDriverService.createDriver(req.body, adminIdentifier);
      ApiResponse.success(res, driver, 'Driver created successfully', 201);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'VALIDATION_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminDriverController] Failed to create driver');
      ApiResponse.serverError(res, err.message || 'Unable to create driver');
    }
  }

  async updateDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const updated = await adminDriverService.updateDriver(id, req.body, adminIdentifier);
      ApiResponse.success(res, updated, 'Driver updated successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'VALIDATION_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminDriverController] Failed to update driver');
      ApiResponse.serverError(res, 'Unable to update driver');
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';

      if (!status) {
        ApiResponse.badRequest(res, 'Status is required');
        return;
      }

      const updated = await adminDriverService.updateDriverStatus(id, status, reason, adminIdentifier);
      ApiResponse.success(res, updated, `Driver account status updated to ${status}`);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'UPDATE_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminDriverController] Failed to update driver status');
      ApiResponse.serverError(res, 'Unable to update driver status');
    }
  }

  async updateVerification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';

      if (!status) {
        ApiResponse.badRequest(res, 'Verification status is required');
        return;
      }

      const updated = await adminDriverService.updateDriverVerification(id, status, rejectionReason, adminIdentifier);
      ApiResponse.success(res, updated, `Driver verification updated to ${status}`);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'UPDATE_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminDriverController] Failed to update driver verification');
      ApiResponse.serverError(res, 'Unable to update driver verification');
    }
  }

  async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documents = await adminDriverService.getDriverDocuments(id);
      ApiResponse.success(res, documents, 'Driver documents retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminDriverController] Failed to retrieve driver documents');
      ApiResponse.serverError(res, 'Unable to retrieve driver documents');
    }
  }

  async getTrips(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await adminDriverService.getDriverTrips(id, page, limit);
      ApiResponse.success(res, result, 'Driver trips retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminDriverController] Failed to retrieve driver trips');
      ApiResponse.serverError(res, 'Unable to retrieve driver trips');
    }
  }

  async getEligibleDrivers(req: Request, res: Response): Promise<void> {
    try {
      const vehicleId = req.query.vehicleId as string | undefined;
      const eligible = await adminDriverService.getEligibleDriversForAssignment(vehicleId);
      ApiResponse.success(res, eligible, 'Eligible drivers retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminDriverController] Failed to retrieve eligible drivers');
      ApiResponse.serverError(res, 'Unable to retrieve eligible drivers');
    }
  }
}

export const adminDriverController = new AdminDriverController();
