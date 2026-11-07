import { Response } from 'express';

export interface EnvelopeMeta {
  timestamp: string;
  requestId: string;
  version?: string;
  [key: string]: any;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  code?: string;
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
    messageOrStatus: string | number = 'Operation completed successfully',
    statusCode = 200,
    additionalMeta: Record<string, any> = {}
  ): Response<StandardApiResponse<T>> {
    const requestId = (res.req?.headers['x-request-id'] as string) || (res.locals?.requestId as string) || 'unknown';

    let message = 'Operation completed successfully';
    let status = statusCode;

    if (typeof messageOrStatus === 'number') {
      status = messageOrStatus;
    } else if (typeof messageOrStatus === 'string') {
      message = messageOrStatus;
    }

    const envelope: StandardApiResponse<T> = {
      success: true,
      message,
      data,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...additionalMeta,
      },
    };

    return res.status(status).json(envelope);
  }

  static error(
    res: Response,
    code: string,
    message = 'An error occurred',
    statusCode = 500,
    details?: any,
    additionalMeta: Record<string, any> = {}
  ): Response<StandardApiResponse<null>> {
    const requestId = (res.req?.headers['x-request-id'] as string) || (res.locals?.requestId as string) || 'unknown';

    const envelope: StandardApiResponse<null> = {
      success: false,
      message,
      code,
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

