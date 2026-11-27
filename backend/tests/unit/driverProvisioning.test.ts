import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const { mockPrisma, mockSendDriverOnboardingEmail, mockAuditRecord } = vi.hoisted(() => {
  const mock: any = {
    driver: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    driverDocument: {
      create: vi.fn(),
    },
    driverStatusHistory: {
      create: vi.fn(),
    },
    trip: {
      count: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));

  return {
    mockPrisma: mock,
    mockSendDriverOnboardingEmail: vi.fn(),
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
      sendDriverOnboardingEmail: mockSendDriverOnboardingEmail,
    }),
  },
}));

import {
  generateSecureTemporaryPassword,
  hashDriverPassword,
  verifyDriverPassword,
} from '../../src/utils/driverPassword';
import { adminDriverService } from '../../src/modules/drivers/adminDriver.service';
import { authenticateToken, requireRole } from '../../src/core/middleware/auth.middleware';
import { env } from '../../src/config/env';

function buildBaseDriverRecord(overrides: Record<string, any> = {}) {
  const now = new Date();
  return {
    id: '11111111-1111-4111-8111-111111111111',
    fullName: 'Abebe Kebede',
    email: 'abebe.driver@kingstaxi.et',
    phoneNumber: '+251911223344',
    passwordHash: 'storedhash:storedsalt',
    profileImage: null,
    accountStatus: 'PENDING_VERIFICATION',
    verificationStatus: 'PENDING',
    availabilityStatus: 'OFFLINE',
    mustChangePassword: true,
    onboardingStatus: 'PENDING_ONBOARDING',
    onboardingEmailStatus: 'PENDING',
    onboardingEmailSentAt: null,
    onboardingEmailLastAttemptAt: now,
    onboardingEmailError: null,
    tempPasswordExpiresAt: new Date(Date.now() + 7 * 86400000),
    accountProvisionedAt: now,
    accountActivatedAt: null,
    provisionedBy: 'admin@kingstaxi.et',
    idempotencyKey: null,
    city: 'Gondar',
    address: null,
    licenseNumber: 'ET-AMH-DL-1001',
    licenseExpiry: null,
    dateOfBirth: null,
    gender: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelationship: null,
    rejectionReason: null,
    suspensionReason: null,
    rating: 5.0,
    totalTrips: 0,
    vehicles: [],
    vehicleAssignments: [],
    documents: [],
    statusHistory: [],
    trips: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe('Driver Account Provisioning & Automatic Password Email Delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));
    mockPrisma.trip.count.mockResolvedValue(0);
    mockAuditRecord.mockResolvedValue(undefined);
  });

  describe('Secure Password Generation & Scrypt Hashing', () => {
    it('generates unique 12+ character temporary passwords with upper, lower, digit, and symbol', () => {
      const p1 = generateSecureTemporaryPassword(12);
      const p2 = generateSecureTemporaryPassword(12);
      expect(p1).toHaveLength(12);
      expect(p2).toHaveLength(12);
      expect(p1).not.toBe(p2);
      expect(/[A-Z]/.test(p1)).toBe(true);
      expect(/[a-z]/.test(p1)).toBe(true);
      expect(/[0-9]/.test(p1)).toBe(true);
      expect(/[@#$%&*!?]/.test(p1)).toBe(true);
    });

    it('hashes with random salt using scrypt and verifies with timingSafeEqual', async () => {
      const plain = generateSecureTemporaryPassword();
      const stored = await hashDriverPassword(plain);
      expect(stored).not.toContain(plain);
      expect(stored.split(':')).toHaveLength(2);
      expect(await verifyDriverPassword(plain, stored)).toBe(true);
      expect(await verifyDriverPassword('WrongPass!99', stored)).toBe(false);
    });
  });

  describe('AdminDriverService.createDriver provisioning', () => {
    it('creates driver, hashes temp password, sends onboarding email, and omits password from response & audit logs', async () => {
      let persistedCreateData: any = null;
      const base = buildBaseDriverRecord({
        onboardingStatus: 'ONBOARDING_EMAIL_SENT',
        onboardingEmailStatus: 'SENT',
        onboardingEmailSentAt: new Date(),
      });

      mockPrisma.driver.findUnique
        .mockResolvedValueOnce(null) // idempotencyKey
        .mockResolvedValueOnce(null) // phone
        .mockResolvedValueOnce(null); // email
      mockPrisma.driver.create.mockImplementation(async ({ data }: any) => {
        persistedCreateData = data;
        return { ...base, ...data };
      });
      mockPrisma.driverStatusHistory.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue(base);
      mockPrisma.driver.findFirst.mockResolvedValue(base);
      mockSendDriverOnboardingEmail.mockResolvedValue({ success: true, provider: 'Brevo HTTPS API' });

      const result: any = await adminDriverService.createDriver(
        {
          fullName: 'Abebe Kebede',
          phone: '0911223344',
          email: 'Abebe.Driver@KingsTaxi.et',
          licenseNumber: 'ET-AMH-DL-1001',
          city: 'Gondar',
          idempotencyKey: 'idem-create-1',
        },
        'superadmin@kingstaxi.et',
        { actorId: 'admin-1', ipAddress: '127.0.0.1' }
      );

      expect(persistedCreateData).toBeTruthy();
      expect(persistedCreateData.mustChangePassword).toBe(true);
      expect(persistedCreateData.email).toBe('abebe.driver@kingstaxi.et');
      expect(persistedCreateData.phoneNumber).toBe('+251911223344');
      expect(persistedCreateData.passwordHash).toContain(':');

      // Onboarding email received the plaintext temporary password
      expect(mockSendDriverOnboardingEmail).toHaveBeenCalledTimes(1);
      const emailArgs = mockSendDriverOnboardingEmail.mock.calls[0][0];
      expect(emailArgs.to).toBe('abebe.driver@kingstaxi.et');
      expect(emailArgs.temporaryPassword).toHaveLength(12);
      expect(persistedCreateData.passwordHash).not.toContain(emailArgs.temporaryPassword);
      expect(await verifyDriverPassword(emailArgs.temporaryPassword, persistedCreateData.passwordHash)).toBe(true);

      // Response never leaks password or passwordHash
      const serializedResult = JSON.stringify(result);
      expect(serializedResult).not.toContain(emailArgs.temporaryPassword);
      expect(serializedResult).not.toContain(persistedCreateData.passwordHash);
      expect(result.passwordHash).toBeUndefined();
      expect(result.provisioning.emailSent).toBe(true);

      // Audit logs never contain password or hash
      expect(mockAuditRecord).toHaveBeenCalled();
      const serializedAudits = JSON.stringify(mockAuditRecord.mock.calls);
      expect(serializedAudits).not.toContain(emailArgs.temporaryPassword);
      expect(serializedAudits).not.toContain(persistedCreateData.passwordHash);
    });

    it('rejects duplicate phone numbers with 409', async () => {
      mockPrisma.driver.findUnique.mockResolvedValueOnce(buildBaseDriverRecord());
      await expect(
        adminDriverService.createDriver(
          { fullName: 'Dup', phone: '+251911223344', email: 'new@kingstaxi.et' },
          'superadmin@kingstaxi.et'
        )
      ).rejects.toThrow(/phone number is already registered/i);
      expect(mockPrisma.driver.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate email addresses with 409', async () => {
      mockPrisma.driver.findUnique
        .mockResolvedValueOnce(null) // phone
        .mockResolvedValueOnce(buildBaseDriverRecord()); // email
      await expect(
        adminDriverService.createDriver(
          { fullName: 'Dup', phone: '+251911998877', email: 'abebe.driver@kingstaxi.et' },
          'superadmin@kingstaxi.et'
        )
      ).rejects.toThrow(/email address is already registered/i);
      expect(mockPrisma.driver.create).not.toHaveBeenCalled();
    });

    it('deduplicates repeated Save Profile clicks via idempotencyKey', async () => {
      const existing = buildBaseDriverRecord({
        idempotencyKey: 'idem-dup-click',
        onboardingStatus: 'ONBOARDING_EMAIL_SENT',
        onboardingEmailStatus: 'SENT',
      });
      mockPrisma.driver.findUnique.mockResolvedValueOnce(existing);
      mockPrisma.driver.findFirst.mockResolvedValueOnce(existing);

      const res: any = await adminDriverService.createDriver(
        {
          fullName: 'Abebe Kebede',
          phone: '+251911223344',
          email: 'abebe.driver@kingstaxi.et',
          idempotencyKey: 'idem-dup-click',
        },
        'superadmin@kingstaxi.et'
      );

      expect(res.provisioning.deduplicated).toBe(true);
      expect(mockPrisma.driver.create).not.toHaveBeenCalled();
      expect(mockSendDriverOnboardingEmail).not.toHaveBeenCalled();
    });

    it('preserves created driver and marks email FAILED when provider rejects delivery', async () => {
      const failedRecord = buildBaseDriverRecord({
        onboardingStatus: 'ONBOARDING_EMAIL_FAILED',
        onboardingEmailStatus: 'FAILED',
        onboardingEmailError: 'SMTP connection refused',
      });

      mockPrisma.driver.findUnique.mockResolvedValue(null);
      mockPrisma.driver.create.mockResolvedValue(failedRecord);
      mockPrisma.driverStatusHistory.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue(failedRecord);
      mockPrisma.driver.findFirst.mockResolvedValue(failedRecord);
      mockSendDriverOnboardingEmail.mockResolvedValue({
        success: false,
        error: 'SMTP connection refused',
      });

      const res: any = await adminDriverService.createDriver(
        {
          fullName: 'Abebe Kebede',
          phone: '+251911223344',
          email: 'abebe.driver@kingstaxi.et',
        },
        'superadmin@kingstaxi.et'
      );

      expect(res.provisioning.emailSent).toBe(false);
      expect(res.provisioning.onboardingEmailStatus).toBe('FAILED');
      expect(res.provisioning.error).toBe('SMTP connection refused');
    });
  });

  describe('AdminDriverService.resendDriverOnboarding', () => {
    it('regenerates temporary password, invalidates old hash, and sends email', async () => {
      const oldHash = await hashDriverPassword('OldTempPass!1');
      const existing = buildBaseDriverRecord({
        passwordHash: oldHash,
        mustChangePassword: true,
        onboardingStatus: 'ONBOARDING_EMAIL_FAILED',
        onboardingEmailStatus: 'FAILED',
      });

      let updatedHash = '';
      mockPrisma.driver.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, onboardingStatus: 'ONBOARDING_EMAIL_SENT', onboardingEmailStatus: 'SENT' });
      mockPrisma.driver.update.mockImplementation(async ({ data }: any) => {
        if (data.passwordHash) updatedHash = data.passwordHash;
        return { ...existing, ...data };
      });
      mockPrisma.driverStatusHistory.create.mockResolvedValue({});
      mockSendDriverOnboardingEmail.mockResolvedValue({ success: true, provider: 'Brevo HTTPS API' });

      const res: any = await adminDriverService.resendDriverOnboarding(existing.id, 'superadmin@kingstaxi.et');

      expect(res.provisioning.emailSent).toBe(true);
      expect(updatedHash).toBeTruthy();
      expect(updatedHash).not.toBe(oldHash);
      expect(await verifyDriverPassword('OldTempPass!1', updatedHash)).toBe(false);
      const sentPass = mockSendDriverOnboardingEmail.mock.calls[0][0].temporaryPassword;
      expect(await verifyDriverPassword(sentPass, updatedHash)).toBe(true);
    });

    it('refuses to reset password for an already activated driver (mustChangePassword: false)', async () => {
      const active = buildBaseDriverRecord({ mustChangePassword: false, onboardingStatus: 'ACTIVE' });
      mockPrisma.driver.findFirst.mockResolvedValueOnce(active);

      await expect(
        adminDriverService.resendDriverOnboarding(active.id, 'superadmin@kingstaxi.et')
      ).rejects.toThrow(/already activated/i);
      expect(mockSendDriverOnboardingEmail).not.toHaveBeenCalled();
    });
  });

  describe('Admin RBAC & Route Protection', () => {
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

    it('rejects unauthenticated and PASSENGER/DRIVER tokens on admin driver endpoints', () => {
      const next = vi.fn();
      const unauthRes = createMockRes();
      authenticateToken({ headers: {}, query: {} } as any, unauthRes, next);
      expect(unauthRes.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();

      const adminGuard = requireRole(['ADMIN', 'SUPER_ADMIN']);

      const passengerToken = jwt.sign({ sub: 'p-1', role: 'PASSENGER' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      const passengerReq: any = { headers: { authorization: `Bearer ${passengerToken}` }, query: {} };
      const passengerRes = createMockRes();
      const passengerNext = vi.fn();
      authenticateToken(passengerReq, passengerRes, passengerNext);
      expect(passengerNext).toHaveBeenCalled();
      adminGuard(passengerReq, passengerRes, vi.fn());
      expect(passengerRes.statusCode).toBe(403);

      const driverToken = jwt.sign({ sub: 'd-1', role: 'DRIVER' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      const driverReq: any = { headers: { authorization: `Bearer ${driverToken}` }, query: {} };
      const driverRes = createMockRes();
      const driverNext = vi.fn();
      authenticateToken(driverReq, driverRes, driverNext);
      expect(driverNext).toHaveBeenCalled();
      adminGuard(driverReq, driverRes, vi.fn());
      expect(driverRes.statusCode).toBe(403);

      const adminToken = jwt.sign({ sub: 'a-1', role: 'SUPER_ADMIN' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      const adminReq: any = { headers: { authorization: `Bearer ${adminToken}` }, query: {} };
      const adminRes = createMockRes();
      const adminAuthNext = vi.fn();
      const adminRoleNext = vi.fn();
      authenticateToken(adminReq, adminRes, adminAuthNext);
      expect(adminAuthNext).toHaveBeenCalled();
      adminGuard(adminReq, adminRes, adminRoleNext);
      expect(adminRoleNext).toHaveBeenCalled();
    });
  });
});
