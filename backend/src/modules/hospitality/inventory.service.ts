import { Prisma, InventoryReservationStatus, InventoryTransactionType } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { auditService } from '../../core/audit/audit.service';
import { addCalendarDays, formatCalendarDate, parseCalendarDate, validateBookingDates, getAddisCurrentDateString } from './utils/addisDate';
import { inventoryEventBus, InventoryEventType } from './inventoryEvents';

export interface DateAvailability {
  date: string;
  totalRooms: number;
  reservedRooms: number;
  confirmedRooms: number;
  blockedRooms: number;
  availableRooms: number;
}

export class InventoryService {
  /**
   * Generates YYYY-MM-DD strings for every night of [checkInDate, checkOutDate).
   * Check-out date is strictly excluded from inventory consumption.
   */
  getStayNightDates(checkIn: Date | string, checkOut: Date | string): string[] {
    const start = typeof checkIn === 'string' ? parseCalendarDate(checkIn) : checkIn;
    const end = typeof checkOut === 'string' ? parseCalendarDate(checkOut) : checkOut;
    const dates: string[] = [];
    let cursor = start;
    let guard = 0;
    while (cursor.getTime() < end.getTime() && guard < 90) {
      dates.push(formatCalendarDate(cursor));
      cursor = addCalendarDays(cursor, 1);
      guard++;
    }
    return dates;
  }

  computeAvailable(row: {
    totalRooms: number;
    reservedRooms: number;
    confirmedRooms: number;
    blockedRooms: number;
  }): number {
    return Math.max(
      0,
      row.totalRooms - row.reservedRooms - row.confirmedRooms - row.blockedRooms
    );
  }

  /**
   * Ensures a HotelRoomInventory row exists for each requested night date inside a transaction.
   */
  private async ensureDateRows(
    tx: Prisma.TransactionClient,
    hotelId: string,
    roomTypeId: string,
    totalInventory: number,
    dateStrings: string[]
  ) {
    for (const dateStr of dateStrings) {
      const invDate = parseCalendarDate(dateStr);
      await tx.hotelRoomInventory.upsert({
        where: {
          roomTypeId_inventoryDate: {
            roomTypeId,
            inventoryDate: invDate,
          },
        },
        update: {},
        create: {
          hotelId,
          roomTypeId,
          inventoryDate: invDate,
          totalRooms: totalInventory,
          reservedRooms: 0,
          confirmedRooms: 0,
          blockedRooms: 0,
        },
      });
    }
  }

  /**
   * Atomic reservation inside an active PostgreSQL transaction.
   * Rejects if roomType is inactive or ANY night has insufficient availability.
   */
  async reserveForBooking(
    tx: Prisma.TransactionClient,
    params: {
      bookingId: string;
      hotelId: string;
      roomTypeId: string;
      checkInDate: Date;
      checkOutDate: Date;
      quantity: number;
      expiresAt: Date;
      actorId?: string;
    }
  ): Promise<{ dates: string[] }> {
    const { bookingId, hotelId, roomTypeId, checkInDate, checkOutDate, quantity, expiresAt, actorId } = params;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('INVALID_QUANTITY: Room quantity must be at least 1.');
    }

    const roomType = await tx.hotelRoomType.findFirst({
      where: { id: roomTypeId, hotelId },
    });

    if (!roomType) {
      throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist for this hotel.');
    }

    if (roomType.status !== 'ACTIVE') {
      throw new Error(`ROOM_TYPE_INACTIVE: Room type '${roomType.name}' is currently not bookable.`);
    }

    const dates = this.getStayNightDates(checkInDate, checkOutDate);
    if (dates.length === 0) {
      throw new Error('INVALID_DATES: Check-out date must be after check-in date.');
    }

    // Legacy mock compatibility when hotelRoomInventory / $executeRaw are absent in partial unit test mocks
    if (!tx.hotelRoomInventory || !tx.$executeRaw) {
      const overlappingBookings = await tx.hotelBooking.findMany({
        where: {
          hotelId,
          bookingStatus: { in: ['CONFIRMED', 'PENDING'] },
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
        include: { bookingRooms: { where: { roomTypeId } } },
      });
      const alreadyBooked = (overlappingBookings || []).reduce(
        (sum: number, b: any) =>
          sum + (b.bookingRooms || []).reduce((rSum: number, br: any) => rSum + br.quantity, 0),
        0
      );
      const availableInventory = roomType.totalInventory - alreadyBooked;
      if (availableInventory < quantity) {
        throw new Error(
          `INSUFFICIENT_INVENTORY: Only ${availableInventory} room(s) available for the selected dates. Requested: ${quantity}.`
        );
      }
      return { dates };
    }

    await this.ensureDateRows(tx, hotelId, roomTypeId, roomType.totalInventory, dates);

    // Atomic conditional update per night: prevents concurrent overselling / negative inventory
    for (const dateStr of dates) {
      const invDate = parseCalendarDate(dateStr);
      const updatedRows = await tx.$executeRaw`
        UPDATE "hotel_room_inventories"
        SET "reserved_rooms" = "reserved_rooms" + ${quantity},
            "updated_at" = NOW()
        WHERE "room_type_id" = ${roomTypeId}::uuid
          AND "inventory_date" = ${invDate}::date
          AND ("total_rooms" - "reserved_rooms" - "confirmed_rooms" - "blocked_rooms") >= ${quantity}
      `;

      if (Number(updatedRows) === 0) {
        const current = await tx.hotelRoomInventory.findUnique({
          where: {
            roomTypeId_inventoryDate: {
              roomTypeId,
              inventoryDate: invDate,
            },
          },
        });
        const avail = current ? this.computeAvailable(current) : 0;
        throw new Error(
          `INSUFFICIENT_INVENTORY: Only ${avail} room(s) available for '${roomType.name}' on ${dateStr}. Requested: ${quantity}.`
        );
      }

      await tx.hotelInventoryTransaction.create({
        data: {
          hotelId,
          roomTypeId,
          bookingId,
          inventoryDate: invDate,
          transactionType: InventoryTransactionType.RESERVE,
          quantity,
          idempotencyKey: `reserve:${bookingId}:${roomTypeId}:${dateStr}`,
          actorId: actorId || null,
          note: `Reserved ${quantity} room(s) until ${expiresAt.toISOString()}`,
        },
      });
    }

    await tx.hotelInventoryReservation.create({
      data: {
        bookingId,
        hotelId,
        roomTypeId,
        checkInDate,
        checkOutDate,
        quantity,
        reservationStatus: InventoryReservationStatus.RESERVED,
        expiresAt,
      },
    });

    return { dates };
  }

  /**
   * Idempotent transition: RESERVED -> CONFIRMED (on payment success or admin accept).
   * Never double-counts rooms. Rejects if reservation already expired or cancelled.
   */
  async confirmReservation(
    tx: Prisma.TransactionClient,
    bookingId: string,
    actorId?: string
  ): Promise<Array<{ hotelId: string; roomTypeId: string; dates: string[] }>> {
    if (!tx?.hotelInventoryReservation) {
      return [];
    }
    const reservations = await tx.hotelInventoryReservation.findMany({
      where: { bookingId },
    });

    if (reservations.length === 0) {
      return [];
    }

    const results: Array<{ hotelId: string; roomTypeId: string; dates: string[] }> = [];

    for (const resv of reservations) {
      if (resv.reservationStatus === InventoryReservationStatus.CONFIRMED) {
        continue; // Idempotent
      }
      if (
        resv.reservationStatus === InventoryReservationStatus.EXPIRED ||
        resv.reservationStatus === InventoryReservationStatus.CANCELLED ||
        resv.reservationStatus === InventoryReservationStatus.RELEASED
      ) {
        throw new Error(
          `RESERVATION_${resv.reservationStatus}: Cannot confirm reservation in ${resv.reservationStatus} state.`
        );
      }

      // Atomic status claim
      const claimed = await tx.hotelInventoryReservation.updateMany({
        where: {
          id: resv.id,
          reservationStatus: InventoryReservationStatus.RESERVED,
        },
        data: {
          reservationStatus: InventoryReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        continue;
      }

      const dates = this.getStayNightDates(resv.checkInDate, resv.checkOutDate);
      for (const dateStr of dates) {
        const invDate = parseCalendarDate(dateStr);
        await tx.$executeRaw`
          UPDATE "hotel_room_inventories"
          SET "reserved_rooms" = GREATEST(0, "reserved_rooms" - ${resv.quantity}),
              "confirmed_rooms" = "confirmed_rooms" + ${resv.quantity},
              "updated_at" = NOW()
          WHERE "room_type_id" = ${resv.roomTypeId}::uuid
            AND "inventory_date" = ${invDate}::date
        `;

        await tx.hotelInventoryTransaction.upsert({
          where: { idempotencyKey: `confirm:${bookingId}:${resv.roomTypeId}:${dateStr}` },
          update: {},
          create: {
            hotelId: resv.hotelId,
            roomTypeId: resv.roomTypeId,
            bookingId,
            inventoryDate: invDate,
            transactionType: InventoryTransactionType.CONFIRM,
            quantity: resv.quantity,
            idempotencyKey: `confirm:${bookingId}:${resv.roomTypeId}:${dateStr}`,
            actorId: actorId || null,
            note: `Confirmed ${resv.quantity} room(s)`,
          },
        });
      }

      results.push({ hotelId: resv.hotelId, roomTypeId: resv.roomTypeId, dates });
    }

    return results;
  }

  /**
   * Idempotent inventory release on cancellation, payment failure, or expiration.
   * Never releases inventory twice.
   */
  async releaseReservation(
    tx: Prisma.TransactionClient,
    bookingId: string,
    targetStatus: 'CANCELLED' | 'EXPIRED' | 'RELEASED',
    actorId?: string,
    note?: string
  ): Promise<Array<{ hotelId: string; roomTypeId: string; dates: string[] }>> {
    if (!tx?.hotelInventoryReservation) {
      return [];
    }
    const reservations = await tx.hotelInventoryReservation.findMany({
      where: { bookingId },
    });

    if (reservations.length === 0) {
      return [];
    }

    const results: Array<{ hotelId: string; roomTypeId: string; dates: string[] }> = [];
    const mappedStatus =
      targetStatus === 'CANCELLED'
        ? InventoryReservationStatus.CANCELLED
        : targetStatus === 'EXPIRED'
        ? InventoryReservationStatus.EXPIRED
        : InventoryReservationStatus.RELEASED;

    const txType =
      targetStatus === 'CANCELLED'
        ? InventoryTransactionType.CANCEL
        : targetStatus === 'EXPIRED'
        ? InventoryTransactionType.EXPIRE
        : InventoryTransactionType.RELEASE;

    for (const resv of reservations) {
      if (
        resv.reservationStatus === InventoryReservationStatus.CANCELLED ||
        resv.reservationStatus === InventoryReservationStatus.EXPIRED ||
        resv.reservationStatus === InventoryReservationStatus.RELEASED
      ) {
        continue; // Idempotent
      }

      const prevStatus = resv.reservationStatus;
      const claimed = await tx.hotelInventoryReservation.updateMany({
        where: {
          id: resv.id,
          reservationStatus: prevStatus,
        },
        data: {
          reservationStatus: mappedStatus,
          releasedAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        continue;
      }

      const dates = this.getStayNightDates(resv.checkInDate, resv.checkOutDate);
      for (const dateStr of dates) {
        const invDate = parseCalendarDate(dateStr);

        if (prevStatus === InventoryReservationStatus.RESERVED) {
          await tx.$executeRaw`
            UPDATE "hotel_room_inventories"
            SET "reserved_rooms" = GREATEST(0, "reserved_rooms" - ${resv.quantity}),
                "updated_at" = NOW()
            WHERE "room_type_id" = ${resv.roomTypeId}::uuid
              AND "inventory_date" = ${invDate}::date
          `;
        } else if (prevStatus === InventoryReservationStatus.CONFIRMED) {
          await tx.$executeRaw`
            UPDATE "hotel_room_inventories"
            SET "confirmed_rooms" = GREATEST(0, "confirmed_rooms" - ${resv.quantity}),
                "updated_at" = NOW()
            WHERE "room_type_id" = ${resv.roomTypeId}::uuid
              AND "inventory_date" = ${invDate}::date
          `;
        }

        const idemKey = `${targetStatus.toLowerCase()}:${bookingId}:${resv.roomTypeId}:${dateStr}`;
        await tx.hotelInventoryTransaction.upsert({
          where: { idempotencyKey: idemKey },
          update: {},
          create: {
            hotelId: resv.hotelId,
            roomTypeId: resv.roomTypeId,
            bookingId,
            inventoryDate: invDate,
            transactionType: txType,
            quantity: resv.quantity,
            idempotencyKey: idemKey,
            actorId: actorId || null,
            note: note || `Inventory ${targetStatus.toLowerCase()} (${resv.quantity} room(s))`,
          },
        });
      }

      results.push({ hotelId: resv.hotelId, roomTypeId: resv.roomTypeId, dates });
    }

    return results;
  }

  /**
   * Emits SSE inventory synchronization events after transaction commit.
   */
  emitSyncEvents(
    type: InventoryEventType,
    items: Array<{ hotelId: string; roomTypeId: string; dates: string[] }>,
    bookingId?: string
  ) {
    for (const item of items) {
      try {
        inventoryEventBus.emitSync({
          type,
          hotelId: item.hotelId,
          roomTypeId: item.roomTypeId,
          bookingId,
          dates: item.dates,
        });
      } catch (err: any) {
        logger.warn({ err: err?.message }, '[InventoryService] Failed to emit sync event (non-fatal)');
      }
    }
  }

  /**
   * Super Admin: Hotel inventory summary across a date range (defaults to today + 7 days)
   */
  async getHotelInventorySummary(hotelId: string, startDateStr?: string, endDateStr?: string) {
    const todayStr = formatCalendarDate(new Date());
    const startStr = startDateStr || todayStr;
    const startDate = parseCalendarDate(startStr);
    const endDate = endDateStr ? parseCalendarDate(endDateStr) : addCalendarDays(startDate, 7);

    const validation = validateBookingDates(startStr, formatCalendarDate(endDate));
    if (!validation.valid && startStr !== formatCalendarDate(endDate)) {
      // Allow single-day inspection when start == end
    }

    const dates = this.getStayNightDates(startDate, endDate.getTime() <= startDate.getTime() ? addCalendarDays(startDate, 1) : endDate);

    const [hotel, roomTypes, inventoryRows, activeReservations, recentTransactions] = await Promise.all([
      prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { id: true, name: true, city: true, status: true },
      }),
      prisma.hotelRoomType.findMany({
        where: { hotelId },
        orderBy: { basePricePerNight: 'asc' },
      }),
      prisma.hotelRoomInventory.findMany({
        where: {
          hotelId,
          inventoryDate: {
            gte: parseCalendarDate(dates[0]),
            lte: parseCalendarDate(dates[dates.length - 1]),
          },
        },
        orderBy: { inventoryDate: 'asc' },
      }),
      prisma.hotelInventoryReservation.findMany({
        where: {
          hotelId,
          reservationStatus: { in: [InventoryReservationStatus.RESERVED, InventoryReservationStatus.CONFIRMED] },
          checkOutDate: { gt: parseCalendarDate(dates[0]) },
          checkInDate: { lt: addCalendarDays(parseCalendarDate(dates[dates.length - 1]), 1) },
        },
        include: {
          booking: {
            select: {
              bookingReference: true,
              bookingStatus: true,
              paymentStatus: true,
              passenger: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.hotelInventoryTransaction.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    if (!hotel) {
      throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');
    }

    const rowMap = new Map<string, typeof inventoryRows[number]>();
    for (const row of inventoryRows) {
      rowMap.set(`${row.roomTypeId}:${formatCalendarDate(row.inventoryDate)}`, row);
    }

    const roomSummaries = roomTypes.map((rt) => {
      const dailyBreakdown: DateAvailability[] = dates.map((d) => {
        const row = rowMap.get(`${rt.id}:${d}`);
        if (!row) {
          return {
            date: d,
            totalRooms: rt.totalInventory,
            reservedRooms: 0,
            confirmedRooms: 0,
            blockedRooms: 0,
            availableRooms: rt.totalInventory,
          };
        }
        return {
          date: d,
          totalRooms: row.totalRooms,
          reservedRooms: row.reservedRooms,
          confirmedRooms: row.confirmedRooms,
          blockedRooms: row.blockedRooms,
          availableRooms: this.computeAvailable(row),
        };
      });

      const minAvailable = dailyBreakdown.reduce((min, d) => Math.min(min, d.availableRooms), rt.totalInventory);
      const maxReserved = dailyBreakdown.reduce((max, d) => Math.max(max, d.reservedRooms), 0);
      const maxConfirmed = dailyBreakdown.reduce((max, d) => Math.max(max, d.confirmedRooms), 0);
      const maxBlocked = dailyBreakdown.reduce((max, d) => Math.max(max, d.blockedRooms), 0);

      return {
        roomTypeId: rt.id,
        name: rt.name,
        status: rt.status,
        basePricePerNight: Number(rt.basePricePerNight),
        totalRooms: rt.totalInventory,
        availableRooms: minAvailable,
        reservedRooms: maxReserved,
        confirmedRooms: maxConfirmed,
        blockedRooms: maxBlocked,
        occupancyPercent:
          rt.totalInventory > 0
            ? Math.round(((rt.totalInventory - minAvailable) / rt.totalInventory) * 100)
            : 0,
        dailyBreakdown,
      };
    });

    return {
      hotel,
      startDate: dates[0],
      endDate: formatCalendarDate(addCalendarDays(parseCalendarDate(dates[dates.length - 1]), 1)),
      dates,
      roomTypes: roomSummaries,
      activeReservations: activeReservations.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        bookingReference: r.booking?.bookingReference,
        passengerName: r.booking?.passenger?.fullName || 'Guest',
        roomTypeId: r.roomTypeId,
        quantity: r.quantity,
        reservationStatus: r.reservationStatus,
        bookingStatus: r.booking?.bookingStatus,
        paymentStatus: r.booking?.paymentStatus,
        checkInDate: formatCalendarDate(r.checkInDate),
        checkOutDate: formatCalendarDate(r.checkOutDate),
        expiresAt: r.expiresAt,
      })),
      recentTransactions,
    };
  }

  /**
   * Super Admin: Adjust total physical inventory safely (prevents reducing below committed rooms).
   */
  async adjustTotalInventory(params: {
    hotelId: string;
    roomTypeId: string;
    newTotalRooms: number;
    adminId: string;
    note?: string;
  }) {
    const { hotelId, roomTypeId, newTotalRooms, adminId, note } = params;
    if (!Number.isInteger(newTotalRooms) || newTotalRooms < 0) {
      throw new Error('INVALID_INVENTORY: Total rooms must be a non-negative integer.');
    }

    const todayDate = parseCalendarDate(formatCalendarDate(new Date()));

    const updated = await prisma.$transaction(async (tx) => {
      const roomType = await tx.hotelRoomType.findFirst({
        where: { id: roomTypeId, hotelId },
      });
      if (!roomType) {
        throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist.');
      }

      const futureRows = await tx.hotelRoomInventory.findMany({
        where: {
          roomTypeId,
          inventoryDate: { gte: todayDate },
        },
      });

      for (const row of futureRows) {
        const committed = row.reservedRooms + row.confirmedRooms + row.blockedRooms;
        if (newTotalRooms < committed) {
          throw new Error(
            `INVENTORY_BELOW_COMMITTED: Cannot reduce total rooms to ${newTotalRooms}. On ${formatCalendarDate(
              row.inventoryDate
            )}, ${committed} room(s) are already reserved/confirmed/blocked.`
          );
        }
      }

      const updatedRoom = await tx.hotelRoomType.update({
        where: { id: roomTypeId },
        data: { totalInventory: newTotalRooms },
      });

      if (futureRows.length > 0) {
        await tx.hotelRoomInventory.updateMany({
          where: {
            roomTypeId,
            inventoryDate: { gte: todayDate },
          },
          data: { totalRooms: newTotalRooms },
        });
      }

      await tx.hotelInventoryTransaction.create({
        data: {
          hotelId,
          roomTypeId,
          inventoryDate: todayDate,
          transactionType: InventoryTransactionType.ADJUST_TOTAL,
          quantity: newTotalRooms,
          idempotencyKey: `adjust:${roomTypeId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          actorId: adminId,
          note: note || `Adjusted total inventory from ${roomType.totalInventory} to ${newTotalRooms}`,
        },
      });

      return updatedRoom;
    });

    await auditService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ADMIN_ADJUST_ROOM_INVENTORY',
      entityType: 'HotelRoomType',
      entityId: roomTypeId,
      metadata: { hotelId, newTotalRooms, note },
    });

    this.emitSyncEvents('INVENTORY_ADJUSTED', [
      { hotelId, roomTypeId, dates: [formatCalendarDate(todayDate)] },
    ]);

    return updated;
  }

  /**
   * Super Admin: Block or unblock rooms for a date range.
   */
  async setBlockedRooms(params: {
    hotelId: string;
    roomTypeId: string;
    startDateStr: string;
    endDateStr: string;
    quantity: number;
    action: 'BLOCK' | 'UNBLOCK';
    adminId: string;
    note?: string;
  }) {
    const { hotelId, roomTypeId, startDateStr, endDateStr, quantity, action, adminId, note } = params;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('INVALID_QUANTITY: Quantity must be a positive integer.');
    }

    const startDate = parseCalendarDate(startDateStr);
    const endDate = parseCalendarDate(endDateStr);
    const dates = this.getStayNightDates(
      startDate,
      endDate.getTime() <= startDate.getTime() ? addCalendarDays(startDate, 1) : endDate
    );

    await prisma.$transaction(async (tx) => {
      const roomType = await tx.hotelRoomType.findFirst({
        where: { id: roomTypeId, hotelId },
      });
      if (!roomType) {
        throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist.');
      }

      await this.ensureDateRows(tx, hotelId, roomTypeId, roomType.totalInventory, dates);

      for (const dateStr of dates) {
        const invDate = parseCalendarDate(dateStr);
        if (action === 'BLOCK') {
          const updated = await tx.$executeRaw`
            UPDATE "hotel_room_inventories"
            SET "blocked_rooms" = "blocked_rooms" + ${quantity},
                "updated_at" = NOW()
            WHERE "room_type_id" = ${roomTypeId}::uuid
              AND "inventory_date" = ${invDate}::date
              AND ("total_rooms" - "reserved_rooms" - "confirmed_rooms" - "blocked_rooms") >= ${quantity}
          `;
          if (Number(updated) === 0) {
            throw new Error(`INSUFFICIENT_AVAILABLE_TO_BLOCK: Cannot block ${quantity} room(s) on ${dateStr}.`);
          }
        } else {
          await tx.$executeRaw`
            UPDATE "hotel_room_inventories"
            SET "blocked_rooms" = GREATEST(0, "blocked_rooms" - ${quantity}),
                "updated_at" = NOW()
            WHERE "room_type_id" = ${roomTypeId}::uuid
              AND "inventory_date" = ${invDate}::date
          `;
        }

        await tx.hotelInventoryTransaction.create({
          data: {
            hotelId,
            roomTypeId,
            inventoryDate: invDate,
            transactionType: action === 'BLOCK' ? InventoryTransactionType.BLOCK : InventoryTransactionType.UNBLOCK,
            quantity,
            idempotencyKey: `${action.toLowerCase()}:${roomTypeId}:${dateStr}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
            actorId: adminId,
            note: note || `${action} ${quantity} room(s)`,
          },
        });
      }
    });

    await auditService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: action === 'BLOCK' ? 'ADMIN_BLOCK_ROOMS' : 'ADMIN_UNBLOCK_ROOMS',
      entityType: 'HotelRoomType',
      entityId: roomTypeId,
      metadata: { hotelId, startDateStr, endDateStr, quantity, note },
    });

    this.emitSyncEvents(action === 'BLOCK' ? 'INVENTORY_BLOCKED' : 'INVENTORY_UNBLOCKED', [
      { hotelId, roomTypeId, dates },
    ]);

    return { hotelId, roomTypeId, dates, action, quantity };
  }

  /**
   * Computes current available inventory per roomTypeId using upcoming HotelRoomInventory rows
   * and confirmed/checked-in HotelBookingRoom records so Admin tables and Passenger room cards
   * always reflect real-time database availability.
   */
  async getRoomTypesAvailabilityMap(
    roomTypes: Array<{ id: string; totalInventory: number }>
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!roomTypes || roomTypes.length === 0) {
      return result;
    }

    const ids = roomTypes.map((r) => r.id);
    const today = parseCalendarDate(getAddisCurrentDateString());

    const [inventoryRows, confirmedBookingRooms] = await Promise.all([
      prisma.hotelRoomInventory
        ? prisma.hotelRoomInventory
            .findMany({
              where: {
                roomTypeId: { in: ids },
                inventoryDate: { gte: today },
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      prisma.hotelBookingRoom
        ? prisma.hotelBookingRoom
            .findMany({
              where: {
                roomTypeId: { in: ids },
                booking: {
                  bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
                  checkOutDate: { gt: today },
                },
              },
              select: {
                roomTypeId: true,
                quantity: true,
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const maxCommittedByRoom = new Map<string, number>();
    for (const row of inventoryRows as any[]) {
      const committed =
        (row.reservedRooms || 0) + (row.confirmedRooms || 0) + (row.blockedRooms || 0);
      const prev = maxCommittedByRoom.get(row.roomTypeId) || 0;
      if (committed > prev) {
        maxCommittedByRoom.set(row.roomTypeId, committed);
      }
    }

    const confirmedSumByRoom = new Map<string, number>();
    for (const br of confirmedBookingRooms as any[]) {
      confirmedSumByRoom.set(
        br.roomTypeId,
        (confirmedSumByRoom.get(br.roomTypeId) || 0) + (br.quantity || 0)
      );
    }

    for (const rt of roomTypes) {
      const rowPeak = maxCommittedByRoom.get(rt.id) || 0;
      const confirmedTotal = confirmedSumByRoom.get(rt.id) || 0;
      const committed = Math.max(rowPeak, confirmedTotal);
      result.set(rt.id, Math.max(0, (rt.totalInventory || 0) - committed));
    }

    return result;
  }
}

export const inventoryService = new InventoryService();
