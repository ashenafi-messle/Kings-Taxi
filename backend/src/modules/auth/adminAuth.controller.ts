import { Request, Response } from 'express';
import { adminAuthService } from './adminAuth.service';
import { ApiResponse } from '../../core/response/apiResponse';

export class AdminAuthController {
  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        ApiResponse.badRequest(res, 'Administrator email and password are required.');
        return;
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await adminAuthService.login({
        email,
        password,
        ipAddress,
        userAgent,
      });

      ApiResponse.success(res, result, 'Administrator authenticated successfully');
    } catch (err: any) {
      ApiResponse.error(res, 'AUTH_ERROR', err.message || 'Authentication failed', err.statusCode || 401);
    }
  }

  public static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        ApiResponse.badRequest(res, 'Administrator email address is required.');
        return;
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await adminAuthService.initiatePasswordReset({
        email,
        ipAddress,
        userAgent,
      });

      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      ApiResponse.error(res, 'RECOVERY_ERROR', err.message || 'Unable to process password reset request', err.statusCode || 400);
    }
  }

  public static async resendResetOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        ApiResponse.badRequest(res, 'Administrator email address is required.');
        return;
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await adminAuthService.resendPasswordResetOtp({
        email,
        ipAddress,
        userAgent,
      });

      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      ApiResponse.error(res, 'RECOVERY_ERROR', err.message || 'Unable to resend verification code', err.statusCode || 400);
    }
  }

  public static async verifyResetOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        ApiResponse.badRequest(res, 'Administrator email and 6-digit OTP code are required.');
        return;
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await adminAuthService.verifyPasswordResetOtp({
        email,
        otp,
        ipAddress,
        userAgent,
      });

      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      ApiResponse.error(res, 'VERIFICATION_ERROR', err.message || 'Verification failed', err.statusCode || 400);
    }
  }

  public static async resetPassword(req: Request, res: Response) {
    try {
      const { email, resetToken, newPassword } = req.body;
      if (!email || !resetToken || !newPassword) {
        ApiResponse.badRequest(res, 'Email, reset authorization token, and new password are required.');
        return;
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await adminAuthService.resetPasswordWithToken({
        email,
        resetToken,
        newPassword,
        ipAddress,
        userAgent,
      });

      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      ApiResponse.error(res, 'RESET_ERROR', err.message || 'Password reset failed', err.statusCode || 400);
    }
  }

  public static async changePassword(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      if (!adminId) {
        ApiResponse.unauthorized(res, 'Unauthorized administrator session.');
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        ApiResponse.badRequest(res, 'Current password and new password are required.');
        return;
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await adminAuthService.changePassword({
        adminId,
        currentPassword,
        newPassword,
        ipAddress,
        userAgent,
      });

      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to update password');
    }
  }

  public static async getCurrentAdmin(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      if (!adminId) {
        ApiResponse.unauthorized(res, 'Unauthorized administrator session.');
        return;
      }

      const profile = await adminAuthService.getProfile(adminId);
      ApiResponse.success(res, profile, 'Administrator profile retrieved successfully');
    } catch (err: any) {
      ApiResponse.notFound(res, err.message || 'Administrator profile not found');
    }
  }

  public static async logout(_req: Request, res: Response) {
    ApiResponse.success(res, { loggedOut: true }, 'Administrator session terminated successfully');
  }
}
