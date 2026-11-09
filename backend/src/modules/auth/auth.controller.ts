import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../core/response/apiResponse';
import {
  initiateRegistrationSchema,
  resendOtpSchema,
  verifyOtpSchema,
  completeRegistrationSchema,
  loginSchema,
  initiateRecoverySchema,
  verifyRecoveryOtpSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  telegramVerifySchema,
} from './auth.validation';

const authService = new AuthService();

export class AuthController {
  // ----------------------------------------------------------------------------
  // Registration Handlers
  // ----------------------------------------------------------------------------

  static async initiateRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = initiateRegistrationSchema.parse(req.body);
      const result = await authService.initiateRegistration(
        validated.method,
        validated.identifier,
        validated.fullName
      );
      ApiResponse.success(res, result, 'Verification code dispatched successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async resendRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resendOtpSchema.parse(req.body);
      const result = await authService.resendRegistrationOtp(validated.sessionId);
      ApiResponse.success(res, result, 'New verification code sent', 200);
    } catch (err) {
      next(err);
    }
  }

  static async verifyRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyOtpSchema.parse(req.body);
      const result = await authService.verifyRegistrationOtp(validated.sessionId, validated.code);
      ApiResponse.success(res, result, 'Verification code verified successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async completeRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = completeRegistrationSchema.parse(req.body);
      const result = await authService.completeRegistration(
        validated.sessionId,
        validated.registrationToken,
        validated.password,
        validated.deviceId,
        validated.platform
      );
      ApiResponse.success(res, result, 'Passenger account registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------------------------------
  // Login Handler
  // ----------------------------------------------------------------------------

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(
        validated.identifier,
        validated.password,
        validated.deviceId,
        validated.platform
      );
      ApiResponse.success(res, result, 'Logged in successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------------------------------
  // Password Recovery Handlers
  // ----------------------------------------------------------------------------

  static async initiateRecovery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = initiateRecoverySchema.parse(req.body);
      const result = await authService.initiateRecovery(validated.method, validated.identifier);
      ApiResponse.success(res, result, 'Password recovery OTP dispatched successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async resendRecoveryOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resendOtpSchema.parse(req.body);
      const result = await authService.resendRecoveryOtp(validated.sessionId);
      ApiResponse.success(res, result, 'New recovery verification code sent', 200);
    } catch (err) {
      next(err);
    }
  }

  static async verifyRecoveryOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyRecoveryOtpSchema.parse(req.body);
      const result = await authService.verifyRecoveryOtp(validated.sessionId, validated.code);
      ApiResponse.success(res, result, 'Recovery code verified successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(
        validated.sessionId,
        validated.recoveryToken,
        validated.newPassword
      );
      ApiResponse.success(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------------------------------
  // Token Refresh & Logout
  // ----------------------------------------------------------------------------

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshTokens(validated.refreshToken);
      ApiResponse.success(res, result, 'Token refreshed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.body?.refreshToken;
      const result = await authService.logout(rawRefreshToken);
      ApiResponse.success(res, result, 'Logged out successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }
      const profile = await authService.getCurrentPassenger(userId);
      ApiResponse.success(res, profile, 'Passenger profile retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  static async telegramVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = telegramVerifySchema.parse(req.body);
      // Validated handshake
      ApiResponse.success(
        res,
        {
          challenge: validated.challenge,
          verified: true,
        },
        'Telegram handshake validated',
        200
      );
    } catch (err) {
      next(err);
    }
  }

  static async handleTelegramWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.handleTelegramWebhook(req.body);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }

  static async getDiagnostics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const diagnostics = await authService.getDiagnostics();
      ApiResponse.success(res, diagnostics, 'Auth & notification channels diagnostic information', 200);
    } catch (err) {
      next(err);
    }
  }
}

