import crypto from 'crypto';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB limit per image
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export interface ProcessedImageResult {
  imageUrl: string;
  publicId?: string;
  fileFormat?: string;
  fileSize?: number;
  caption?: string | null;
  displayOrder?: number;
  isPrimary?: boolean;
}

export class HospitalityImageService {
  /**
   * Validates format and size, and uploads a single image (Data URI, Base64, or remote URL) to Cloudinary.
   */
  static async processImage(
    imageData: string,
    options: {
      folder: string;
      publicIdPrefix: string;
      caption?: string | null;
      displayOrder?: number;
      isPrimary?: boolean;
    }
  ): Promise<ProcessedImageResult> {
    if (!imageData || typeof imageData !== 'string') {
      throw new AppError('Image data is missing or invalid.', 400);
    }

    const trimmed = imageData.trim();

    // If already an HTTP/HTTPS remote URL (e.g. Unsplash or Cloudinary), preserve it directly
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return {
        imageUrl: trimmed,
        publicId: undefined,
        fileFormat: 'url',
        fileSize: 0,
        caption: options.caption || null,
        displayOrder: options.displayOrder || 0,
        isPrimary: options.isPrimary ?? false,
      };
    }

    let mimeType = 'image/jpeg';
    let extension = 'jpg';
    let base64Body = trimmed;

    if (trimmed.startsWith('data:')) {
      const matches = trimmed.match(/^data:([a-zA-Z0-9_\-\/\.\+]+);base64,(.+)$/);
      if (!matches) {
        throw new AppError('Invalid Data URI format for image upload.', 400);
      }
      mimeType = matches[1].toLowerCase();
      base64Body = matches[2];

      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        throw new AppError(
          `Invalid image format '${mimeType}'. Allowed formats: JPEG, JPG, PNG, and WebP.`,
          400
        );
      }

      if (mimeType === 'image/png') extension = 'png';
      else if (mimeType === 'image/webp') extension = 'webp';
      else extension = 'jpg';
    }

    // Size verification
    const padding = (base64Body.endsWith('==') ? 2 : base64Body.endsWith('=') ? 1 : 0);
    const calculatedBytes = Math.ceil((base64Body.length * 3) / 4) - padding;

    if (calculatedBytes > MAX_IMAGE_SIZE_BYTES) {
      throw new AppError(
        `Image file size (${(calculatedBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the 8MB maximum limit.`,
        400
      );
    }

    const cleanFolder = options.folder.replace(/[^a-zA-Z0-9_\-\/]/g, '-');
    const cleanPrefix = options.publicIdPrefix.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const uniquePublicId = `${cleanPrefix}_${uniqueSuffix}`;

    try {
      const uploadRes = await CloudinaryService.uploadAsset(trimmed, {
        folder: cleanFolder,
        publicId: uniquePublicId,
        resourceType: 'image',
      });

      return {
        imageUrl: uploadRes.secureUrl || uploadRes.url,
        publicId: uploadRes.publicId,
        fileFormat: uploadRes.format || extension,
        fileSize: uploadRes.bytes || calculatedBytes,
        caption: options.caption || null,
        displayOrder: options.displayOrder || 0,
        isPrimary: options.isPrimary ?? false,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error(
        { error: err.message, folder: options.folder, publicIdPrefix: options.publicIdPrefix },
        '[HospitalityImageService] Cloudinary image upload failed'
      );
      throw new AppError(`Failed to upload image to storage provider: ${err.message}`, 502);
    }
  }

  /**
   * Safely deletes an asset from Cloudinary. Never throws so it doesn't disrupt database transactions.
   */
  static async safeDelete(publicId?: string | null): Promise<boolean> {
    if (!publicId || publicId.startsWith('local_')) return true;
    try {
      await CloudinaryService.deleteAsset(publicId, 'image');
      logger.info({ publicId }, '[HospitalityImageService] Successfully deleted image from Cloudinary');
      return true;
    } catch (err: any) {
      logger.warn({ publicId, error: err.message }, '[HospitalityImageService] Non-fatal error deleting Cloudinary asset');
      return false;
    }
  }
}
