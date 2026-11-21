import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiResponse } from '../response/apiResponse';

export interface TokenPayload {
  sub: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';
  email?: string;
  phone?: string;
  sessionId?: string;
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

