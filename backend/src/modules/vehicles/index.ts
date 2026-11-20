import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';
import { vehicleDocumentController } from './vehicleDocument.controller';

/**
 * Kings Taxi — Vehicle & Fleet Management Module
 *
 * Responsibilities:
 * - Vehicle registration, plate number uniqueness
 * - Inspection & verification lifecycle
 * - Vehicle categories: STANDARD_SEDAN, COMFORT_VAN, EXECUTIVE, MINIVAN_TOUR
 * - Seating capacity and active status
 * - Cloudinary vehicle document management & verification
 */

export const vehicleRouter = Router();

vehicleRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'vehicles',
      status: 'operational',
      description: 'Vehicle fleet registry, verification, and inspection services',
    },
    'Vehicle service status operational'
  );
});

// Vehicle Verification Documents & Cloudinary Management endpoints
vehicleRouter.get('/:id/documents', (req, res) => vehicleDocumentController.listDocuments(req, res));
vehicleRouter.get('/:id/documents/upload-signature', (req, res) => vehicleDocumentController.getUploadSignature(req, res));
vehicleRouter.post('/:id/documents', (req, res) => vehicleDocumentController.createDocument(req, res));
vehicleRouter.patch('/:id/documents/:docId/status', (req, res) => vehicleDocumentController.reviewDocument(req, res));
vehicleRouter.delete('/:id/documents/:docId', (req, res) => vehicleDocumentController.deleteDocument(req, res));

export * from './vehicleDocument.service';
export * from './vehicleDocument.controller';
export * from './adminVehicle.service';
export * from './adminVehicle.controller';
export * from './adminVehicle.routes';
