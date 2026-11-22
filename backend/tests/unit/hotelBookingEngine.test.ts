import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaClient } = vi.hoisted(() => {
  const mock: any = {
    hotel: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    hotelRoomType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    hotelBooking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    hotelBookingRoom: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    hotelBookingStatusHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    airportTransferRate: {
      findUnique: vi.fn(),
    },
    auditLog: {
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

vi.mock('../../src/modules/notifications/notification.service', () => ({
  notificationService: {
    sendHotelBookingAcceptedNotification: vi.fn().mockResolvedValue(true),
    sendHotelBookingDeclinedNotification: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../src/core/audit/audit.service', () => ({
  auditService: {
    record: vi.fn().mockResolvedValue(true),
  },
}));

import { HospitalityBookingService } from '../../src/modules/hospitality/booking.service';
import { RoomService } from '../../src/modules/hospitality/room.service';
import { HotelBookingStatus } from '@prisma/client';

describe('Hotel Booking & Concurrency Engine', () => {
  let bookingService: HospitalityBookingService;
  let roomService: RoomService;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingService = new HospitalityBookingService();
    roomService = new RoomService();
  });

  const mockHotel = {
    id: 'h-goha-001',
    name: 'Goha Hotel Gondar',
    slug: 'goha-hotel-gondar',
    city: 'Gondar',
    status: 'PUBLISHED',
  };

  const mockRoomType = {
    id: 'room-deluxe-001',
    hotelId: 'h-goha-001',
    name: 'Deluxe Castle View Room',
    totalInventory: 5,
    basePricePerNight: 5000,
    maximumGuests: 3,
    status: 'ACTIVE',
    rates: [],
  };

  describe('Concurrency & Double-Booking Prevention', () => {
    it('should correctly calculate available inventory when active overlapping bookings exist', async () => {
      mockPrismaClient.hotelRoomType.findMany.mockResolvedValue([mockRoomType]);

      // 2 rooms are already confirmed overlapping [2026-12-01, 2026-12-04]
      mockPrismaClient.hotelBooking.findMany.mockResolvedValue([
        {
          id: 'b-active-1',
          checkInDate: new Date('2026-12-01'),
          checkOutDate: new Date('2026-12-04'),
          bookingStatus: HotelBookingStatus.CONFIRMED,
          bookingRooms: [{ roomTypeId: 'room-deluxe-001', quantity: 2 }],
        },
      ]);

      const result = await roomService.checkHotelAvailability(
        'h-goha-001',
        '2026-12-01',
        '2026-12-04',
        2,
        1
      );

      expect(result.roomTypes.length).toBe(1);
      const evaluated = result.roomTypes[0];
      // Total: 5, Booked: 2 => Available: 3
      expect(evaluated.availableInventory).toBe(3);
      expect(evaluated.isAvailable).toBe(true);
    });

    it('should reject booking if requested room quantity exceeds available inventory', async () => {
      mockPrismaClient.hotel.findFirst.mockResolvedValue(mockHotel);
      mockPrismaClient.hotelRoomType.findFirst.mockResolvedValue(mockRoomType);

      // Overlapping bookings occupy 4 out of 5 rooms
      mockPrismaClient.hotelBooking.findMany.mockResolvedValue([
        {
          id: 'b-active-1',
          bookingStatus: HotelBookingStatus.CONFIRMED,
          bookingRooms: [{ roomTypeId: 'room-deluxe-001', quantity: 4 }],
        },
      ]);

      // User requests 2 rooms, but only 1 is available
      await expect(
        bookingService.createBooking('passenger-uuid-001', {
          hotelId: 'h-goha-001',
          roomTypeId: 'room-deluxe-001',
          checkInDate: '2026-12-10',
          checkOutDate: '2026-12-12',
          numberOfRooms: 2,
        })
      ).rejects.toThrow('INSUFFICIENT_INVENTORY: Only 1 room(s) available for the selected dates. Requested: 2.');
    });

    it('should create booking hold with 15-minute expiration when inventory is available', async () => {
      mockPrismaClient.hotel.findFirst.mockResolvedValue(mockHotel);
      mockPrismaClient.hotelRoomType.findFirst.mockResolvedValue(mockRoomType);
      mockPrismaClient.hotelBooking.findMany.mockResolvedValue([]); // zero conflicting bookings

      mockPrismaClient.hotelBooking.create.mockImplementation((args: any) => ({
        id: args.data.id,
        ...args.data,
      }));

      const booking = await bookingService.createBooking('passenger-uuid-001', {
        hotelId: 'h-goha-001',
        roomTypeId: 'room-deluxe-001',
        checkInDate: '2026-12-20',
        checkOutDate: '2026-12-22',
        numberOfRooms: 1,
      });

      expect(mockPrismaClient.hotelBooking.create).toHaveBeenCalled();
      const createData = mockPrismaClient.hotelBooking.create.mock.calls[0][0].data;
      expect(createData.holdExpiresAt).toBeInstanceOf(Date);
      // Expiration should be in the future (~15 mins)
      expect(createData.holdExpiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(booking.bookingReference).toMatch(/^KT-HTL-/);
    });
  });

  describe('Admin Booking Review Lifecycle', () => {
    it('should accept booking and record status history transition to CONFIRMED', async () => {
      const mockPendingBooking = {
        id: 'booking-pending-01',
        bookingReference: 'KT-HTL-TEST-99',
        hotelId: 'h-goha-001',
        passengerId: 'pax-01',
        bookingStatus: HotelBookingStatus.PENDING,
        checkInDate: new Date('2026-12-20'),
        checkOutDate: new Date('2026-12-22'),
        hotel: mockHotel,
        bookingRooms: [{ roomTypeId: 'room-deluxe-001', quantity: 1, roomType: mockRoomType }],
      };

      mockPrismaClient.hotelBooking.findUnique.mockResolvedValue(mockPendingBooking);
      // No other overlapping bookings
      mockPrismaClient.hotelBooking.findMany.mockResolvedValue([]);
      mockPrismaClient.hotelBooking.update.mockResolvedValue({
        ...mockPendingBooking,
        bookingStatus: HotelBookingStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      const result = await bookingService.adminAcceptBooking(
        'booking-pending-01',
        'admin-001',
        'Confirmed after room physical inspection'
      );

      expect(mockPrismaClient.hotelBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking-pending-01' },
          data: expect.objectContaining({
            bookingStatus: HotelBookingStatus.CONFIRMED,
            reviewedByAdminId: 'admin-001',
            adminReviewNote: 'Confirmed after room physical inspection',
          }),
        })
      );

      // Verify status history creation
      expect(mockPrismaClient.hotelBookingStatusHistory.create).toHaveBeenCalledWith({
        data: {
          hotelBookingId: 'booking-pending-01',
          fromStatus: HotelBookingStatus.PENDING,
          toStatus: HotelBookingStatus.CONFIRMED,
          changedByAdminId: 'admin-001',
          note: 'Confirmed after room physical inspection',
        },
      });

      expect(result.bookingStatus).toBe(HotelBookingStatus.CONFIRMED);
    });

    it('should decline booking with mandatory decline reason and record status history', async () => {
      const mockPendingBooking = {
        id: 'booking-pending-02',
        bookingReference: 'KT-HTL-TEST-98',
        hotelId: 'h-goha-001',
        passengerId: 'pax-01',
        bookingStatus: HotelBookingStatus.PENDING,
        hotel: mockHotel,
        bookingRooms: [{ roomTypeId: 'room-deluxe-001', quantity: 1 }],
      };

      mockPrismaClient.hotelBooking.findUnique.mockResolvedValue(mockPendingBooking);
      mockPrismaClient.hotelBooking.update.mockResolvedValue({
        ...mockPendingBooking,
        bookingStatus: HotelBookingStatus.DECLINED,
        declineReason: 'Hotel renovation underway',
      });

      const result = await bookingService.adminDeclineBooking(
        'booking-pending-02',
        'admin-001',
        'Hotel renovation underway',
        'Contacted hotel GM directly'
      );

      expect(mockPrismaClient.hotelBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking-pending-02' },
          data: expect.objectContaining({
            bookingStatus: HotelBookingStatus.DECLINED,
            declineReason: 'Hotel renovation underway',
          }),
        })
      );

      expect(mockPrismaClient.hotelBookingStatusHistory.create).toHaveBeenCalledWith({
        data: {
          hotelBookingId: 'booking-pending-02',
          fromStatus: HotelBookingStatus.PENDING,
          toStatus: HotelBookingStatus.DECLINED,
          changedByAdminId: 'admin-001',
          note: 'Declined: Hotel renovation underway (Contacted hotel GM directly)',
        },
      });

      expect(result.bookingStatus).toBe(HotelBookingStatus.DECLINED);
    });

    it('should reject decline when decline reason is empty', async () => {
      await expect(
        bookingService.adminDeclineBooking('booking-01', 'admin-001', '   ')
      ).rejects.toThrow('A specific decline reason is required when declining a booking request.');
    });
  });
});
