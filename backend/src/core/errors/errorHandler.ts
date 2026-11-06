import { Request, Response, NextFunction } from 'express';
import { AppError } from './appError';
import { ApiResponse } from '../response/apiResponse';
import { logger } from '../logging/logger';
import { env } from '../../config/env';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || (res.locals?.requestId as string) || 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, path: req.path, method: req.method }, `[Operational Error 5xx]: ${err.message}`);
    } else {
      logger.warn({ code: err.code, message: err.message, requestId, path: req.path }, `[Client Error 4xx]: ${err.message}`);
    }

    ApiResponse.error(
      res,
      err.code,
      err.message,
      err.statusCode,
      err.details
    );
    return;
  }

  // Handle JSON parse errors from express.json()
  if ('type' in err && (err as any).type === 'entity.parse.failed') {
    ApiResponse.error(
      res,
      'INVALID_JSON',
      'Malformed JSON payload in request body',
      400
    );
    return;
  }

  // Unexpected non-operational error
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      requestId,
      path: req.path,
      method: req.method,
    },
    `[Unhandled Internal Exception]: ${err.message}`
  );

  const safeMessage =
    env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred. Please contact Kings Taxi support.'
      : err.message;

  ApiResponse.error(
    res,
    'INTERNAL_SERVER_ERROR',
    safeMessage,
    500
  );
}

