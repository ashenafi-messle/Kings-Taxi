import { Router } from 'express';
import { adminDocumentController } from './adminDocument.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const adminDocumentRouter = Router();

// Enforce admin authentication across all document management routes
adminDocumentRouter.use(authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']));

adminDocumentRouter.get('/:documentId', (req, res) => adminDocumentController.getDocument(req, res));
adminDocumentRouter.get('/:documentId/preview', (req, res) => adminDocumentController.previewDocument(req, res));
adminDocumentRouter.get('/:documentId/download', (req, res) => adminDocumentController.downloadDocument(req, res));
adminDocumentRouter.patch('/:documentId/verification', (req, res) => adminDocumentController.reviewDocument(req, res));
adminDocumentRouter.get('/:documentId/history', (req, res) => adminDocumentController.getDocumentHistory(req, res));
