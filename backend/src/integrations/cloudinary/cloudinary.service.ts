import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';
import { logger } from '../../core/logging/logger';

export interface CloudinarySignaturePayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
}

export interface CloudinaryUploadOptions {
  folder: string;
  publicId?: string;
  resourceType?: 'auto' | 'image' | 'raw';
  preset?: string;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  resourceType: string;
}

export class CloudinaryService {
  private static isConfigured: boolean = false;

  public static initialize(): void {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.isConfigured = true;
      logger.info(
        { cloudName: env.CLOUDINARY_CLOUD_NAME },
        '[CloudinaryService] Configured Cloudinary SDK successfully'
      );
    } else {
      logger.warn(
        '[CloudinaryService] CLOUDINARY_CLOUD_NAME, API_KEY or API_SECRET is missing. Running in local/mock upload fallback mode.'
      );
    }
  }

  /**
   * Generates a signed Cloudinary upload authorization for direct upload from the web/mobile client.
   * Client receives signature and can POST directly to https://api.cloudinary.com/v1_1/<cloud_name>/auto/upload
   * without exposing API_SECRET.
   */
  public static generateUploadSignature(
    folder: string = 'kings-taxi/documents',
    publicIdPrefix?: string
  ): CloudinarySignaturePayload {
    const timestamp = Math.round(Date.now() / 1000);
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const publicId = publicIdPrefix ? `${publicIdPrefix}_${timestamp}_${uniqueSuffix}` : undefined;

    let paramsToSign = '';
    if (publicId) {
      paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    } else {
      paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    }

    const apiSecret = env.CLOUDINARY_API_SECRET || 'dev_cloudinary_secret';
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME || 'kings-taxi',
      apiKey: env.CLOUDINARY_API_KEY || 'dev_key',
      timestamp,
      signature,
      folder,
      publicId,
    };
  }

  /**
   * Server-side upload method for Base64, Data URI strings, or remote URLs.
   * Features automatic dual-tier execution:
   * 1. Attempts signed upload via Cloudinary SDK.
   * 2. If signed upload is rejected (e.g. HTTP 403 when API key has restricted create permissions),
   *    automatically falls back to authorized upload preset without interruption.
   */
  public static async uploadAsset(
    fileData: string,
    options: CloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> {
    if (!fileData || typeof fileData !== 'string') {
      throw new Error('INVALID_IMAGE_DATA: Image payload is required.');
    }

    if (fileData.startsWith('data:')) {
      const mimeMatch = fileData.match(/^data:([^;]+);base64,/);
      const mime = mimeMatch?.[1]?.toLowerCase() || '';
      if (options.resourceType === 'image' && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
        throw new Error(`UNSUPPORTED_IMAGE_FORMAT: Unsupported image MIME type '${mime}'. Allowed: JPEG, PNG, WEBP.`);
      }
      const approxBytes = Math.ceil((fileData.length * 3) / 4);
      if (approxBytes > 10 * 1024 * 1024) {
        throw new Error('IMAGE_TOO_LARGE: Image size exceeds 10MB upload limit.');
      }
    }

    if (!this.isConfigured && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      this.initialize();
    }

    if (!this.isConfigured) {
      if (env.NODE_ENV === 'production') {
        throw new Error('CLOUDINARY_NOT_CONFIGURED: Cloudinary credentials are missing in production environment.');
      }
      // Offline / dev fallback: return dummy or data representation
      const dummyId = options.publicId || `local_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      logger.info({ folder: options.folder, dummyId }, '[CloudinaryService] Returning fallback upload metadata');
      const fallbackExt = options.resourceType === 'raw' ? 'pdf' : 'jpg';
      return {
        url: fileData.startsWith('http')
          ? fileData
          : `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME || 'kings-taxi'}/image/upload/v1/${options.folder}/${dummyId}.${fallbackExt}`,
        secureUrl: fileData.startsWith('http')
          ? fileData
          : `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME || 'kings-taxi'}/image/upload/v1/${options.folder}/${dummyId}.${fallbackExt}`,
        publicId: `${options.folder}/${dummyId}`,
        format: fallbackExt,
        bytes: 102400,
        resourceType: options.resourceType || 'image',
      };
    }

    const effectiveResourceType = options.resourceType || 'auto';
    const preset = options.preset || env.CLOUDINARY_UPLOAD_PRESET || 'kings_passenger_avatars';

    // Tier 1: Attempt standard signed upload first
    try {
      const uploadResult = await cloudinary.uploader.upload(fileData, {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: effectiveResourceType,
        tags: options.tags,
      });

      logger.info(
        { publicId: uploadResult.public_id, format: uploadResult.format, resourceType: uploadResult.resource_type },
        '[CloudinaryService] Signed upload successful'
      );

      return {
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format || (effectiveResourceType === 'raw' ? 'pdf' : 'jpg'),
        bytes: uploadResult.bytes || 0,
        resourceType: uploadResult.resource_type || effectiveResourceType,
      };
    } catch (signedErr: any) {
      const isForbiddenOrMissingPermissions =
        signedErr.http_code === 403 ||
        signedErr.message?.includes('403') ||
        signedErr.message?.includes('permissions') ||
        signedErr.message?.includes('Request forbidden');

      // Tier 2: Seamless fallback to authorized upload preset
      if (isForbiddenOrMissingPermissions && preset) {
        logger.warn(
          { folder: options.folder, preset },
          '[CloudinaryService] Signed upload returned 403 (API key restricted). Performing upload using authorized preset.'
        );

        try {
          const presetResult = await cloudinary.uploader.unsigned_upload(fileData, preset, {
            folder: options.folder,
            public_id: options.publicId,
            resource_type: effectiveResourceType,
            tags: options.tags,
          });

          logger.info(
            { publicId: presetResult.public_id, format: presetResult.format, resourceType: presetResult.resource_type },
            '[CloudinaryService] Preset upload successful'
          );

          return {
            url: presetResult.url,
            secureUrl: presetResult.secure_url,
            publicId: presetResult.public_id,
            format: presetResult.format || (effectiveResourceType === 'raw' ? 'pdf' : 'jpg'),
            bytes: presetResult.bytes || 0,
            resourceType: presetResult.resource_type || effectiveResourceType,
          };
        } catch (presetErr: any) {
          logger.error(
            { error: presetErr.message, httpCode: presetErr.http_code, folder: options.folder },
            '[CloudinaryService] Preset upload failed'
          );
          throw presetErr;
        }
      }

      logger.error(
        { error: signedErr.message, httpCode: signedErr.http_code, folder: options.folder },
        '[CloudinaryService] Upload failed'
      );
      throw signedErr;
    }
  }

  /**
   * Generates a signed, expiring delivery URL for private or restricted access to documents.
   */
  public static generateSignedDeliveryUrl(
    publicId: string,
    options?: {
      resourceType?: 'image' | 'raw';
      format?: string;
      expiresInSeconds?: number;
    }
  ): string {
    const resourceType = options?.resourceType || 'image';
    const expiresIn = options?.expiresInSeconds || 3600; // 1 hour default
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    try {
      if (options?.format) {
        return cloudinary.utils.private_download_url(publicId, options.format, {
          resource_type: resourceType,
          expires_at: expiresAt,
        });
      }
      return cloudinary.url(publicId, {
        secure: true,
        sign_url: true,
        resource_type: resourceType,
        expires_at: expiresAt,
      });
    } catch (err: any) {
      logger.warn({ publicId, error: err.message }, '[CloudinaryService] Failed generating signed delivery URL, returning secure URL');
      return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME || 'kings-taxi'}/${resourceType}/upload/${publicId}`;
    }
  }

  /**
   * Deletes an asset from Cloudinary by public ID.
   * Gracefully handles restricted API keys without disrupting database transactions.
   */
  public static async deleteAsset(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<boolean> {
    if (!this.isConfigured && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      this.initialize();
    }

    if (!this.isConfigured) {
      logger.info({ publicId }, '[CloudinaryService] Mock deleted asset');
      return true;
    }

    try {
      const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return res.result === 'ok';
    } catch (error: any) {
      logger.warn(
        { error: error.message, httpCode: error.http_code, publicId },
        '[CloudinaryService] Delete asset warning (non-fatal compensation notice)'
      );
      return false;
    }
  }
}

// Initialize on module load
CloudinaryService.initialize();
