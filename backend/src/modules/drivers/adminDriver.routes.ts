import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminDriverController } from './adminDriver.controller';
import { adminDocumentController } from '../documents/adminDocument.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const adminDriverRouter = Router();

const driverProvisioningLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many driver provisioning requests. Please wait before trying again.',
  },
});

const onboardingResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many onboarding email resend requests. Please wait before retrying.',
  },
});

// Enforce authentication & admin RBAC across all administrative driver endpoints
adminDriverRouter.use(authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']));

adminDriverRouter.get('/statistics', (req, res) => adminDriverController.getStatistics(req, res));
adminDriverRouter.get('/eligible', (req, res) => adminDriverController.getEligibleDrivers(req, res));
adminDriverRouter.get('/', (req, res) => adminDriverController.listDrivers(req, res));
adminDriverRouter.post('/', driverProvisioningLimiter, (req, res) => adminDriverController.createDriver(req, res));

adminDriverRouter.get('/:id', (req, res) => adminDriverController.getDriverById(req, res));
adminDriverRouter.post('/:id/resend-onboarding', onboardingResendLimiter, (req, res) =>
  adminDriverController.resendOnboarding(req, res)
);
adminDriverRouter.patch('/:id', (req, res) => adminDriverController.updateDriver(req, res));
adminDriverRouter.patch('/:id/status', (req, res) => adminDriverController.updateStatus(req, res));
adminDriverRouter.patch('/:id/verification', (req, res) => adminDriverController.updateVerification(req, res));
adminDriverRouter.get('/:id/documents', (req, res) => adminDocumentController.getDriverDocuments(req, res));
adminDriverRouter.get('/:id/documents/:documentId', (req, res) => adminDocumentController.getDriverDocumentById(req, res));
adminDriverRouter.patch('/:id/documents/:documentId/status', (req, res) => adminDocumentController.reviewDocument(req, res));
adminDriverRouter.patch('/:id/documents/:documentId/verification', (req, res) => adminDocumentController.reviewDocument(req, res));
adminDriverRouter.get('/:id/trips', (req, res) => adminDriverController.getTrips(req, res));
