import { Request, Response } from 'express';
import { adminHotelPartnerService } from './adminHotelPartner.service';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';

export class AdminHotelPartnerController {
  async listPartners(req: Request, res: Response) {
    try {
      const result = await adminHotelPartnerService.listPartners({
        search: req.query.search as string,
        status: req.query.status as string,
        verificationStatus: req.query.verificationStatus as string,
        city: req.query.city as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      });

      return res.status(200).json({
        success: true,
        message: 'Hotel partners retrieved successfully.',
        data: result,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[AdminHotelPartnerController.listPartners] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to retrieve hotel partners.',
        error: { code: 'PARTNER_LIST_ERROR', message: err.message },
      });
    }
  }

  async getPartnerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const partner = await adminHotelPartnerService.getPartnerById(id);

      return res.status(200).json({
        success: true,
        message: 'Hotel partner retrieved successfully.',
        data: partner,
      });
    } catch (err: any) {
      logger.error({ error: err.message, id: req.params.id }, '[AdminHotelPartnerController.getPartnerById] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to retrieve hotel partner.',
        error: { code: 'PARTNER_FETCH_ERROR', message: err.message },
      });
    }
  }

  async createPartner(req: Request, res: Response) {
    try {
      const partner = await adminHotelPartnerService.createPartner(req.body);

      return res.status(201).json({
        success: true,
        message: 'Hotel partner registered successfully.',
        data: partner,
      });
    } catch (err: any) {
      logger.error({ error: err.message, body: req.body }, '[AdminHotelPartnerController.createPartner] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to create hotel partner.',
        error: { code: 'PARTNER_CREATE_ERROR', message: err.message },
      });
    }
  }

  async updatePartner(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const partner = await adminHotelPartnerService.updatePartner(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Hotel partner updated successfully.',
        data: partner,
      });
    } catch (err: any) {
      logger.error({ error: err.message, id: req.params.id }, '[AdminHotelPartnerController.updatePartner] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to update hotel partner.',
        error: { code: 'PARTNER_UPDATE_ERROR', message: err.message },
      });
    }
  }

  async updatePartnerStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const partner = await adminHotelPartnerService.updatePartnerStatus(id, status, reason);

      return res.status(200).json({
        success: true,
        message: `Partner status updated to ${status}.`,
        data: partner,
      });
    } catch (err: any) {
      logger.error({ error: err.message, id: req.params.id }, '[AdminHotelPartnerController.updatePartnerStatus] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to update partner status.',
        error: { code: 'PARTNER_STATUS_UPDATE_ERROR', message: err.message },
      });
    }
  }

  async verifyPartner(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { verificationStatus, reason } = req.body;
      const adminId = (req as any).user?.userId || (req as any).user?.id;
      const partner = await adminHotelPartnerService.verifyPartner(id, verificationStatus, adminId, reason);

      return res.status(200).json({
        success: true,
        message: `Partner verification ${verificationStatus.toLowerCase()} successfully.`,
        data: partner,
      });
    } catch (err: any) {
      logger.error({ error: err.message, id: req.params.id }, '[AdminHotelPartnerController.verifyPartner] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to verify hotel partner.',
        error: { code: 'PARTNER_VERIFICATION_ERROR', message: err.message },
      });
    }
  }

  async uploadPartnerDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.userId || (req as any).user?.id;
      const doc = await adminHotelPartnerService.uploadPartnerDocument(id, req.body, adminId);

      return res.status(201).json({
        success: true,
        message: 'Document uploaded and attached successfully.',
        data: doc,
      });
    } catch (err: any) {
      logger.error({ error: err.message, id: req.params.id }, '[AdminHotelPartnerController.uploadPartnerDocument] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to upload document.',
        error: { code: 'DOCUMENT_UPLOAD_ERROR', message: err.message },
      });
    }
  }

  async getStats(_req: Request, res: Response) {
    try {
      const stats = await adminHotelPartnerService.getPartnerStats();
      return res.status(200).json({
        success: true,
        message: 'Partner statistics retrieved successfully.',
        data: stats,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[AdminHotelPartnerController.getStats] Error');
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to retrieve partner statistics.',
        error: { code: 'STATS_FETCH_ERROR', message: err.message },
      });
    }
  }
}

export const adminHotelPartnerController = new AdminHotelPartnerController();
