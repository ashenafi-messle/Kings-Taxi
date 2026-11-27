import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const { mockPrisma, mockSendOtpEmail, mockSendSecurityAlert, mockAuditRecord } = vi.hoisted(() => {
  const mock: any = {
    driver: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    driverPasswordReset: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));
  return {
    mockPrisma: mock,
    mockSendOtpEmail: vi.fn(),
    mockSendSecurityAlert: vi.fn(),
    mockAuditRecord: vi.fn(),
  };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../src/core/audit/audit.service', () => ({
  auditService: {
    record: mockAuditRecord,
  },
}));

vi.mock('../../src/integrations/email/email.service', () => ({
  EmailService: {
    getInstance: () => ({
      sendDriverPasswordResetOtpEmail: mockSendOtpEmail,
      sendSecurityAlert: mockSendSecurityAlert,
    }),
  },
}));

import { driverAuthService } from '../../src/modules/auth/driverAuth.service';
import {
  authenticateDriver,
  DRIVER_TOKEN_AUDIENCE,
  DRIVER_TOKEN_ISSUER,
} from '../../src/core/middleware/auth.middleware';
import { hashDriverPassword, verifyDriverPassword } from '../../src/utils/driverPassword';
import { env } from '../../src/config/env';

async function makeDriver(overrides: Record<string, any> = {}) {
  const passwordHash = await hashDriverPassword('DriverPass123');
  return {
    id: '22222222-2222-4222-8222-222222222222',
    fullName: 'Abebe Kebede',
    email: 'abebe.driver@kingstaxi.et',
    phoneNumber: '+251911223344',
    passwordHash,
    profileImage: null,
    accountStatus: 'ACTIVE',
    verificationStatus: 'APPROVED',
    availabilityStatus: 'OFFLINE',
    mustChangePassword: false,
    tempPasswordExpiresAt: null,
    accountActivatedAt: new Date(),
    city: 'Gondar',
    licenseNumber: 'ET-AMH-DL-98210',
    licenseExpiry: new Date('2028-09-30'),
    rating: 4.9,
    totalTrips: 42,
    vehicles: [],
    vehicleAssignments: [],
    deletedAt: null,
    ...overrides,
  };
}

describe('Driver Authentication, Session Security & Forgot Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));
    mockAuditRecord.mockResolvedValue(undefined);
    mockSendOtpEmail.mockResolvedValue({ success: true, provider: 'Mock' });
    mockSendSecurityAlert.mockResolvedValue(true);
  });

  describe('Driver Login', () => {
    it('authenticates an approved active driver with email and issues scoped JWT + refresh token', async () => {
      const driver = await makeDriver();
      mockPrisma.driver.findFirst.mockResolvedValueOnce(driver);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});
      mockPrisma.driver.update.mockResolvedValueOnce(driver);

      const res = await driverAuthService.login('Abebe.Driver@KingsTaxi.et', 'DriverPass123');

      expect(res.driver.id).toBe(driver.id);
      expect((res.driver as any).passwordHash).toBeUndefined();
      expect(res.accessToken).toBeTruthy();
      expect(res.refreshToken).toBeTruthy();

      const decoded = jwt.verify(res.accessToken, env.JWT_ACCESS_SECRET, {
        issuer: DRIVER_TOKEN_ISSUER,
        audience: DRIVER_TOKEN_AUDIENCE,
      }) as any;
      expect(decoded.sub).toBe(driver.id);
      expect(decoded.role).toBe('DRIVER');
      expect(decoded.tokenType).toBe('access');
    });

    it('authenticates using normalized Ethiopian phone number', async () => {
      const driver = await makeDriver();
      mockPrisma.driver.findFirst.mockResolvedValueOnce(driver);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});
      mockPrisma.driver.update.mockResolvedValueOnce(driver);

      const res = await driverAuthService.login('0911223344', 'DriverPass123');
      expect(mockPrisma.driver.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phoneNumber: '+251911223344', deletedAt: null },
        })
      );
      expect(res.driver.phone).toBe('+251911223344');
    });

    it('rejects invalid password and unknown accounts with generic error', async () => {
      const driver = await makeDriver();
      mockPrisma.driver.findFirst.mockResolvedValueOnce(driver);
      await expect(driverAuthService.login('abebe.driver@kingstaxi.et', 'WrongPass1')).rejects.toThrow(
        /invalid email\/phone or password/i
      );

      mockPrisma.driver.findFirst.mockResolvedValueOnce(null);
      await expect(driverAuthService.login('unknown@kingstaxi.et', 'WrongPass1')).rejects.toThrow(
        /invalid email\/phone or password/i
      );
    });

    it('blocks unapproved, suspended, and expired-temp-password drivers', async () => {
      const pendingDriver = await makeDriver({
        accountStatus: 'PENDING_VERIFICATION',
        verificationStatus: 'PENDING',
      });
      mockPrisma.driver.findFirst.mockResolvedValueOnce(pendingDriver);
      await expect(driverAuthService.login('abebe.driver@kingstaxi.et', 'DriverPass123')).rejects.toThrow(
        /pending administrator approval/i
      );

      const suspendedDriver = await makeDriver({
        accountStatus: 'SUSPENDED',
        verificationStatus: 'SUSPENDED',
      });
      mockPrisma.driver.findFirst.mockResolvedValueOnce(suspendedDriver);
      await expect(driverAuthService.login('abebe.driver@kingstaxi.et', 'DriverPass123')).rejects.toThrow(
        /suspended/i
      );

      const expiredDriver = await makeDriver({
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(Date.now() - 60000),
      });
      mockPrisma.driver.findFirst.mockResolvedValueOnce(expiredDriver);
      await expect(driverAuthService.login('abebe.driver@kingstaxi.et', 'DriverPass123')).rejects.toThrow(
        /expired/i
      );
    });
  });

  describe('Refresh Token Rotation, Reuse Detection & Logout', () => {
    it('rotates valid refresh token and revokes token family on replay', async () => {
      const driver = await makeDriver();
      const rawToken = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt-1',
        userId: driver.id,
        userType: 'DRIVER',
        driverId: driver.id,
        tokenHash,
        familyId: 'fam-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.driver.findFirst.mockResolvedValueOnce(driver);
      mockPrisma.refreshToken.update.mockResolvedValueOnce({});
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      const rotated = await driverAuthService.refresh(rawToken);
      expect(rotated.refreshToken).not.toBe(rawToken);
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: expect.objectContaining({ isRevoked: true }),
        })
      );

      // Simulate replay of the already-revoked token
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt-1',
        userId: driver.id,
        userType: 'DRIVER',
        driverId: driver.id,
        tokenHash,
        familyId: 'fam-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(driverAuthService.refresh(rawToken)).rejects.toThrow(/security violation/i);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: 'fam-1', isRevoked: false } })
      );
    });
  });

  describe('authenticateDriver Middleware', () => {
    function createMockRes() {
      const res: any = { locals: {}, statusCode: 200, body: null };
      res.status = vi.fn((code: number) => {
        res.statusCode = code;
        return res;
      });
      res.json = vi.fn((payload: any) => {
        res.body = payload;
        return res;
      });
      return res;
    }

    it('rejects passenger tokens and suspended drivers, and allows active approved drivers', async () => {
      const passengerToken = jwt.sign({ sub: 'p-1', role: 'PASSENGER' }, env.JWT_ACCESS_SECRET, {
        expiresIn: '15m',
      });
      const res1 = createMockRes();
      await authenticateDriver(
        { headers: { authorization: `Bearer ${passengerToken}` } } as any,
        res1,
        vi.fn()
      );
      expect(res1.statusCode).toBe(401);

      const driverToken = jwt.sign(
        { sub: 'drv-1', role: 'DRIVER', tokenType: 'access' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m', issuer: DRIVER_TOKEN_ISSUER, audience: DRIVER_TOKEN_AUDIENCE }
      );

      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'drv-1',
        accountStatus: 'SUSPENDED',
        verificationStatus: 'SUSPENDED',
      });
      const res2 = createMockRes();
      await authenticateDriver(
        { headers: { authorization: `Bearer ${driverToken}` } } as any,
        res2,
        vi.fn()
      );
      expect(res2.statusCode).toBe(403);

      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'drv-1',
        accountStatus: 'ACTIVE',
        verificationStatus: 'APPROVED',
      });
      const res3 = createMockRes();
      const next3 = vi.fn();
      await authenticateDriver(
        { headers: { authorization: `Bearer ${driverToken}` } } as any,
        res3,
        next3
      );
      expect(next3).toHaveBeenCalledTimes(1);
    });
  });

  describe('Driver Forgot Password OTP & Reset Flow', () => {
    it('returns generic message for unknown email and dispatches hashed OTP for eligible driver', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce(null);
      const unknownRes = await driverAuthService.forgotPassword('nobody@kingstaxi.et');
      expect(unknownRes.message).toMatch(/if an eligible account exists/i);
      expect(mockSendOtpEmail).not.toHaveBeenCalled();

      const driver = await makeDriver();
      mockPrisma.driver.findFirst.mockResolvedValueOnce(driver);
      mockPrisma.driverPasswordReset.findFirst.mockResolvedValueOnce(null);
      mockPrisma.driverPasswordReset.updateMany.mockResolvedValueOnce({ count: 0 });
      let storedOtpHash = '';
      mockPrisma.driverPasswordReset.create.mockImplementationOnce(async ({ data }: any) => {
        storedOtpHash = data.otpHash;
        return data;
      });

      const knownRes = await driverAuthService.forgotPassword('abebe.driver@kingstaxi.et');
      expect(knownRes.message).toMatch(/if an eligible account exists/i);
      expect(mockSendOtpEmail).toHaveBeenCalledTimes(1);
      const sentOtp = mockSendOtpEmail.mock.calls[0][0].otp;
      expect(sentOtp).toMatch(/^\d{6}$/);
      expect(storedOtpHash).not.toContain(sentOtp);
      expect(await verifyDriverPassword(sentOtp, storedOtpHash)).toBe(true);
    });

    it('verifies OTP, issues single-use resetToken, updates passwordHash, and revokes sessions', async () => {
      const driver = await makeDriver({ mustChangePassword: true });
      const otpHash = await hashDriverPassword('654321');
      const sessionId = 'reset-sess-1';

      mockPrisma.driverPasswordReset.findFirst.mockResolvedValueOnce({
        id: sessionId,
        driverId: driver.id,
        email: driver.email,
        otpHash,
        expiresAt: new Date(Date.now() + 300000),
        attempts: 0,
        maxAttempts: 5,
        isVerified: false,
        isConsumed: false,
      });

      let storedResetTokenHash = '';
      mockPrisma.driverPasswordReset.update.mockImplementationOnce(async ({ data }: any) => {
        storedResetTokenHash = data.resetTokenHash;
        return {};
      });

      const verifyRes = await driverAuthService.verifyResetOtp('abebe.driver@kingstaxi.et', '654321');
      expect(verifyRes.resetToken).toBeTruthy();
      expect(storedResetTokenHash).toBe(
        crypto.createHash('sha256').update(verifyRes.resetToken).digest('hex')
      );

      // Reset password consumes token, updates passwordHash, clears mustChangePassword, revokes refresh tokens
      mockPrisma.driverPasswordReset.findFirst.mockResolvedValueOnce({
        id: sessionId,
        driverId: driver.id,
        driver,
        resetTokenHash: storedResetTokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 300000),
        isVerified: true,
        isConsumed: false,
      });

      let updatedDriverData: any = null;
      mockPrisma.driver.update.mockImplementationOnce(async ({ data }: any) => {
        updatedDriverData = data;
        return { ...driver, ...data };
      });
      mockPrisma.driverPasswordReset.update.mockResolvedValueOnce({});
      mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 });

      await driverAuthService.resetPassword(verifyRes.resetToken, 'NewDriverPass1');

      expect(updatedDriverData.mustChangePassword).toBe(false);
      expect(updatedDriverData.onboardingStatus).toBe('ACTIVE');
      expect(await verifyDriverPassword('NewDriverPass1', updatedDriverData.passwordHash)).toBe(true);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverId: driver.id, userType: 'DRIVER', isRevoked: false },
          data: expect.objectContaining({ isRevoked: true }),
        })
      );

      // Reset token cannot be reused
      mockPrisma.driverPasswordReset.findFirst.mockResolvedValueOnce(null);
      await expect(
        driverAuthService.resetPassword(verifyRes.resetToken, 'AnotherPass1')
      ).rejects.toThrow(/invalid or expired password reset token/i);
    });
  });
});
