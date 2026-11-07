import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Authentication & Multi-Channel OTP Integration Tests', { timeout: 15000 }, () => {
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
