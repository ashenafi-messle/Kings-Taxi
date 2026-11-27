import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  AccountStatus,
  ActorType,
  DriverOnboardingStatus,
  DriverVerificationStatus,
  UserRoleType,
} from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/appError';
import { auditService } from '../../core/audit/audit.service';
import {
  DRIVER_TOKEN_AUDIENCE,
  DRIVER_TOKEN_ISSUER,
} from '../../core/middleware/auth.middleware';
import { EmailService } from '../../integrations/email/email.service';
import {
  hashDriverPassword,
  verifyDriverPassword,
} from '../../utils/driverPassword';
import { normalizeEthiopianPhone } from '../../utils/phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 7;
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const RESET_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes
const DUMMY_HASH =
  '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000:00000000000000000000000000000000';

export interface DriverRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface SanitizedDriverProfile {
  id: string;
  driverCode: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  city: string;
  accountStatus: AccountStatus;
  verificationStatus: DriverVerificationStatus;
  availabilityStatus: string;
  mustChangePassword: boolean;
  rating: number;
  totalTrips: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    serviceTier: string;
  } | null;
  license: {
    licenseNumber: string;
    expiryDate: string;
    issuingAuthority: string;
  };
}

function sha256Hex(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function validateNewPasswordPolicy(password: string): void {
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AppError(
      'Password must include at least one uppercase letter, one lowercase letter, and one number.',
      400,
      'WEAK_PASSWORD'
    );
  }
}

export class DriverAuthService {
  private sanitizeDriver(driver: any): SanitizedDriverProfile {
    const activeAssignment = driver.vehicleAssignments?.[0]?.vehicle;
    const activeVehicle = activeAssignment || driver.vehicles?.[0] || null;

    return {
      id: driver.id,
      driverCode: `DRV-${String(driver.id).slice(0, 6).toUpperCase()}`,
      fullName: driver.fullName,
      email: driver.email || '',
      phone: driver.phoneNumber,
      avatarUrl: driver.profileImage || null,
      city: driver.city || 'Gondar',
      accountStatus: driver.accountStatus,
      verificationStatus: driver.verificationStatus,
      availabilityStatus: driver.availabilityStatus,
      mustChangePassword: Boolean(driver.mustChangePassword),
      rating: typeof driver.rating === 'number' ? driver.rating : 5.0,
      totalTrips: typeof driver.totalTrips === 'number' ? driver.totalTrips : 0,
      vehicle: activeVehicle
        ? {
            make: activeVehicle.make || 'Toyota',
            model: activeVehicle.vehicleModel || 'Sedan',
            year: activeVehicle.manufacturingYear || 2022,
            color: activeVehicle.vehicleColor || 'Silver',
            plateNumber: activeVehicle.plateNumber,
            serviceTier: activeVehicle.categoryName || activeVehicle.vehicleType || 'Standard',
          }
        : null,
      license: {
        licenseNumber: driver.licenseNumber || 'Pending',
        expiryDate: driver.licenseExpiry
          ? new Date(driver.licenseExpiry).toISOString().split('T')[0]
          : 'N/A',
        issuingAuthority: 'Ethiopian Transport Authority',
      },
    };
  }

  private assertDriverEligible(driver: any): void {
    if (driver.deletedAt || driver.accountStatus === AccountStatus.DELETED) {
      throw new AppError('Invalid email/phone or password.', 401, 'INVALID_CREDENTIALS');
    }
    if (
      driver.accountStatus === AccountStatus.SUSPENDED ||
      driver.verificationStatus === DriverVerificationStatus.SUSPENDED
    ) {
      throw new AppError(
        'Your driver account has been suspended. Please contact Kings Taxi administration.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }
    if (driver.verificationStatus === DriverVerificationStatus.REJECTED) {
      throw new AppError(
        'Your driver verification was not approved. Please contact Kings Taxi administration.',
        403,
        'ACCOUNT_REJECTED'
      );
    }
    if (
      driver.accountStatus !== AccountStatus.ACTIVE ||
      driver.verificationStatus !== DriverVerificationStatus.APPROVED
    ) {
      throw new AppError(
        'Your driver account is pending administrator approval. You can sign in once approved.',
        403,
        'ACCOUNT_PENDING_APPROVAL'
      );
    }
  }

  private signDriverAccessToken(driver: any, sessionId: string): string {
    return jwt.sign(
      {
        sub: driver.id,
        role: 'DRIVER',
        tokenType: 'access',
        sessionId,
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        issuer: DRIVER_TOKEN_ISSUER,
        audience: DRIVER_TOKEN_AUDIENCE,
      }
    );
  }

  private async findDriverWithVehicleById(driverId: string) {
    return prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      include: {
        vehicles: { where: { isActive: true }, take: 1 },
        vehicleAssignments: {
          where: { isActive: true },
          include: { vehicle: true },
          take: 1,
        },
      },
    });
  }

  async login(
    identifier: string,
    password: string,
    context: DriverRequestContext = {}
  ) {
    const trimmedId = (identifier || '').trim();
    if (!trimmedId || !password) {
      throw new AppError('Email/phone number and password are required.', 400, 'VALIDATION_ERROR');
    }

    const isEmail = trimmedId.includes('@');
    let whereClause: any;
    if (isEmail) {
      const cleanEmail = trimmedId.toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail)) {
        throw new AppError('Please enter a valid email address or phone number.', 400, 'VALIDATION_ERROR');
      }
      whereClause = { email: cleanEmail, deletedAt: null };
    } else {
      const phoneRes = normalizeEthiopianPhone(trimmedId);
      if (!phoneRes.isValid) {
        throw new AppError('Invalid email/phone or password.', 401, 'INVALID_CREDENTIALS');
      }
      whereClause = { phoneNumber: phoneRes.normalized, deletedAt: null };
    }

    const driver = await prisma.driver.findFirst({
      where: whereClause,
      include: {
        vehicles: { where: { isActive: true }, take: 1 },
        vehicleAssignments: {
          where: { isActive: true },
          include: { vehicle: true },
          take: 1,
        },
      },
    });

    // Always run scrypt verification to prevent timing-based account enumeration
    const hashToCheck = driver?.passwordHash || DUMMY_HASH;
    const passwordMatches = await verifyDriverPassword(password, hashToCheck);

    if (!driver || !passwordMatches) {
      if (driver) {
        await auditService.record({
          actorId: driver.id,
          actorType: ActorType.DRIVER,
          action: 'DRIVER_LOGIN_FAILED',
          entityType: 'DRIVER',
          entityId: driver.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { reason: 'INVALID_PASSWORD' },
        });
      }
      throw new AppError('Invalid email/phone or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Enforce account activation, approval, and suspension status AFTER password verification
    this.assertDriverEligible(driver);

    if (
      driver.mustChangePassword &&
      driver.tempPasswordExpiresAt &&
      new Date(driver.tempPasswordExpiresAt).getTime() < Date.now()
    ) {
      throw new AppError(
        'Your temporary onboarding password has expired. Please use Forgot Password or ask an administrator to resend onboarding credentials.',
        403,
        'TEMP_CREDENTIAL_EXPIRED'
      );
    }

    const now = new Date();
    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = sha256Hex(rawRefreshToken);
    const familyId = `fam_drv_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const sessionId = crypto.randomUUID();
    const refreshExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({
        data: {
          id: sessionId,
          userId: driver.id,
          userType: UserRoleType.DRIVER,
          driverId: driver.id,
          tokenHash: refreshTokenHash,
          familyId,
          expiresAt: refreshExpiresAt,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: {
          lastLoginAt: now,
          ...(driver.accountActivatedAt ? {} : { accountActivatedAt: now }),
        },
      });
    });

    await auditService.record({
      actorId: driver.id,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_LOGIN_SUCCESS',
      entityType: 'DRIVER',
      entityId: driver.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { channel: isEmail ? 'EMAIL' : 'PHONE' },
    });

    const accessToken = this.signDriverAccessToken(driver, sessionId);

    return {
      driver: this.sanitizeDriver(driver),
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async refresh(rawRefreshToken: string, context: DriverRequestContext = {}) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new AppError('Refresh token is required.', 400, 'VALIDATION_ERROR');
    }

    const tokenHash = sha256Hex(rawRefreshToken.trim());
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.userType !== UserRoleType.DRIVER || !stored.driverId) {
      throw new AppError('Invalid or unrecognized refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (stored.isRevoked) {
      // Token reuse detected: revoke the entire token family immediately
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      await auditService.record({
        actorId: stored.driverId,
        actorType: ActorType.DRIVER,
        action: 'DRIVER_REFRESH_TOKEN_REUSE_DETECTED',
        entityType: 'DRIVER',
        entityId: stored.driverId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { familyId: stored.familyId },
      });
      throw new AppError(
        'Session security violation detected. Please sign in again.',
        401,
        'TOKEN_REUSE_DETECTED'
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new AppError('Refresh token has expired. Please sign in again.', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    const driver = await this.findDriverWithVehicleById(stored.driverId);
    if (!driver) {
      throw new AppError('Driver account not found.', 401, 'UNAUTHORIZED');
    }
    this.assertDriverEligible(driver);

    const now = new Date();
    const newRawRefreshToken = crypto.randomBytes(48).toString('hex');
    const newTokenHash = sha256Hex(newRawRefreshToken);
    const newSessionId = crypto.randomUUID();
    const newExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true, revokedAt: now },
      });
      await tx.refreshToken.create({
        data: {
          id: newSessionId,
          userId: driver.id,
          userType: UserRoleType.DRIVER,
          driverId: driver.id,
          tokenHash: newTokenHash,
          familyId: stored.familyId,
          expiresAt: newExpiresAt,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    const accessToken = this.signDriverAccessToken(driver, newSessionId);

    return {
      driver: this.sanitizeDriver(driver),
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async logout(
    driverId: string,
    rawRefreshToken?: string,
    logoutAll = false,
    context: DriverRequestContext = {}
  ): Promise<void> {
    const now = new Date();
    if (logoutAll || !rawRefreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          driverId,
          userType: UserRoleType.DRIVER,
          isRevoked: false,
        },
        data: { isRevoked: true, revokedAt: now },
      });
    } else {
      const tokenHash = sha256Hex(rawRefreshToken.trim());
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          driverId,
          userType: UserRoleType.DRIVER,
          isRevoked: false,
        },
        data: { isRevoked: true, revokedAt: now },
      });
    }

    await auditService.record({
      actorId: driverId,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_LOGOUT',
      entityType: 'DRIVER',
      entityId: driverId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { logoutAll: Boolean(logoutAll) },
    });
  }

  async getCurrentDriver(driverId: string): Promise<SanitizedDriverProfile> {
    const driver = await this.findDriverWithVehicleById(driverId);
    if (!driver) {
      throw new AppError('Driver not found.', 404, 'NOT_FOUND');
    }
    this.assertDriverEligible(driver);
    return this.sanitizeDriver(driver);
  }

  /**
   * Forgot Password Step 1: Request 6-digit OTP to registered email.
   * Always returns a generic success message to prevent email enumeration.
   */
  async forgotPassword(email: string, context: DriverRequestContext = {}) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      throw new AppError('Please provide a valid email address.', 400, 'VALIDATION_ERROR');
    }

    const genericResponse = {
      message: 'If an eligible account exists, a verification code will be sent.',
    };

    const driver = await prisma.driver.findFirst({
      where: { email: cleanEmail, deletedAt: null },
    });

    if (
      !driver ||
      driver.accountStatus === AccountStatus.SUSPENDED ||
      driver.accountStatus === AccountStatus.DELETED ||
      driver.verificationStatus === DriverVerificationStatus.SUSPENDED ||
      driver.verificationStatus === DriverVerificationStatus.REJECTED
    ) {
      return genericResponse;
    }

    const now = new Date();
    const recentReset = await prisma.driverPasswordReset.findFirst({
      where: {
        driverId: driver.id,
        isConsumed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentReset && now.getTime() < recentReset.resendCooldownUntil.getTime()) {
      // Do not leak cooldown timing differences externally; silently honor cooldown
      return genericResponse;
    }

    // Invalidate prior unconsumed reset OTPs for this driver
    await prisma.driverPasswordReset.updateMany({
      where: { driverId: driver.id, isConsumed: false },
      data: { isConsumed: true, consumedAt: now },
    });

    const rawOtp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = await hashDriverPassword(rawOtp);
    const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
    const resendCooldownUntil = new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);

    await prisma.driverPasswordReset.create({
      data: {
        driverId: driver.id,
        email: cleanEmail,
        otpHash,
        salt,
        expiresAt,
        maxAttempts: 5,
        resendCooldownUntil,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    await EmailService.getInstance()
      .sendDriverPasswordResetOtpEmail({
        to: cleanEmail,
        driverName: driver.fullName,
        otp: rawOtp,
        expiresInMinutes: 10,
      })
      .catch(() => ({ success: false }));

    await auditService.record({
      actorId: driver.id,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_PASSWORD_RESET_REQUESTED',
      entityType: 'DRIVER',
      entityId: driver.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { channel: 'EMAIL' },
    });

    return genericResponse;
  }

  /**
   * Forgot Password Step 2: Verify 6-digit OTP and issue single-use scoped resetToken.
   */
  async verifyResetOtp(
    email: string,
    otp: string,
    context: DriverRequestContext = {}
  ) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!EMAIL_REGEX.test(cleanEmail) || !/^\d{6}$/.test(cleanOtp)) {
      throw new AppError('Invalid email or 6-digit verification code.', 400, 'INVALID_OTP');
    }

    const session = await prisma.driverPasswordReset.findFirst({
      where: {
        email: cleanEmail,
        isConsumed: false,
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new AppError('Invalid or expired verification code.', 400, 'INVALID_OTP');
    }

    const now = new Date();
    if (session.expiresAt.getTime() <= now.getTime()) {
      await prisma.driverPasswordReset.update({
        where: { id: session.id },
        data: { isConsumed: true, consumedAt: now },
      });
      throw new AppError('Verification code has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    if (session.attempts >= session.maxAttempts) {
      await prisma.driverPasswordReset.update({
        where: { id: session.id },
        data: { isConsumed: true, consumedAt: now },
      });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 429, 'OTP_MAX_ATTEMPTS');
    }

    const matches = await verifyDriverPassword(cleanOtp, session.otpHash);
    if (!matches) {
      const nextAttempts = session.attempts + 1;
      const exhausted = nextAttempts >= session.maxAttempts;
      await prisma.driverPasswordReset.update({
        where: { id: session.id },
        data: {
          attempts: nextAttempts,
          ...(exhausted ? { isConsumed: true, consumedAt: now } : {}),
        },
      });
      throw new AppError(
        exhausted
          ? 'Maximum verification attempts exceeded. Please request a new code.'
          : 'Invalid verification code.',
        exhausted ? 429 : 400,
        exhausted ? 'OTP_MAX_ATTEMPTS' : 'INVALID_OTP'
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = sha256Hex(resetToken);
    const resetTokenExpiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_SECONDS * 1000);

    await prisma.driverPasswordReset.update({
      where: { id: session.id },
      data: {
        isVerified: true,
        verifiedAt: now,
        resetTokenHash,
        resetTokenExpiresAt,
      },
    });

    await auditService.record({
      actorId: session.driverId,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_PASSWORD_RESET_OTP_VERIFIED',
      entityType: 'DRIVER',
      entityId: session.driverId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {},
    });

    return {
      resetToken,
      expiresInSeconds: RESET_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * Forgot Password Step 3: Consume single-use resetToken, update passwordHash,
   * clear mustChangePassword, and revoke all existing driver refresh sessions.
   */
  async resetPassword(
    resetToken: string,
    newPassword: string,
    context: DriverRequestContext = {}
  ): Promise<void> {
    if (!resetToken || typeof resetToken !== 'string' || resetToken.trim().length < 32) {
      throw new AppError('Invalid or expired password reset token.', 400, 'INVALID_RESET_TOKEN');
    }

    validateNewPasswordPolicy(newPassword);

    const tokenHash = sha256Hex(resetToken.trim());
    const session = await prisma.driverPasswordReset.findFirst({
      where: {
        resetTokenHash: tokenHash,
        isVerified: true,
        isConsumed: false,
      },
      include: { driver: true },
    });

    if (
      !session ||
      !session.resetTokenExpiresAt ||
      session.resetTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new AppError('Invalid or expired password reset token.', 400, 'INVALID_RESET_TOKEN');
    }

    const newPasswordHash = await hashDriverPassword(newPassword);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { id: session.driverId },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          onboardingStatus: DriverOnboardingStatus.ACTIVE,
          ...(session.driver.accountActivatedAt ? {} : { accountActivatedAt: now }),
        },
      });

      await tx.driverPasswordReset.update({
        where: { id: session.id },
        data: { isConsumed: true, consumedAt: now },
      });

      // Revoke all active driver sessions so stolen/old tokens cannot persist
      await tx.refreshToken.updateMany({
        where: {
          driverId: session.driverId,
          userType: UserRoleType.DRIVER,
          isRevoked: false,
        },
        data: { isRevoked: true, revokedAt: now },
      });
    });

    if (session.driver?.email) {
      await EmailService.getInstance()
        .sendSecurityAlert(
          session.driver.email,
          'Driver Account Password Changed',
          'Your Kings Taxi Driver account password was successfully reset. All prior sessions have been signed out.'
        )
        .catch(() => false);
    }

    await auditService.record({
      actorId: session.driverId,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_PASSWORD_RESET_COMPLETED',
      entityType: 'DRIVER',
      entityId: session.driverId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {},
    });
  }
}

export const driverAuthService = new DriverAuthService();
