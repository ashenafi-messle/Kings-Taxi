import { Request, Response } from 'express';
import { adminDocumentService } from './adminDocument.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { DocumentReviewStatus } from '@prisma/client';

export class AdminDocumentController {
  /**
   * GET /api/v1/admin/documents/:documentId
   */
  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const document = await adminDocumentService.getDocumentById(documentId);
      ApiResponse.success(res, document, 'Document details retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message, documentId: req.params.documentId }, '[AdminDocumentController] Failed to retrieve document');
      ApiResponse.error(res, 'DOC_NOT_FOUND', err.message || 'Unable to retrieve document', err.statusCode || 404);
    }
  }

  /**
   * GET /api/v1/admin/documents/:documentId/preview
   * Streams the document with Content-Disposition: inline and verified MIME type.
   */
  async previewDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const { stream, contentType, contentDisposition } = await adminDocumentService.getDocumentStream(
        documentId,
        'preview'
      );

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);
      res.setHeader('Cache-Control', 'private, max-age=3600');

      stream.on('error', (streamErr) => {
        logger.error({ err: streamErr.message, documentId }, '[AdminDocumentController] Preview stream error');
        if (!res.headersSent) {
          ApiResponse.serverError(res, 'Failed to stream document preview');
        }
      });

      stream.pipe(res);
    } catch (err: any) {
      logger.error({ err: err.message, documentId: req.params.documentId }, '[AdminDocumentController] Failed to preview document');
      if (!res.headersSent) {
        ApiResponse.error(res, 'PREVIEW_ERROR', err.message || 'Unable to preview document', err.statusCode || 500);
      }
    }
  }

  /**
   * GET /api/v1/admin/documents/:documentId/download
   * Streams the document as an attachment download with proper filename.
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const { stream, contentType, contentDisposition } = await adminDocumentService.getDocumentStream(
        documentId,
        'download'
      );

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);

      stream.on('error', (streamErr) => {
        logger.error({ err: streamErr.message, documentId }, '[AdminDocumentController] Download stream error');
        if (!res.headersSent) {
          ApiResponse.serverError(res, 'Failed to download document');
        }
      });

      stream.pipe(res);
    } catch (err: any) {
      logger.error({ err: err.message, documentId: req.params.documentId }, '[AdminDocumentController] Failed to download document');
      if (!res.headersSent) {
        ApiResponse.error(res, 'DOWNLOAD_ERROR', err.message || 'Unable to download document', err.statusCode || 500);
      }
    }
  }

  /**
   * PATCH /api/v1/admin/documents/:documentId/verification
   * Updates document review status and synchronizes overall driver/vehicle status.
   */
  async reviewDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason, reviewNotes } = req.body;

      if (!status || !Object.values(DocumentReviewStatus).includes(status)) {
        ApiResponse.badRequest(
          res,
          `Invalid status. Must be one of: ${Object.values(DocumentReviewStatus).join(', ')}`
        );
        return;
      }

      const adminUser = req.user?.email || req.user?.sub || 'Super Admin';

      const result = await adminDocumentService.reviewDocument(documentId, {
        status,
        rejectionReason,
        reviewNotes,
        adminIdentifier: adminUser,
      });

      ApiResponse.success(res, result, `Document status updated to ${status}`);
    } catch (err: any) {
      logger.error({ err: err.message, documentId: req.params.documentId }, '[AdminDocumentController] Review failed');
      ApiResponse.error(res, 'REVIEW_ERROR', err.message || 'Failed to review document', err.statusCode || 500);
    }
  }

  /**
   * GET /api/v1/admin/documents/:documentId/history
   */
  async getDocumentHistory(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const history = await adminDocumentService.getDocumentHistory(documentId);
      ApiResponse.success(res, history, 'Document verification history retrieved');
    } catch (err: any) {
      logger.error({ err: err.message }, '[AdminDocumentController] Failed to retrieve document history');
      ApiResponse.serverError(res, 'Unable to retrieve document history');
    }
  }

  /**
   * GET /api/v1/admin/drivers/:id/documents
   */
  async getDriverDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documents = await adminDocumentService.getDocumentsByDriverId(id);
      ApiResponse.success(res, documents, 'Driver documents retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message, driverId: req.params.id }, '[AdminDocumentController] Failed to retrieve driver documents');
      ApiResponse.serverError(res, 'Unable to retrieve driver documents');
    }
  }

  /**
   * GET /api/v1/admin/drivers/:id/documents/:documentId
   */
  async getDriverDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const { id, documentId } = req.params;
      const doc = await adminDocumentService.getDocumentById(documentId);
      if (doc.driverId !== id) {
        ApiResponse.error(res, 'NOT_FOUND', 'Document does not belong to this driver', 404);
        return;
      }
      ApiResponse.success(res, doc, 'Driver document retrieved successfully');
    } catch (err: any) {
      logger.error({ err: err.message, driverId: req.params.id, documentId: req.params.documentId }, '[AdminDocumentController] Failed to get driver document');
      ApiResponse.error(res, 'DOC_NOT_FOUND', err.message, err.statusCode || 404);
    }
  }
}

export const adminDocumentController = new AdminDocumentController();
