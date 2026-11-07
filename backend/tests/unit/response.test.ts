import { describe, it, expect } from 'vitest';
import { ApiResponse } from '../../src/core/response/apiResponse';

describe('ApiResponse Envelope', () => {
  it('should format success response correctly with default message', () => {
    let outputStatus = 0;
    let outputJson: any = null;

    const mockRes: any = {
      req: { headers: { 'x-request-id': 'req-test-123' } },
      status: (code: number) => {
        outputStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        outputJson = data;
        return mockRes;
      },
    };

    ApiResponse.success(mockRes, { user: 'Dawit' }, 200);

    expect(outputStatus).toBe(200);
    expect(outputJson.success).toBe(true);
    expect(outputJson.message).toBe('Operation completed successfully');
    expect(outputJson.data).toEqual({ user: 'Dawit' });
    expect(outputJson.error).toBeNull();
    expect(outputJson.meta.requestId).toBe('req-test-123');
    expect(outputJson.meta.timestamp).toBeDefined();
  });

  it('should format success response with custom message', () => {
    let outputStatus = 0;
    let outputJson: any = null;

    const mockRes: any = {
      req: { headers: { 'x-request-id': 'req-custom-789' } },
      status: (code: number) => {
        outputStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        outputJson = data;
        return mockRes;
      },
    };

    ApiResponse.success(mockRes, { tripId: 'trip-1' }, 'Trip fetched successfully', 200);

    expect(outputStatus).toBe(200);
    expect(outputJson.success).toBe(true);
    expect(outputJson.message).toBe('Trip fetched successfully');
    expect(outputJson.data).toEqual({ tripId: 'trip-1' });
  });

  it('should format error response correctly', () => {
    let outputStatus = 0;
    let outputJson: any = null;

    const mockRes: any = {
      req: { headers: { 'x-request-id': 'req-err-456' } },
      status: (code: number) => {
        outputStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        outputJson = data;
        return mockRes;
      },
    };

    ApiResponse.error(mockRes, 'NOT_FOUND', 'Entity not found', 404, { id: '999' });

    expect(outputStatus).toBe(404);
    expect(outputJson.success).toBe(false);
    expect(outputJson.message).toBe('Entity not found');
    expect(outputJson.code).toBe('NOT_FOUND');
    expect(outputJson.data).toBeNull();
    expect(outputJson.error.code).toBe('NOT_FOUND');
    expect(outputJson.error.message).toBe('Entity not found');
    expect(outputJson.error.details).toEqual({ id: '999' });
    expect(outputJson.meta.requestId).toBe('req-err-456');
  });
});
