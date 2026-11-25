import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

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

vi.mock('../../src/core/database/prisma', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/database/prisma')>();
  return {
    ...actual,
    prisma: mockPrismaClient,
  };
});

vi.mock('../../src/integrations/cloudinary/cloudinary.service', () => ({
  CloudinaryService: {
    initialize: vi.fn(),
    uploadAsset: vi.fn().mockImplementation(async (_fileData: string, options: any) => {
      const folder = options?.folder || 'kings-taxi/misc';
      const pid = options?.publicId || `asset_${Date.now()}`;
      return {
        url: `https://res.cloudinary.com/kings-taxi/image/upload/v1/${folder}/${pid}.jpg`,
        secureUrl: `https://res.cloudinary.com/kings-taxi/image/upload/v1/${folder}/${pid}.jpg`,
        publicId: `${folder}/${pid}`,
        format: 'jpg',
        bytes: 10240,
        resourceType: 'image',
      };
    }),
    deleteAsset: vi.fn().mockResolvedValue(true),
  },
}));

import { hospitalityController } from '../../src/modules/hospitality/hospitality.controller';
import { authenticateToken, requireRole } from '../../src/core/middleware/auth.middleware';
import { env } from '../../src/config/env';

function createToken(role: 'SUPER_ADMIN' | 'ADMIN' | 'PASSENGER') {
  return jwt.sign(
    { sub: '11111111-1111-4111-8111-111111111111', role, email: 'test@kingstaxi.et' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

function createMockReqRes(overrides: Partial<Request> = {}) {
  const req = {
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;

  const res: any = {
    statusCode: 200,
    body: null,
    locals: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };

  return { req, res: res as Response & { statusCode: number; body: any } };
}

describe('Hospitality API Integration (Admin & Public)', () => {
  const adminToken = createToken('SUPER_ADMIN');
  const passengerToken = createToken('PASSENGER');
  const sampleHotelId = '11111111-2222-4333-8444-555555555555';
  const sampleRoomId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Hotel Endpoints (/api/v1/admin/hotels)', () => {
    it('rejects unauthenticated requests with 401', () => {
      const { req, res } = createMockReqRes();
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects non-admin roles with 403', () => {
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${passengerToken}` },
      });
      const nextAuth = vi.fn();
      authenticateToken(req, res, nextAuth);
      expect(nextAuth).toHaveBeenCalled();

      const nextRole = vi.fn();
      requireRole(['ADMIN', 'SUPER_ADMIN'])(req, res, nextRole);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(nextRole).not.toHaveBeenCalled();
    });

    it('lists hotels without pagination params (GET /api/v1/admin/hotels)', async () => {
      mockPrismaClient.hotel.findMany.mockResolvedValue([
        {
          id: sampleHotelId,
          name: 'Goha Hotel Gondar',
          slug: 'goha-hotel-gondar',
          city: 'Gondar',
          status: 'PUBLISHED',
          publicationStatus: 'PUBLISHED',
          images: [],
          roomTypes: [],
          partner: null,
          _count: { roomTypes: 0, transferRates: 0, hotelBookings: 0 },
        },
      ]);
      mockPrismaClient.hotel.count.mockResolvedValue(1);

      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${adminToken}` },
      });
      await hospitalityController.adminListHotels(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hotels).toHaveLength(1);
      expect(res.body.data.pagination.limit).toBe(20);
    });

    it('lists hotels with limit=100 (GET /api/v1/admin/hotels?limit=100)', async () => {
      mockPrismaClient.hotel.findMany.mockResolvedValue([]);
      mockPrismaClient.hotel.count.mockResolvedValue(0);

      const { req, res } = createMockReqRes({
        query: { limit: '100' },
      });
      await hospitalityController.adminListHotels(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.limit).toBe(100);
    });

    it('returns 400 on invalid pagination parameters', async () => {
      const { req: req1, res: res1 } = createMockReqRes({ query: { limit: '-5' } });
      await hospitalityController.adminListHotels(req1, res1);
      expect(res1.statusCode).toBe(400);

      const { req: req2, res: res2 } = createMockReqRes({ query: { page: 'abc' } });
      await hospitalityController.adminListHotels(req2, res2);
      expect(res2.statusCode).toBe(400);
    });

    it('returns 500 on Prisma query/schema error (does not swallow as mock data)', async () => {
      const schemaErr: any = new Error('The column `hotels.category` does not exist');
      schemaErr.name = 'PrismaClientKnownRequestError';
      schemaErr.code = 'P2022';
      mockPrismaClient.hotel.findMany.mockRejectedValue(schemaErr);

      const { req, res } = createMockReqRes({ query: { limit: '100' } });
      await hospitalityController.adminListHotels(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('returns 503 on genuine database connection error without exposing SSH commands', async () => {
      const connErr: any = new Error("Can't reach database server at `127.0.0.1:15433`");
      connErr.name = 'PrismaClientInitializationError';
      connErr.code = 'P1001';
      mockPrismaClient.hotel.findMany.mockRejectedValue(connErr);

      const { req, res } = createMockReqRes({ query: { limit: '100' } });
      await hospitalityController.adminListHotels(req, res);

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).not.toContain('ssh -N');
      expect(res.body.message).not.toContain('ambelu');
    });

    it('creates a room type and associates isolated images', async () => {
      mockPrismaClient.hotel.findUnique.mockResolvedValue({
        id: sampleHotelId,
        name: 'Fasil Lodge',
      });
      mockPrismaClient.hotelRoomType.create.mockResolvedValue({
        id: sampleRoomId,
        hotelId: sampleHotelId,
        name: 'Royal Suite',
      });
      mockPrismaClient.roomImage.create.mockResolvedValue({
        id: 'img-1',
        roomTypeId: sampleRoomId,
        imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/room.jpg',
        isPrimary: true,
      });
      mockPrismaClient.hotelRoomType.findUnique.mockResolvedValue({
        id: sampleRoomId,
        hotelId: sampleHotelId,
        name: 'Royal Suite',
        basePricePerNight: 6500,
        images: [
          {
            id: 'img-1',
            roomTypeId: sampleRoomId,
            imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/room.jpg',
            isPrimary: true,
          },
        ],
        rates: [],
      });

      const { req, res } = createMockReqRes({
        params: { id: sampleHotelId },
        body: {
          name: 'Royal Suite',
          basePricePerNight: 6500,
          totalInventory: 5,
          images: [{ imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/v1/room.jpg', isPrimary: true }],
        },
      });
      await hospitalityController.adminCreateRoomType(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.images).toHaveLength(1);
    });
  });

  describe('Public Hotel Endpoints (/api/v1/hotels)', () => {
    it('lists published hotels with search filter preserving publication constraint', async () => {
      mockPrismaClient.hotel.findMany.mockResolvedValue([
        {
          id: sampleHotelId,
          name: 'Goha Hotel Gondar',
          slug: 'goha-hotel-gondar',
          description: 'Hilltop hotel',
          shortDescription: 'Hilltop hotel',
          category: 'BOUTIQUE_HERITAGE',
          coverImageUrl: 'https://res.cloudinary.com/kings-taxi/goha.jpg',
          coverImagePublicId: 'kings-taxi/hotels/goha',
          contactPhone: '+251581110000',
          contactEmail: 'info@goha.et',
          address: 'Goha Hill',
          city: 'Gondar',
          subCity: 'Goha',
          latitude: 12.61,
          longitude: 37.47,
          starRating: 4,
          featured: true,
          checkInTime: '14:00',
          checkOutTime: '11:00',
          images: [],
          amenities: [],
          roomTypes: [{ id: sampleRoomId, name: 'Standard', basePricePerNight: 4500, currency: 'ETB', maximumGuests: 2, totalInventory: 10 }],
          transferRates: [],
        },
      ]);
      mockPrismaClient.hotel.count.mockResolvedValue(1);

      const { req, res } = createMockReqRes({ query: { search: 'Goha' } });
      await hospitalityController.listHotels(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hotels).toHaveLength(1);
      const findManyArg = mockPrismaClient.hotel.findMany.mock.calls[0][0];
      expect(findManyArg.where.AND).toBeDefined();
      expect(findManyArg.where.AND.length).toBeGreaterThanOrEqual(3);
    });

    it('returns 500 on Prisma P2022 schema error instead of misleading 503 SSH tunnel message', async () => {
      const schemaErr: any = new Error('The column `hotels.cover_image_public_id` does not exist');
      schemaErr.name = 'PrismaClientKnownRequestError';
      schemaErr.code = 'P2022';
      mockPrismaClient.hotel.findMany.mockRejectedValue(schemaErr);

      const { req, res } = createMockReqRes();
      await hospitalityController.listHotels(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('returns 503 on genuine DB initialization error without exposing SSH credentials', async () => {
      const connErr: any = new Error("Can't reach database server at `127.0.0.1:15433`");
      connErr.name = 'PrismaClientInitializationError';
      connErr.code = 'P1001';
      mockPrismaClient.hotel.findMany.mockRejectedValue(connErr);

      const { req, res } = createMockReqRes();
      await hospitalityController.listHotels(req, res);

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).not.toContain('ambelu');
    });

    it('returns 404 when public hotel detail is not found', async () => {
      mockPrismaClient.hotel.findFirst.mockResolvedValue(null);

      const { req, res } = createMockReqRes({ params: { slugOrId: sampleHotelId } });
      await hospitalityController.getHotelDetails(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns hotel detail with isolated room photos (empty array when room has no images)', async () => {
      mockPrismaClient.hotel.findFirst.mockResolvedValue({
        id: sampleHotelId,
        name: 'Goha Hotel Gondar',
        slug: 'goha-hotel-gondar',
        coverImageUrl: 'https://res.cloudinary.com/kings-taxi/goha-cover.jpg',
        images: [],
        amenities: [],
        roomTypes: [
          {
            id: sampleRoomId,
            name: 'Suite A',
            basePricePerNight: 5000,
            images: [{ imageUrl: 'https://res.cloudinary.com/kings-taxi/suite-a.jpg' }],
            rates: [],
          },
          {
            id: 'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            name: 'Room B (No Images)',
            basePricePerNight: 3000,
            images: [],
            rates: [],
          },
        ],
        transferRates: [],
      });

      const { req, res } = createMockReqRes({ params: { slugOrId: sampleHotelId } });
      await hospitalityController.getHotelDetails(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.roomTypes[0].photos).toEqual(['https://res.cloudinary.com/kings-taxi/suite-a.jpg']);
      expect(res.body.data.roomTypes[1].photos).toEqual([]);
    });
  });
});
