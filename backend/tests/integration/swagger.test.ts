import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Swagger Documentation Integration Tests', () => {
  it('GET /api/v1/docs.json should return OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/v1/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Kings Taxi Central API');
    expect(res.body.paths['/health']).toBeDefined();
    expect(res.body.paths['/health/ready']).toBeDefined();
  });
});

