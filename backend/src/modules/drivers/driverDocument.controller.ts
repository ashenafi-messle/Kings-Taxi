import { Request, Response } from 'express';
import { driverDocumentService } from './driverDocument.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { AppError } from '../../core/errors/appError';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { DocumentReviewStatus } from '@prisma/client';

export class DriverDocumentController {
  async listDocuments(req: Request, res: Response) {
    try {
      const driverId = req.params.id || req.params.driverId;
      const documents = await driverDocumentService.getDocumentsByDriverId(driverId);
      ApiResponse.success(res, documents, 'Driver documents fetched successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'DRIVER_DOC_ERROR', err.message || 'Failed to list driver documents', err.statusCode || 500);
    }
  }

  async getUploadSignature(req: Request, res: Response) {
    try {
      const driverId = req.params.id || req.params.driverId;
      const folder = `kings-taxi/drivers/${driverId}`;
      const signaturePayload = CloudinaryService.generateUploadSignature(folder, 'doc');
      ApiResponse.success(res, signaturePayload, 'Upload signature generated successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'SIGNATURE_ERROR', err.message || 'Failed to generate signature', 500);
    }
  }

  async createDocument(req: Request, res: Response) {
    try {
      const driverId = req.params.id || req.params.driverId;
      const { documentType, documentNumber, fileUrl, publicId, fileName, fileFormat, fileSize, expiryDate } = req.body;

      if (!documentType || !fileUrl) {
        throw new AppError('documentType and fileUrl are required', 400);
      }

      const document = await driverDocumentService.createDocument(driverId, {
        documentType,
        documentNumber,
        fileUrl,
        publicId,
        fileName,
        fileFormat,
        fileSize: fileSize ? Number(fileSize) : undefined,
        expiryDate,
      });

      ApiResponse.created(res, document, 'Document uploaded and attached successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'DOCUMENT_CREATE_ERROR', err.message || 'Failed to create document', err.statusCode || 500);
    }
  }

  async reviewDocument(req: Request, res: Response) {
    try {
      const driverId = req.params.id || req.params.driverId;
      const documentId = req.params.docId || req.params.documentId;
      const { status, rejectionReason, reviewNotes, reviewedBy } = req.body;

      if (!status || !Object.values(DocumentReviewStatus).includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${Object.values(DocumentReviewStatus).join(', ')}`, 400);
      }

      const updated = await driverDocumentService.reviewDocument(driverId, documentId, {
        status,
        rejectionReason,
        reviewNotes,
        reviewedBy: reviewedBy || (req as any).user?.name || (req as any).user?.email || 'Super Admin',
      });

      ApiResponse.success(res, updated, `Document status updated to ${status}`);
    } catch (err: any) {
      ApiResponse.error(res, 'DOCUMENT_REVIEW_ERROR', err.message || 'Failed to review document', err.statusCode || 500);
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const driverId = req.params.id || req.params.driverId;
      const documentId = req.params.docId || req.params.documentId;
      const result = await driverDocumentService.deleteDocument(driverId, documentId);
      ApiResponse.success(res, result, 'Document deleted successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'DOCUMENT_DELETE_ERROR', err.message || 'Failed to delete document', err.statusCode || 500);
    }
  }
}

export const driverDocumentController = new DriverDocumentController();
