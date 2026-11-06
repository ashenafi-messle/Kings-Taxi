import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ServiceUnavailableError,
} from '../../src/core/errors/appError';

describe('AppError Hierarchy', () => {
  it('should instantiate BadRequestError with 400 status', () => {
    const error = new BadRequestError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.isOperational).toBe(true);
  });

  it('should instantiate UnauthorizedError with 401 status', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should instantiate ForbiddenError with 403 status', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('should instantiate NotFoundError with 404 status', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should instantiate ValidationError with details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const error = new ValidationError('Validation failed', details);
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual(details);
  });

  it('should instantiate ServiceUnavailableError with 503 status', () => {
    const error = new ServiceUnavailableError('Database down');
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

