import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Passenger Management Module (Phase 3 Architectural Boundary)
 *
 * Responsibilities:
 * - Profile retrieval and update
 * - Avatar/photo management
 * - Language and notification preferences
 * - Active session inspection and remote termination
 * - Account deletion request lifecycle
 */

export const passengerRouter = Router();

passengerRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'passengers',
      status: 'operational',
      description: 'Passenger profile, preferences, and session management services',
    },
    'Passenger service status operational'
  );
});

export interface IPassengerService {
  // Phase 3 implementation contract
}
