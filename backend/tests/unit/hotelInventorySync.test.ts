import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

/**
 * In-memory PostgreSQL/Prisma simulation for verifying atomic date-based
 * Hotel Room Inventory Synchronization without touching any live/production DB.
 */
const { mockPrismaClient, resetInMemoryDb, state } = vi.hoisted(() => {
  const dbState: {
    roomTypes: Map<string, any>;
    inventories: Map<string, any>;
    reservations: Map<string, any>;
    transactions: any[];
    bookings: Map<string, any>;
    payments: Map<string, any>;
    hotels: Map<string, any>;
  } = {
    roomTypes: new Map(),
    inventories: new Map(),
    reservations: new Map(),
    transactions: [],
    bookings: new Map(),
    payments: new Map(),
    hotels: new Map(),
  };

  const toDateStr = (d: Date | string) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().split('T')[0];
  };

  const invKey = (roomTypeId: string, d: Date | string) => `${roomTypeId}:${toDateStr(d)}`;

  const mock: any = {
    hotel: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return dbState.hotels.get(where.id) || null;
        return null;
      }),
    },
    hotelRoomType: {
      findFirst: vi.fn(async ({ where }: any) => {
        for (const rt of dbState.roomTypes.values()) {
          if (where.id && rt.id !== where.id) continue;
          if (where.hotelId && rt.hotelId !== where.hotelId) continue;
          return rt;
        }
        return null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const list: any[] = [];
        for (const rt of dbState.roomTypes.values()) {
          if (where?.hotelId && rt.hotelId !== where.hotelId) continue;
          if (where?.status && rt.status !== where.status) continue;
          list.push({ ...rt, rates: [] });
        }
        return list;
      }),
      findUnique: vi.fn(async ({ where }: any) => dbState.roomTypes.get(where.id) || null),
      update: vi.fn(async ({ where, data }: any) => {
        const rt = dbState.roomTypes.get(where.id);
        if (!rt) throw new Error('ROOM_TYPE_NOT_FOUND');
        const updated = { ...rt, ...data };
        dbState.roomTypes.set(where.id, updated);
        return updated;
      }),
    },
    hotelRoomInventory: {
      upsert: vi.fn(async ({ where, create }: any) => {
        const key = invKey(
          where.roomTypeId_inventoryDate.roomTypeId,
          where.roomTypeId_inventoryDate.inventoryDate
        );
        if (!dbState.inventories.has(key)) {
          dbState.inventories.set(key, {
            id: `inv_${key}`,
            ...create,
            reservedRooms: create.reservedRooms ?? 0,
            confirmedRooms: create.confirmedRooms ?? 0,
            blockedRooms: create.blockedRooms ?? 0,
          });
        }
        return dbState.inventories.get(key);
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const key = invKey(
          where.roomTypeId_inventoryDate.roomTypeId,
          where.roomTypeId_inventoryDate.inventoryDate
        );
        return dbState.inventories.get(key) || null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const rows: any[] = [];
        for (const row of dbState.inventories.values()) {
          if (where?.hotelId && row.hotelId !== where.hotelId) continue;
          if (where?.roomTypeId) {
            if (typeof where.roomTypeId === 'string' && row.roomTypeId !== where.roomTypeId) continue;
            if (where.roomTypeId.in && !where.roomTypeId.in.includes(row.roomTypeId)) continue;
          }
          if (where?.inventoryDate) {
            const dTime = new Date(row.inventoryDate).getTime();
            if (where.inventoryDate.gte && dTime < new Date(where.inventoryDate.gte).getTime()) continue;
            if (where.inventoryDate.lt && dTime >= new Date(where.inventoryDate.lt).getTime()) continue;
            if (where.inventoryDate.lte && dTime > new Date(where.inventoryDate.lte).getTime()) continue;
          }
          rows.push({ ...row });
        }
        return rows;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [k, row] of dbState.inventories.entries()) {
          if (where?.roomTypeId && row.roomTypeId !== where.roomTypeId) continue;
          if (where?.inventoryDate?.gte && new Date(row.inventoryDate).getTime() < new Date(where.inventoryDate.gte).getTime()) {
            continue;
          }
          dbState.inventories.set(k, { ...row, ...data });
          count++;
        }
        return { count };
      }),
    },
    hotelInventoryReservation: {
      create: vi.fn(async ({ data }: any) => {
        const id = `resv_${dbState.reservations.size + 1}`;
        const rec = { id, ...data };
        dbState.reservations.set(id, rec);
        return rec;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const res: any[] = [];
        for (const r of dbState.reservations.values()) {
          if (where?.bookingId && r.bookingId !== where.bookingId) continue;
          if (where?.hotelId && r.hotelId !== where.hotelId) continue;
          if (where?.reservationStatus) {
            if (typeof where.reservationStatus === 'string' && r.reservationStatus !== where.reservationStatus) continue;
            if (where.reservationStatus.in && !where.reservationStatus.in.includes(r.reservationStatus)) continue;
          }
          if (where?.expiresAt?.lte && new Date(r.expiresAt).getTime() > new Date(where.expiresAt.lte).getTime()) {
            continue;
          }
          res.push({ ...r });
        }
        return res;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [id, r] of dbState.reservations.entries()) {
          if (where?.id && r.id !== where.id) continue;
          if (where?.reservationStatus && r.reservationStatus !== where.reservationStatus) continue;
          dbState.reservations.set(id, { ...r, ...data });
          count++;
        }
        return { count };
      }),
    },
    hotelInventoryTransaction: {
      create: vi.fn(async ({ data }: any) => {
        const rec = { id: `tx_${dbState.transactions.length + 1}`, createdAt: new Date(), ...data };
        dbState.transactions.push(rec);
        return rec;
      }),
      upsert: vi.fn(async ({ where, create }: any) => {
        const existing = dbState.transactions.find((t) => t.idempotencyKey === where.idempotencyKey);
        if (existing) return existing;
        const rec = { id: `tx_${dbState.transactions.length + 1}`, createdAt: new Date(), ...create };
        dbState.transactions.push(rec);
        return rec;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return dbState.transactions.filter((t) => (!where?.hotelId || t.hotelId === where.hotelId));
      }),
    },
    hotelBooking: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return dbState.bookings.get(where.id) || null;
        if (where.bookingReference) {
          for (const b of dbState.bookings.values()) {
            if (b.bookingReference === where.bookingReference) return b;
          }
        }
        return null;
      }),
      findMany: vi.fn(async () => []),
      update: vi.fn(async ({ where, data }: any) => {
        let targetKey: string | null = null;
        for (const [k, b] of dbState.bookings.entries()) {
          if ((where.id && b.id === where.id) || (where.bookingReference && b.bookingReference === where.bookingReference)) {
            targetKey = k;
            break;
          }
        }
        if (!targetKey) throw new Error('BOOKING_NOT_FOUND');
        const updated = { ...dbState.bookings.get(targetKey), ...data };
        dbState.bookings.set(targetKey, updated);
        return updated;
      }),
    },
    hotelBookingStatusHistory: {
      create: vi.fn(async ({ data }: any) => data),
    },
    payment: {
      findUnique: vi.fn(async ({ where }: any) => dbState.payments.get(where.transactionReference) || null),
      update: vi.fn(async ({ where, data }: any) => {
        const p = dbState.payments.get(where.transactionReference);
        const updated = { ...p, ...data };
        dbState.payments.set(where.transactionReference, updated);
        return updated;
      }),
    },
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join(' ');
      if (sql.includes('SET "reserved_rooms" = "reserved_rooms" +')) {
        const [qty, roomTypeId, invDate] = values;
        const row = dbState.inventories.get(invKey(roomTypeId, invDate));
        if (!row) return 0;
        const avail = row.totalRooms - row.reservedRooms - row.confirmedRooms - row.blockedRooms;
        if (avail < qty) return 0;
        row.reservedRooms += qty;
        return 1;
      }
      if (sql.includes('"confirmed_rooms" = "confirmed_rooms" +')) {
        const [qty1, qty2, roomTypeId, invDate] = values;
        const row = dbState.inventories.get(invKey(roomTypeId, invDate));
        if (!row) return 0;
        row.reservedRooms = Math.max(0, row.reservedRooms - qty1);
        row.confirmedRooms += qty2;
        return 1;
      }
      if (sql.includes('SET "confirmed_rooms" = GREATEST(0, "confirmed_rooms" -')) {
        const [qty, roomTypeId, invDate] = values;
        const row = dbState.inventories.get(invKey(roomTypeId, invDate));
        if (!row) return 0;
        row.confirmedRooms = Math.max(0, row.confirmedRooms - qty);
        return 1;
      }
      if (sql.includes('SET "reserved_rooms" = GREATEST(0, "reserved_rooms" -')) {
        const [qty, roomTypeId, invDate] = values;
        const row = dbState.inventories.get(invKey(roomTypeId, invDate));
        if (!row) return 0;
        row.reservedRooms = Math.max(0, row.reservedRooms - qty);
        return 1;
      }
      if (sql.includes('SET "blocked_rooms" = "blocked_rooms" +')) {
        const [qty, roomTypeId, invDate] = values;
        const row = dbState.inventories.get(invKey(roomTypeId, invDate));
        if (!row) return 0;
        const avail = row.totalRooms - row.reservedRooms - row.confirmedRooms - row.blockedRooms;
        if (avail < qty) return 0;
        row.blockedRooms += qty;
        return 1;
      }
      if (sql.includes('SET "blocked_rooms" = GREATEST(0, "blocked_rooms" -')) {
        const [qty, roomTypeId, invDate] = values;
        const row = dbState.inventories.get(invKey(roomTypeId, invDate));
        if (!row) return 0;
        row.blockedRooms = Math.max(0, row.blockedRooms - qty);
        return 1;
      }
      return 0;
    }),
  };

  mock.$transaction = vi.fn(async (cb: any) => cb(mock));

  const reset = () => {
    dbState.roomTypes.clear();
    dbState.inventories.clear();
    dbState.reservations.clear();
    dbState.transactions.length = 0;
    dbState.bookings.clear();
    dbState.payments.clear();
    dbState.hotels.clear();
    vi.clearAllMocks();
  };

  return { mockPrismaClient: mock, resetInMemoryDb: reset, state: dbState };
});

vi.mock('../../src/core/database/prisma', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/database/prisma')>();
  return {
    ...actual,
    prisma: mockPrismaClient,
  };
});

vi.mock('../../src/core/audit/audit.service', () => ({
  auditService: {
    record: vi.fn(async () => undefined),
  },
}));

import { inventoryService } from '../../src/modules/hospitality/inventory.service';
import { inventoryEventBus } from '../../src/modules/hospitality/inventoryEvents';
import { reservationExpirationWorker } from '../../src/modules/hospitality/expirationWorker';
import { roomService } from '../../src/modules/hospitality/room.service';
import { hospitalityController } from '../../src/modules/hospitality/hospitality.controller';
import { normalizeBookingStatus } from '../../src/modules/passengers/passengerBookingHistory.service';
import { parseCalendarDate } from '../../src/modules/hospitality/utils/addisDate';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const ROOM_ID = '22222222-2222-4222-8222-222222222222';

function seedStandardRoom(totalInventory = 3, status = 'ACTIVE') {
  state.hotels.set(HOTEL_ID, {
    id: HOTEL_ID,
    name: 'Goha Heritage Hotel',
    status: 'PUBLISHED',
    publicationStatus: 'PUBLISHED',
  });
  state.roomTypes.set(ROOM_ID, {
    id: ROOM_ID,
    hotelId: HOTEL_ID,
    name: 'Deluxe King Room',
    description: 'Panoramic view',
    maximumAdults: 2,
    maximumChildren: 1,
    maximumGuests: 3,
    totalInventory,
    basePricePerNight: 4500,
    currency: 'ETB',
    status,
  });
}

function createMockReqRes(params: any = {}, query: any = {}, body: any = {}, user: any = { sub: 'adm_1', role: 'SUPER_ADMIN' }) {
  const req = { params, query, body, user } as unknown as Request;
  let statusCode = 200;
  let jsonBody: any = null;
  const res = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      jsonBody = data;
      return res;
    }),
  } as unknown as Response;
  return { req, res, getStatus: () => statusCode, getBody: () => jsonBody };
}

describe('Hotel Room Inventory Synchronization System', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('excludes check-out date from stay night dates and computes available rooms accurately', () => {
    const nights = inventoryService.getStayNightDates('2026-12-10', '2026-12-13');
    expect(nights).toEqual(['2026-12-10', '2026-12-11', '2026-12-12']);

    expect(
      inventoryService.computeAvailable({
        totalRooms: 5,
        reservedRooms: 1,
        confirmedRooms: 2,
        blockedRooms: 1,
      })
    ).toBe(1);

    // Never returns negative
    expect(
      inventoryService.computeAvailable({
        totalRooms: 2,
        reservedRooms: 2,
        confirmedRooms: 1,
        blockedRooms: 0,
      })
    ).toBe(0);
  });

  it('atomically reserves inventory across stay nights and prevents concurrent overselling', async () => {
    seedStandardRoom(1);
    const checkIn = parseCalendarDate('2026-12-10');
    const checkOut = parseCalendarDate('2026-12-12');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [attempt1, attempt2] = await Promise.allSettled([
      mockPrismaClient.$transaction((tx: any) =>
        inventoryService.reserveForBooking(tx, {
          bookingId: 'bk_1',
          hotelId: HOTEL_ID,
          roomTypeId: ROOM_ID,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          quantity: 1,
          expiresAt,
          actorId: 'pax_1',
        })
      ),
      mockPrismaClient.$transaction((tx: any) =>
        inventoryService.reserveForBooking(tx, {
          bookingId: 'bk_2',
          hotelId: HOTEL_ID,
          roomTypeId: ROOM_ID,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          quantity: 1,
          expiresAt,
          actorId: 'pax_2',
        })
      ),
    ]);

    const fulfilled = [attempt1, attempt2].filter((r) => r.status === 'fulfilled');
    const rejected = [attempt1, attempt2].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toContain('INSUFFICIENT_INVENTORY');

    const invDec10 = state.inventories.get(`${ROOM_ID}:2026-12-10`);
    const invDec11 = state.inventories.get(`${ROOM_ID}:2026-12-11`);
    const invDec12 = state.inventories.get(`${ROOM_ID}:2026-12-12`);
    expect(invDec10.reservedRooms).toBe(1);
    expect(invDec11.reservedRooms).toBe(1);
    expect(invDec12).toBeUndefined(); // Checkout date not consumed!
  });

  it('transitions RESERVED -> CONFIRMED on payment/admin confirmation and is idempotent on duplicate callbacks', async () => {
    seedStandardRoom(4);
    const checkIn = parseCalendarDate('2026-12-15');
    const checkOut = parseCalendarDate('2026-12-17');

    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.reserveForBooking(tx, {
        bookingId: 'bk_pay_1',
        hotelId: HOTEL_ID,
        roomTypeId: ROOM_ID,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        quantity: 2,
        expiresAt: new Date(Date.now() + 900_000),
      })
    );

    // First confirmation
    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.confirmReservation(tx, 'bk_pay_1', 'PAYMENT_WEBHOOK')
    );

    const row = state.inventories.get(`${ROOM_ID}:2026-12-15`);
    expect(row.reservedRooms).toBe(0);
    expect(row.confirmedRooms).toBe(2);

    // Duplicate webhook confirmation must be a no-op (no double counting)
    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.confirmReservation(tx, 'bk_pay_1', 'PAYMENT_WEBHOOK')
    );
    expect(row.reservedRooms).toBe(0);
    expect(row.confirmedRooms).toBe(2);
  });

  it('restores inventory idempotently on cancellation and rejects confirming expired reservations', async () => {
    seedStandardRoom(3);
    const checkIn = parseCalendarDate('2026-12-20');
    const checkOut = parseCalendarDate('2026-12-22');

    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.reserveForBooking(tx, {
        bookingId: 'bk_cancel_1',
        hotelId: HOTEL_ID,
        roomTypeId: ROOM_ID,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        quantity: 2,
        expiresAt: new Date(Date.now() + 900_000),
      })
    );

    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.releaseReservation(tx, 'bk_cancel_1', 'CANCELLED', 'pax_1')
    );
    const row = state.inventories.get(`${ROOM_ID}:2026-12-20`);
    expect(row.reservedRooms).toBe(0);

    // Duplicate cancel must not go negative or double release
    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.releaseReservation(tx, 'bk_cancel_1', 'CANCELLED', 'pax_1')
    );
    expect(row.reservedRooms).toBe(0);

    // Late confirmation after cancellation/expiration must fail
    await expect(
      mockPrismaClient.$transaction((tx: any) =>
        inventoryService.confirmReservation(tx, 'bk_cancel_1', 'PAYMENT_WEBHOOK')
      )
    ).rejects.toThrow('RESERVATION_CANCELLED');
  });

  it('expires overdue unpaid holds via ReservationExpirationWorker while preserving paid bookings', async () => {
    seedStandardRoom(5);
    const checkIn = parseCalendarDate('2026-12-24');
    const checkOut = parseCalendarDate('2026-12-26');
    const pastExpiry = new Date(Date.now() - 60_000);

    // Unpaid expired booking
    state.bookings.set('bk_expired', {
      id: 'bk_expired',
      bookingReference: 'KT-EXP-1',
      hotelId: HOTEL_ID,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
    });
    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.reserveForBooking(tx, {
        bookingId: 'bk_expired',
        hotelId: HOTEL_ID,
        roomTypeId: ROOM_ID,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        quantity: 2,
        expiresAt: pastExpiry,
      })
    );

    // Paid booking with old expiresAt must NOT be expired
    state.bookings.set('bk_paid', {
      id: 'bk_paid',
      bookingReference: 'KT-PAID-1',
      hotelId: HOTEL_ID,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
    });
    await mockPrismaClient.$transaction((tx: any) =>
      inventoryService.reserveForBooking(tx, {
        bookingId: 'bk_paid',
        hotelId: HOTEL_ID,
        roomTypeId: ROOM_ID,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        quantity: 1,
        expiresAt: pastExpiry,
      })
    );

    const { expiredCount } = await reservationExpirationWorker.processExpiredReservations();
    expect(expiredCount).toBe(1);
    expect(state.bookings.get('bk_expired').bookingStatus).toBe('EXPIRED');
    expect(state.bookings.get('bk_paid').bookingStatus).toBe('CONFIRMED');

    const row = state.inventories.get(`${ROOM_ID}:2026-12-24`);
    expect(row.reservedRooms).toBe(1); // Only bk_paid remains
  });

  it('enforces committed-room guard when adjusting total inventory and supports block/unblock + SSE events', async () => {
    seedStandardRoom(4);
    const events: any[] = [];
    const listener = (evt: any) => events.push(evt);
    inventoryEventBus.on('inventory:sync', listener);

    try {
      const checkIn = parseCalendarDate('2026-12-28');
      const checkOut = parseCalendarDate('2026-12-30');
      await mockPrismaClient.$transaction((tx: any) =>
        inventoryService.reserveForBooking(tx, {
          bookingId: 'bk_guard',
          hotelId: HOTEL_ID,
          roomTypeId: ROOM_ID,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          quantity: 3,
          expiresAt: new Date(Date.now() + 900_000),
        })
      );

      // Cannot reduce totalRooms below 3 committed rooms
      await expect(
        inventoryService.adjustTotalInventory({
          hotelId: HOTEL_ID,
          roomTypeId: ROOM_ID,
          newTotalRooms: 2,
          adminId: 'adm_1',
        })
      ).rejects.toThrow('INVENTORY_BELOW_COMMITTED');

      // Block remaining 1 room for 2026-12-28..2026-12-30
      await inventoryService.setBlockedRooms({
        hotelId: HOTEL_ID,
        roomTypeId: ROOM_ID,
        startDateStr: '2026-12-28',
        endDateStr: '2026-12-30',
        quantity: 1,
        action: 'BLOCK',
        adminId: 'adm_1',
        note: 'AC maintenance',
      });

      // Public availability check must show 0 available rooms on 2026-12-28..2026-12-30
      const avail = await roomService.checkHotelAvailability(HOTEL_ID, '2026-12-28', '2026-12-30', 2, 1);
      expect(avail.roomTypes[0].remainingInventory).toBe(0);
      expect(avail.roomTypes[0].isAvailable).toBe(false);

      // Unblock restores 1 available room
      await inventoryService.setBlockedRooms({
        hotelId: HOTEL_ID,
        roomTypeId: ROOM_ID,
        startDateStr: '2026-12-28',
        endDateStr: '2026-12-30',
        quantity: 1,
        action: 'UNBLOCK',
        adminId: 'adm_1',
      });

      const availAfter = await roomService.checkHotelAvailability(HOTEL_ID, '2026-12-28', '2026-12-30', 2, 1);
      expect(availAfter.roomTypes[0].remainingInventory).toBe(1);
      expect(availAfter.roomTypes[0].isAvailable).toBe(true);

      expect(events.some((e) => e.type === 'INVENTORY_BLOCKED')).toBe(true);
      expect(events.some((e) => e.type === 'INVENTORY_UNBLOCKED')).toBe(true);
    } finally {
      inventoryEventBus.off('inventory:sync', listener);
    }
  });

  it('serves Super Admin inventory controller endpoints cleanly', async () => {
    seedStandardRoom(5);
    const { req, res, getStatus, getBody } = createMockReqRes(
      { id: HOTEL_ID },
      { startDate: '2026-12-10', endDate: '2026-12-12' }
    );
    await hospitalityController.adminGetHotelInventory(req, res);
    expect(getStatus()).toBe(200);
    expect(getBody().success).toBe(true);
    expect(getBody().data.roomTypes[0].totalRooms).toBe(5);
    expect(getBody().data.roomTypes[0].availableRooms).toBe(5);
  });

  it('computes per-room-type availableInventory independently after confirmation and normalizes DECLINED/CONFIRMED statuses', async () => {
    const stdId = '33333333-3333-4333-8333-333333333333';
    const dlxId = '44444444-4444-4444-8444-444444444444';

    // Simulate 2 confirmed rooms on Standard Room only
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dayAfter = new Date();
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 3);

    await mockPrismaClient.hotelRoomInventory.upsert({
      where: { roomTypeId_inventoryDate: { roomTypeId: stdId, inventoryDate: tomorrow } },
      create: {
        hotelId: HOTEL_ID,
        roomTypeId: stdId,
        inventoryDate: tomorrow,
        totalRooms: 10,
        reservedRooms: 0,
        confirmedRooms: 2,
        blockedRooms: 0,
      },
    });

    const availMap = await inventoryService.getRoomTypesAvailabilityMap([
      { id: stdId, totalInventory: 10 },
      { id: dlxId, totalInventory: 5 },
    ]);

    expect(availMap.get(stdId)).toBe(8);
    expect(availMap.get(dlxId)).toBe(5);

    expect(normalizeBookingStatus('HOTEL', 'PENDING')).toBe('PENDING');
    expect(normalizeBookingStatus('HOTEL', 'CONFIRMED')).toBe('CONFIRMED');
    expect(normalizeBookingStatus('HOTEL', 'DECLINED')).toBe('DECLINED');
    expect(normalizeBookingStatus('HOTEL', 'CANCELLED')).toBe('CANCELLED');
    expect(normalizeBookingStatus('HOTEL', 'COMPLETED')).toBe('COMPLETED');

    // Non-UUID hotel IDs (e.g., htl_skylight_addis) must fall back cleanly instead of throwing P2023 UUID error
    const nonUuidAvail = await roomService.checkHotelAvailability(
      'htl_skylight_addis',
      '2026-12-28',
      '2026-12-30',
      2,
      1
    );
    expect(nonUuidAvail.hotelId).toBe('htl_skylight_addis');
    expect(Array.isArray(nonUuidAvail.roomTypes)).toBe(true);
  });
});
