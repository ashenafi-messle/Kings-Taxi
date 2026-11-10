import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, resetAuthSessions, resetIdentifierRateLimitTracker } from '../../src/modules/auth/auth.service';
import { prisma } from '../../src/config/database';
import { EmailService } from '../../src/integrations/email/email.service';

describe('AuthService Database Persistence & Failure Handling', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessions();
    resetIdentifierRateLimitTracker();
    vi.spyOn(EmailService.getInstance(), 'sendOtpEmail').mockResolvedValue(true);
    authService = new AuthService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAuthSessions();
    resetIdentifierRateLimitTracker();
  });

  describe('1. createRefreshToken() Persistence Enforcement', () => {
    it('should throw HTTP 503 when prisma.refreshToken.create fails', async () => {
      vi.spyOn(prisma.refreshToken, 'create').mockRejectedValueOnce(new Error('Connection lost to PostgreSQL'));

      await expect(
        authService.createRefreshToken('test-passenger-uuid')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });
  });

  describe('2. completeRegistration() Database Failure', () => {
    it('should throw HTTP 503 when prisma.passenger.create fails and NOT create in-memory user', async () => {
      // 1. Initiate session first
      vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(prisma.oTPVerification, 'create').mockResolvedValueOnce({} as any);

      const initResult = await authService.initiateRegistration('email', 'persist_test@kingstaxi.et', 'Test Persistence');
      expect(initResult.devOtp).toBeDefined();

      // 2. Verify OTP
      const verifyResult = await authService.verifyRegistrationOtp(initResult.sessionId, initResult.devOtp!);
      expect(verifyResult.registrationToken).toBeDefined();

      // 3. Mock database failure on completeRegistration
      vi.spyOn(prisma.passenger, 'create').mockRejectedValueOnce(new Error('PostgreSQL out of disk space / down'));

      await expect(
        authService.completeRegistration(initResult.sessionId, verifyResult.registrationToken!, 'SecurePass123!')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });

    it('should throw HTTP 409 when prisma.passenger.create fails due to duplicate constraint P2002', async () => {
      vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(prisma.oTPVerification, 'create').mockResolvedValueOnce({} as any);

      const initResult = await authService.initiateRegistration('email', 'duplicate_p2002@kingstaxi.et', 'Dup User');
      const verifyResult = await authService.verifyRegistrationOtp(initResult.sessionId, initResult.devOtp!);

      const duplicateError: any = new Error('Unique constraint failed on the fields: (`email`)');
      duplicateError.code = 'P2002';
      vi.spyOn(prisma.passenger, 'create').mockRejectedValueOnce(duplicateError);

      await expect(
        authService.completeRegistration(initResult.sessionId, verifyResult.registrationToken!, 'SecurePass123!')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'ACCOUNT_ALREADY_EXISTS',
        })
      );
    });
  });

  describe('3. login() Database Failure Handling', () => {
    it('should throw HTTP 503 on database query failure and NEVER fall back to in-memory users', async () => {
      vi.spyOn(prisma.passenger, 'findFirst').mockRejectedValueOnce(new Error('DB connection pool exhausted'));

      await expect(
        authService.login('dawit@kingstaxi.et', 'Password123!')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });

    it('should throw HTTP 401 when database query succeeds but passenger does not exist', async () => {
      vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValueOnce(null);

      await expect(
        authService.login('nonexistent@kingstaxi.et', 'Password123!')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });
  });

  describe('4. initiateRecovery() Database Failure Handling', () => {
    it('should throw HTTP 503 when passenger lookup in PostgreSQL fails', async () => {
      vi.spyOn(prisma.passenger, 'findFirst').mockRejectedValueOnce(new Error('PostgreSQL timeout'));

      await expect(
        authService.initiateRecovery('email', 'recovery_fail@kingstaxi.et')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });

    it('should throw HTTP 503 when OTP persistence in prisma.oTPVerification fails', async () => {
      vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValueOnce({
        id: 'test-passenger-id',
        fullName: 'Recovery User',
        email: 'recovery_user@kingstaxi.et',
        phoneNumber: null,
      } as any);

      vi.spyOn(prisma.oTPVerification, 'create').mockRejectedValueOnce(new Error('DB write failure'));

      await expect(
        authService.initiateRecovery('email', 'recovery_user@kingstaxi.et')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });
  });

  describe('5. resetPassword() Transaction Failure Handling', () => {
    it('should throw HTTP 503 when prisma.$transaction fails and preserve recovery session', async () => {
      // 1. Setup verified recovery session
      vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValueOnce({
        id: 'test-rec-id',
        fullName: 'Reset User',
        email: 'reset_user@kingstaxi.et',
        phoneNumber: null,
      } as any);
      vi.spyOn(prisma.oTPVerification, 'create').mockResolvedValueOnce({} as any);

      const initRec = await authService.initiateRecovery('email', 'reset_user@kingstaxi.et');
      const verifyRec = await authService.verifyRecoveryOtp(initRec.sessionId, initRec.devOtp!);

      // 2. Mock transaction failure
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('Transaction deadlock'));

      await expect(
        authService.resetPassword(initRec.sessionId, verifyRec.recoveryToken!, 'NewStrongPass123!')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );

      // 3. Verify recovery session was NOT deleted prematurely
      // Subsequent attempt should succeed when transaction mock resolves
      vi.spyOn(prisma, '$transaction').mockResolvedValueOnce([{}, { count: 1 }] as any);

      const retryResult = await authService.resetPassword(initRec.sessionId, verifyRec.recoveryToken!, 'NewStrongPass123!');
      expect(retryResult.message).toContain('Password successfully updated');
    });
  });

  describe('6. refreshTokens() Failure Handling', () => {
    it('should throw HTTP 503 when prisma.refreshToken.findUnique fails', async () => {
      vi.spyOn(prisma.refreshToken, 'findUnique').mockRejectedValueOnce(new Error('DB failure'));

      await expect(
        authService.refreshTokens('rt_mock_token_string')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });

    it('should throw HTTP 401 when token does not exist in PostgreSQL', async () => {
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValueOnce(null);

      await expect(
        authService.refreshTokens('rt_mock_token_nonexistent')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
        })
      );
    });

    it('should throw HTTP 503 if atomic rotation update fails in PostgreSQL', async () => {
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValueOnce({
        id: 'token-uuid',
        tokenHash: 'hashed',
        userId: 'passenger-uuid',
        familyId: 'family-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        passenger: { id: 'passenger-uuid', fullName: 'Token User' },
      } as any);

      vi.spyOn(prisma.refreshToken, 'updateMany').mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        authService.refreshTokens('rt_valid_token')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });
  });

  describe('7. logout() Database Failure Handling', () => {
    it('should throw HTTP 503 when prisma.refreshToken.updateMany fails on logout', async () => {
      vi.spyOn(prisma.refreshToken, 'updateMany').mockRejectedValueOnce(new Error('DB error on logout'));

      await expect(
        authService.logout('rt_logout_token')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });
  });

  describe('8. getCurrentPassenger() Database Failure Handling', () => {
    it('should throw HTTP 503 when prisma.passenger.findUnique fails', async () => {
      vi.spyOn(prisma.passenger, 'findUnique').mockRejectedValueOnce(new Error('DB connection dropped'));

      await expect(
        authService.getCurrentPassenger('any-passenger-uuid')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    });

    it('should throw HTTP 404 when passenger is not found in PostgreSQL', async () => {
      vi.spyOn(prisma.passenger, 'findUnique').mockResolvedValueOnce(null);

      await expect(
        authService.getCurrentPassenger('non-existent-uuid')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });
  });
});

