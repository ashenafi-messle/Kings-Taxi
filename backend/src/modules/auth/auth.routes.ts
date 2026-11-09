import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../../core/middleware/auth.middleware';
import { ApiResponse } from '../../core/response/apiResponse';

export const authRouter = Router();

// Stricter rate limiter for authentication & OTP endpoints (30 requests per 15 minutes)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});

// Operational status endpoint
authRouter.get('/status', (_req, res) => {
  ApiResponse.success(
    res,
    {
      module: 'auth',
      status: 'operational',
      description: 'Multi-channel authentication, Argon2id passwords, and rotating session tokens',
    },
    'Auth service status operational'
  );
});

// Registration Flow
authRouter.post('/register/initiate', authRateLimiter, AuthController.initiateRegistration);
authRouter.post('/register/resend-otp', authRateLimiter, AuthController.resendRegistrationOtp);
authRouter.post('/register/verify-otp', authRateLimiter, AuthController.verifyRegistrationOtp);
authRouter.post('/register/complete', authRateLimiter, AuthController.completeRegistration);

// Login Flow
authRouter.post('/login', authRateLimiter, AuthController.login);

// Password Recovery Flow
authRouter.post('/recovery/initiate', authRateLimiter, AuthController.initiateRecovery);
authRouter.post('/recovery/resend-otp', authRateLimiter, AuthController.resendRecoveryOtp);
authRouter.post('/recovery/verify-otp', authRateLimiter, AuthController.verifyRecoveryOtp);
authRouter.post('/recovery/reset', authRateLimiter, AuthController.resetPassword);

// Token Refresh & Logout
authRouter.post('/refresh', authRateLimiter, AuthController.refreshToken);
authRouter.post('/logout', authenticateToken, AuthController.logout);

// Protected Identity Inspection
authRouter.get('/me', authenticateToken, AuthController.getCurrentUser);

// Telegram Verification Handshake & Webhook
authRouter.post('/telegram/verify', authRateLimiter, AuthController.telegramVerify);
authRouter.post('/telegram/webhook', AuthController.handleTelegramWebhook);

// Safe Diagnostics Endpoint (Inspect channels & delivery health without leaking secrets)
authRouter.get('/diagnostics', AuthController.getDiagnostics);

