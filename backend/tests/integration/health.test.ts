import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import * as dbHealth from '../../src/core/database/health';

describe('Health & Liveness Integration Tests', () => {
  it('GET /api/v1/health should return HTTP 200 with service metadata', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('kings-taxi-central-backend');
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/v1/health/live should return HTTP 200', async () => {
    const res = await request(app).get('/api/v1/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health/ready should return HTTP 200 when database is healthy', async () => {
    vi.spyOn(dbHealth, 'checkDatabaseHealth').mockResolvedValueOnce({
      status: 'up',
      latencyMs: 3.5,
    });

    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.checks.database.status).toBe('up');
  });

  it('GET /api/v1/health/ready should return HTTP 503 when database is down', async () => {
    vi.spyOn(dbHealth, 'checkDatabaseHealth').mockResolvedValueOnce({
      status: 'down',
      latencyMs: 12.1,
      error: 'Connection refused: 5432',
    });

    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DEPENDENCY_UNAVAILABLE');
    expect(res.body.error.details.database.status).toBe('down');
  });
});

