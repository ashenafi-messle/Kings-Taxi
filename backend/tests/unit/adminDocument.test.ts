import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentReviewStatus, DriverVerificationStatus, VehicleVerificationStatus } from '@prisma/client';

const { mockPrismaClient } = vi.hoisted(() => {
  const mock: any = {
    driver: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    driverDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    vehicleDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    driverStatusHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));
  return { mockPrismaClient: mock };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrismaClient,
  isDbConnectionError: vi.fn(() => false),
}));

import { adminDocumentService } from '../../src/modules/documents/adminDocument.service';
import { AppError } from '../../src/core/errors/appError';

const prismaMock = mockPrismaClient;

describe('AdminDocumentService Unit Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  describe('formatDocument', () => {
    it('generates canonical metadata, previewUrl and downloadUrl for driver document', () => {
      const rawDoc = {
        id: 'doc-101',
        driverId: 'drv-1',
        documentType: 'DRIVING_LICENSE',
        documentNumber: 'DL-987654',
        fileUrl: 'https://res.cloudinary.com/oxzqogef/raw/upload/v1/license.pdf',
        publicId: 'license_abc',
        fileFormat: 'pdf',
        fileSize: 204800,
        status: DocumentReviewStatus.PENDING_REVIEW,
        createdAt: new Date('2026-11-20T10:00:00Z'),
        updatedAt: new Date('2026-11-20T10:00:00Z'),
      };

      const formatted = adminDocumentService.formatDocument(rawDoc, 'DRIVER');

      expect(formatted.id).toBe('doc-101');
      expect(formatted.entityType).toBe('DRIVER');
      expect(formatted.previewUrl).toBe('/api/v1/admin/documents/doc-101/preview');
      expect(formatted.downloadUrl).toBe('/api/v1/admin/documents/doc-101/download');
      expect(formatted.fileFormat).toBe('pdf');
      expect(formatted.fileName).toBe('driving_license.pdf');
    });

    it('handles image documents and assigns correct extension', () => {
      const rawDoc = {
        id: 'doc-102',
        vehicleId: 'veh-1',
        documentType: 'INSURANCE_CERTIFICATE',
        fileUrl: 'https://res.cloudinary.com/oxzqogef/image/upload/v1/insurance.jpg',
        fileFormat: 'jpg',
        status: DocumentReviewStatus.APPROVED,
      };

      const formatted = adminDocumentService.formatDocument(rawDoc, 'VEHICLE');

      expect(formatted.id).toBe('doc-102');
      expect(formatted.entityType).toBe('VEHICLE');
      expect(formatted.fileFormat).toBe('jpg');
      expect(formatted.previewUrl).toBe('/api/v1/admin/documents/doc-102/preview');
      expect(formatted.downloadUrl).toBe('/api/v1/admin/documents/doc-102/download');
    });
  });

  describe('getDocumentById', () => {
    it('retrieves driver document if found in driverDocument table', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue({
        id: 'doc-drv-1',
        driverId: 'drv-1',
        documentType: 'NATIONAL_ID',
        fileUrl: 'https://res.cloudinary.com/oxzqogef/image/upload/v1/id.jpg',
        fileFormat: 'jpg',
        status: DocumentReviewStatus.PENDING_REVIEW,
      });

      const result = await adminDocumentService.getDocumentById('doc-drv-1');
      expect(result.id).toBe('doc-drv-1');
      expect(result.entityType).toBe('DRIVER');
      expect(prismaMock.driverDocument.findUnique).toHaveBeenCalledWith({ where: { id: 'doc-drv-1' } });
    });

    it('retrieves vehicle document if not found in driverDocument table', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue(null);
      prismaMock.vehicleDocument.findUnique.mockResolvedValue({
        id: 'doc-veh-1',
        vehicleId: 'veh-1',
        documentType: 'REGISTRATION_CERTIFICATE',
        fileUrl: 'https://res.cloudinary.com/oxzqogef/image/upload/v1/libre.jpg',
        fileFormat: 'jpg',
        status: DocumentReviewStatus.PENDING_REVIEW,
      });

      const result = await adminDocumentService.getDocumentById('doc-veh-1');
      expect(result.id).toBe('doc-veh-1');
      expect(result.entityType).toBe('VEHICLE');
    });

    it('throws AppError 404 if document does not exist anywhere', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue(null);
      prismaMock.vehicleDocument.findUnique.mockResolvedValue(null);

      await expect(adminDocumentService.getDocumentById('non-existent')).rejects.toThrow(AppError);
    });
  });

  describe('reviewDocument', () => {
    it('throws 400 if rejecting without a rejection reason', async () => {
      await expect(
        adminDocumentService.reviewDocument('doc-1', {
          status: DocumentReviewStatus.REJECTED,
          rejectionReason: '',
          adminIdentifier: 'admin@kingstaxi.com',
        })
      ).rejects.toThrow('Rejection reason is required when rejecting a document');
    });

    it('approves driver document and sets driver verificationStatus to APPROVED when all mandatory docs are approved', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue({
        id: 'doc-lic',
        driverId: 'drv-42',
        documentType: 'DRIVING_LICENSE',
        status: DocumentReviewStatus.PENDING_REVIEW,
      });

      prismaMock.driverDocument.update.mockResolvedValue({
        id: 'doc-lic',
        driverId: 'drv-42',
        documentType: 'DRIVING_LICENSE',
        status: DocumentReviewStatus.APPROVED,
        reviewedBy: 'admin@kingstaxi.com',
        reviewedAt: new Date(),
      });

      // All mandatory docs: DRIVING_LICENSE, NATIONAL_ID, POLICE_CLEARANCE are APPROVED
      prismaMock.driverDocument.findMany.mockResolvedValue([
        { id: 'doc-lic', documentType: 'DRIVING_LICENSE', status: DocumentReviewStatus.APPROVED },
        { id: 'doc-id', documentType: 'NATIONAL_ID', status: DocumentReviewStatus.APPROVED },
        { id: 'doc-pol', documentType: 'POLICE_CLEARANCE', status: DocumentReviewStatus.APPROVED },
      ]);

      prismaMock.driver.update.mockResolvedValue({
        id: 'drv-42',
        verificationStatus: DriverVerificationStatus.APPROVED,
      });

      const res = await adminDocumentService.reviewDocument('doc-lic', {
        status: DocumentReviewStatus.APPROVED,
        adminIdentifier: 'admin@kingstaxi.com',
      });

      expect(res.document.status).toBe(DocumentReviewStatus.APPROVED);
      expect(res.overallStatus).toBe(DriverVerificationStatus.APPROVED);
      expect(prismaMock.driver.update).toHaveBeenCalledWith({
        where: { id: 'drv-42' },
        data: { verificationStatus: DriverVerificationStatus.APPROVED },
      });
      expect(prismaMock.driverStatusHistory.create).toHaveBeenCalled();
    });

    it('sets driver verificationStatus to REJECTED if any document is REJECTED', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue({
        id: 'doc-lic',
        driverId: 'drv-42',
        documentType: 'DRIVING_LICENSE',
        status: DocumentReviewStatus.PENDING_REVIEW,
      });

      prismaMock.driverDocument.update.mockResolvedValue({
        id: 'doc-lic',
        driverId: 'drv-42',
        documentType: 'DRIVING_LICENSE',
        status: DocumentReviewStatus.REJECTED,
        rejectionReason: 'Blurry photo of license',
      });

      prismaMock.driverDocument.findMany.mockResolvedValue([
        { id: 'doc-lic', documentType: 'DRIVING_LICENSE', status: DocumentReviewStatus.REJECTED },
        { id: 'doc-id', documentType: 'NATIONAL_ID', status: DocumentReviewStatus.APPROVED },
      ]);

      prismaMock.driver.update.mockResolvedValue({
        id: 'drv-42',
        verificationStatus: DriverVerificationStatus.REJECTED,
      });

      const res = await adminDocumentService.reviewDocument('doc-lic', {
        status: DocumentReviewStatus.REJECTED,
        rejectionReason: 'Blurry photo of license',
        adminIdentifier: 'admin@kingstaxi.com',
      });

      expect(res.document.status).toBe(DocumentReviewStatus.REJECTED);
      expect(res.overallStatus).toBe(DriverVerificationStatus.REJECTED);
      expect(prismaMock.driver.update).toHaveBeenCalledWith({
        where: { id: 'drv-42' },
        data: { verificationStatus: DriverVerificationStatus.REJECTED },
      });
    });

    it('keeps driver verificationStatus as PENDING when some mandatory documents are still pending', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue({
        id: 'doc-lic',
        driverId: 'drv-42',
        documentType: 'DRIVING_LICENSE',
        status: DocumentReviewStatus.PENDING_REVIEW,
      });

      prismaMock.driverDocument.update.mockResolvedValue({
        id: 'doc-lic',
        driverId: 'drv-42',
        documentType: 'DRIVING_LICENSE',
        status: DocumentReviewStatus.APPROVED,
      });

      // POLICE_CLEARANCE is still PENDING_REVIEW
      prismaMock.driverDocument.findMany.mockResolvedValue([
        { id: 'doc-lic', documentType: 'DRIVING_LICENSE', status: DocumentReviewStatus.APPROVED },
        { id: 'doc-id', documentType: 'NATIONAL_ID', status: DocumentReviewStatus.APPROVED },
        { id: 'doc-pol', documentType: 'POLICE_CLEARANCE', status: DocumentReviewStatus.PENDING_REVIEW },
      ]);

      prismaMock.driver.update.mockResolvedValue({
        id: 'drv-42',
        verificationStatus: DriverVerificationStatus.PENDING,
      });

      const res = await adminDocumentService.reviewDocument('doc-lic', {
        status: DocumentReviewStatus.APPROVED,
        adminIdentifier: 'admin@kingstaxi.com',
      });

      expect(res.overallStatus).toBe(DriverVerificationStatus.PENDING);
      expect(prismaMock.driver.update).toHaveBeenCalledWith({
        where: { id: 'drv-42' },
        data: { verificationStatus: DriverVerificationStatus.PENDING },
      });
    });

    it('approves vehicle document and sets vehicle verificationStatus to VERIFIED when all mandatory docs are approved', async () => {
      prismaMock.driverDocument.findUnique.mockResolvedValue(null);
      prismaMock.vehicleDocument.findUnique.mockResolvedValue({
        id: 'doc-ins',
        vehicleId: 'veh-99',
        documentType: 'INSURANCE_CERTIFICATE',
        status: DocumentReviewStatus.PENDING_REVIEW,
      });

      prismaMock.vehicleDocument.update.mockResolvedValue({
        id: 'doc-ins',
        vehicleId: 'veh-99',
        documentType: 'INSURANCE_CERTIFICATE',
        status: DocumentReviewStatus.APPROVED,
        reviewedBy: 'admin@kingstaxi.com',
      });

      prismaMock.vehicleDocument.findMany.mockResolvedValue([
        { id: 'doc-reg', documentType: 'REGISTRATION_CERTIFICATE', status: DocumentReviewStatus.APPROVED },
        { id: 'doc-ins', documentType: 'INSURANCE_CERTIFICATE', status: DocumentReviewStatus.APPROVED },
        { id: 'doc-inspec', documentType: 'ANNUAL_INSPECTION_BOLO', status: DocumentReviewStatus.APPROVED },
      ]);

      prismaMock.vehicle.update.mockResolvedValue({
        id: 'veh-99',
        verificationStatus: VehicleVerificationStatus.VERIFIED,
      });

      const res = await adminDocumentService.reviewDocument('doc-ins', {
        status: DocumentReviewStatus.APPROVED,
        adminIdentifier: 'admin@kingstaxi.com',
      });

      expect(res.document.status).toBe(DocumentReviewStatus.APPROVED);
      expect(res.overallStatus).toBe(VehicleVerificationStatus.VERIFIED);
      expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'veh-99' },
        data: { verificationStatus: VehicleVerificationStatus.VERIFIED },
      });
    });
  });
});
