import { Response } from 'express';

export interface EnvelopeMeta {
  timestamp: string;
  requestId: string;
  version?: string;
  [key: string]: any;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: EnvelopeMeta;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    statusCode = 200,
    additionalMeta: Record<string, any> = {}
  ): Response<StandardApiResponse<T>> {
    const requestId = (res.req?.headers['x-request-id'] as string) || (res.locals?.requestId as string) || 'unknown';

    const envelope: StandardApiResponse<T> = {
      success: true,
      data,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...additionalMeta,
      },
    };

    return res.status(statusCode).json(envelope);
  }

  static error(
    res: Response,
    code: string,
    message: string,
    statusCode = 500,
    details?: any,
    additionalMeta: Record<string, any> = {}
  ): Response<StandardApiResponse<null>> {
    const requestId = (res.req?.headers['x-request-id'] as string) || (res.locals?.requestId as string) || 'unknown';

    const envelope: StandardApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code,
        message,
        details: details || null,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...additionalMeta,
      },
    };

    return res.status(statusCode).json(envelope);
  }
}

