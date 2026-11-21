import { Router } from 'express';
import { adminDriverController } from './adminDriver.controller';
import { adminDocumentController } from '../documents/adminDocument.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const adminDriverRouter = Router();

// Enforce authentication & admin RBAC across all administrative driver endpoints
adminDriverRouter.use(authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']));

adminDriverRouter.get('/statistics', (req, res) => adminDriverController.getStatistics(req, res));
adminDriverRouter.get('/eligible', (req, res) => adminDriverController.getEligibleDrivers(req, res));
adminDriverRouter.get('/', (req, res) => adminDriverController.listDrivers(req, res));
adminDriverRouter.post('/', (req, res) => adminDriverController.createDriver(req, res));

adminDriverRouter.get('/:id', (req, res) => adminDriverController.getDriverById(req, res));
adminDriverRouter.patch('/:id', (req, res) => adminDriverController.updateDriver(req, res));
adminDriverRouter.patch('/:id/status', (req, res) => adminDriverController.updateStatus(req, res));
adminDriverRouter.patch('/:id/verification', (req, res) => adminDriverController.updateVerification(req, res));
adminDriverRouter.get('/:id/documents', (req, res) => adminDocumentController.getDriverDocuments(req, res));
adminDriverRouter.get('/:id/documents/:documentId', (req, res) => adminDocumentController.getDriverDocumentById(req, res));
adminDriverRouter.patch('/:id/documents/:documentId/status', (req, res) => adminDocumentController.reviewDocument(req, res));
adminDriverRouter.patch('/:id/documents/:documentId/verification', (req, res) => adminDocumentController.reviewDocument(req, res));
adminDriverRouter.get('/:id/trips', (req, res) => adminDriverController.getTrips(req, res));
