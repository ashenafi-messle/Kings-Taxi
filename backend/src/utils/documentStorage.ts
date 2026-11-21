import crypto from 'crypto';
import { AppError } from '../core/errors/appError';
import { logger } from '../core/logging/logger';
import { CloudinaryService } from '../integrations/cloudinary/cloudinary.service';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'pdf',
]);

export interface ProcessedDocumentResult {
  fileUrl: string;
  publicId?: string;
  fileFormat?: string;
  fileSize?: number;
  isUploaded: boolean;
  resourceType?: 'image' | 'raw';
}

export interface UploadedAssetReference {
  publicId: string;
  resourceType?: 'image' | 'raw';
}

/**
 * Validates document size and mime type, and uploads Base64 / Data URI payloads
 * to storage (Cloudinary or resilient fallback) prior to database insertion.
 */
export async function validateAndUploadDocument(
  fileData: string,
  options: {
    folder: string;
    publicIdPrefix?: string;
    fileName?: string;
    declaredFormat?: string;
    declaredSize?: number;
  }
): Promise<ProcessedDocumentResult> {
  if (!fileData || typeof fileData !== 'string') {
    throw new AppError('Document file data is missing or invalid.', 400);
  }

  const trimmed = fileData.trim();

  // If already an HTTP/HTTPS URL, preserve it
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      fileUrl: trimmed,
      publicId: undefined,
      fileFormat: options.declaredFormat || 'url',
      fileSize: options.declaredSize || 0,
      isUploaded: false,
    };
  }

  // Detect Data URI or raw Base64
  const isDataUri = trimmed.startsWith('data:');
  let mimeType = '';
  let extension = '';
  let base64Body = trimmed;

  if (isDataUri) {
    const matches = trimmed.match(/^data:([a-zA-Z0-9_\-\/\.\+]+);base64,(.+)$/);
    if (!matches) {
      throw new AppError('Invalid Data URI format for document upload.', 400);
    }
    mimeType = matches[1].toLowerCase();
    base64Body = matches[2];

    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
      throw new AppError(
        `Invalid document format '${mimeType}'. Allowed formats are JPG, PNG, WebP, and PDF.`,
        400
      );
    }

    if (mimeType === 'application/pdf') {
      extension = 'pdf';
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      extension = 'jpg';
    } else if (mimeType === 'image/png') {
      extension = 'png';
    } else if (mimeType === 'image/webp') {
      extension = 'webp';
    }
  } else {
    // If raw base64 or other string, check filename or declared format
    if (options.fileName) {
      const ext = options.fileName.split('.').pop()?.toLowerCase();
      if (ext && ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
        extension = ext === 'jpeg' ? 'jpg' : ext;
      }
    }
    if (!extension && options.declaredFormat) {
      const cleanFmt = options.declaredFormat.replace(/^\./, '').toLowerCase();
      if (ALLOWED_DOCUMENT_EXTENSIONS.has(cleanFmt)) {
        extension = cleanFmt === 'jpeg' ? 'jpg' : cleanFmt;
      }
    }

    // Default to jpg if image without explicit extension
    if (!extension) {
      extension = 'jpg';
    }
  }

  // Calculate size in bytes
  const padding = (base64Body.endsWith('==') ? 2 : base64Body.endsWith('=') ? 1 : 0);
  const calculatedBytes = Math.ceil((base64Body.length * 3) / 4) - padding;
  const effectiveSize = options.declaredSize && options.declaredSize > 0 ? options.declaredSize : calculatedBytes;

  if (effectiveSize > MAX_DOCUMENT_SIZE_BYTES) {
    throw new AppError(
      `File size (${(effectiveSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 10MB maximum limit.`,
      400
    );
  }

  const isPdf = extension === 'pdf' || mimeType === 'application/pdf';
  const resourceType: 'image' | 'raw' = isPdf ? 'raw' : 'image';
  const uniqueId = `${options.publicIdPrefix || 'doc'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  try {
    const uploadRes = await CloudinaryService.uploadAsset(trimmed, {
      folder: options.folder,
      publicId: uniqueId,
      resourceType,
    });

    return {
      fileUrl: uploadRes.secureUrl || uploadRes.url,
      publicId: uploadRes.publicId,
      fileFormat: uploadRes.format || extension,
      fileSize: uploadRes.bytes || effectiveSize,
      isUploaded: true,
      resourceType,
    };
  } catch (err: any) {
    logger.error({ error: err.message, folder: options.folder }, '[validateAndUploadDocument] Upload failed');
    throw new AppError(`Document upload failed: ${err.message}`, 502);
  }
}

/**
 * Compensation cleanup helper: deletes assets uploaded to storage
 * if a database transaction fails subsequently.
 */
export async function cleanupUploadedAssets(assets: UploadedAssetReference[]): Promise<void> {
  if (!assets || assets.length === 0) return;

  for (const asset of assets) {
    try {
      if (asset.publicId) {
        await CloudinaryService.deleteAsset(asset.publicId, asset.resourceType || 'image');
        logger.info({ publicId: asset.publicId }, '[cleanupUploadedAssets] Successfully rolled back uploaded asset');
      }
    } catch (cleanupErr: any) {
      logger.warn(
        { publicId: asset.publicId, error: cleanupErr.message },
        '[cleanupUploadedAssets] Failed to rollback uploaded asset during transaction compensation'
      );
    }
  }
}
