import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { rideRequestController } from './rideRequest.controller';
import {
  authenticateDriver,
  authenticateToken,
  requireRole,
} from '../../core/middleware/auth.middleware';

export const rideRequestRouter = Router();

const rideRequestCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many ride requests. Please wait before trying again.',
  },
});

// Passenger endpoints
rideRequestRouter.post(
  '/requests',
  authenticateToken,
  requireRole(['PASSENGER']),
  rideRequestCreateLimiter,
  (req, res) => rideRequestController.createRequest(req, res)
);
rideRequestRouter.get(
  '/requests/passenger/current',
  authenticateToken,
  requireRole(['PASSENGER']),
  (req, res) => rideRequestController.getPassengerCurrent(req, res)
);
rideRequestRouter.post(
  '/requests/:requestId/cancel',
  authenticateToken,
  requireRole(['PASSENGER']),
  (req, res) => rideRequestController.cancelRequest(req, res)
);

// Driver endpoints (strict driver JWT + live eligibility enforcement)
rideRequestRouter.get('/requests/driver/pending', authenticateDriver, (req, res) =>
  rideRequestController.getDriverPending(req, res)
);
rideRequestRouter.get('/requests/driver/current', authenticateDriver, (req, res) =>
  rideRequestController.getDriverCurrent(req, res)
);
rideRequestRouter.get('/requests/driver/history', authenticateDriver, (req, res) =>
  rideRequestController.getDriverHistory(req, res)
);
rideRequestRouter.post('/requests/:requestId/accept', authenticateDriver, (req, res) =>
  rideRequestController.acceptRequest(req, res)
);
rideRequestRouter.post('/requests/:requestId/reject', authenticateDriver, (req, res) =>
  rideRequestController.rejectRequest(req, res)
);

// Single request detail for passenger sync (keep after static /driver/* and /passenger/* paths)
rideRequestRouter.get(
  '/requests/:requestId',
  authenticateToken,
  requireRole(['PASSENGER']),
  (req, res) => rideRequestController.getPassengerById(req, res)
);
