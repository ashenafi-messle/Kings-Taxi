import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

import {
  buildApiUrl,
  resolveApiBaseUrl,
  PRODUCTION_API_URL,
  apiFetch,
  registerAuthHandlers,
} from '../config/apiClient';

describe('API URL Resolution & Path Construction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses PRODUCTION_API_URL in production environment when EXPO_PUBLIC_API_URL is unset', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';

    const resolved = resolveApiBaseUrl();
    expect(resolved).toBe(PRODUCTION_API_URL);
    expect(resolved).not.toContain('localhost');
    expect(resolved).not.toContain('127.0.0.1');
    expect(resolved).not.toContain('10.0.2.2');
  });

  it('honors explicitly configured EXPO_PUBLIC_API_URL and removes trailing slashes', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://kings-taxi.onrender.com/api/v1///';
    const resolved = resolveApiBaseUrl();
    expect(resolved).toBe('https://kings-taxi.onrender.com/api/v1');
  });

  it('correctly constructs basic endpoints', () => {
    const url = buildApiUrl('/auth/login', 'https://kings-taxi.onrender.com/api/v1');
    expect(url).toBe('https://kings-taxi.onrender.com/api/v1/auth/login');
  });

  it('eliminates redundant leading /api/v1 prefix from endpoints', () => {
    const url = buildApiUrl('/api/v1/auth/login', 'https://kings-taxi.onrender.com/api/v1');
    expect(url).toBe('https://kings-taxi.onrender.com/api/v1/auth/login');
    expect(url).not.toContain('/api/v1/api/v1');
  });

  it('handles endpoints without leading slashes safely', () => {
    const url = buildApiUrl('hotels/featured', 'https://kings-taxi.onrender.com/api/v1');
    expect(url).toBe('https://kings-taxi.onrender.com/api/v1/hotels/featured');
  });

  it('handles query parameters and complex routes correctly', () => {
    const url = buildApiUrl(
      '/passengers/bookings?type=RIDE&page=1',
      'https://kings-taxi.onrender.com/api/v1'
    );
    expect(url).toBe(
      'https://kings-taxi.onrender.com/api/v1/passengers/bookings?type=RIDE&page=1'
    );
  });
});

describe('Central API Fetch Transport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches bearer token from registered auth handler', async () => {
    let capturedHeaders: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'healthy' } }),
      });
    });

    registerAuthHandlers(
      () => 'test_jwt_bearer_token',
      async () => true
    );

    const res = await apiFetch('/test/endpoint');
    expect(res.success).toBe(true);
    expect(capturedHeaders['Authorization']).toBe('Bearer test_jwt_bearer_token');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedHeaders['Accept']).toBe('application/json');
  });

  it('maps HTTP 400 with user-friendly message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, message: 'Invalid phone format' }),
    });

    const res = await apiFetch('/auth/register/initiate', { method: 'POST' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid phone format');
  });

  it('maps HTTP 429 rate limit exceeded gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ success: false }),
    });

    const res = await apiFetch('/auth/login', { method: 'POST' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Too many requests');
  });

  it('maps HTTP 500 without leaking stack traces or raw errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: 'Internal server error',
        stack: 'Error: at PrismaClient.findMany (/app/node_modules/...)',
      }),
    });

    const res = await apiFetch('/hotels');
    expect(res.success).toBe(false);
    expect(res.error).toContain('momentarily unavailable');
    expect(res.error).not.toContain('PrismaClient');
  });

  it('retries once after transparently refreshing on 401', async () => {
    let callCount = 0;
    let refreshTriggered = false;
    let currentToken = 'initial_expired_token';

    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Token expired' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { id: 'passenger_123' } }),
      });
    });

    registerAuthHandlers(
      () => currentToken,
      async () => {
        refreshTriggered = true;
        currentToken = 'fresh_refreshed_token';
        return true;
      }
    );

    const res = await apiFetch('/passenger/profile');
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: 'passenger_123' });
    expect(refreshTriggered).toBe(true);
    expect(callCount).toBe(2);
  });

  it('never automatically retries non-idempotent POST requests on transient error', async () => {
    let postCalls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      postCalls++;
      return Promise.reject(new Error('Network disconnected'));
    });

    const res = await apiFetch('/passengers/rides', { method: 'POST' });
    expect(res.success).toBe(false);
    expect(postCalls).toBe(1); // Exactly 1 attempt, zero retries
  });
});
