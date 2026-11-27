import { Request, Response } from 'express';
import { driverAuthService } from './driverAuth.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';

export class DriverAuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body || {};
      const result = await driverAuthService.login(identifier, password, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      ApiResponse.success(res, result, 'Driver signed in successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'AUTH_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[DriverAuthController] Login error');
      ApiResponse.serverError(res, 'Unable to sign in right now');
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      const result = await driverAuthService.refresh(refreshToken, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      ApiResponse.success(res, result, 'Session refreshed successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'TOKEN_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[DriverAuthController] Refresh error');
      ApiResponse.serverError(res, 'Unable to refresh session');
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Driver authentication required', 401);
        return;
      }
      const { refreshToken, logoutAll } = req.body || {};
      await driverAuthService.logout(driverId, refreshToken, Boolean(logoutAll), {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      ApiResponse.success(res, null, 'Signed out successfully');
    } catch (err: any) {
      logger.error({ err: err?.message }, '[DriverAuthController] Logout error');
      ApiResponse.serverError(res, 'Unable to sign out');
    }
  }

  static async getCurrentDriver(req: Request, res: Response): Promise<void> {
    try {
      const driverId = req.user?.sub;
      if (!driverId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Driver authentication required', 401);
        return;
      }
      const driver = await driverAuthService.getCurrentDriver(driverId);
      ApiResponse.success(res, { driver }, 'Driver profile retrieved successfully');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'AUTH_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[DriverAuthController] Me error');
      ApiResponse.serverError(res, 'Unable to retrieve driver profile');
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body || {};
      const result = await driverAuthService.forgotPassword(email, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'VALIDATION_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[DriverAuthController] Forgot password error');
      ApiResponse.serverError(res, 'Unable to process password reset request');
    }
  }

  static async verifyResetOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body || {};
      const result = await driverAuthService.verifyResetOtp(email, otp, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      ApiResponse.success(res, result, 'Verification code confirmed');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'OTP_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[DriverAuthController] Verify OTP error');
      ApiResponse.serverError(res, 'Unable to verify code');
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body || {};
      await driverAuthService.resetPassword(resetToken, newPassword, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      ApiResponse.success(res, null, 'Password has been reset successfully. Please sign in.');
    } catch (err: any) {
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code || 'RESET_ERROR', err.message, err.statusCode);
        return;
      }
      logger.error({ err: err?.message }, '[DriverAuthController] Reset password error');
      ApiResponse.serverError(res, 'Unable to reset password');
    }
  }
}
