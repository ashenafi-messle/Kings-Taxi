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
}
