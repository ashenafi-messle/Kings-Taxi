import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { EmailService } from '../../integrations/email/email.service';
import { TelegramService } from '../../integrations/telegram/telegram.service';

export type RegistrationMethod = 'email' | 'telegram';

export interface RegistrationSessionData {
  sessionId: string;
  method: RegistrationMethod;
  identifier: string;
  fullName: string;
  otpHash: string;
  sessionSalt: string;
  otpExpiresAt: number;
  attempts: number;
  maxAttempts: number;
  resendCooldownUntil: number;
  isVerified: boolean;
  registrationToken: string | null;
  createdAt: number;
  devOtp?: string;
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
  otpExpiresAt: number;
  attempts: number;
  maxAttempts: number;
  resendCooldownUntil: number;
  isVerified: boolean;
  recoveryToken: string | null;
  createdAt: number;
  devOtp?: string;
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

async function withDbTimeout<T>(queryPromise: Promise<T>, timeoutMs = 1200): Promise<T> {
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

// In-memory registered user cache (strictly restricted to non-production dev/testing when database is offline)
const fallbackUsers = new Map<string, any>([
  [
    'dawit@kingstaxi.et',
    {
      id: 'e2b9c7a1-8d4e-4f1a-9b2c-3d4e5f6a7b8c',
      fullName: 'Dawit Haile',
      email: 'dawit@kingstaxi.et',
      phoneNumber: '+251911234567',
      passwordHash: hashPasswordSync('Password123!', 'salt_dawit_haile'),
      passwordSalt: 'salt_dawit_haile',
      language: 'EN',
      city: 'Gondar',
      isVerified: true,
      accountStatus: 'ACTIVE',
    },
  ],
  [
    '+251911234567',
    {
      id: 'e2b9c7a1-8d4e-4f1a-9b2c-3d4e5f6a7b8c',
      fullName: 'Dawit Haile',
      email: 'dawit@kingstaxi.et',
      phoneNumber: '+251911234567',
      passwordHash: hashPasswordSync('Password123!', 'salt_dawit_haile'),
      passwordSalt: 'salt_dawit_haile',
      language: 'EN',
      city: 'Gondar',
      isVerified: true,
      accountStatus: 'ACTIVE',
    },
  ],
]);

interface FallbackRefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  passenger?: any;
}

// In-memory fallback refresh token cache (strictly for non-production environments)
const fallbackRefreshTokens = new Map<string, FallbackRefreshToken>();

export class AuthService {
  private emailService = EmailService.getInstance();
  private telegramService = TelegramService.getInstance();

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
    const id = `rt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

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
    } catch (err) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Session persistence unavailable. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
      }
      logger.warn({ err }, '[AuthService] Could not persist refresh token to database, operating in session memory');
    }

    if (env.NODE_ENV !== 'production') {
      let passengerObj = null;
      for (const val of fallbackUsers.values()) {
        if (val.id === passengerId) {
          passengerObj = val;
          break;
        }
      }
      fallbackRefreshTokens.set(tokenHash, {
        id,
        tokenHash,
        userId: passengerId,
        familyId: tokenFamily,
        expiresAt,
        isRevoked: false,
        passenger: passengerObj || { id: passengerId },
      });
    }

    return rawToken;
  }

  public formatPassengerProfile(passenger: any) {
    return {
      id: passenger.id,
      fullName: passenger.fullName,
      email: passenger.email || undefined,
      phone: passenger.phoneNumber || undefined,
      avatarUrl: passenger.profileImage || undefined,
      emergencyContact: passenger.emergencyContactPhone || undefined,
      preferredLanguage: (passenger.language || 'en').toLowerCase(),
      rating: 5.0,
      totalTrips: 0,
    };
  }

  // ----------------------------------------------------------------------------
  // Registration Flow
  // ----------------------------------------------------------------------------

  public async initiateRegistration(method: RegistrationMethod, identifier: string, fullName: string) {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const normalized = normalizeIdentifier(cleanIdentifier);

    // 1. Identifier-level rate limiting (max 5 per rolling hour)
    checkIdentifierRateLimit(normalized, 5);

    // 2. Check duplicate in database
    try {
      const existing = await withDbTimeout(
        prisma.passenger.findFirst({
          where: {
            OR: [{ email: cleanIdentifier }, { phoneNumber: cleanIdentifier }],
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
      if (env.NODE_ENV === 'production') {
        throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
      // If DB is offline in non-production, check fallback map
      if (fallbackUsers.has(cleanIdentifier)) {
        throw new AppError('An account with this identifier already exists. Please sign in.', 409, 'ACCOUNT_ALREADY_EXISTS');
      }
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
      otpExpiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
      maxAttempts: 5,
      resendCooldownUntil: Date.now() + cooldownSeconds * 1000,
      isVerified: false,
      registrationToken: null,
      createdAt: Date.now(),
      devOtp: env.NODE_ENV !== 'production' ? plainOtp : undefined,
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
      if (env.NODE_ENV === 'production') {
        throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    // Dispatch via channel
    if (method === 'email') {
      await this.emailService.sendOtpEmail(cleanIdentifier, plainOtp, cleanFullName);
    } else {
      await this.telegramService.sendOtpMessage(cleanIdentifier, plainOtp);
    }

    return {
      sessionId,
      method,
      maskedIdentifier: this.maskIdentifier(cleanIdentifier),
      expiresInSeconds: ttlSeconds,
      resendCooldownSeconds: cooldownSeconds,
      devOtp: env.NODE_ENV !== 'production' ? plainOtp : undefined,
    };
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
    session.otpHash = this.hashOtp(newOtp, session.sessionSalt);
    session.otpExpiresAt = Date.now() + 300 * 1000;
    session.resendCooldownUntil = Date.now() + 60 * 1000;
    session.attempts = 0;
    session.devOtp = env.NODE_ENV !== 'production' ? newOtp : undefined;

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
      if (env.NODE_ENV === 'production') {
        throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    if (session.method === 'email') {
      await this.emailService.sendOtpEmail(session.identifier, newOtp, session.fullName);
    } else {
      await this.telegramService.sendOtpMessage(session.identifier, newOtp);
    }

    return {
      success: true,
      resendCooldownSeconds: 60,
      devOtp: env.NODE_ENV !== 'production' ? newOtp : undefined,
    };
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
    if (inputHash !== session.otpHash) {
      const remaining = session.maxAttempts - session.attempts;
      throw new AppError(`Invalid verification code. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    // Invalidate OTP hash immediately to prevent replay attacks
    session.otpHash = '';
    session.isVerified = true;
    session.registrationToken = `tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    activeRegSessions.set(sessionId, session);

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
                providerId: session.identifier,
                verified: true,
                verifiedAt: new Date(),
              },
            },
          },
        })
      );
    } catch (err: any) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Unable to complete registration. Service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
      logger.warn({ err }, '[AuthService] Database write bypassed in non-production; creating in-memory fallback user');
      createdPassenger = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        fullName: session.fullName,
        email: emailVal,
        phoneNumber: phoneVal,
        passwordHash: `${passwordHash}:${salt}`,
        isVerified: true,
        accountStatus: 'ACTIVE',
        language: 'EN',
      };
      fallbackUsers.set(session.identifier, createdPassenger);
    }

    // Clean session
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
    const clean = identifier.trim().toLowerCase();

    let passenger: any = null;

    try {
      passenger = await withDbTimeout(
        prisma.passenger.findFirst({
          where: {
            OR: [{ email: clean }, { phoneNumber: clean }],
          },
        })
      );
    } catch (err: any) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Authentication service temporarily unavailable. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
      }
      passenger = null;
    }

    // Strictly restrict in-memory fallback to non-production environments
    if (!passenger && env.NODE_ENV !== 'production' && fallbackUsers.has(clean)) {
      passenger = fallbackUsers.get(clean);
    }

    if (!passenger) {
      throw new AppError('Invalid email/phone or password', 401, 'INVALID_CREDENTIALS');
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
    const clean = identifier.trim().toLowerCase();
    const normalized = normalizeIdentifier(clean);

    // 1. Identifier-level rate limiting
    checkIdentifierRateLimit(normalized, 5);

    let passenger: any = null;
    try {
      passenger = await withDbTimeout(
        prisma.passenger.findFirst({
          where: {
            OR: [{ email: clean }, { phoneNumber: clean }],
          },
        })
      );
    } catch (err: any) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Password recovery service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
      passenger = null;
    }

    if (!passenger && env.NODE_ENV !== 'production' && fallbackUsers.has(clean)) {
      passenger = fallbackUsers.get(clean);
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
      otpExpiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
      maxAttempts: 5,
      resendCooldownUntil: Date.now() + cooldownSeconds * 1000,
      isVerified: false,
      recoveryToken: null,
      createdAt: Date.now(),
      devOtp: env.NODE_ENV !== 'production' ? plainOtp : undefined,
    };

    activeRecSessions.set(sessionId, session);

    // Persist OTP in database
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
      if (env.NODE_ENV === 'production') {
        throw new AppError('Password recovery service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    if (method === 'email') {
      await this.emailService.sendOtpEmail(clean, plainOtp, passenger.fullName);
    } else {
      await this.telegramService.sendOtpMessage(clean, plainOtp);
    }

    const telegramBotUrl =
      method === 'telegram' ? `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=rec_${sessionId}` : undefined;

    return {
      sessionId,
      method,
      maskedIdentifier: session.maskedIdentifier,
      fullName: session.fullName,
      expiresInSeconds: ttlSeconds,
      resendCooldownSeconds: cooldownSeconds,
      telegramBotUrl,
      devOtp: env.NODE_ENV !== 'production' ? plainOtp : undefined,
    };
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
    session.otpHash = this.hashOtp(newOtp, session.sessionSalt);
    session.otpExpiresAt = Date.now() + 300 * 1000;
    session.resendCooldownUntil = Date.now() + 60 * 1000;
    session.attempts = 0;
    session.devOtp = env.NODE_ENV !== 'production' ? newOtp : undefined;

    activeRecSessions.set(sessionId, session);

    if (session.method === 'email') {
      await this.emailService.sendOtpEmail(session.identifier, newOtp, session.fullName);
    } else {
      await this.telegramService.sendOtpMessage(session.identifier, newOtp);
    }

    return {
      success: true,
      resendCooldownSeconds: 60,
      devOtp: env.NODE_ENV !== 'production' ? newOtp : undefined,
    };
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
    if (inputHash !== session.otpHash) {
      const remaining = session.maxAttempts - session.attempts;
      throw new AppError(`Invalid verification code. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    // Invalidate OTP immediately to prevent replay
    session.otpHash = '';
    session.isVerified = true;
    session.recoveryToken = `rec_tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
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

    // Invalidate recovery token and session immediately to prevent replay attacks
    activeRecSessions.delete(sessionId);

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
      if (env.NODE_ENV === 'production') {
        throw new AppError('Unable to reset password. Service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
      if (fallbackUsers.has(session.identifier)) {
        const u = fallbackUsers.get(session.identifier);
        u.passwordHash = passwordHash;
        u.passwordSalt = salt;
      }
    }

    if (env.NODE_ENV !== 'production') {
      for (const token of fallbackRefreshTokens.values()) {
        if (token.userId === session.passengerId) {
          token.isRevoked = true;
          token.revokedAt = new Date();
        }
      }
    }

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
    try {
      storedToken = await withDbTimeout(
        prisma.refreshToken.findUnique({
          where: { tokenHash },
          include: { passenger: true },
        })
      );
    } catch (err: any) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Authentication service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
      storedToken = null;
    }

    if (!storedToken && env.NODE_ENV !== 'production' && fallbackRefreshTokens.has(tokenHash)) {
      storedToken = fallbackRefreshTokens.get(tokenHash);
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

      try {
        await withDbTimeout(
          prisma.refreshToken.updateMany({
            where: { familyId: storedToken.familyId, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
          })
        );
      } catch (err) {
        if (env.NODE_ENV === 'production') {
          logger.error({ err }, '[SecurityAlert] Failed to revoke compromised token family');
        }
      }

      if (env.NODE_ENV !== 'production') {
        for (const token of fallbackRefreshTokens.values()) {
          if (token.familyId === storedToken.familyId) {
            token.isRevoked = true;
            token.revokedAt = new Date();
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

    // 3. ATOMIC TOKEN ROTATION & CONCURRENCY PROTECTION
    // Conditionally update isRevoked: true ONLY IF isRevoked is currently false.
    let rotationSucceeded = false;
    try {
      const updateResult = await withDbTimeout(
        prisma.refreshToken.updateMany({
          where: { id: storedToken.id, isRevoked: false },
          data: { isRevoked: true, revokedAt: new Date() },
        })
      );
      rotationSucceeded = updateResult.count === 1;
    } catch {
      // In non-production fallback store:
      if (env.NODE_ENV !== 'production') {
        const memToken = fallbackRefreshTokens.get(tokenHash);
        if (memToken && !memToken.isRevoked) {
          memToken.isRevoked = true;
          memToken.revokedAt = new Date();
          rotationSucceeded = true;
        } else {
          rotationSucceeded = false;
        }
      }
    }

    // Also sync the fallback store in non-production even if DB succeeded
    if (env.NODE_ENV !== 'production') {
      const memToken = fallbackRefreshTokens.get(tokenHash);
      if (memToken) {
        if (memToken.isRevoked && !rotationSucceeded) {
          // Already marked as revoked
        } else if (!memToken.isRevoked) {
          memToken.isRevoked = true;
          memToken.revokedAt = new Date();
        }
      }
    }

    if (!rotationSucceeded) {
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
      } catch {}

      if (env.NODE_ENV !== 'production') {
        for (const token of fallbackRefreshTokens.values()) {
          if (token.familyId === storedToken.familyId) {
            token.isRevoked = true;
            token.revokedAt = new Date();
          }
        }
      }

      throw new AppError('Concurrent token refresh detected. Session has been revoked.', 401, 'CONCURRENT_REFRESH_REVOKED');
    }

    const passenger = storedToken.passenger || { id: storedToken.userId };
    const newAccessToken = this.generateAccessToken(passenger);
    const newRefreshToken = await this.createRefreshToken(passenger.id, storedToken.familyId);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      try {
        await withDbTimeout(
          prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { isRevoked: true, revokedAt: new Date() },
          })
        );
      } catch {}

      if (env.NODE_ENV !== 'production') {
        const memToken = fallbackRefreshTokens.get(tokenHash);
        if (memToken) {
          memToken.isRevoked = true;
          memToken.revokedAt = new Date();
        }
      }
    }
    return { success: true };
  }

  public async getCurrentPassenger(passengerId: string) {
    let passenger: any = null;
    try {
      passenger = await withDbTimeout(
        prisma.passenger.findUnique({
          where: { id: passengerId },
        })
      );
    } catch (err: any) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Passenger service temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
      }
      passenger = null;
    }

    if (!passenger && env.NODE_ENV !== 'production') {
      for (const val of fallbackUsers.values()) {
        if (val.id === passengerId) {
          passenger = val;
          break;
        }
      }
    }

    if (!passenger) {
      throw new AppError('Passenger record not found', 404, 'NOT_FOUND');
    }

    return this.formatPassengerProfile(passenger);
  }
}
