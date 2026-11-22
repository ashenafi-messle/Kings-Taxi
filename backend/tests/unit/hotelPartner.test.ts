import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaClient } = vi.hoisted(() => {
  const mock: any = {
    hotelPartner: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    hotelPartnerDocument: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    hotel: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));
  return { mockPrismaClient: mock };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrismaClient,
  isDbConnectionError: vi.fn(() => false),
}));

vi.mock('../../src/utils/documentStorage', () => ({
  validateAndUploadDocument: vi.fn().mockResolvedValue({
    fileUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/mock-license.pdf',
    publicId: 'hp_doc_mock123',
    fileFormat: 'pdf',
    fileSize: 2048,
    isUploaded: true,
  }),
}));

import { adminHotelPartnerService } from '../../src/modules/hotel-partners/adminHotelPartner.service';
import { PartnerAccountStatus, PartnerVerificationStatus, HotelDocumentType } from '@prisma/client';

describe('Admin Hotel Partner Management Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPartnerRecord = {
    id: 'hp-uuid-1234',
    partnerCode: 'HP-10001',
    businessName: 'Gondar Heritage Hospitality Group Ltd',
    tradeName: 'Gondar Heritage Hotels',
    contactPerson: 'Alemayehu Tadesse',
    email: 'partners@gondarheritage.et',
    phone: '+251918112233',
    alternativePhone: '+251581112233',
    businessAddress: 'Royal Castle Avenue, P.O. Box 450',
    city: 'Gondar',
    region: 'Amhara',
    country: 'Ethiopia',
    businessLicenseNumber: 'BL-AMH-2024-9812',
    taxIdentificationNumber: '0039485721',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccountNumber: '1000392817293',
    bankAccountName: 'Gondar Heritage Hospitality Group Ltd',
    commissionRate: 10.0,
    profileImageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/profile.jpg',
    status: PartnerAccountStatus.ACTIVE,
    verificationStatus: PartnerVerificationStatus.APPROVED,
    verifiedAt: new Date('2026-01-15T10:00:00.000Z'),
    verifiedByAdminId: 'admin-uuid-001',
    rejectionReason: null,
    internalNotes: 'Operating Goha Hotel and Castle Boutique lodges',
    createdAt: new Date('2026-01-10T08:30:00.000Z'),
    updatedAt: new Date('2026-01-15T10:00:00.000Z'),
    hotels: [
      { id: 'h_goha', name: 'Goha Hotel Gondar', slug: 'goha-hotel-gondar', city: 'Gondar', starRating: 4, status: 'PUBLISHED' },
    ],
    documents: [
      { id: 'doc-1', documentType: 'BUSINESS_LICENSE', documentNumber: 'BL-AMH-2024-9812', status: 'APPROVED', verifiedAt: new Date() },
    ],
  };

  describe('listPartners', () => {
    it('should retrieve a paginated list of hotel partners with metrics', async () => {
      mockPrismaClient.hotelPartner.count.mockResolvedValue(1);
      mockPrismaClient.hotelPartner.findMany.mockResolvedValue([mockPartnerRecord]);

      const result = await adminHotelPartnerService.listPartners({ page: 1, limit: 10 });

      expect(mockPrismaClient.hotelPartner.count).toHaveBeenCalled();
      expect(mockPrismaClient.hotelPartner.findMany).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].partnerCode).toBe('HP-10001');
      expect(result.items[0].totalHotels).toBe(1);
      expect(result.items[0].totalDocuments).toBe(1);
    });

    it('should filter partners by status and verification status', async () => {
      mockPrismaClient.hotelPartner.count.mockResolvedValue(1);
      mockPrismaClient.hotelPartner.findMany.mockResolvedValue([mockPartnerRecord]);

      await adminHotelPartnerService.listPartners({
        status: 'ACTIVE',
        verificationStatus: 'APPROVED',
        city: 'Gondar',
      });

      const findManyArg = mockPrismaClient.hotelPartner.findMany.mock.calls[0][0];
      expect(findManyArg.where.status).toBe('ACTIVE');
      expect(findManyArg.where.verificationStatus).toBe('APPROVED');
      expect(findManyArg.where.city).toEqual({ contains: 'Gondar', mode: 'insensitive' });
    });
  });

  describe('getPartnerById', () => {
    it('should return partner details when found', async () => {
      mockPrismaClient.hotelPartner.findUnique.mockResolvedValue(mockPartnerRecord);

      const partner = await adminHotelPartnerService.getPartnerById('hp-uuid-1234');

      expect(mockPrismaClient.hotelPartner.findUnique).toHaveBeenCalledWith({
        where: { id: 'hp-uuid-1234' },
        include: {
          hotels: {
            include: {
              roomTypes: {
                select: {
                  id: true,
                  name: true,
                  totalInventory: true,
                  basePricePerNight: true,
                  status: true,
                },
              },
            },
          },
          documents: true,
        },
      });
      expect(partner.id).toBe('hp-uuid-1234');
      expect(partner.commissionRate).toBe(10.0);
    });

    it('should throw 404 AppError when partner does not exist', async () => {
      mockPrismaClient.hotelPartner.findUnique.mockResolvedValue(null);

      await expect(adminHotelPartnerService.getPartnerById('non-existent-id')).rejects.toThrow(
        'Hotel partner not found.'
      );
    });
  });

  describe('createPartner', () => {
    it('should successfully register a new hotel partner with auto-generated code', async () => {
      mockPrismaClient.hotelPartner.findFirst.mockResolvedValue(null);
      mockPrismaClient.hotelPartner.create.mockImplementation((args: any) => ({
        id: 'new-partner-uuid',
        ...args.data,
      }));

      const newPartner = await adminHotelPartnerService.createPartner({
        businessName: 'Simien Highland Resorts PLC',
        contactPerson: 'Kassahun Bekele',
        email: 'info@simienresorts.et',
        phone: '+251918776655',
        businessAddress: 'Debark Road, Gondar',
        city: 'Gondar',
        commissionRate: 12.5,
      });

      expect(mockPrismaClient.hotelPartner.create).toHaveBeenCalled();
      const createData = mockPrismaClient.hotelPartner.create.mock.calls[0][0].data;
      expect(createData.partnerCode).toMatch(/^HP-\d{5}$/);
      expect(createData.status).toBe('PENDING');
      expect(createData.verificationStatus).toBe('PENDING');
      expect(newPartner.businessName).toBe('Simien Highland Resorts PLC');
    });

    it('should reject creation when email already exists', async () => {
      mockPrismaClient.hotelPartner.findFirst.mockResolvedValue({
        email: 'partners@gondarheritage.et',
        phone: '+251911000000',
      });

      await expect(
        adminHotelPartnerService.createPartner({
          businessName: 'Duplicate Entity',
          contactPerson: 'Someone',
          email: 'partners@gondarheritage.et',
          phone: '+251999999999',
          businessAddress: 'Addis Ababa',
        })
      ).rejects.toThrow('A partner with this email address already exists.');
    });
  });

  describe('verifyPartner', () => {
    it('should approve partner verification and transition status to ACTIVE', async () => {
      mockPrismaClient.hotelPartner.findUnique.mockResolvedValue(mockPartnerRecord);
      mockPrismaClient.hotelPartner.update.mockResolvedValue({
        ...mockPartnerRecord,
        verificationStatus: 'APPROVED',
        status: 'ACTIVE',
        verifiedAt: new Date(),
        verifiedByAdminId: 'admin-super-1',
      });

      const verified = await adminHotelPartnerService.verifyPartner(
        'hp-uuid-1234',
        PartnerVerificationStatus.APPROVED,
        'admin-super-1'
      );

      expect(mockPrismaClient.hotelPartner.update).toHaveBeenCalledWith({
        where: { id: 'hp-uuid-1234' },
        data: {
          verificationStatus: 'APPROVED',
          status: 'ACTIVE',
          verifiedAt: expect.any(Date),
          verifiedByAdminId: 'admin-super-1',
          rejectionReason: null,
        },
      });
      expect(verified.verificationStatus).toBe('APPROVED');
      expect(verified.status).toBe('ACTIVE');
    });

    it('should require rejection reason when rejecting verification', async () => {
      await expect(
        adminHotelPartnerService.verifyPartner(
          'hp-uuid-1234',
          PartnerVerificationStatus.REJECTED,
          'admin-1',
          ''
        )
      ).rejects.toThrow('A rejection reason is required when rejecting a partner verification.');
    });
  });

  describe('uploadPartnerDocument', () => {
    it('should upload document to Cloudinary and attach record', async () => {
      mockPrismaClient.hotelPartnerDocument.create.mockResolvedValue({
        id: 'doc-uuid-567',
        partnerId: 'hp-uuid-1234',
        documentType: HotelDocumentType.BUSINESS_LICENSE,
        documentUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/mock-license.pdf',
        publicId: 'hp_doc_mock123',
        status: 'PENDING_REVIEW',
      });

      const doc = await adminHotelPartnerService.uploadPartnerDocument('hp-uuid-1234', {
        documentType: HotelDocumentType.BUSINESS_LICENSE,
        documentNumber: 'BL-2026-90',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQK...',
        fileName: 'license.pdf',
      });

      expect(doc.id).toBe('doc-uuid-567');
      expect(doc.documentUrl).toContain('mock-license.pdf');
    });
  });

  describe('getPartnerStats', () => {
    it('should aggregate partner platform counts for dashboard metrics', async () => {
      mockPrismaClient.hotelPartner.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(12) // active
        .mockResolvedValueOnce(3); // pending
      mockPrismaClient.hotel.count.mockResolvedValueOnce(24);

      const stats = await adminHotelPartnerService.getPartnerStats();

      expect(stats.totalPartners).toBe(15);
      expect(stats.activePartners).toBe(12);
      expect(stats.pendingPartners).toBe(3);
      expect(stats.totalHotels).toBe(24);
    });
  });
});
