import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../database/prisma';
import { ApiResponse } from '../response/apiResponse';

export interface TokenPayload {
  sub: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';
  email?: string;
  phone?: string;
  sessionId?: string;
  tokenType?: 'access' | 'refresh';
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    token = authHeader.replace(/^Bearer\s+/i, '').trim();
  } else if (req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    ApiResponse.error(res, 'UNAUTHORIZED', 'Missing or malformed Authorization header', 401);
    return;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    req.user = decoded;
    res.locals.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      ApiResponse.error(res, 'TOKEN_EXPIRED', 'Access token has expired. Please refresh your session.', 401);
      return;
    }
    ApiResponse.error(res, 'INVALID_TOKEN', 'Access token signature is invalid or corrupted', 401);
  }
}

export function requireRole(allowedRoles: Array<'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      ApiResponse.error(res, 'FORBIDDEN', 'Insufficient permissions to access this resource', 403);
      return;
    }
    next();
  };
}

export const DRIVER_TOKEN_ISSUER = 'kings-taxi-api';
export const DRIVER_TOKEN_AUDIENCE = 'kings-taxi-driver';

/**
 * Authenticates a driver JWT, enforces issuer/audience/role isolation,
 * and verifies against the live Driver record that the account is active and approved.
 */
export async function authenticateDriver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token =
    authHeader && /^Bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^Bearer\s+/i, '').trim()
      : undefined;

  if (!token) {
    ApiResponse.error(res, 'UNAUTHORIZED', 'Missing or malformed Authorization header', 401);
    return;
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: DRIVER_TOKEN_ISSUER,
      audience: DRIVER_TOKEN_AUDIENCE,
    }) as TokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      ApiResponse.error(res, 'TOKEN_EXPIRED', 'Access token has expired. Please refresh your session.', 401);
      return;
    }
    ApiResponse.error(res, 'INVALID_TOKEN', 'Access token signature or scope is invalid', 401);
    return;
  }

  if (decoded.role !== 'DRIVER' || decoded.tokenType !== 'access' || !decoded.sub) {
    ApiResponse.error(res, 'FORBIDDEN', 'Driver authorization required', 403);
    return;
  }

  try {
    const driver = await prisma.driver.findFirst({
      where: { id: decoded.sub, deletedAt: null },
      select: {
        id: true,
        accountStatus: true,
        verificationStatus: true,
      },
    });

    if (!driver) {
      ApiResponse.error(res, 'UNAUTHORIZED', 'Driver account not found', 401);
      return;
    }

    if (driver.accountStatus === 'SUSPENDED' || driver.verificationStatus === 'SUSPENDED') {
      ApiResponse.error(res, 'ACCOUNT_SUSPENDED', 'Your driver account has been suspended.', 403);
      return;
    }

    if (driver.accountStatus === 'DELETED' || driver.verificationStatus === 'REJECTED') {
      ApiResponse.error(res, 'ACCOUNT_REJECTED', 'Your driver account is not authorized to sign in.', 403);
      return;
    }

    if (driver.accountStatus !== 'ACTIVE' || driver.verificationStatus !== 'APPROVED') {
      ApiResponse.error(
        res,
        'ACCOUNT_PENDING_APPROVAL',
        'Your driver account is pending administrator approval.',
        403
      );
      return;
    }

    req.user = decoded;
    res.locals.user = decoded;
    next();
  } catch {
    ApiResponse.serverError(res, 'Unable to verify driver session');
  }
}

