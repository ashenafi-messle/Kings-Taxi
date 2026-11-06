/**
 * Kings Taxi - Registration & OTP Authentication Service
 *
 * Implements channel-specific registration (Email & Telegram),
 * cryptographic OTP hashing, expiration validation, attempt rate limiting,
 * password complexity verification, and duplicate account prevention.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, PassengerProfile } from '../types';
import {
  sha256,
  hashOtp,
  hashPassword,
  generateRandomOtp,
  maskContact,
} from '../utils/crypto';
import { mockPassenger } from '../mocks';

export type RegistrationMethod = 'email' | 'telegram';

export interface RegistrationSession {
  sessionId: string;
  method: RegistrationMethod;
  identifier: string; // email address or phone number
  fullName: string;
  otpHash: string | null;
  sessionSalt: string;
  otpExpiresAt: number;
  attempts: number;
  maxAttempts: number;
  resendCooldownUntil: number;
  isVerified: boolean;
  registrationToken: string | null;
  createdAt: number;
  // Dev hint for testing & verification
  lastDevOtp?: string;
}

export interface RegisteredAccountRecord {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  emailVerified: boolean;
  telegramVerified: boolean;
  registrationMethod: RegistrationMethod;
  createdAt: string;
}

const REGISTERED_ACCOUNTS_STORAGE_KEY = '@kings_taxi_registered_accounts_db';
const ACTIVE_SESSIONS_STORAGE_KEY = '@kings_taxi_active_reg_sessions';
const BACKEND_API_BASE = 'https://api.kingstaxi.et/api/v1/auth';

// In-memory active registration sessions
const activeSessions = new Map<string, RegistrationSession>();

// In-memory registered accounts (seeded with existing mock passenger for backwards compatibility)
let registeredAccounts: RegisteredAccountRecord[] = [
  {
    id: mockPassenger.id,
    fullName: mockPassenger.fullName,
    email: mockPassenger.email,
    phone: mockPassenger.phone,
    passwordHash: hashPassword('Password123!', 'salt_dawit_haile'),
    passwordSalt: 'salt_dawit_haile',
    emailVerified: true,
    telegramVerified: true,
    registrationMethod: 'email',
    createdAt: '2026-01-15T10:00:00Z',
  },
];

let isDbLoaded = false;

async function loadRegisteredDb(): Promise<void> {
  if (isDbLoaded) return;
  try {
    const data = await AsyncStorage.getItem(REGISTERED_ACCOUNTS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        registeredAccounts = parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load registered accounts DB:', err);
  }
  isDbLoaded = true;
}

async function saveRegisteredDb(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REGISTERED_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(registeredAccounts)
    );
  } catch (err) {
    console.warn('Failed to save registered accounts DB:', err);
  }
}

export class RegistrationAuthService {
  /**
   * Checks if an email or phone number is already registered
   */
  static async isIdentifierRegistered(identifier: string): Promise<boolean> {
    await loadRegisteredDb();
    const clean = identifier.trim().toLowerCase();
    return registeredAccounts.some(
      (acc) =>
        (acc.email && acc.email.toLowerCase() === clean) ||
        (acc.phone && acc.phone.replace(/\s+/g, '') === clean.replace(/\s+/g, ''))
    );
  }

  /**
   * Retrieves an account by email or phone (for login validation)
   */
  static async findAccountByIdentifier(
    identifier: string
  ): Promise<RegisteredAccountRecord | null> {
    await loadRegisteredDb();
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = clean.replace(/\s+/g, '');
    return (
      registeredAccounts.find(
        (acc) =>
          (acc.email && acc.email.toLowerCase() === clean) ||
          (acc.phone && acc.phone.replace(/\s+/g, '') === cleanPhone)
      ) || null
    );
  }

  /**
   * Updates an existing account password (for password recovery)
   */
  static async updateAccountPassword(
    accountId: string,
    newPassword: string
  ): Promise<boolean> {
    await loadRegisteredDb();
    const index = registeredAccounts.findIndex((acc) => acc.id === accountId);
    if (index === -1) return false;

    const newSalt = `usr_salt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newPasswordHash = hashPassword(newPassword, newSalt);

    registeredAccounts[index] = {
      ...registeredAccounts[index],
      passwordHash: newPasswordHash,
      passwordSalt: newSalt,
    };

    await saveRegisteredDb();
    return true;
  }

  /**
   * Verifies account credentials using the salted password hash
   */
  static async verifyAccountCredentials(
    identifier: string,
    passwordAttempt: string
  ): Promise<RegisteredAccountRecord | null> {
    await loadRegisteredDb();
    const account = await this.findAccountByIdentifier(identifier);
    if (!account) return null;

    const attemptHash = hashPassword(passwordAttempt, account.passwordSalt);
    if (attemptHash === account.passwordHash) {
      return account;
    }
    return null;
  }

  /**
   * Step 1 & 2: Initiate Registration & Generate Channel-Specific OTP
   */
  static async initiateRegistration(
    method: RegistrationMethod,
    identifier: string,
    fullName: string
  ): Promise<
    ApiResponse<{
      sessionId: string;
      method: RegistrationMethod;
      maskedIdentifier: string;
      expiresInSeconds: number;
      resendCooldownSeconds: number;
      devOtp?: string;
    }>
  > {
    await loadRegisteredDb();

    const cleanIdentifier = identifier.trim();
    const cleanFullName = fullName.trim();

    // 1. Validation
    if (!cleanFullName || cleanFullName.length < 2) {
      return {
        success: false,
        data: {} as any,
        error: 'Please enter your full name',
      };
    }

    if (method === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanIdentifier)) {
        return {
          success: false,
          data: {} as any,
          error: 'Please enter a valid email address',
        };
      }
    } else {
      // Telegram phone
      const phoneDigits = cleanIdentifier.replace(/[^0-9]/g, '');
      if (phoneDigits.length < 9) {
        return {
          success: false,
          data: {} as any,
          error: 'Please enter a valid phone number associated with Telegram',
        };
      }
    }

    // 2. Duplicate Account Prevention
    const isDuplicate = await this.isIdentifierRegistered(cleanIdentifier);
    if (isDuplicate) {
      return {
        success: false,
        data: {} as any,
        error:
          method === 'email'
            ? 'An account with this email address already exists. Please sign in instead.'
            : 'An account with this Telegram phone number already exists. Please sign in instead.',
      };
    }

    // 3. Attempt Remote Backend Call
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`${BACKEND_API_BASE}/register/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, identifier: cleanIdentifier, fullName: cleanFullName }),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      if (res && res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback to local secure engine
    }

    // 4. Secure Session & OTP Generation
    const sessionId = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sessionSalt = `salt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const plainOtp = generateRandomOtp(); // 6 digits
    const otpHash = hashOtp(plainOtp, sessionSalt);
    const ttlSeconds = 300; // 5 minutes
    const cooldownSeconds = 60; // 60s resend cooldown

    const session: RegistrationSession = {
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
      lastDevOtp: plainOtp,
    };

    activeSessions.set(sessionId, session);

    return {
      success: true,
      data: {
        sessionId,
        method,
        maskedIdentifier: maskContact(cleanIdentifier),
        expiresInSeconds: ttlSeconds,
        resendCooldownSeconds: cooldownSeconds,
        devOtp: plainOtp, // Supplied for developer & automated test verification
      },
    };
  }

  /**
   * Step 3: Resend OTP
   */
  static async resendOtp(
    sessionId: string
  ): Promise<
    ApiResponse<{
      success: boolean;
      resendCooldownSeconds: number;
      devOtp?: string;
    }>
  > {
    const session = activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        data: {} as any,
        error: 'Registration session expired or not found. Please restart registration.',
      };
    }

    if (Date.now() < session.resendCooldownUntil) {
      const remainingSeconds = Math.ceil((session.resendCooldownUntil - Date.now()) / 1000);
      return {
        success: false,
        data: {} as any,
        error: `Please wait ${remainingSeconds}s before requesting a new code.`,
      };
    }

    // Generate new OTP
    const newOtp = generateRandomOtp();
    session.otpHash = hashOtp(newOtp, session.sessionSalt);
    session.otpExpiresAt = Date.now() + 300 * 1000;
    session.resendCooldownUntil = Date.now() + 60 * 1000;
    session.attempts = 0; // reset attempts for new OTP
    session.lastDevOtp = newOtp;

    activeSessions.set(sessionId, session);

    return {
      success: true,
      data: {
        success: true,
        resendCooldownSeconds: 60,
        devOtp: newOtp,
      },
    };
  }

  /**
   * Step 4: Verify OTP
   */
  static async verifyOtp(
    sessionId: string,
    code: string
  ): Promise<
    ApiResponse<{
      registrationToken: string;
      fullName: string;
      method: RegistrationMethod;
      identifier: string;
    }>
  > {
    const session = activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        data: {} as any,
        error: 'Registration session not found or expired. Please restart.',
      };
    }

    // Check expiration
    if (Date.now() > session.otpExpiresAt) {
      return {
        success: false,
        data: {} as any,
        error: 'Verification code has expired. Please request a new code.',
      };
    }

    // Check rate limit
    if (session.attempts >= session.maxAttempts) {
      activeSessions.delete(sessionId);
      return {
        success: false,
        data: {} as any,
        error: 'Maximum verification attempts exceeded. Please restart registration.',
      };
    }

    // Increment attempts
    session.attempts++;

    // Hash user input and compare
    const inputHash = hashOtp(code.trim(), session.sessionSalt);
    if (!session.otpHash || inputHash !== session.otpHash) {
      const remaining = session.maxAttempts - session.attempts;
      return {
        success: false,
        data: {} as any,
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    }

    // Prevent OTP reuse: clear hash immediately
    session.otpHash = null;
    session.isVerified = true;
    session.registrationToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    activeSessions.set(sessionId, session);

    return {
      success: true,
      data: {
        registrationToken: session.registrationToken,
        fullName: session.fullName,
        method: session.method,
        identifier: session.identifier,
      },
    };
  }

  /**
   * Step 5 & 6: Set Password & Complete Account Registration
   */
  static async setPasswordAndComplete(
    sessionId: string,
    registrationToken: string,
    password: string
  ): Promise<
    ApiResponse<{
      token: string;
      user: PassengerProfile;
    }>
  > {
    await loadRegisteredDb();

    const session = activeSessions.get(sessionId);
    if (!session || !session.isVerified || session.registrationToken !== registrationToken) {
      return {
        success: false,
        data: {} as any,
        error: 'Invalid or unverified registration session. Please complete verification first.',
      };
    }

    // Password Complexity Verification:
    // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    if (password.length < 8) {
      return {
        success: false,
        data: {} as any,
        error: 'Password must be at least 8 characters long.',
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        success: false,
        data: {} as any,
        error: 'Password must include at least one uppercase letter.',
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        success: false,
        data: {} as any,
        error: 'Password must include at least one lowercase letter.',
      };
    }
    if (!/[0-9]/.test(password)) {
      return {
        success: false,
        data: {} as any,
        error: 'Password must include at least one number.',
      };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return {
        success: false,
        data: {} as any,
        error: 'Password must include at least one special character (!@#$%^&*).',
      };
    }

    // Re-check duplicate account
    const isDup = await this.isIdentifierRegistered(session.identifier);
    if (isDup) {
      return {
        success: false,
        data: {} as any,
        error: 'An account with this credential is already registered.',
      };
    }

    // Hash password securely with unique passenger salt
    const passengerSalt = `usr_salt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = hashPassword(password, passengerSalt);

    const newId = `usr_kt_${Date.now()}`;
    const newAccount: RegisteredAccountRecord = {
      id: newId,
      fullName: session.fullName,
      email: session.method === 'email' ? session.identifier : undefined,
      phone: session.method === 'telegram' ? session.identifier : undefined,
      passwordHash,
      passwordSalt: passengerSalt,
      emailVerified: session.method === 'email',
      telegramVerified: session.method === 'telegram',
      registrationMethod: session.method,
      createdAt: new Date().toISOString(),
    };

    registeredAccounts.push(newAccount);
    await saveRegisteredDb();

    // Clean up used registration session
    activeSessions.delete(sessionId);

    const newPassengerProfile: PassengerProfile = {
      id: newId,
      fullName: newAccount.fullName,
      email: newAccount.email || 'passenger@kingstaxi.et',
      phone: newAccount.phone || '+251911234567',
      rating: 5.0,
      totalTrips: 0,
      defaultPaymentMethod: 'telebirr',
      preferredLanguage: 'en',
    };

    const sessionJwt = `jwt_kt_reg_${newId}_${Date.now()}`;

    return {
      success: true,
      data: {
        token: sessionJwt,
        user: newPassengerProfile,
      },
    };
  }

  /**
   * Resets test DB (for tests only)
   */
  static async resetTestDatabase(): Promise<void> {
    registeredAccounts = [
      {
        id: mockPassenger.id,
        fullName: mockPassenger.fullName,
        email: mockPassenger.email,
        phone: mockPassenger.phone,
        passwordHash: hashPassword('Password123!', 'salt_dawit_haile'),
        passwordSalt: 'salt_dawit_haile',
        emailVerified: true,
        telegramVerified: true,
        registrationMethod: 'email',
        createdAt: '2026-01-15T10:00:00Z',
      },
    ];
    activeSessions.clear();
    await saveRegisteredDb();
  }
}

