import { Router, Request, Response } from 'express';
import { tripController } from './trip.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';
import { ApiResponse } from '../../core/response/apiResponse';

export const tripRouter = Router();

tripRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'trips',
      status: 'operational',
      description: 'Trip lifecycle, telematics, and passenger feedback services',
    },
    'Trip service status operational'
  );
});

// Driver journey management endpoints
tripRouter.post('/:rideId/start', authenticateToken, requireRole(['DRIVER', 'ADMIN', 'SUPER_ADMIN']), (req, res) =>
  tripController.startJourney(req, res)
);

tripRouter.post('/:rideId/location', authenticateToken, requireRole(['DRIVER', 'ADMIN', 'SUPER_ADMIN']), (req, res) =>
  tripController.ingestLocation(req, res)
);

tripRouter.post('/:rideId/complete', authenticateToken, requireRole(['DRIVER', 'ADMIN', 'SUPER_ADMIN']), (req, res) =>
  tripController.completeJourney(req, res)
);

tripRouter.post(
  '/:rideId/destination-change/respond',
  authenticateToken,
  requireRole(['DRIVER', 'ADMIN', 'SUPER_ADMIN']),
  (req, res) => tripController.respondDestinationChange(req, res)
);

// Passenger destination change endpoint
tripRouter.post(
  '/:rideId/change-destination',
  authenticateToken,
  requireRole(['PASSENGER', 'ADMIN', 'SUPER_ADMIN']),
  (req, res) => tripController.changeDestination(req, res)
);

// Receipt retrieval
tripRouter.get('/:rideId/receipt', authenticateToken, (req, res) => tripController.getReceipt(req, res));
