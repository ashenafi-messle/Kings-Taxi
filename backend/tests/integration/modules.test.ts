import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Modular Architecture Route Endpoints', () => {
  const modules = [
    { route: '/api/v1/auth/status', name: 'auth' },
    { route: '/api/v1/passengers/status', name: 'passengers' },
    { route: '/api/v1/drivers/status', name: 'drivers' },
    { route: '/api/v1/vehicles/status', name: 'vehicles' },
    { route: '/api/v1/bookings/status', name: 'bookings' },
    { route: '/api/v1/trips/status', name: 'trips' },
    { route: '/api/v1/payments/status', name: 'payments' },
    { route: '/api/v1/notifications/status', name: 'notifications' },
    { route: '/api/v1/support/status', name: 'support' },
  ];

  modules.forEach(({ route, name }) => {
    it(`GET ${route} should return HTTP 200 and operational status for ${name}`, async () => {
      const res = await request(app).get(route);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBeDefined();
      expect(res.body.data.module).toBe(name);
      expect(res.body.data.status).toBe('operational');
      expect(res.body.meta.requestId).toBeDefined();
      expect(res.body.meta.timestamp).toBeDefined();
    });
  });

  it('GET /api/v1/live should return HTTP 200 direct liveness probe', async () => {
    const res = await request(app).get('/api/v1/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/ready should query readiness probe', async () => {
    const res = await request(app).get('/api/v1/ready');
    // Depending on DB availability, 200 (healthy) or 503 (offline)
    expect([200, 503]).toContain(res.status);
    expect(res.body.meta.requestId).toBeDefined();
  });
});

