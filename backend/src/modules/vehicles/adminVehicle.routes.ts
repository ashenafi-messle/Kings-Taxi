import { Router } from 'express';
import { adminVehicleController } from './adminVehicle.controller';
import { adminDocumentController } from '../documents/adminDocument.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const adminVehicleRouter = Router();

// Enforce authentication & admin RBAC across all administrative vehicle endpoints
adminVehicleRouter.use(authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']));

adminVehicleRouter.get('/statistics', (req, res) => adminVehicleController.getStatistics(req, res));
adminVehicleRouter.get('/eligible', (req, res) => adminVehicleController.getEligibleVehicles(req, res));
adminVehicleRouter.get('/', (req, res) => adminVehicleController.listVehicles(req, res));
adminVehicleRouter.post('/', (req, res) => adminVehicleController.createVehicle(req, res));

adminVehicleRouter.get('/:id', (req, res) => adminVehicleController.getVehicleById(req, res));
adminVehicleRouter.patch('/:id', (req, res) => adminVehicleController.updateVehicle(req, res));
adminVehicleRouter.patch('/:id/status', (req, res) => adminVehicleController.updateStatus(req, res));
adminVehicleRouter.patch('/:id/verification', (req, res) => adminVehicleController.updateVerification(req, res));

adminVehicleRouter.post('/:id/assign-driver', (req, res) => adminVehicleController.assignDriver(req, res));
adminVehicleRouter.post('/:id/unassign-driver', (req, res) => adminVehicleController.unassignDriver(req, res));
adminVehicleRouter.get('/:id/assignments', (req, res) => adminVehicleController.getAssignments(req, res));

adminVehicleRouter.get('/:id/maintenance', (req, res) => adminVehicleController.getMaintenance(req, res));
adminVehicleRouter.post('/:id/maintenance', (req, res) => adminVehicleController.addMaintenance(req, res));
adminVehicleRouter.patch('/:id/maintenance/:maintenanceId', (req, res) => adminVehicleController.updateMaintenance(req, res));

adminVehicleRouter.get('/:id/documents', (req, res) => adminVehicleController.getDocuments(req, res));
adminVehicleRouter.patch('/:id/documents/:documentId/status', (req, res) => adminDocumentController.reviewDocument(req, res));
adminVehicleRouter.patch('/:id/documents/:documentId/verification', (req, res) => adminDocumentController.reviewDocument(req, res));

