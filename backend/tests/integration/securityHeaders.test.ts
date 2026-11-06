import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Security Headers & CORS Integration Tests', () => {
  it('should include Helmet security headers and x-request-id in responses', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should reflect incoming x-request-id correlation header if provided', async () => {
    const customId = 'corr-uuid-998877';
    const res = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.meta.requestId).toBe(customId);
  });
});

