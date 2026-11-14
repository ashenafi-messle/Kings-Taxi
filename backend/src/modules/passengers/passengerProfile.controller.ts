import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiResponse } from '../../core/response/apiResponse';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { passengerProfileService } from './passengerProfile.service';

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name exceeds 100 characters')
    .optional(),
  city: z.string().trim().min(2, 'City name too short').max(100).optional(),
  language: z.enum(['en', 'am', 'om']).optional(),
  emergencyContactName: z.string().trim().max(100).optional().nullable(),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{9,20}$/, 'Invalid emergency phone format')
    .optional()
    .nullable(),
});

const initiateContactChangeSchema = z
  .object({
    type: z
      .enum(['EMAIL', 'PHONE', 'email', 'phone'])
      .transform((val) => val.toLowerCase() as 'email' | 'phone'),
    newContact: z.string().trim().min(3, 'Contact value is required'),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.newContact)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newContact'],
          message: 'Invalid email address format',
        });
      }
    } else if (data.type === 'phone') {
      const phoneRegex = /^\+?[0-9\s-]{9,20}$/;
      if (!phoneRegex.test(data.newContact)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newContact'],
          message: 'Invalid phone number format',
        });
      }
    }
  });

const verifyContactChangeSchema = z.object({
  sessionId: z.string().trim().min(5, 'Session ID is required'),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

const updateProfileImageSchema = z.object({
  imageUrl: z.string().url('A valid image URL is required').max(512),
  publicId: z.string().trim().max(255).optional(),
});

const uploadDirectImageSchema = z.object({
  imageBase64: z.string().min(10, 'Image data is required'),
  fileName: z.string().trim().optional(),
});

const updateBiometricPreferenceSchema = z.object({
  enabled: z.boolean(),
  deviceId: z.string().trim().optional(),
  deviceName: z.string().trim().optional(),
  biometricType: z.string().trim().optional(),
});

export class PassengerProfileController {
  private getPassengerId(req: Request): string | null {
    return (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id || null;
  }

  /**
   * GET /api/v1/passengers/profile
   * Returns current profile of the authenticated passenger.
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const profile = await passengerProfileService.getProfile(passengerId);
      ApiResponse.success(res, profile, 'Passenger profile retrieved successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to get passenger profile');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve profile');
    }
  }

  /**
   * PATCH /api/v1/passengers/profile
   * Updates personal details (name, city, language, emergency contacts).
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        ApiResponse.badRequest(res, parsed.error.issues[0]?.message || 'Invalid input data');
        return;
      }

      const updated = await passengerProfileService.updateProfile(passengerId, parsed.data);
      ApiResponse.success(res, updated, 'Profile updated successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to update passenger profile');
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code, err.message, err.statusCode);
        return;
      }
      ApiResponse.serverError(res, err.message || 'Unable to update profile');
    }
  }

  /**
   * POST /api/v1/passengers/profile/change-contact/initiate
   * Begins 2-step verification for email or phone change to prevent account takeover.
   */
  async initiateContactChange(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const parsed = initiateContactChangeSchema.safeParse(req.body);
      if (!parsed.success) {
        ApiResponse.badRequest(res, parsed.error.issues[0]?.message || 'Invalid contact input');
        return;
      }

      const result = await passengerProfileService.initiateContactChange(passengerId, parsed.data);
      ApiResponse.success(res, result, result.message);
    } catch (err: any) {
      logger.warn({ err, path: req.originalUrl }, 'Failed to initiate contact change');
      ApiResponse.badRequest(res, err.message || 'Failed to initiate contact change');
    }
  }

  /**
   * POST /api/v1/passengers/profile/change-contact/verify
   * Verifies OTP and applies the contact update to the database.
   */
  async verifyContactChange(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const parsed = verifyContactChangeSchema.safeParse(req.body);
      if (!parsed.success) {
        ApiResponse.badRequest(res, parsed.error.issues[0]?.message || 'Invalid OTP code');
        return;
      }

      const result = await passengerProfileService.verifyContactChange(passengerId, parsed.data);
      ApiResponse.success(res, result, 'Contact updated successfully');
    } catch (err: any) {
      logger.warn({ err, path: req.originalUrl }, 'Failed to verify contact change');
      ApiResponse.badRequest(res, err.message || 'Contact verification failed');
    }
  }

  /**
   * POST /api/v1/passengers/profile-image/upload-signature
   * Generates signed Cloudinary upload params (secure direct client upload without leaking secrets).
   */
  async getCloudinaryUploadSignature(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const sigData = await passengerProfileService.generateCloudinarySignature(passengerId);
      ApiResponse.success(res, sigData, 'Signed Cloudinary upload credentials generated');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to generate Cloudinary signature');
      ApiResponse.serverError(res, err.message || 'Unable to generate upload signature');
    }
  }

  /**
   * PATCH /api/v1/passengers/profile-image
   * Persists Cloudinary image URL to passenger profile.
   */
  async updateProfileImage(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const parsed = updateProfileImageSchema.safeParse(req.body);
      if (!parsed.success) {
        ApiResponse.badRequest(res, parsed.error.issues[0]?.message || 'Invalid image payload');
        return;
      }

      const updated = await passengerProfileService.updateProfileImage(passengerId, parsed.data);
      ApiResponse.success(res, updated, 'Profile image updated successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to update profile image');
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code, err.message, err.statusCode);
        return;
      }
      if (err.message?.startsWith('CONFLICT:')) {
        ApiResponse.error(res, 'CONFLICT', err.message, 409);
        return;
      }
      if (err.message?.startsWith('FORBIDDEN_ASSET:')) {
        ApiResponse.error(res, 'FORBIDDEN', err.message, 403);
        return;
      }
      ApiResponse.serverError(res, err.message || 'Unable to update profile image');
    }
  }

  /**
   * POST /api/v1/passengers/profile-image/upload-direct
   * Accepts image data, uploads to Cloudinary or falls back to server filesystem, and updates profile.
   */
  async uploadDirectProfileImage(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const parsed = uploadDirectImageSchema.safeParse(req.body);
      if (!parsed.success) {
        ApiResponse.badRequest(res, parsed.error.issues[0]?.message || 'Invalid image payload');
        return;
      }

      const hostHeader = req.get('host') || undefined;
      const updated = await passengerProfileService.uploadDirectProfileImage(
        passengerId,
        parsed.data.imageBase64,
        parsed.data.fileName,
        hostHeader
      );

      ApiResponse.success(res, updated, 'Profile image uploaded and persisted successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to upload profile image directly');
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code, err.message, err.statusCode);
        return;
      }
      ApiResponse.serverError(res, err.message || 'Unable to upload profile image');
    }
  }

  /**
   * DELETE /api/v1/passengers/profile-image
   * Clears passenger avatar image.
   */
  async removeProfileImage(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const updated = await passengerProfileService.removeProfileImage(passengerId);
      ApiResponse.success(res, updated, 'Profile image removed successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to remove profile image');
      if (err instanceof AppError) {
        ApiResponse.error(res, err.code, err.message, err.statusCode);
        return;
      }
      ApiResponse.serverError(res, err.message || 'Unable to remove profile image');
    }
  }

  /**
   * GET /api/v1/passengers/security
   * Returns security status (biometrics registered, active sessions).
   */
  async getSecurityInfo(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const info = await passengerProfileService.getSecurityInfo(passengerId);
      ApiResponse.success(res, info, 'Security status retrieved successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to retrieve security info');
      ApiResponse.serverError(res, err.message || 'Unable to retrieve security info');
    }
  }

  /**
   * POST /api/v1/passengers/security/biometric
   * Enables or disables biometric login preference for the device.
   */
  async updateBiometricPreference(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = this.getPassengerId(req);
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const parsed = updateBiometricPreferenceSchema.safeParse(req.body);
      if (!parsed.success) {
        ApiResponse.badRequest(res, parsed.error.issues[0]?.message || 'Invalid biometric preferences');
        return;
      }

      const result = await passengerProfileService.updateBiometricPreference(passengerId, parsed.data);
      ApiResponse.success(res, result, 'Biometric preference updated successfully');
    } catch (err: any) {
      logger.error({ err, path: req.originalUrl }, 'Failed to update biometric preference');
      ApiResponse.serverError(res, err.message || 'Unable to update biometric preference');
    }
  }
}

export const passengerProfileController = new PassengerProfileController();
