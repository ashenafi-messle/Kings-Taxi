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
   * Server-side upload method for base64 / dataURI strings or URLs.
   */
  public static async uploadAsset(
    fileData: string,
    options: {
      folder: string;
      publicId?: string;
      resourceType?: 'auto' | 'image' | 'raw';
    }
  ): Promise<{
    url: string;
    secureUrl: string;
    publicId: string;
    format: string;
    bytes: number;
  }> {
    if (!this.isConfigured && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      this.initialize();
    }

    if (!this.isConfigured) {
      // Offline / dev fallback: return dummy or data representation
      const dummyId = options.publicId || `local_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      logger.info({ folder: options.folder, dummyId }, '[CloudinaryService] Returning fallback upload metadata');
      return {
        url: fileData.startsWith('http') ? fileData : `https://res.cloudinary.com/kings-taxi/image/upload/v1/${options.folder}/${dummyId}.jpg`,
        secureUrl: fileData.startsWith('http') ? fileData : `https://res.cloudinary.com/kings-taxi/image/upload/v1/${options.folder}/${dummyId}.jpg`,
        publicId: `${options.folder}/${dummyId}`,
        format: 'jpg',
        bytes: 102400,
      };
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(fileData, {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'auto',
      });

      return {
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format || 'jpg',
        bytes: uploadResult.bytes || 0,
      };
    } catch (error: any) {
      logger.error({ error: error.message, folder: options.folder }, '[CloudinaryService] Upload failed');
      throw error;
    }
  }

  /**
   * Deletes an asset from Cloudinary by public ID.
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
      logger.warn({ error: error.message, publicId }, '[CloudinaryService] Delete asset warning');
      return false;
    }
  }
}

// Initialize on module load
CloudinaryService.initialize();
