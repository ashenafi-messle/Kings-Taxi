import { Router } from 'express';
import { subcityController } from './subcity.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const subcityRouter = Router();

// Public / Passenger accessible routes
subcityRouter.get('/', (req, res) => subcityController.listActive(req, res));
subcityRouter.get('/:id', (req, res) => subcityController.getById(req, res));

// Admin management routes
subcityRouter.post('/', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => subcityController.create(req, res));
subcityRouter.put('/:id', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => subcityController.update(req, res));
subcityRouter.post('/:subcityId/drivers/:driverId', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => subcityController.assignDriver(req, res));
subcityRouter.delete('/:subcityId/drivers/:driverId', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => subcityController.removeDriver(req, res));
