import { Request, Response } from 'express';
import { vehicleDocumentService } from './vehicleDocument.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { AppError } from '../../core/errors/appError';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { DocumentReviewStatus } from '@prisma/client';

export class VehicleDocumentController {
  async listDocuments(req: Request, res: Response) {
    try {
      const vehicleId = req.params.id || req.params.vehicleId;
      const documents = await vehicleDocumentService.getDocumentsByVehicleId(vehicleId);
      ApiResponse.success(res, documents, 'Vehicle documents fetched successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'VEHICLE_DOC_ERROR', err.message || 'Failed to list vehicle documents', err.statusCode || 500);
    }
  }

  async getUploadSignature(req: Request, res: Response) {
    try {
      const vehicleId = req.params.id || req.params.vehicleId;
      const folder = `kings-taxi/vehicles/${vehicleId}`;
      const signaturePayload = CloudinaryService.generateUploadSignature(folder, 'vdoc');
      ApiResponse.success(res, signaturePayload, 'Vehicle upload signature generated successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'SIGNATURE_ERROR', err.message || 'Failed to generate signature', 500);
    }
  }

  async createDocument(req: Request, res: Response) {
    try {
      const vehicleId = req.params.id || req.params.vehicleId;
      const { documentType, documentNumber, fileUrl, publicId, fileName, fileFormat, fileSize, expiryDate } = req.body;

      if (!documentType || !fileUrl) {
        throw new AppError('documentType and fileUrl are required', 400);
      }

      const document = await vehicleDocumentService.createDocument(vehicleId, {
        documentType,
        documentNumber,
        fileUrl,
        publicId,
        fileName,
        fileFormat,
        fileSize: fileSize ? Number(fileSize) : undefined,
        expiryDate,
      });

      ApiResponse.created(res, document, 'Vehicle document uploaded and attached successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'DOCUMENT_CREATE_ERROR', err.message || 'Failed to create vehicle document', err.statusCode || 500);
    }
  }

  async reviewDocument(req: Request, res: Response) {
    try {
      const vehicleId = req.params.id || req.params.vehicleId;
      const documentId = req.params.docId || req.params.documentId;
      const { status, rejectionReason, reviewNotes, reviewedBy } = req.body;

      if (!status || !Object.values(DocumentReviewStatus).includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${Object.values(DocumentReviewStatus).join(', ')}`, 400);
      }

      const updated = await vehicleDocumentService.reviewDocument(vehicleId, documentId, {
        status,
        rejectionReason,
        reviewNotes,
        reviewedBy: reviewedBy || (req as any).user?.name || (req as any).user?.email || 'Super Admin',
      });

      ApiResponse.success(res, updated, `Vehicle document status updated to ${status}`);
    } catch (err: any) {
      ApiResponse.error(res, 'DOCUMENT_REVIEW_ERROR', err.message || 'Failed to review vehicle document', err.statusCode || 500);
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const vehicleId = req.params.id || req.params.vehicleId;
      const documentId = req.params.docId || req.params.documentId;
      const result = await vehicleDocumentService.deleteDocument(vehicleId, documentId);
      ApiResponse.success(res, result, 'Vehicle document deleted successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'DOCUMENT_DELETE_ERROR', err.message || 'Failed to delete vehicle document', err.statusCode || 500);
    }
  }
}

export const vehicleDocumentController = new VehicleDocumentController();
