import { Router } from 'express';
import { adminPassengerController } from './adminPassenger.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const adminPassengerRouter = Router();

// Enforce authentication & admin RBAC across all administrative passenger endpoints
adminPassengerRouter.use(authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']));

// 2.2 Dashboard statistics
adminPassengerRouter.get('/stats', (req, res) => adminPassengerController.getStatistics(req, res));
adminPassengerRouter.get('/statistics', (req, res) => adminPassengerController.getStatistics(req, res));

// 2.1 Passenger listing
adminPassengerRouter.get('/', (req, res) => adminPassengerController.listPassengers(req, res));

// 2.3 Passenger details
adminPassengerRouter.get('/:passengerId', (req, res) => adminPassengerController.getPassengerById(req, res));

// 2.4 Passenger ride history
adminPassengerRouter.get('/:passengerId/rides', (req, res) => adminPassengerController.getPassengerRides(req, res));

// 2.5 Passenger booking history
adminPassengerRouter.get('/:passengerId/bookings', (req, res) => adminPassengerController.getPassengerBookings(req, res));

// 2.6 Passenger payment history
adminPassengerRouter.get('/:passengerId/payments', (req, res) => adminPassengerController.getPassengerPayments(req, res));

// 2.7 Account status management
adminPassengerRouter.patch('/:passengerId/status', (req, res) => adminPassengerController.updateStatus(req, res));
