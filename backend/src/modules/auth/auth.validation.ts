import { z } from 'zod';

export const initiateRegistrationSchema = z.object({
  method: z.enum(['email', 'telegram'], {
    errorMap: () => ({ message: "Method must be either 'email' or 'telegram'" }),
  }),
  identifier: z.string().min(3, 'Identifier is required').trim(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
});

export const resendOtpSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required').trim(),
});

export const verifyOtpSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required').trim(),
  code: z.string().min(4, 'Verification code must be at least 4 digits').max(8).trim(),
});

export const completeRegistrationSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required').trim(),
  registrationToken: z.string().min(1, 'registrationToken is required').trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  deviceId: z.string().optional(),
  platform: z.enum(['ANDROID', 'IOS', 'WEB', 'UNKNOWN']).optional().default('UNKNOWN'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required').trim(),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
  platform: z.enum(['ANDROID', 'IOS', 'WEB', 'UNKNOWN']).optional().default('UNKNOWN'),
});

export const initiateRecoverySchema = z.object({
  method: z.enum(['email', 'telegram']),
  identifier: z.string().min(3, 'Identifier is required').trim(),
});

export const verifyRecoveryOtpSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required').trim(),
  code: z.string().min(4, 'Verification code must be at least 4 digits').max(8).trim(),
});

export const resetPasswordSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required').trim(),
  recoveryToken: z.string().min(1, 'recoveryToken is required').trim(),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required').trim(),
});

export const telegramVerifySchema = z.object({
  challenge: z.string().min(1, 'Challenge nonce is required'),
  telegramUser: z.object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    auth_date: z.number(),
    hash: z.string(),
  }),
});

