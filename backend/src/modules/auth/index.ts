import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Authentication Module (Phase 2 Architectural Boundary)
 *
 * Responsibilities:
 * - Email & Telegram registration verification
 * - Argon2id password hashing and validation
 * - Rotating access & refresh tokens
 * - Session revocation & logout
 * - Password recovery via verified OTP
 */

export const authRouter = Router();

authRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'auth',
      status: 'operational',
      description: 'Multi-channel authentication and session verification services',
    },
    'Auth service status operational'
  );
});

export interface IAuthService {
  // Phase 2 implementation contract
}
