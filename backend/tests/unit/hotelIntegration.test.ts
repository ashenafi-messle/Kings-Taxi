import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaClient } = vi.hoisted(() => {
  const mock: any = {
    hotel: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    hotelImage: {
      create: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    hotelRoomType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    roomImage: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    hotelAmenity: {
      findMany: vi.fn(),
    },
    hotelAmenityRelation: {
      create: vi.fn(),
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
    fileUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/mock-room.jpg',
    publicId: 'room_img_mock123',
    fileFormat: 'jpg',
    fileSize: 4096,
    isUploaded: true,
  }),
}));

import { hotelService } from '../../src/modules/hospitality/hotel.service';
import { roomService } from '../../src/modules/hospitality/room.service';
import { HotelStatus, HotelPublicationStatus, HotelVerificationStatus, HotelCategory, Prisma } from '@prisma/client';

describe('Hotel & Lodge Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validHotelUuid = 'a72498cc-908e-4f4f-8f42-ff288135013c';
  const validRoomUuid = 'bbbbbbbb-1111-4222-8333-cccccccccccc';
  const adminUuid = '11111111-2222-4333-8444-555555555555';

  const mockDbHotel = {
    id: validHotelUuid,
    name: 'Gondar Heritage Castle Hotel',
    slug: 'gondar-heritage-castle-hotel',
    description: 'Premier heritage hotel located near the historic castles of Gondar.',
    shortDescription: 'Luxury lodging near Fasil Ghebbi',
    category: HotelCategory.BOUTIQUE_HERITAGE,
    coverImageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/cover.jpg',
    address: 'Royal Castle Avenue',
    city: 'Gondar',
    subCity: 'Piassa',
    latitude: 12.6078,
    longitude: 37.4705,
    contactPhone: '+251 58 111 2233',
    contactEmail: 'hospitality@gondarheritage.et',
    website: 'https://gondarheritage.et',
    starRating: 5,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    timezone: 'Africa/Addis_Ababa',
    status: HotelStatus.PUBLISHED,
    publicationStatus: HotelPublicationStatus.PUBLISHED,
    verificationStatus: HotelVerificationStatus.APPROVED,
    featured: true,
    publishedAt: new Date(),
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [
      { id: 'img-1', imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/cover.jpg', isCover: true, displayOrder: 0, altText: 'Cover' },
      { id: 'img-2', imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/balcony.jpg', isCover: false, displayOrder: 1, altText: 'Balcony' },
    ],
    amenities: [
      { amenity: { id: 'am-1', name: 'Free High-Speed Wi-Fi', slug: 'free-wifi', icon: 'wifi' } },
      { amenity: { id: 'am-2', name: 'Airport Shuttle', slug: 'airport-shuttle', icon: 'car' } },
    ],
    roomTypes: [
      {
        id: validRoomUuid,
        hotelId: validHotelUuid,
        name: 'Royal Heritage King Suite',
        description: 'Spacious king suite with panoramic castle view.',
        maximumAdults: 2,
        maximumChildren: 1,
        maximumGuests: 3,
        totalInventory: 8,
        basePricePerNight: new Prisma.Decimal(4500.0),
        currency: 'ETB',
        status: 'ACTIVE',
        images: [
          { id: 'rm-img-1', imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/suite-bed.jpg', isPrimary: true, displayOrder: 0 },
          { id: 'rm-img-2', imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/suite-bath.jpg', isPrimary: false, displayOrder: 1 },
        ],
        rates: [],
      },
    ],
    transferRates: [
      {
        id: 'tr-1',
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Hotel Entrance Gate',
        fixedPrice: new Prisma.Decimal(1200.0),
        currency: 'ETB',
        vehicleType: 'STANDARD_SEDAN',
        vehicleCapacity: 4,
        isActive: true,
      },
    ],
  };

  describe('1. Super Admin Hotel Creation & Publication', () => {
    it('creates a published hotel property with approved status when published', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue(null);
      mockPrismaClient.hotel.create.mockResolvedValue(mockDbHotel);

      const created = await hotelService.createHotel(
        {
          name: 'Gondar Heritage Castle Hotel',
          address: 'Royal Castle Avenue',
          city: 'Gondar',
          latitude: 12.6078,
          longitude: 37.4705,
          contactPhone: '+251 58 111 2233',
          description: 'Premier heritage hotel located near the historic castles of Gondar.',
          starRating: 5,
          status: HotelStatus.PUBLISHED,
          publishImmediately: true,
        },
        adminUuid
      );

      expect(mockPrismaClient.hotel.create).toHaveBeenCalled();
      const callArgs = mockPrismaClient.hotel.create.mock.calls[0][0];
      expect(callArgs.data.status).toBe(HotelStatus.PUBLISHED);
      expect(callArgs.data.publicationStatus).toBe(HotelPublicationStatus.PUBLISHED);
      expect(callArgs.data.verificationStatus).toBe(HotelVerificationStatus.APPROVED);
      expect(callArgs.data.city).toBe('Gondar');
      expect(created.id).toBe(validHotelUuid);
    });
  });

  describe('2. Room Type Creation with Images', () => {
    it('creates a room type and associates room gallery images', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue(mockDbHotel);
      mockPrismaClient.hotelRoomType.create.mockResolvedValue({
        id: validRoomUuid,
        hotelId: validHotelUuid,
        name: 'Royal Heritage King Suite',
        totalInventory: 8,
        basePricePerNight: new Prisma.Decimal(4500.0),
      });
      mockPrismaClient.roomImage.create.mockResolvedValue({ id: 'rm-img-1' });
      mockPrismaClient.hotelRoomType.findUnique.mockResolvedValue({
        id: validRoomUuid,
        hotelId: validHotelUuid,
        name: 'Royal Heritage King Suite',
        totalInventory: 8,
        basePricePerNight: new Prisma.Decimal(4500.0),
        images: [
          { id: 'rm-img-1', imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/suite-bed.jpg', isPrimary: true, displayOrder: 0 },
        ],
        rates: [],
      });

      const room = await roomService.createRoomType(validHotelUuid, {
        name: 'Royal Heritage King Suite',
        maximumAdults: 2,
        maximumChildren: 1,
        maximumGuests: 3,
        totalInventory: 8,
        basePricePerNight: 4500,
        currency: 'ETB',
        images: [
          'https://res.cloudinary.com/kings-taxi/image/upload/v1/suite-bed.jpg',
        ],
      });

      expect(mockPrismaClient.hotelRoomType.create).toHaveBeenCalled();
      expect(mockPrismaClient.roomImage.create).toHaveBeenCalled();
      expect(room.id).toBe(validRoomUuid);
    });
  });

  describe('3. Public Hotel Listing (GET /api/v1/hotels)', () => {
    it('retrieves published hotels including starting price and cover image', async () => {
      mockPrismaClient.hotel.findMany.mockResolvedValue([mockDbHotel]);
      mockPrismaClient.hotel.count.mockResolvedValue(1);

      const result = await hotelService.listPublishedHotels({ city: 'Gondar', page: 1, limit: 10 });

      expect(mockPrismaClient.hotel.findMany).toHaveBeenCalled();
      expect(result.hotels.length).toBe(1);
      expect(result.hotels[0].id).toBe(validHotelUuid);
      expect(result.hotels[0].name).toBe('Gondar Heritage Castle Hotel');
      expect(result.hotels[0].startingPrice).toBe(4500);
      expect(result.hotels[0].coverImage).toContain('cover.jpg');
    });

    it('filters out unpublished or archived hotels by status', async () => {
      mockPrismaClient.hotel.findMany.mockResolvedValue([]);
      mockPrismaClient.hotel.count.mockResolvedValue(0);

      const result = await hotelService.listPublishedHotels({ city: 'NonExistentCity' });
      expect(result.hotels.length).toBe(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('4. Hotel Details (GET /api/v1/hotels/:id)', () => {
    it('retrieves published hotel details by valid UUID with room gallery and amenities', async () => {
      mockPrismaClient.hotel.findFirst.mockResolvedValue(mockDbHotel);

      const hotel = await hotelService.getHotelDetails(validHotelUuid, true);

      expect(mockPrismaClient.hotel.findFirst).toHaveBeenCalled();
      expect(hotel).not.toBeNull();
      expect(hotel?.id).toBe(validHotelUuid);
      expect(hotel?.roomTypes.length).toBe(1);
      expect(hotel?.roomTypes[0].photos.length).toBeGreaterThan(0);
      expect(hotel?.amenities.length).toBe(2);
      expect(hotel?.startingPrice).toBe(4500);
    });

    it('returns null for nonexistent UUID', async () => {
      mockPrismaClient.hotel.findFirst.mockResolvedValue(null);

      const hotel = await hotelService.getHotelDetails('00000000-0000-4000-8000-000000000000', true);
      expect(hotel).toBeNull();
    });
  });

  describe('5. Hotel Room Retrieval (GET /api/v1/hotels/:id/rooms)', () => {
    it('retrieves active room types belonging to the specified hotel', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue(mockDbHotel);
      mockPrismaClient.hotelRoomType.findMany.mockResolvedValue(mockDbHotel.roomTypes);

      const rooms = await roomService.getRoomsByHotel(validHotelUuid, true);

      expect(mockPrismaClient.hotel.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.hotelRoomType.findMany).toHaveBeenCalled();
      expect(rooms.length).toBe(1);
      expect(rooms[0].name).toBe('Royal Heritage King Suite');
      expect(rooms[0].basePricePerNight).toBe(4500);
      expect(rooms[0].photos).toContain('https://res.cloudinary.com/kings-taxi/image/upload/v1/suite-bed.jpg');
    });

    it('throws error when hotel does not exist', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue(null);

      await expect(
        roomService.getRoomsByHotel('00000000-0000-4000-8000-000000000000', true)
      ).rejects.toThrow('HOTEL_NOT_FOUND');
    });
  });

  describe('6. Publishing & Unpublishing State Machine', () => {
    it('publishes hotel and sets status to PUBLISHED with verification APPROVED', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue({
        ...mockDbHotel,
        status: HotelStatus.DRAFT,
        publicationStatus: HotelPublicationStatus.DRAFT,
      });
      mockPrismaClient.hotel.update.mockResolvedValue({
        ...mockDbHotel,
        status: HotelStatus.PUBLISHED,
        publicationStatus: HotelPublicationStatus.PUBLISHED,
        verificationStatus: HotelVerificationStatus.APPROVED,
      });

      const published = await hotelService.publishHotel(validHotelUuid, adminUuid);

      expect(mockPrismaClient.hotel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: validHotelUuid },
          data: expect.objectContaining({
            status: HotelStatus.PUBLISHED,
            publicationStatus: HotelPublicationStatus.PUBLISHED,
            verificationStatus: HotelVerificationStatus.APPROVED,
          }),
        })
      );
      expect(published.status).toBe(HotelStatus.PUBLISHED);
    });

    it('unpublishes hotel and sets status to UNPUBLISHED', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue(mockDbHotel);
      mockPrismaClient.hotel.update.mockResolvedValue({
        ...mockDbHotel,
        status: HotelStatus.UNPUBLISHED,
        publicationStatus: HotelPublicationStatus.UNPUBLISHED,
      });

      const unpublished = await hotelService.unpublishHotel(validHotelUuid, adminUuid);

      expect(mockPrismaClient.hotel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: validHotelUuid },
          data: expect.objectContaining({
            status: HotelStatus.UNPUBLISHED,
            publicationStatus: HotelPublicationStatus.UNPUBLISHED,
          }),
        })
      );
      expect(unpublished.status).toBe(HotelStatus.UNPUBLISHED);
    });
  });
});
