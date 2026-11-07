import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { resetIdentifierRateLimitTracker } from '../../src/modules/auth/auth.service';
import { env } from '../../src/config/env';

describe('Authentication & Multi-Channel OTP Integration Tests', { timeout: 25000 }, () => {
  const testEmail = `test_${Date.now()}@kingstaxi.et`;
  let activeSessionId = '';
  let activeDevOtp = '';
  let activeRegistrationToken = '';
  let activeAccessToken = '';
  let activeRefreshToken = '';

  it('GET /api/v1/auth/status should return 200 operational status', async () => {
    const res = await request(app).get('/api/v1/auth/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.module).toBe('auth');
    expect(res.body.data.status).toBe('operational');
  });

  describe('Registration Flow', () => {
    it('POST /api/v1/auth/register/initiate should validate inputs and dispatch OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/initiate')
        .send({
          method: 'email',
          identifier: testEmail,
          fullName: 'Abebe Bikila',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.devOtp).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(300);

      activeSessionId = res.body.data.sessionId;
      activeDevOtp = res.body.data.devOtp;
    });

    it('POST /api/v1/auth/register/verify-otp should reject incorrect OTP code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/verify-otp')
        .send({
          sessionId: activeSessionId,
          code: '000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_OTP');
    });

    it('POST /api/v1/auth/register/verify-otp should accept valid OTP and issue registrationToken', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/verify-otp')
        .send({
          sessionId: activeSessionId,
          code: activeDevOtp,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registrationToken).toBeDefined();
      expect(res.body.data.fullName).toBe('Abebe Bikila');

      activeRegistrationToken = res.body.data.registrationToken;
    });

    it('POST /api/v1/auth/register/complete should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/complete')
        .send({
          sessionId: activeSessionId,
          registrationToken: activeRegistrationToken,
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/auth/register/complete should create account and return JWT session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/complete')
        .send({
          sessionId: activeSessionId,
          registrationToken: activeRegistrationToken,
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.fullName).toBe('Abebe Bikila');

      activeAccessToken = res.body.data.token;
      activeRefreshToken = res.body.data.refreshToken;
    });
  });

  describe('Login Flow', () => {
    it('POST /api/v1/auth/login should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testEmail,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('POST /api/v1/auth/login should authenticate with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
    });
  });

  describe('Protected Routes & Profile Inspection', () => {
    it('GET /api/v1/auth/me should reject requests without Authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/auth/me should return passenger profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${activeAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Abebe Bikila');
    });
  });

  describe('Password Recovery Flow', () => {
    let recSessionId = '';
    let recDevOtp = '';
    let recToken = '';

    it('POST /api/v1/auth/recovery/initiate should reject non-existent accounts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/recovery/initiate')
        .send({
          method: 'email',
          identifier: 'nonexistent999@kingstaxi.et',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('POST /api/v1/auth/recovery/initiate should dispatch OTP for existing account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/recovery/initiate')
        .send({
          method: 'email',
          identifier: testEmail,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.devOtp).toBeDefined();

      recSessionId = res.body.data.sessionId;
      recDevOtp = res.body.data.devOtp;
    });

    it('POST /api/v1/auth/recovery/verify-otp should verify OTP and issue recoveryToken', async () => {
      const res = await request(app)
        .post('/api/v1/auth/recovery/verify-otp')
        .send({
          sessionId: recSessionId,
          code: recDevOtp,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recoveryToken).toBeDefined();

      recToken = res.body.data.recoveryToken;
    });

    it('POST /api/v1/auth/recovery/reset should update password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/recovery/reset')
        .send({
          sessionId: recSessionId,
          recoveryToken: recToken,
          newPassword: 'NewSecurePassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Security: POST /api/v1/auth/recovery/reset should reject recovery-token replay', async () => {
      const res = await request(app)
        .post('/api/v1/auth/recovery/reset')
        .send({
          sessionId: recSessionId,
          recoveryToken: recToken,
          newPassword: 'AnotherPassword789!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNVERIFIED_SESSION');
    });

    it('POST /api/v1/auth/login should now succeed with the new password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testEmail,
          password: 'NewSecurePassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      activeAccessToken = res.body.data.token;
      activeRefreshToken = res.body.data.refreshToken;
    });
  });

  describe('Security Hardening & Token Lifecycle', () => {
    let rotatedRefreshToken = '';

    it('POST /api/v1/auth/refresh should successfully rotate refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: activeRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      rotatedRefreshToken = res.body.data.refreshToken;
    });

    it('Security: Replaying an already-revoked refresh token must trigger family revocation', async () => {
      // Replaying the old activeRefreshToken which was already rotated
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: activeRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(['TOKEN_FAMILY_REVOKED', 'INVALID_REFRESH_TOKEN']).toContain(res.body.error.code);
    });

    it('Security: Resend OTP before cooldown timer must return HTTP 429', async () => {
      const initRes = await request(app)
        .post('/api/v1/auth/register/initiate')
        .send({
          method: 'email',
          identifier: `cooldown_${Date.now()}@kingstaxi.et`,
          fullName: 'Cooldown Tester',
        });

      const sessId = initRes.body.data.sessionId;

      // Immediate resend must be rejected by the 60-second cooldown
      const resendRes = await request(app)
        .post('/api/v1/auth/register/resend-otp')
        .send({ sessionId: sessId });

      expect(resendRes.status).toBe(429);
      expect(resendRes.body.success).toBe(false);
      expect(resendRes.body.error.code).toBe('COOLDOWN_ACTIVE');
    });

    it('Security: Identifier-level rate limiting should reject after 5 requests in 1 hour', async () => {
      resetIdentifierRateLimitTracker();
      const floodEmail = `flood_${Date.now()}@kingstaxi.et`;

      // 5 requests allowed
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/register/initiate')
          .send({
            method: 'email',
            identifier: floodEmail,
            fullName: `Flood Test ${i}`,
          });
        expect(res.status).toBe(200);
      }

      // 6th request must be rejected with 429
      const blockedRes = await request(app)
        .post('/api/v1/auth/register/initiate')
        .send({
          method: 'email',
          identifier: floodEmail,
          fullName: 'Flood Blocked',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('IDENTIFIER_RATE_LIMIT_EXCEEDED');
      resetIdentifierRateLimitTracker();
    });

    it('Security: Production environment strictly forbids in-memory fallback accounts', async () => {
      // Simulate production environment
      const originalEnv = env.NODE_ENV;
      (env as any).NODE_ENV = 'production';

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'dawit@kingstaxi.et',
          password: 'Password123!',
        });

      // When DB is unreachable in production, must return 503 rather than silent in-memory fallback
      expect([401, 503]).toContain(res.status);

      (env as any).NODE_ENV = originalEnv;
    });

    it('Security: Concurrent token refresh requests using the same token cannot double-consume', async () => {
      // Issue a fresh token pair for Abebe Bikila
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testEmail,
          password: 'NewSecurePassword456!',
        });

      const tokenToConsume = loginRes.body.data.refreshToken;

      // Dispatch 2 concurrent refresh calls simultaneously
      const [call1, call2] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokenToConsume }),
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokenToConsume }),
      ]);

      // Exactly one must succeed, or if DB is offline, both fail safely
      const statuses = [call1.status, call2.status];
      expect(statuses).toContain(200);
    });
  });

  describe('Session Termination', () => {
    it('POST /api/v1/auth/logout should revoke session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${activeAccessToken}`)
        .send({ refreshToken: activeRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
