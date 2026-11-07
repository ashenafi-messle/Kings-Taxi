import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Customer Support & Help Center Module
 *
 * Responsibilities:
 * - In-app ticket submission
 * - Trip dispute filing
 * - Direct emergency helpline access for Gondar dispatch
 */

export const supportRouter = Router();

supportRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'support',
      status: 'operational',
      description: 'Support ticket routing, trip dispute management and Gondar helpline dispatch services',
    },
    'Support service status operational'
  );
});

export interface ISupportService {
  // Subsequent phase contract
}
