import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('404 & Error Handling Integration Tests', () => {
  it('should return 404 with standardized error envelope for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-path');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Resource not found');
    expect(res.body.meta.requestId).toBeDefined();
    expect(res.body.meta.timestamp).toBeDefined();
  });
});

