import { Router, Request, Response } from 'express';
import { driverController } from './driver.controller';
import { driverDocumentController } from './driverDocument.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';
import { ApiResponse } from '../../core/response/apiResponse';

export const driverRouter = Router();

driverRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'drivers',
      status: 'operational',
      description: 'Driver management, verification, and availability services',
    },
    'Driver service status operational'
  );
});

// Public / Passenger discovery endpoints
driverRouter.get('/available', (req, res) => driverController.getAvailableDrivers(req, res));
driverRouter.get('/:id/public', (req, res) => driverController.getPublicDriver(req, res));

// Authenticated driver endpoints
driverRouter.post('/me/availability', authenticateToken, requireRole(['DRIVER', 'ADMIN', 'SUPER_ADMIN']), (req, res) =>
  driverController.updateAvailability(req, res)
);

// Driver Verification Documents & Cloudinary Management endpoints
driverRouter.get('/:id/documents', (req, res) => driverDocumentController.listDocuments(req, res));
driverRouter.get('/:id/documents/upload-signature', (req, res) => driverDocumentController.getUploadSignature(req, res));
driverRouter.post('/:id/documents', (req, res) => driverDocumentController.createDocument(req, res));
driverRouter.patch('/:id/documents/:docId/status', (req, res) => driverDocumentController.reviewDocument(req, res));
driverRouter.delete('/:id/documents/:docId', (req, res) => driverDocumentController.deleteDocument(req, res));

