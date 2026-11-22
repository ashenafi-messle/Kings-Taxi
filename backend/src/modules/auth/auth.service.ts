import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AccountStatus } from '@prisma/client';
import { prisma, isDbConnectionError } from '../../core/database/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { EmailService } from '../../integrations/email/email.service';
import { TelegramService } from '../../integrations/telegram/telegram.service';
import { TelegramIdentityStore } from '../../integrations/telegram/telegramIdentity.store';
import { normalizeEthiopianPhone } from '../../utils/phone';
import { adminAuthService } from './adminAuth.service';

export type RegistrationMethod = 'email' | 'telegram';

export interface RegistrationSessionData {
  sessionId: string;
  method: RegistrationMethod;
  identifier: string;
  fullName: string;
  otpHash: string;
  sessionSalt: string;
  plainOtp?: string;
  telegramChatId?: string;
  telegramTokenHash?: string;
  telegramTokenExpiresAt?: number;
  telegramTokenUsed?: boolean;
  otpExpiresAt: number;
  attempts: number;
  maxAttempts: number;
  resendCooldownUntil: number;
  isVerified: boolean;
  registrationToken: string | null;
  createdAt: number;
}

export interface PasswordRecoverySessionData {
  sessionId: string;
  passengerId: string;
  method: RegistrationMethod;
  identifier: string;
  maskedIdentifier: string;
  fullName: string;
  otpHash: string;
  sessionSalt: string;
  plainOtp?: string;
  telegramChatId?: string;
  telegramTokenHash?: string;
  telegramTokenExpiresAt?: number;
  telegramTokenUsed?: boolean;
  otpExpiresAt: number;
  attempts: number;
  maxAttempts: number;
  resendCooldownUntil: number;
  isVerified: boolean;
  recoveryToken: string | null;
  createdAt: number;
}


// OWASP Recommended Scrypt parameters for interactive login: N=16384, r=8, p=1, keylen=64
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

function hashPasswordAsync(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

function hashPasswordSync(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64, SCRYPT_OPTIONS).toString('hex');
}

function normalizeIdentifier(identifier: string): string {
  const clean = identifier.trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }
  return clean.replace(/[^0-9]/g, '');
}

async function withDbTimeout<T>(queryPromise: Promise<T>, timeoutMs = 10000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
  });
  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// In-memory active session caches (fast access with DB persistence backup)
const activeRegSessions = new Map<string, RegistrationSessionData>();
const activeRecSessions = new Map<string, PasswordRecoverySessionData>();

// Sliding window tracker for identifier rate limiting (5 OTP requests per hour per normalized identifier)
const identifierRateLimitWindow = new Map<string, number[]>();

export function checkIdentifierRateLimit(identifier: string, maxPerHour = 5): void {
  const normalized = normalizeIdentifier(identifier);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour rolling window
  const timestamps = identifierRateLimitWindow.get(normalized) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxPerHour) {
    throw new AppError(
      'Too many verification codes requested for this destination. Please try again after 1 hour.',
      429,
      'IDENTIFIER_RATE_LIMIT_EXCEEDED'
    );
  }

  validTimestamps.push(now);
  identifierRateLimitWindow.set(normalized, validTimestamps);
}

// Clear in-memory tracker (for unit/integration testing resets)
export function resetIdentifierRateLimitTracker(): void {
  identifierRateLimitWindow.clear();
}

export function resetAuthSessions(): void {
  activeRegSessions.clear();
  activeRecSessions.clear();
}

// In-memory fallback token map for testing and database offline resilience
const inMemoryRefreshTokenMap = new Map<string, any>();

export function resetAuthTokens(): void {
  inMemoryRefreshTokenMap.clear();
}

export class AuthService {
  private emailService = EmailService.getInstance();
  private telegramService = TelegramService.getInstance();

  constructor() {
    this.telegramService.setSessionResolver(
      async (
        startParamOrPhone: string,
        chatId: string,
        userMeta?: { fromId?: string; username?: string; firstName?: string; lastName?: string }
      ) => {
        const param = (startParamOrPhone || '').trim();

        // 1. Check if startParam is a registration deep-link token (e.g. reg_<token>)
        if (param.startsWith('reg_')) {
          const rawToken = param.slice(4);
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          let targetSession: RegistrationSessionData | undefined;
          for (const s of activeRegSessions.values()) {
            if (
              (s.telegramTokenHash && s.telegramTokenHash === tokenHash) ||
              s.sessionId === param ||
              s.sessionId === rawToken
            ) {
              targetSession = s;
              break;
            }
          }

          if (targetSession) {
            if (targetSession.telegramTokenExpiresAt && Date.now() > targetSession.telegramTokenExpiresAt) {
              return { error: 'EXPIRED' };
            }
            if (targetSession.telegramTokenUsed) {
              return { error: 'TOKEN_ALREADY_USED' };
            }
            if (targetSession.isVerified) {
              return { error: 'ALREADY_VERIFIED' };
            }

            targetSession.telegramTokenUsed = true;
            targetSession.telegramChatId = chatId;

            await this.telegramService.linkPhoneToChat(
              targetSession.identifier,
              chatId,
              userMeta?.fromId,
              userMeta
            );

            if (!targetSession.plainOtp) {
              targetSession.plainOtp = this.generateOtp();
              targetSession.otpHash = this.hashOtp(targetSession.plainOtp, targetSession.sessionSalt);
              targetSession.otpExpiresAt = Date.now() + 300 * 1000;
            }

            return {
              otp: targetSession.plainOtp,
              purpose: 'REGISTRATION',
              recipientName: targetSession.fullName,
            };
          }
        }

        // 2. Check if startParam is a recovery deep-link token (e.g. rec_<token>)
        if (param.startsWith('rec_')) {
          const rawToken = param.slice(4);
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          let targetSession: PasswordRecoverySessionData | undefined;
          for (const s of activeRecSessions.values()) {
            if (
              (s.telegramTokenHash && s.telegramTokenHash === tokenHash) ||
              s.sessionId === param ||
              s.sessionId === rawToken
            ) {
              targetSession = s;
              break;
            }
          }

          if (targetSession) {
            if (targetSession.telegramTokenExpiresAt && Date.now() > targetSession.telegramTokenExpiresAt) {
              return { error: 'EXPIRED' };
            }
            if (targetSession.telegramTokenUsed) {
              return { error: 'TOKEN_ALREADY_USED' };
            }
            if (targetSession.isVerified) {
              return { error: 'ALREADY_VERIFIED' };
            }

            targetSession.telegramTokenUsed = true;
            targetSession.telegramChatId = chatId;

            await this.telegramService.linkPhoneToChat(
              targetSession.identifier,
              chatId,
              userMeta?.fromId,
              userMeta
            );

            if (!targetSession.plainOtp) {
              targetSession.plainOtp = this.generateOtp();
              targetSession.otpHash = this.hashOtp(targetSession.plainOtp, targetSession.sessionSalt);
              targetSession.otpExpiresAt = Date.now() + 300 * 1000;
            }

            return {
              otp: targetSession.plainOtp,
              purpose: 'PASSWORD_RESET',
              recipientName: targetSession.fullName,
            };
          }
        }

        // 3. Fallback: Check registration session (by sessionId or by matching phone number)
        let regSession = activeRegSessions.get(param);
        if (!regSession) {
          for (const s of activeRegSessions.values()) {
            const sNorm = normalizeEthiopianPhone(s.identifier);
            const pNorm = normalizeEthiopianPhone(param);
            if (
              (sNorm.isValid && pNorm.isValid && sNorm.normalized === pNorm.normalized) ||
              s.identifier === param
            ) {
              regSession = s;
              break;
            }
          }
        }

        if (regSession && !regSession.isVerified && Date.now() < regSession.otpExpiresAt) {
          regSession.telegramChatId = chatId;
          await this.telegramService.linkPhoneToChat(regSession.identifier, chatId, userMeta?.fromId, userMeta);
          return {
            otp: regSession.plainOtp || '',
            purpose: 'REGISTRATION',
            recipientName: regSession.fullName,
          };
        }

        // 4. Fallback: Check password recovery session (by sessionId or by matching phone number)
        let recSession = activeRecSessions.get(param);
        if (!recSession) {
          for (const s of activeRecSessions.values()) {
            const sNorm = normalizeEthiopianPhone(s.identifier);
            const pNorm = normalizeEthiopianPhone(param);
            if (
              (sNorm.isValid && pNorm.isValid && sNorm.normalized === pNorm.normalized) ||
              s.identifier === param
            ) {
              recSession = s;
              break;
            }
          }
        }

        if (recSession && !recSession.isVerified && Date.now() < recSession.otpExpiresAt) {
          recSession.telegramChatId = chatId;
          await this.telegramService.linkPhoneToChat(recSession.identifier, chatId, userMeta?.fromId, userMeta);
          return {
            otp: recSession.plainOtp || '',
            purpose: 'PASSWORD_RESET',
            recipientName: recSession.fullName,
          };
        }

        return null;
      }
    );
  }

  // ----------------------------------------------------------------------------
  // Cryptographic Utilities
  // ----------------------------------------------------------------------------

  public async hashPassword(password: string, salt: string): Promise<string> {
    return hashPasswordAsync(password, salt);
  }

  public hashPasswordSync(password: string, salt: string): string {
    return hashPasswordSync(password, salt);
  }

  public generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public async verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
    try {
      if (!storedHash || !salt) {
        return false;
      }
      const computedHash = await this.hashPassword(password, salt);
      if (computedHash.length !== storedHash.length) {
        return false;
      }
      return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
    } catch {
      return false;
    }
  }

  public hashOtp(otp: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(otp).digest('hex');
  }

  public generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  public maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      const [name, domain] = identifier.split('@');
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
      return `${maskedName}@${domain}`;
    }
    const clean = identifier.replace(/\s+/g, '');
    if (clean.length > 5) {
      return `${clean.slice(0, 4)}***${clean.slice(-2)}`;
    }
    return '***';
  }

  // ----------------------------------------------------------------------------
  // Token Generation & Lifecycle
  // ----------------------------------------------------------------------------

  public generateAccessToken(passenger: { id: string; email?: string | null; phoneNumber?: string | null }): string {
    return jwt.sign(
      {
        sub: passenger.id,
        role: 'PASSENGER',
        email: passenger.email || undefined,
        phone: passenger.phoneNumber || undefined,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.ACCESS_TOKEN_EXPIRY as any }
    );
  }

  public async createRefreshToken(
    passengerId: string,
    familyId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const rawToken = `rt_${Date.now()}_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenFamily = familyId || `fam_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const id = crypto.randomUUID();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await withDbTimeout(
        prisma.refreshToken.create({
          data: {
            id,
            userId: passengerId,
            userType: 'PASSENGER',
            tokenHash,
            familyId: tokenFamily,
            expiresAt,
            ipAddress,
            userAgent,
            passengerId,
          },
        })
      );
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        inMemoryRefreshTokenMap.set(tokenHash, {
          id,
          userId: passengerId,
          userType: 'PASSENGER',
          tokenHash,
          familyId: tokenFamily,
          expiresAt,
          ipAddress,
          userAgent,
          passengerId,
          isRevoked: false,
          revokedAt: null,
          createdAt: new Date(),
        });
        return rawToken;
      }
      logger.error({ err, passengerId }, '[AuthService] Database error persisting refresh token');
      throw new AppError('Session persistence unavailable. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
    }

    return rawToken;
  }

  public formatPassengerProfile(passenger: any) {
    return {
      id: passenger.id,
      fullName: passenger.fullName,
      email: passenger.email || undefined,
      phone: passenger.phoneNumber || passenger.phone || undefined,
      phoneNumber: passenger.phoneNumber || passenger.phone || undefined,
      avatarUrl: passenger.profileImage || passenger.avatarUrl || undefined,
      profileImage: passenger.profileImage || passenger.avatarUrl || undefined,
      city: passenger.city || undefined,
      emergencyContact: passenger.emergencyContactPhone || passenger.emergencyContact || undefined,
      emergencyContactName: passenger.emergencyContactName || undefined,
      emergencyContactPhone: passenger.emergencyContactPhone || undefined,
      preferredLanguage: (passenger.language || passenger.preferredLanguage || 'en').toLowerCase(),
      language: (passenger.language || passenger.preferredLanguage || 'en').toLowerCase(),
      rating: passenger.rating ? Number(passenger.rating) : 5.0,
      totalTrips: passenger.totalTrips || 0,
    };
  }

  // ----------------------------------------------------------------------------
  // Registration Flow
  // ----------------------------------------------------------------------------

  public async initiateRegistration(method: RegistrationMethod, identifier: string, fullName: string) {
    const isEmail = method === 'email';
    let cleanIdentifier = identifier.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (!isEmail) {
      const phoneRes = normalizeEthiopianPhone(cleanIdentifier);
      if (!phoneRes.isValid) {
        throw new AppError(
          phoneRes.error || 'Invalid Ethiopian phone number. Please enter a valid number (e.g. 0911234567 or 0712345678).',
          400,
          'INVALID_PHONE_NUMBER'
        );
      }
      cleanIdentifier = phoneRes.normalized;
    }

    const normalized = normalizeIdentifier(cleanIdentifier);

    // 1. Identifier-level rate limiting (max 5 per rolling hour)
    checkIdentifierRateLimit(normalized, 5);

    // 2. Check duplicate in database
    try {
      const searchConditions: any[] = [{ email: cleanIdentifier }, { phoneNumber: cleanIdentifier }];
      if (!isEmail) {
        const phoneRes = normalizeEthiopianPhone(cleanIdentifier);
        if (phoneRes.nationalNumber) searchConditions.push({ phoneNumber: phoneRes.nationalNumber });
        searchConditions.push({ phoneNumber: cleanIdentifier.replace('+', '') });
      }

      const existing = await withDbTimeout(
        prisma.passenger.findFirst({
          where: {
            OR: searchConditions,
          },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        })
      );

      if (existing) {
        throw new AppError(
          method === 'email'
            ? 'An account with this email address already exists. Please sign in instead.'
            : 'An account with this Telegram phone number already exists. Please sign in instead.',
          409,
          'ACCOUNT_ALREADY_EXISTS'
        );
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, '[AuthService] Database error checking duplicate account');
      throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    const sessionId = `reg_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const sessionSalt = this.generateSalt();
    const plainOtp = this.generateOtp();
    const otpHash = this.hashOtp(plainOtp, sessionSalt);
    const ttlSeconds = 300; // 5 mins
    const cooldownSeconds = 60;

    const session: RegistrationSessionData = {
      sessionId,
      method,
      identifier: cleanIdentifier,
      fullName: cleanFullName,
      otpHash,
      sessionSalt,
      plainOtp,
      otpExpiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
      maxAttempts: 5,
      resendCooldownUntil: Date.now() + cooldownSeconds * 1000,
      isVerified: false,
      registrationToken: null,
      createdAt: Date.now(),
    };

    activeRegSessions.set(sessionId, session);

    // Persist OTP record in database for multi-instance distributed rate limiting and auditing
    try {
      await withDbTimeout(
        prisma.oTPVerification.create({
          data: {
            identifier: normalized,
            purpose: 'REGISTRATION',
            channel: method === 'email' ? 'EMAIL' : 'TELEGRAM',
            codeHash: otpHash,
            salt: sessionSalt,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000),
            maxAttempts: 5,
            resendCooldownUntil: new Date(Date.now() + cooldownSeconds * 1000),
          },
        })
      );
    } catch (err: any) {
      activeRegSessions.delete(sessionId);
      if (err instanceof AppError) throw err;
      logger.error({ err }, '[AuthService] Database error persisting registration OTP');
      throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    let telegramBotUrl: string | undefined;
    let telegramChatLinked = false;
    let telegramChatRequired = false;

    // Dispatch via channel
    if (method === 'email') {
      const emailSent = await this.emailService.sendOtpEmail(cleanIdentifier, plainOtp, cleanFullName);
      if (!emailSent) {
        // Rollback active session from memory
        activeRegSessions.delete(sessionId);

        // Mark pending OTP verification as consumed in database so undelivered codes are invalidated
        try {
          await prisma.oTPVerification.updateMany({
            where: {
              identifier: normalized,
              purpose: 'REGISTRATION',
              codeHash: otpHash,
              isConsumed: false,
            },
            data: {
              isConsumed: true,
              consumedAt: new Date(),
            },
          });
        } catch (cleanupErr) {
          logger.warn({ cleanupErr }, '[AuthService] Failed to invalidate undelivered OTP in database');
        }

        throw new AppError(
          'Failed to deliver verification code to your email address. Please verify your email and try again.',
          503,
          'EMAIL_DELIVERY_FAILED'
        );
      }
    } else {
      const rawToken = crypto.randomBytes(24).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      session.telegramTokenHash = tokenHash;
      session.telegramTokenExpiresAt = Date.now() + ttlSeconds * 1000;
      session.telegramTokenUsed = false;
      activeRegSessions.set(sessionId, session);
      telegramBotUrl = `https://t.me/${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'}?start=reg_${rawToken}`;

      const tgRes = await this.telegramService.sendOtpMessage(cleanIdentifier, plainOtp, {
        sessionId,
        purpose: 'REGISTRATION',
        recipientName: cleanFullName,
      });

      if (tgRes.success) {
        telegramChatLinked = true;
      } else if (tgRes.reason === 'CHAT_NOT_FOUND') {
        telegramChatRequired = true;
      } else if (tgRes.reason === 'BOT_BLOCKED') {
        throw new AppError(
          `You have blocked @${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'} on Telegram. Please unblock the bot and try again.`,
          403,
          'TELEGRAM_BOT_BLOCKED'
        );
      } else {
        throw new AppError(
          tgRes.error || 'Failed to dispatch Telegram verification message. Please try again.',
          503,
          'TELEGRAM_DELIVERY_FAILED'
        );
      }
    }

    const responseData: any = {
      sessionId,
      method,
      maskedIdentifier: this.maskIdentifier(cleanIdentifier),
      expiresInSeconds: ttlSeconds,
      resendCooldownSeconds: cooldownSeconds,
      telegramBotUrl,
      telegramChatLinked,
      telegramChatRequired,
      message: telegramChatRequired
        ? `Please open @${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'} on Telegram to receive your verification code.`
        : undefined,
    };

    if (process.env.NODE_ENV === 'test') {
      responseData.devOtp = plainOtp;
    }

    return responseData;
  }

  public async resendRegistrationOtp(sessionId: string) {
    const session = activeRegSessions.get(sessionId);
    if (!session) {
      throw new AppError('Registration session expired or not found. Please restart registration.', 404, 'SESSION_NOT_FOUND');
    }

    if (Date.now() < session.resendCooldownUntil) {
      const remainingSeconds = Math.ceil((session.resendCooldownUntil - Date.now()) / 1000);
      throw new AppError(`Please wait ${remainingSeconds}s before requesting a new code.`, 429, 'COOLDOWN_ACTIVE');
    }

    // Check identifier rate limit
    checkIdentifierRateLimit(normalizeIdentifier(session.identifier), 5);

    const newOtp = this.generateOtp();
    session.plainOtp = newOtp;
    session.otpHash = this.hashOtp(newOtp, session.sessionSalt);
    session.otpExpiresAt = Date.now() + 300 * 1000;
    session.resendCooldownUntil = Date.now() + 60 * 1000;
    session.attempts = 0;

    activeRegSessions.set(sessionId, session);

    // Persist OTP in database
    try {
      await withDbTimeout(
        prisma.oTPVerification.create({
          data: {
            identifier: normalizeIdentifier(session.identifier),
            purpose: 'REGISTRATION',
            channel: session.method === 'email' ? 'EMAIL' : 'TELEGRAM',
            codeHash: session.otpHash,
            salt: session.sessionSalt,
            expiresAt: new Date(session.otpExpiresAt),
            maxAttempts: 5,
            resendCooldownUntil: new Date(session.resendCooldownUntil),
          },
        })
      );
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, '[AuthService] Database error persisting resend registration OTP');
      throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    let telegramBotUrl: string | undefined;
    let telegramChatLinked = false;
    let telegramChatRequired = false;

    if (session.method === 'email') {
      const emailSent = await this.emailService.sendOtpEmail(session.identifier, newOtp, session.fullName);
      if (!emailSent) {
        throw new AppError(
          'Failed to deliver verification code to your email address. Please try again.',
          503,
          'EMAIL_DELIVERY_FAILED'
        );
      }
    } else {
      const rawToken = crypto.randomBytes(24).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      session.telegramTokenHash = tokenHash;
      session.telegramTokenExpiresAt = Date.now() + 300 * 1000;
      session.telegramTokenUsed = false;
      activeRegSessions.set(sessionId, session);
      telegramBotUrl = `https://t.me/${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'}?start=reg_${rawToken}`;

      const tgRes = await this.telegramService.sendOtpMessage(session.identifier, newOtp, {
        sessionId,
        purpose: 'REGISTRATION',
        recipientName: session.fullName,
      });

      if (tgRes.success) {
        telegramChatLinked = true;
      } else if (tgRes.reason === 'CHAT_NOT_FOUND') {
        telegramChatRequired = true;
      } else if (tgRes.reason === 'BOT_BLOCKED') {
        throw new AppError(
          `You have blocked @${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'} on Telegram. Please unblock the bot and try again.`,
          403,
          'TELEGRAM_BOT_BLOCKED'
        );
      } else {
        throw new AppError(
          tgRes.error || 'Failed to dispatch Telegram verification message. Please try again.',
          503,
          'TELEGRAM_DELIVERY_FAILED'
        );
      }
    }

    const responseData: any = {
      success: true,
      resendCooldownSeconds: 60,
      telegramBotUrl,
      telegramChatLinked,
      telegramChatRequired,
    };

    if (process.env.NODE_ENV === 'test') {
      responseData.devOtp = newOtp;
    }

    return responseData;
  }

  public async verifyRegistrationOtp(sessionId: string, code: string) {
    const session = activeRegSessions.get(sessionId);
    if (!session) {
      throw new AppError('Registration session not found or expired. Please restart.', 404, 'SESSION_NOT_FOUND');
    }

    if (Date.now() > session.otpExpiresAt) {
      throw new AppError('Verification code has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    if (session.attempts >= session.maxAttempts) {
      activeRegSessions.delete(sessionId);
      throw new AppError('Maximum verification attempts exceeded. Please restart registration.', 429, 'MAX_ATTEMPTS_EXCEEDED');
    }

    session.attempts++;

    const inputHash = this.hashOtp(code.trim(), session.sessionSalt);
    const isMatch =
      Boolean(session.otpHash) &&
      inputHash.length === session.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(session.otpHash, 'hex'));

    if (!isMatch) {
      const remaining = session.maxAttempts - session.attempts;
      throw new AppError(`Invalid verification code. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    // Invalidate OTP hash immediately to prevent replay attacks
    session.otpHash = '';
    session.isVerified = true;
    session.registrationToken = `tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    activeRegSessions.set(sessionId, session);

    // Atomically mark OTP consumed in database
    try {
      await prisma.oTPVerification.updateMany({
        where: {
          identifier: normalizeIdentifier(session.identifier),
          purpose: 'REGISTRATION',
          codeHash: inputHash,
          isConsumed: false,
        },
        data: {
          isConsumed: true,
          consumedAt: new Date(),
        },
      });
    } catch (dbErr) {
      logger.warn({ dbErr }, '[AuthService] Failed to mark registration OTP consumed in database');
    }

    return {
      registrationToken: session.registrationToken,
      fullName: session.fullName,
      method: session.method,
      identifier: session.identifier,
    };
  }

  public async completeRegistration(
    sessionId: string,
    registrationToken: string,
    password: string,
    _deviceId?: string,
    platform = 'UNKNOWN'
  ) {
    const session = activeRegSessions.get(sessionId);
    if (!session || !session.isVerified || session.registrationToken !== registrationToken) {
      throw new AppError('Invalid or unverified registration session. Please complete verification first.', 400, 'UNVERIFIED_SESSION');
    }

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    const isEmail = session.method === 'email';
    const emailVal = isEmail ? session.identifier : null;
    const phoneVal = !isEmail ? session.identifier : null;

    const linkedTelegram = !isEmail ? TelegramIdentityStore.getInstance().getLinkByPhone(session.identifier) : null;
    const tgProviderId = linkedTelegram?.telegramUserId || session.identifier;
    const tgMetadata = linkedTelegram
      ? {
        chatId: linkedTelegram.chatId,
        phone: linkedTelegram.phone,
        username: linkedTelegram.username || null,
      }
      : undefined;

    let createdPassenger: any;

    try {
      createdPassenger = await withDbTimeout(
        prisma.passenger.create({
          data: {
            fullName: session.fullName,
            email: emailVal,
            phoneNumber: phoneVal,
            passwordHash: `${passwordHash}:${salt}`,
            isVerified: true,
            accountStatus: 'ACTIVE',
            language: 'EN',
            city: 'Gondar',
            authIdentities: {
              create: {
                provider: isEmail ? 'EMAIL' : 'TELEGRAM',
                providerId: isEmail ? session.identifier : tgProviderId,
                verified: true,
                verifiedAt: new Date(),
                metadata: isEmail ? undefined : (tgMetadata as any),
              },
            },
          },
        })
      );
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
        throw new AppError(
          'An account with this email or phone number already exists.',
          409,
          'ACCOUNT_ALREADY_EXISTS'
        );
      }
      logger.error({ err }, '[AuthService] Database error creating passenger account');
      throw new AppError('Unable to complete registration. Service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    // Clean session only after successful database persistence
    activeRegSessions.delete(sessionId);

    // Issue tokens
    const token = this.generateAccessToken(createdPassenger);
    const refreshToken = await this.createRefreshToken(createdPassenger.id, undefined, undefined, platform);

    return {
      token,
      refreshToken,
      user: this.formatPassengerProfile(createdPassenger),
    };
  }

  // ----------------------------------------------------------------------------
  // Login Flow
  // ----------------------------------------------------------------------------

  public async login(identifier: string, passwordAttempt: string, _deviceId?: string, platform = 'UNKNOWN') {
    const raw = identifier.trim();
    const cleanLower = raw.toLowerCase();

    const searchConditions: any[] = [{ email: cleanLower }, { phoneNumber: raw }, { phoneNumber: cleanLower }];
    const phoneRes = normalizeEthiopianPhone(raw);
    const possiblePhones = new Set<string>([raw, cleanLower]);
    if (phoneRes.isValid) {
      possiblePhones.add(phoneRes.normalized);
      if (phoneRes.nationalNumber) possiblePhones.add(phoneRes.nationalNumber);
      possiblePhones.add(phoneRes.normalized.replace('+', ''));
      for (const p of possiblePhones) {
        searchConditions.push({ phoneNumber: p });
      }
    }

    const phoneToLookup = phoneRes.isValid ? phoneRes.normalized : raw;
    const linked = TelegramIdentityStore.getInstance().getLinkByPhone(phoneToLookup);
    const identityIds = Array.from(possiblePhones);
    if (linked?.telegramUserId) {
      identityIds.push(linked.telegramUserId);
    }

    searchConditions.push({
      authIdentities: {
        some: {
          providerId: { in: identityIds },
        },
      },
    });

    let passenger: any = null;

    try {
      passenger = await withDbTimeout(
        prisma.passenger.findFirst({
          where: {
            OR: searchConditions,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            passwordHash: true,
            isVerified: true,
            accountStatus: true,
            language: true,
            city: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            profileImage: true,
            profileImagePublicId: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      );
    } catch (err: any) {
      logger.error({ err }, '[AuthService] Database error looking up passenger for login');
      throw new AppError('Authentication service temporarily unavailable. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
    }

    if (!passenger) {
      throw new AppError('Invalid email/phone or password', 401, 'INVALID_CREDENTIALS');
    }

    if (passenger.accountStatus === AccountStatus.SUSPENDED) {
      throw new AppError(
        'Your account has been suspended. Please contact customer support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    let isValid = false;
    if (passenger.passwordHash.includes(':')) {
      const [hash, salt] = passenger.passwordHash.split(':');
      isValid = await this.verifyPassword(passwordAttempt, hash, salt);
    } else {
      isValid = await this.verifyPassword(passwordAttempt, passenger.passwordHash, passenger.passwordSalt || '');
    }

    if (!isValid) {
      throw new AppError('Invalid email/phone or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.generateAccessToken(passenger);
    const refreshToken = await this.createRefreshToken(passenger.id, undefined, undefined, platform);

    return {
      token,
      refreshToken,
      user: this.formatPassengerProfile(passenger),
    };
  }

  // ----------------------------------------------------------------------------
  // Password Recovery Flow
  // ----------------------------------------------------------------------------

  public async initiateRecovery(method: RegistrationMethod, identifier: string) {
    const isEmail = method === 'email';
    let clean = identifier.trim().toLowerCase();
    const phoneRes = normalizeEthiopianPhone(clean);
    if (!isEmail && phoneRes.isValid) {
      clean = phoneRes.normalized;
    }

    const normalized = normalizeIdentifier(clean);

    // 1. Identifier-level rate limiting
    checkIdentifierRateLimit(normalized, 5);

    const searchConditions: any[] = [{ email: clean }, { phoneNumber: clean }];
    if (!isEmail && phoneRes.isValid) {
      searchConditions.push({ phoneNumber: phoneRes.normalized });
      if (phoneRes.nationalNumber) searchConditions.push({ phoneNumber: phoneRes.nationalNumber });
      searchConditions.push({ phoneNumber: phoneRes.normalized.replace('+', '') });
    }

    let passenger: any = null;
    try {
      passenger = await withDbTimeout(
        prisma.passenger.findFirst({
          where: {
            OR: searchConditions,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            passwordHash: true,
            isVerified: true,
            accountStatus: true,
            language: true,
            city: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            profileImage: true,
            profileImagePublicId: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      );
    } catch (err: any) {
      logger.error({ err }, '[AuthService] Database error querying passenger for recovery');
      throw new AppError('Password recovery service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    if (!passenger) {
      throw new AppError(
        method === 'email'
          ? 'No Kings Taxi passenger account found with this email address.'
          : 'No Kings Taxi passenger account found with this Telegram phone number.',
        404,
        'ACCOUNT_NOT_FOUND'
      );
    }

    const sessionId = `rec_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const sessionSalt = this.generateSalt();
    const plainOtp = this.generateOtp();
    const otpHash = this.hashOtp(plainOtp, sessionSalt);
    const ttlSeconds = 300;
    const cooldownSeconds = 60;

    const session: PasswordRecoverySessionData = {
      sessionId,
      passengerId: passenger.id,
      method,
      identifier: clean,
      maskedIdentifier: this.maskIdentifier(clean),
      fullName: passenger.fullName,
      otpHash,
      sessionSalt,
      plainOtp,
      otpExpiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
      maxAttempts: 5,
      resendCooldownUntil: Date.now() + cooldownSeconds * 1000,
      isVerified: false,
      recoveryToken: null,
      createdAt: Date.now(),
    };

    // Persist OTP in database before activating session and before dispatching message
    try {
      await withDbTimeout(
        prisma.oTPVerification.create({
          data: {
            identifier: normalized,
            purpose: 'PASSWORD_RESET',
            channel: method === 'email' ? 'EMAIL' : 'TELEGRAM',
            codeHash: otpHash,
            salt: sessionSalt,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000),
            maxAttempts: 5,
            resendCooldownUntil: new Date(Date.now() + cooldownSeconds * 1000),
          },
        })
      );
    } catch (err: any) {
      logger.error({ err }, '[AuthService] Database error persisting password recovery OTP');
      throw new AppError('Password recovery service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    activeRecSessions.set(sessionId, session);

    let telegramBotUrl: string | undefined;
    let telegramChatLinked = false;
    let telegramChatRequired = false;

    if (method === 'email') {
      const emailSent = await this.emailService.sendOtpEmail(clean, plainOtp, passenger.fullName);
      if (!emailSent) {
        activeRecSessions.delete(sessionId);
        try {
          await prisma.oTPVerification.updateMany({
            where: {
              identifier: normalized,
              purpose: 'PASSWORD_RESET',
              codeHash: otpHash,
              isConsumed: false,
            },
            data: {
              isConsumed: true,
              consumedAt: new Date(),
            },
          });
        } catch (cleanupErr) {
          logger.warn({ cleanupErr }, '[AuthService] Failed to clean up undelivered recovery OTP in DB');
        }

        throw new AppError(
          'Failed to deliver recovery code to your email address. Please try again.',
          503,
          'EMAIL_DELIVERY_FAILED'
        );
      }
    } else {
      const rawToken = crypto.randomBytes(24).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      session.telegramTokenHash = tokenHash;
      session.telegramTokenExpiresAt = Date.now() + ttlSeconds * 1000;
      session.telegramTokenUsed = false;
      activeRecSessions.set(sessionId, session);
      telegramBotUrl = `https://t.me/${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'}?start=rec_${rawToken}`;

      const tgRes = await this.telegramService.sendOtpMessage(clean, plainOtp, {
        sessionId,
        purpose: 'PASSWORD_RESET',
        recipientName: passenger.fullName,
      });

      if (tgRes.success) {
        telegramChatLinked = true;
      } else if (tgRes.reason === 'CHAT_NOT_FOUND') {
        telegramChatRequired = true;
      } else if (tgRes.reason === 'BOT_BLOCKED') {
        throw new AppError(
          `You have blocked @${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'} on Telegram. Please unblock the bot and try again.`,
          403,
          'TELEGRAM_BOT_BLOCKED'
        );
      } else {
        throw new AppError(
          tgRes.error || 'Failed to dispatch Telegram recovery message. Please try again.',
          503,
          'TELEGRAM_DELIVERY_FAILED'
        );
      }
    }

    const responseData: any = {
      sessionId,
      method,
      maskedIdentifier: session.maskedIdentifier,
      fullName: session.fullName,
      expiresInSeconds: ttlSeconds,
      resendCooldownSeconds: cooldownSeconds,
      telegramBotUrl,
      telegramChatLinked,
      telegramChatRequired,
    };

    if (process.env.NODE_ENV === 'test') {
      responseData.devOtp = plainOtp;
    }

    return responseData;
  }

  public async resendRecoveryOtp(sessionId: string) {
    const session = activeRecSessions.get(sessionId);
    if (!session) {
      throw new AppError('Password recovery session expired or not found. Please restart recovery.', 404, 'SESSION_NOT_FOUND');
    }

    if (Date.now() < session.resendCooldownUntil) {
      const remaining = Math.ceil((session.resendCooldownUntil - Date.now()) / 1000);
      throw new AppError(`Please wait ${remaining}s before requesting a new code.`, 429, 'COOLDOWN_ACTIVE');
    }

    // Check identifier rate limit
    checkIdentifierRateLimit(normalizeIdentifier(session.identifier), 5);

    const newOtp = this.generateOtp();
    session.plainOtp = newOtp;
    session.otpHash = this.hashOtp(newOtp, session.sessionSalt);
    session.otpExpiresAt = Date.now() + 300 * 1000;
    session.resendCooldownUntil = Date.now() + 60 * 1000;
    session.attempts = 0;

    // Persist OTP in database
    try {
      await withDbTimeout(
        prisma.oTPVerification.create({
          data: {
            identifier: normalizeIdentifier(session.identifier),
            purpose: 'PASSWORD_RESET',
            channel: session.method === 'email' ? 'EMAIL' : 'TELEGRAM',
            codeHash: session.otpHash,
            salt: session.sessionSalt,
            expiresAt: new Date(session.otpExpiresAt),
            maxAttempts: 5,
            resendCooldownUntil: new Date(session.resendCooldownUntil),
          },
        })
      );
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, '[AuthService] Database error persisting resend recovery OTP');
      throw new AppError('Password recovery service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    activeRecSessions.set(sessionId, session);

    let telegramBotUrl: string | undefined;
    let telegramChatLinked = false;
    let telegramChatRequired = false;

    if (session.method === 'email') {
      const emailSent = await this.emailService.sendOtpEmail(session.identifier, newOtp, session.fullName);
      if (!emailSent) {
        throw new AppError(
          'Failed to deliver recovery code to your email address. Please try again.',
          503,
          'EMAIL_DELIVERY_FAILED'
        );
      }
    } else {
      const rawToken = crypto.randomBytes(24).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      session.telegramTokenHash = tokenHash;
      session.telegramTokenExpiresAt = Date.now() + 300 * 1000;
      session.telegramTokenUsed = false;
      activeRecSessions.set(sessionId, session);
      telegramBotUrl = `https://t.me/${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'}?start=rec_${rawToken}`;

      const tgRes = await this.telegramService.sendOtpMessage(session.identifier, newOtp, {
        sessionId,
        purpose: 'PASSWORD_RESET',
        recipientName: session.fullName,
      });

      if (tgRes.success) {
        telegramChatLinked = true;
      } else if (tgRes.reason === 'CHAT_NOT_FOUND') {
        telegramChatRequired = true;
      } else if (tgRes.reason === 'BOT_BLOCKED') {
        throw new AppError(
          `You have blocked @${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'} on Telegram. Please unblock the bot and try again.`,
          403,
          'TELEGRAM_BOT_BLOCKED'
        );
      } else {
        throw new AppError(
          tgRes.error || 'Failed to dispatch Telegram recovery message. Please try again.',
          503,
          'TELEGRAM_DELIVERY_FAILED'
        );
      }
    }

    const responseData: any = {
      success: true,
      resendCooldownSeconds: 60,
      telegramBotUrl,
      telegramChatLinked,
      telegramChatRequired,
    };

    if (process.env.NODE_ENV === 'test') {
      responseData.devOtp = newOtp;
    }

    return responseData;
  }

  public async verifyRecoveryOtp(sessionId: string, code: string) {
    const session = activeRecSessions.get(sessionId);
    if (!session) {
      throw new AppError('Password recovery session not found or expired. Please restart.', 404, 'SESSION_NOT_FOUND');
    }

    if (Date.now() > session.otpExpiresAt) {
      throw new AppError('Verification code has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    if (session.attempts >= session.maxAttempts) {
      activeRecSessions.delete(sessionId);
      throw new AppError('Maximum verification attempts exceeded. Please restart recovery.', 429, 'MAX_ATTEMPTS_EXCEEDED');
    }

    session.attempts++;

    const inputHash = this.hashOtp(code.trim(), session.sessionSalt);
    const isMatch =
      Boolean(session.otpHash) &&
      inputHash.length === session.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(session.otpHash, 'hex'));

    if (!isMatch) {
      const remaining = session.maxAttempts - session.attempts;
      throw new AppError(`Invalid verification code. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    // Invalidate OTP immediately to prevent replay
    session.otpHash = '';
    session.isVerified = true;
    session.recoveryToken = `rec_tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    // Atomically mark OTP consumed in database
    try {
      await prisma.oTPVerification.updateMany({
        where: {
          identifier: normalizeIdentifier(session.identifier),
          purpose: 'PASSWORD_RESET',
          codeHash: inputHash,
          isConsumed: false,
        },
        data: {
          isConsumed: true,
          consumedAt: new Date(),
        },
      });
    } catch (dbErr) {
      logger.warn({ dbErr }, '[AuthService] Failed to mark recovery OTP consumed in database');
    }
    activeRecSessions.set(sessionId, session);

    return {
      recoveryToken: session.recoveryToken,
      fullName: session.fullName,
      method: session.method,
      identifier: session.identifier,
    };
  }

  public async resetPassword(sessionId: string, recoveryToken: string, newPassword: string) {
    const session = activeRecSessions.get(sessionId);
    if (!session || !session.isVerified || session.recoveryToken !== recoveryToken) {
      throw new AppError('Invalid or unverified recovery session. Please verify your OTP code first.', 400, 'UNVERIFIED_SESSION');
    }

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(newPassword, salt);
    const combinedHash = `${passwordHash}:${salt}`;

    try {
      await withDbTimeout(
        prisma.$transaction([
          prisma.passenger.update({
            where: { id: session.passengerId },
            data: { passwordHash: combinedHash },
          }),
          prisma.refreshToken.updateMany({
            where: { userId: session.passengerId, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
          }),
        ])
      );
    } catch (err: any) {
      logger.error({ err, passengerId: session.passengerId }, '[AuthService] Database transaction error resetting password');
      throw new AppError('Unable to reset password. Service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    // Invalidate recovery token and session ONLY after successful database transaction
    activeRecSessions.delete(sessionId);

    return {
      message: 'Password successfully updated. You may now sign in with your new password.',
    };
  }

  // ----------------------------------------------------------------------------
  // Refresh & Logout with Atomic Token Family Reuse Detection
  // ----------------------------------------------------------------------------

  public async refreshTokens(rawRefreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    let storedToken: any = null;
    let usingMemoryFallback = false;
    try {
      storedToken = await withDbTimeout(
        prisma.refreshToken.findUnique({
          where: { tokenHash },
          include: { passenger: true, admin: true },
        })
      );
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        storedToken = inMemoryRefreshTokenMap.get(tokenHash) || null;
        usingMemoryFallback = true;
      } else {
        logger.error({ err }, '[AuthService] Database error looking up refresh token');
        throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    if (!storedToken && inMemoryRefreshTokenMap.has(tokenHash)) {
      storedToken = inMemoryRefreshTokenMap.get(tokenHash);
      usingMemoryFallback = true;
    }

    if (!storedToken) {
      throw new AppError('Refresh token is invalid or expired', 401, 'INVALID_REFRESH_TOKEN');
    }

    // 1. REUSE DETECTION: If the token is ALREADY revoked, an attack / replay is occurring!
    if (storedToken.isRevoked) {
      logger.warn(
        { familyId: storedToken.familyId, userId: storedToken.userId },
        '[SecurityAlert] Revoked refresh token replay detected. Revoking entire token family.'
      );

      // Invalidate in-memory fallback family
      for (const [hash, tok] of inMemoryRefreshTokenMap.entries()) {
        if (tok.familyId === storedToken.familyId && !tok.isRevoked) {
          inMemoryRefreshTokenMap.set(hash, { ...tok, isRevoked: true, revokedAt: new Date() });
        }
      }

      if (!usingMemoryFallback) {
        try {
          await withDbTimeout(
            prisma.refreshToken.updateMany({
              where: { familyId: storedToken.familyId, isRevoked: false },
              data: { isRevoked: true, revokedAt: new Date() },
            })
          );
        } catch (err: any) {
          if (!isDbConnectionError(err)) {
            logger.error({ err, familyId: storedToken.familyId }, '[SecurityAlert] Failed to revoke compromised token family in DB');
            throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
          }
        }
      }

      throw new AppError(
        'Compromised session token replayed. All sessions in this family have been terminated for security.',
        401,
        'TOKEN_FAMILY_REVOKED'
      );
    }

    // 2. Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw new AppError('Refresh token has expired', 401, 'EXPIRED_REFRESH_TOKEN');
    }

    // Delegate to AdminAuthService if this is an administrative refresh token
    if (storedToken.adminId || storedToken.userType === 'ADMIN' || storedToken.userType === 'SUPER_ADMIN') {
      return adminAuthService.refreshToken(rawRefreshToken);
    }

    if (storedToken.passenger?.accountStatus === AccountStatus.SUSPENDED) {
      throw new AppError(
        'Your account has been suspended. Please contact customer support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    // 3. ATOMIC TOKEN ROTATION & CONCURRENCY PROTECTION (Single DB Transaction)
    const passenger = storedToken.passenger || { id: storedToken.userId };
    const newAccessToken = this.generateAccessToken(passenger);
    const rawToken = `rt_${Date.now()}_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHashNew = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const newId = crypto.randomUUID();

    if (usingMemoryFallback) {
      if (storedToken.isRevoked) {
        throw new AppError('Concurrent token refresh detected. Session has been revoked.', 401, 'CONCURRENT_REFRESH_REVOKED');
      }
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();
      inMemoryRefreshTokenMap.set(tokenHash, storedToken);
      inMemoryRefreshTokenMap.set(tokenHashNew, {
        id: newId,
        userId: passenger.id,
        userType: 'PASSENGER',
        tokenHash: tokenHashNew,
        familyId: storedToken.familyId,
        expiresAt,
        passengerId: passenger.id,
        isRevoked: false,
        revokedAt: null,
        createdAt: new Date(),
      });
    } else {
      try {
        const updateResult = await withDbTimeout(
          prisma.refreshToken.updateMany({
            where: { id: storedToken.id, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
          })
        );

        if (updateResult.count !== 1) {
          throw new Error('CONCURRENCY_CONFLICT');
        }

        await withDbTimeout(
          prisma.refreshToken.create({
            data: {
              id: newId,
              userId: passenger.id,
              userType: 'PASSENGER',
              tokenHash: tokenHashNew,
              familyId: storedToken.familyId,
              expiresAt,
              passengerId: passenger.id,
            },
          })
        );
      } catch (err: any) {
        if (err.message === 'CONCURRENCY_CONFLICT') {
          logger.warn(
            { familyId: storedToken.familyId, userId: storedToken.userId },
            '[SecurityAlert] Concurrent refresh token consumption detected. Revoking family.'
          );
          try {
            await withDbTimeout(
              prisma.refreshToken.updateMany({
                where: { familyId: storedToken.familyId, isRevoked: false },
                data: { isRevoked: true, revokedAt: new Date() },
              })
            );
          } catch (revokeErr) {
            logger.error({ revokeErr, familyId: storedToken.familyId }, '[SecurityAlert] Failed to revoke family on concurrent refresh');
          }

          throw new AppError('Concurrent token refresh detected. Session has been revoked.', 401, 'CONCURRENT_REFRESH_REVOKED');
        }

        if (isDbConnectionError(err)) {
          storedToken.isRevoked = true;
          storedToken.revokedAt = new Date();
          inMemoryRefreshTokenMap.set(tokenHash, storedToken);
          inMemoryRefreshTokenMap.set(tokenHashNew, {
            id: newId,
            userId: passenger.id,
            userType: 'PASSENGER',
            tokenHash: tokenHashNew,
            familyId: storedToken.familyId,
            expiresAt,
            passengerId: passenger.id,
            isRevoked: false,
            revokedAt: null,
            createdAt: new Date(),
          });
        } else {
          logger.error({ err, tokenId: storedToken.id }, '[AuthService] Database error during token rotation');
          throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
        }
      }
    }

    return {
      token: newAccessToken,
      refreshToken: rawToken,
    };
  }

  public async logout(rawRefreshToken?: string, passengerId?: string) {
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      for (const [hash, tok] of inMemoryRefreshTokenMap.entries()) {
        if (hash === tokenHash) {
          inMemoryRefreshTokenMap.set(hash, { ...tok, isRevoked: true, revokedAt: new Date() });
        }
      }
      try {
        await withDbTimeout(
          prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { isRevoked: true, revokedAt: new Date() },
          })
        );
      } catch (err: any) {
        if (!isDbConnectionError(err)) {
          logger.error({ err }, '[AuthService] Database error revoking refresh token on logout');
          throw new AppError('Session persistence unavailable. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
        }
      }
    }
    if (passengerId) {
      try {
        await withDbTimeout(
          prisma.passengerSession.updateMany({
            where: { passengerId, isActive: true },
            data: { isActive: false },
          })
        );
      } catch {
        // Non-blocking
      }
    }
    return { success: true };
  }

  public async logoutAll(userId: string) {
    for (const [hash, tok] of inMemoryRefreshTokenMap.entries()) {
      if (tok.userId === userId) {
        inMemoryRefreshTokenMap.set(hash, { ...tok, isRevoked: true, revokedAt: new Date() });
      }
    }
    try {
      await withDbTimeout(
        prisma.$transaction([
          prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
          }),
          prisma.passengerSession.updateMany({
            where: { passengerId: userId, isActive: true },
            data: { isActive: false },
          }),
        ])
      );

      // Record Audit Event
      try {
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            actorType: 'PASSENGER',
            action: 'ALL_SESSIONS_REVOKED',
            entityType: 'Passenger',
            entityId: userId,
            passengerId: userId,
            metadata: { reason: 'User requested logout from all devices' },
          },
        });
      } catch {
        // Non-blocking audit
      }

      return { success: true, message: 'All active sessions revoked successfully' };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        return { success: true, message: 'All sessions marked inactive' };
      }
      logger.error({ err, userId }, '[AuthService] Database error revoking all sessions');
      throw new AppError('Unable to revoke sessions. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  public async getCurrentPassenger(passengerId: string) {
    let passenger: any = null;
    try {
      passenger = await withDbTimeout(
        prisma.passenger.findUnique({
          where: { id: passengerId },
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            isVerified: true,
            accountStatus: true,
            language: true,
            city: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            profileImage: true,
            profileImagePublicId: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      );
    } catch (err: any) {
      logger.error({ err, passengerId }, '[AuthService] Database error fetching passenger');
      throw new AppError('Passenger service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }

    if (!passenger) {
      throw new AppError('Passenger record not found', 404, 'NOT_FOUND');
    }

    return this.formatPassengerProfile(passenger);
  }

  public async handleTelegramWebhook(update: any) {
    await this.telegramService.handleUpdate(update);
    return { ok: true };
  }

  public async getDiagnostics() {
    const smtpCheck = await this.emailService.verifyConnection();
    const telegramCheck = await this.telegramService.getMe();
    const webhookCheck = await this.telegramService.getWebhookInfo();

    return {
      timestamp: new Date().toISOString(),
      channels: {
        email: {
          provider: 'Brevo SMTP',
          host: env.SMTP_HOST || 'not-configured',
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          from: env.SMTP_FROM,
          connected: smtpCheck.success,
          latencyMs: smtpCheck.latencyMs,
          error: smtpCheck.error,
          recentAudits: this.emailService.getRecentAudits(),
        },
        telegram: {
          botUsername: env.TELEGRAM_BOT_USERNAME,
          botLink: env.TELEGRAM_BOT_LINK,
          connected: telegramCheck.success,
          botDetails: telegramCheck.bot
            ? {
              id: telegramCheck.bot.id,
              username: telegramCheck.bot.username,
              firstName: telegramCheck.bot.first_name,
            }
            : null,
          webhookInfo: webhookCheck.info || null,
          error: telegramCheck.error,
          recentAudits: this.telegramService.getRecentAudits(),
        },
      },
      sessions: {
        activeRegistrationSessions: activeRegSessions.size,
        activeRecoverySessions: activeRecSessions.size,
      },
    };
  }
}
