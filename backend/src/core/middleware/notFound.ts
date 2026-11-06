import { Request, Response } from 'express';
import { ApiResponse } from '../response/apiResponse';

export function notFoundHandler(req: Request, res: Response): void {
  ApiResponse.error(
    res,
    'NOT_FOUND',
    `Resource not found: ${req.method} ${req.originalUrl}`,
    404
  );
}

