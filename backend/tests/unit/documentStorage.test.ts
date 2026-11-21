import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndUploadDocument,
  cleanupUploadedAssets,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../src/utils/documentStorage';
import { CloudinaryService } from '../../src/integrations/cloudinary/cloudinary.service';
import { AppError } from '../../src/core/errors/appError';

describe('Document Storage & Validation Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves valid HTTP and HTTPS URLs without uploading', async () => {
    const httpsUrl = 'https://res.cloudinary.com/kings-taxi/image/upload/v1/drivers/sample.jpg';
    const result = await validateAndUploadDocument(httpsUrl, {
      folder: 'kings-taxi/drivers/test-driver',
    });

    expect(result.isUploaded).toBe(false);
    expect(result.fileUrl).toBe(httpsUrl);
  });

  it('validates and uploads Base64 image data URIs to clean storage URLs', async () => {
    // 1x1 transparent PNG data URI
    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const result = await validateAndUploadDocument(base64Png, {
      folder: 'kings-taxi/drivers/test-driver-1',
      publicIdPrefix: 'license',
    });

    expect(result.isUploaded).toBe(true);
    expect(result.fileUrl).toContain('https://res.cloudinary.com/kings-taxi/image/upload/');
    expect(result.publicId).toBeDefined();
    expect(result.resourceType).toBe('image');
  });

  it('validates and uploads Base64 PDF documents with raw resourceType', async () => {
    // Minimal PDF header
    const base64Pdf = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAE=';

    const result = await validateAndUploadDocument(base64Pdf, {
      folder: 'kings-taxi/drivers/test-driver-2',
      publicIdPrefix: 'police_clearance',
    });

    expect(result.isUploaded).toBe(true);
    expect(result.resourceType).toBe('raw');
  });

  it('rejects unsupported file mime types', async () => {
    const invalidDataUri = 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA=';

    await expect(
      validateAndUploadDocument(invalidDataUri, {
        folder: 'kings-taxi/drivers/test-driver-3',
      })
    ).rejects.toThrow(/Allowed formats are JPG, PNG, WebP, and PDF/);
  });

  it('rejects documents that exceed the 10MB size limit', async () => {
    // Create an oversized declared size
    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    await expect(
      validateAndUploadDocument(base64Png, {
        folder: 'kings-taxi/drivers/test-driver-4',
        declaredSize: MAX_DOCUMENT_SIZE_BYTES + 1024,
      })
    ).rejects.toThrow(/exceeds the 10MB maximum limit/);
  });

  it('successfully executes compensation cleanup for uploaded assets', async () => {
    const deleteSpy = vi.spyOn(CloudinaryService, 'deleteAsset').mockResolvedValue(true);

    await cleanupUploadedAssets([
      { publicId: 'kings-taxi/drivers/drv-1/license_123', resourceType: 'image' },
      { publicId: 'kings-taxi/drivers/drv-1/clearance_456', resourceType: 'raw' },
    ]);

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(deleteSpy).toHaveBeenCalledWith('kings-taxi/drivers/drv-1/license_123', 'image');
    expect(deleteSpy).toHaveBeenCalledWith('kings-taxi/drivers/drv-1/clearance_456', 'raw');
  });
});
