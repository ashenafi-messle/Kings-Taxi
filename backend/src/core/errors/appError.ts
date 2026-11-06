export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: any) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details?: any) {
    super(message, 401, 'UNAUTHORIZED', true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden action', details?: any) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: any) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', details?: any) {
    super(message, 429, 'TOO_MANY_REQUESTS', true, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
  }
}

