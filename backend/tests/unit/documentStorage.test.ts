import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndUploadDocument,
  cleanupUploadedAssets,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../src/utils/documentStorage';
import { CloudinaryService } from '../../src/integrations/cloudinary/cloudinary.service';
import { v2 as cloudinary } from 'cloudinary';

describe('Document Storage & Validation Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves valid HTTP and HTTPS URLs without uploading', async () => {
    const httpsUrl = 'https://res.cloudinary.com/kings-taxi/image/upload/v1/drivers/sample.jpg';
    const result = await validateAndUploadDocument(httpsUrl, {
      folder: 'kings-taxi/drivers/test-driver/documents',
    });

    expect(result.isUploaded).toBe(false);
    expect(result.fileUrl).toBe(httpsUrl);
  });

  it('validates and uploads Base64 image data URIs to clean storage URLs', async () => {
    vi.spyOn(CloudinaryService, 'uploadAsset').mockResolvedValue({
      secureUrl: 'https://res.cloudinary.com/oxzqogef/image/upload/v1/license.png',
      url: 'http://res.cloudinary.com/oxzqogef/image/upload/v1/license.png',
      publicId: 'kings-taxi/drivers/test-driver-1/documents/license_123',
      format: 'png',
      bytes: 68,
      resourceType: 'image',
    });

    // 1x1 transparent PNG data URI
    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const result = await validateAndUploadDocument(base64Png, {
      folder: 'kings-taxi/drivers/test-driver-1/documents',
      publicIdPrefix: 'license',
    });

    expect(result.isUploaded).toBe(true);
    expect(result.fileUrl).toContain('https://res.cloudinary.com/');
    expect(result.publicId).toBeDefined();
    expect(result.resourceType).toBe('image');
  });

  it('validates and uploads Base64 PDF documents with raw resourceType', async () => {
    vi.spyOn(CloudinaryService, 'uploadAsset').mockResolvedValue({
      secureUrl: 'https://res.cloudinary.com/oxzqogef/raw/upload/v1/police.pdf',
      url: 'http://res.cloudinary.com/oxzqogef/raw/upload/v1/police.pdf',
      publicId: 'kings-taxi/drivers/test-driver-2/documents/police_clearance_123',
      format: 'pdf',
      bytes: 1024,
      resourceType: 'raw',
    });

    // Minimal PDF header
    const base64Pdf = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAE=';

    const result = await validateAndUploadDocument(base64Pdf, {
      folder: 'kings-taxi/drivers/test-driver-2/documents',
      publicIdPrefix: 'police_clearance',
    });

    expect(result.isUploaded).toBe(true);
    expect(result.resourceType).toBe('raw');
  });

  it('rejects unsupported file mime types with HTTP 400', async () => {
    const invalidDataUri = 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA=';

    await expect(
      validateAndUploadDocument(invalidDataUri, {
        folder: 'kings-taxi/drivers/test-driver-3/documents',
      })
    ).rejects.toThrow(/Allowed formats are JPG, PNG, WebP, and PDF/);
  });

  it('rejects documents that exceed the 10MB size limit with HTTP 400', async () => {
    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    await expect(
      validateAndUploadDocument(base64Png, {
        folder: 'kings-taxi/drivers/test-driver-4/documents',
        declaredSize: MAX_DOCUMENT_SIZE_BYTES + 1024,
      })
    ).rejects.toThrow(/exceeds the 10MB maximum limit/);
  });

  it('seamlessly falls back to authorized preset when signed upload receives 403', async () => {
    (CloudinaryService as any).isConfigured = true;

    // Simulate Cloudinary SDK returning 403 on signed upload
    const uploadSpy = vi.spyOn(cloudinary.uploader, 'upload').mockRejectedValue({
      message: '[prodenv:18a8829be8f05ed658c27ee59ba55f] Request forbidden due to missing permissions (actions=["create"])',
      http_code: 403,
      name: 'UnexpectedResponse',
    });

    const unsignedSpy = vi.spyOn(cloudinary.uploader, 'unsigned_upload').mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/oxzqogef/image/upload/v1/kings-taxi/drivers/fallback.png',
      url: 'http://res.cloudinary.com/oxzqogef/image/upload/v1/kings-taxi/drivers/fallback.png',
      public_id: 'kings-taxi/drivers/fallback',
      format: 'png',
      bytes: 68,
      resource_type: 'image',
    } as any);

    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const result = await CloudinaryService.uploadAsset(base64Png, {
      folder: 'kings-taxi/drivers/d1/documents',
      publicId: 'license_test',
      resourceType: 'image',
      preset: 'kings_passenger_avatars',
    });

    expect(uploadSpy).toHaveBeenCalled();
    expect(unsignedSpy).toHaveBeenCalled();
    expect(result.secureUrl).toBe('https://res.cloudinary.com/oxzqogef/image/upload/v1/kings-taxi/drivers/fallback.png');
    expect(result.publicId).toBe('kings-taxi/drivers/fallback');
  });

  it('generates secure, expiring signed delivery URLs for private documents', () => {
    const signedUrl = CloudinaryService.generateSignedDeliveryUrl('kings-taxi/drivers/d1/documents/license_123', {
      resourceType: 'image',
      expiresInSeconds: 1800,
    });

    expect(signedUrl).toBeDefined();
    expect(typeof signedUrl).toBe('string');
    expect(signedUrl).toContain('kings-taxi/drivers/d1/documents/license_123');
  });

  it('successfully executes compensation cleanup for uploaded assets', async () => {
    const deleteSpy = vi.spyOn(CloudinaryService, 'deleteAsset').mockResolvedValue(true);

    await cleanupUploadedAssets([
      { publicId: 'kings-taxi/drivers/drv-1/documents/license_123', resourceType: 'image' },
      { publicId: 'kings-taxi/drivers/drv-1/documents/clearance_456', resourceType: 'raw' },
    ]);

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(deleteSpy).toHaveBeenCalledWith('kings-taxi/drivers/drv-1/documents/license_123', 'image');
    expect(deleteSpy).toHaveBeenCalledWith('kings-taxi/drivers/drv-1/documents/clearance_456', 'raw');
  });

  it('safely handles delete permission failure during rollback without throwing', async () => {
    (CloudinaryService as any).isConfigured = true;

    vi.spyOn(cloudinary.uploader, 'destroy').mockRejectedValue({
      message: 'Server returned unexpected status code - 403',
      http_code: 403,
    });

    const success = await CloudinaryService.deleteAsset('kings-taxi/drivers/drv-1/documents/sample', 'image');
    expect(success).toBe(false); // Does not throw, returns false gracefully
  });
});
