import { Request, Response } from 'express';
import { adminVehicleService } from './adminVehicle.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';

export class AdminVehicleController {
  async listVehicles(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        category,
        status,
        verificationStatus,
        isAssigned,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await adminVehicleService.listVehicles({
        search: search as string,
        category: category as string,
        status: status as string,
        verificationStatus: verificationStatus as string,
        isAssigned: isAssigned as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      ApiResponse.success(res, result, 'Vehicles retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to list vehicles');
      ApiResponse.serverError(res, 'Unable to retrieve vehicles');
    }
  }

  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminVehicleService.getVehicleStatistics();
      ApiResponse.success(res, stats, 'Vehicle statistics retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to get vehicle statistics');
      ApiResponse.serverError(res, 'Unable to retrieve vehicle statistics');
    }
  }

  async getVehicleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vehicle = await adminVehicleService.getVehicleById(id);
      ApiResponse.success(res, vehicle, 'Vehicle details retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'NOT_FOUND', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to get vehicle details');
      ApiResponse.serverError(res, 'Unable to retrieve vehicle details');
    }
  }

  async createVehicle(req: Request, res: Response): Promise<void> {
    try {
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const vehicle = await adminVehicleService.createVehicle(req.body, adminIdentifier);
      ApiResponse.success(res, vehicle, 'Vehicle registered successfully', 201);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'VALIDATION_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to create vehicle');
      ApiResponse.serverError(res, err.message || 'Unable to register vehicle');
    }
  }

  async updateVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const updated = await adminVehicleService.updateVehicle(id, req.body, adminIdentifier);
      ApiResponse.success(res, updated, 'Vehicle updated successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'VALIDATION_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to update vehicle');
      ApiResponse.serverError(res, 'Unable to update vehicle');
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

      const updated = await adminVehicleService.updateVehicleStatus(id, status, reason, adminIdentifier);
      ApiResponse.success(res, updated, `Vehicle status updated to ${status}`);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'UPDATE_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to update vehicle status');
      ApiResponse.serverError(res, 'Unable to update vehicle status');
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

      const updated = await adminVehicleService.updateVehicleVerification(id, status, rejectionReason, adminIdentifier);
      ApiResponse.success(res, updated, `Vehicle verification updated to ${status}`);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'UPDATE_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to update vehicle verification');
      ApiResponse.serverError(res, 'Unable to update vehicle verification');
    }
  }

  async assignDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { driverId, notes } = req.body;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';

      if (!driverId) {
        ApiResponse.badRequest(res, 'driverId is required');
        return;
      }

      const result = await adminVehicleService.assignDriverToVehicle(id, driverId, adminIdentifier, notes);
      ApiResponse.success(res, result, 'Driver assigned to vehicle successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'ASSIGNMENT_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to assign driver');
      ApiResponse.serverError(res, err.message || 'Unable to assign driver');
    }
  }

  async unassignDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';

      const result = await adminVehicleService.unassignDriverFromVehicle(id, adminIdentifier, notes);
      ApiResponse.success(res, result, 'Driver unassigned from vehicle successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'UNASSIGNMENT_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to unassign driver');
      ApiResponse.serverError(res, 'Unable to unassign driver');
    }
  }

  async getAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assignments = await adminVehicleService.getVehicleAssignments(id);
      ApiResponse.success(res, assignments, 'Vehicle assignment history retrieved');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to get assignments');
      ApiResponse.serverError(res, 'Unable to retrieve assignments');
    }
  }

  async getMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const maintenance = await adminVehicleService.getVehicleMaintenanceRecords(id);
      ApiResponse.success(res, maintenance, 'Vehicle maintenance records retrieved');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to get maintenance records');
      ApiResponse.serverError(res, 'Unable to retrieve maintenance records');
    }
  }

  async addMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const record = await adminVehicleService.addVehicleMaintenance(id, req.body, adminIdentifier);
      ApiResponse.success(res, record, 'Maintenance record added successfully', 201);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'MAINTENANCE_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to add maintenance record');
      ApiResponse.serverError(res, 'Unable to add maintenance record');
    }
  }

  async updateMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const { id, maintenanceId } = req.params;
      const adminIdentifier = req.user?.email || req.user?.sub || 'Super Admin';
      const updated = await adminVehicleService.updateVehicleMaintenance(id, maintenanceId, req.body, adminIdentifier);
      ApiResponse.success(res, updated, 'Maintenance record updated successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'MAINTENANCE_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to update maintenance record');
      ApiResponse.serverError(res, 'Unable to update maintenance record');
    }
  }

  async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documents = await adminVehicleService.getVehicleDocuments(id);
      ApiResponse.success(res, documents, 'Vehicle documents retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to get vehicle documents');
      ApiResponse.serverError(res, 'Unable to retrieve vehicle documents');
    }
  }

  async getEligibleVehicles(_req: Request, res: Response): Promise<void> {
    try {
      const vehicles = await adminVehicleService.getEligibleVehiclesForAssignment();
      ApiResponse.success(res, vehicles, 'Eligible vehicles retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminVehicleController] Failed to get eligible vehicles');
      ApiResponse.serverError(res, 'Unable to retrieve eligible vehicles');
    }
  }
}

export const adminVehicleController = new AdminVehicleController();
