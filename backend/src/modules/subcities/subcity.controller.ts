import { Request, Response } from 'express';
import { subcityService } from './subcity.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';

export class SubcityController {
  async listActive(_req: Request, res: Response): Promise<void> {
    try {
      const subcities = await subcityService.listActiveSubcities();
      ApiResponse.success(res, subcities, 'Active subcities retrieved successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to list active subcities');
      ApiResponse.serverError(res, 'Unable to retrieve subcities');
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const subcity = await subcityService.getSubcityById(id);
      if (!subcity) {
        ApiResponse.notFound(res, 'Subcity not found');
        return;
      }
      ApiResponse.success(res, subcity, 'Subcity details retrieved');
    } catch (err) {
      logger.error({ err }, 'Failed to get subcity details');
      ApiResponse.serverError(res, 'Unable to retrieve subcity details');
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, city, centerLatitude, centerLongitude, radiusKm } = req.body;
      if (!name || centerLatitude === undefined || centerLongitude === undefined) {
        ApiResponse.badRequest(res, 'Name, centerLatitude, and centerLongitude are required');
        return;
      }
      const created = await subcityService.createSubcity({
        name,
        slug,
        city,
        centerLatitude: Number(centerLatitude),
        centerLongitude: Number(centerLongitude),
        radiusKm: radiusKm ? Number(radiusKm) : undefined,
      });
      ApiResponse.created(res, created, 'Subcity created successfully');
    } catch (err: any) {
      logger.error({ err }, 'Failed to create subcity');
      if (err.code === 'P2002') {
        ApiResponse.badRequest(res, 'A subcity with this name or slug already exists');
        return;
      }
      ApiResponse.serverError(res, 'Unable to create subcity');
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await subcityService.updateSubcity(id, req.body);
      ApiResponse.success(res, updated, 'Subcity updated successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to update subcity');
      ApiResponse.serverError(res, 'Unable to update subcity');
    }
  }

  async assignDriver(req: Request, res: Response): Promise<void> {
    try {
      const { subcityId, driverId } = req.params;
      const { isPrimary } = req.body;
      const assignment = await subcityService.assignDriver(subcityId, driverId, !!isPrimary);
      ApiResponse.success(res, assignment, 'Driver assigned to subcity successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to assign driver to subcity');
      ApiResponse.serverError(res, 'Unable to assign driver');
    }
  }

  async removeDriver(req: Request, res: Response): Promise<void> {
    try {
      const { subcityId, driverId } = req.params;
      await subcityService.removeDriver(subcityId, driverId);
      ApiResponse.success(res, { removed: true }, 'Driver removed from subcity');
    } catch (err) {
      logger.error({ err }, 'Failed to remove driver from subcity');
      ApiResponse.serverError(res, 'Unable to remove driver');
    }
  }
}

export const subcityController = new SubcityController();

