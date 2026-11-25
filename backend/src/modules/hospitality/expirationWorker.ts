import { HotelBookingStatus, InventoryReservationStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { inventoryService } from './inventory.service';

export class ReservationExpirationWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Finds and expires all overdue RESERVED inventory holds safely and idempotently.
   * Can be invoked by the background interval or triggered directly in tests/admin endpoints.
   */
  async processExpiredReservations(): Promise<{ expiredCount: number }> {
    if (this.isProcessing) {
      return { expiredCount: 0 };
    }
    this.isProcessing = true;
    let expiredCount = 0;

    try {
      const now = new Date();
      const expiredHolds = await prisma.hotelInventoryReservation.findMany({
        where: {
          reservationStatus: InventoryReservationStatus.RESERVED,
          expiresAt: { lte: now },
        },
        select: { bookingId: true },
        distinct: ['bookingId'],
        take: 50,
      });

      for (const hold of expiredHolds) {
        try {
          const releasedItems = await prisma.$transaction(async (tx) => {
            const booking = await tx.hotelBooking.findUnique({
              where: { id: hold.bookingId },
            });
            if (!booking) return [];

            // Never expire an already paid booking
            if (booking.paymentStatus === PaymentStatus.SUCCESS) {
              return [];
            }

            const released = await inventoryService.releaseReservation(
              tx,
              hold.bookingId,
              'EXPIRED',
              'SYSTEM_EXPIRATION_WORKER',
              'Hold expired before payment completion'
            );

            if (
              booking.bookingStatus === HotelBookingStatus.PENDING ||
              booking.bookingStatus === HotelBookingStatus.CONFIRMED
            ) {
              await tx.hotelBooking.update({
                where: { id: hold.bookingId },
                data: {
                  bookingStatus: HotelBookingStatus.EXPIRED,
                  paymentStatus:
                    booking.paymentStatus === PaymentStatus.PENDING
                      ? PaymentStatus.FAILED
                      : booking.paymentStatus,
                },
              });

              await tx.hotelBookingStatusHistory.create({
                data: {
                  hotelBookingId: hold.bookingId,
                  fromStatus: booking.bookingStatus,
                  toStatus: HotelBookingStatus.EXPIRED,
                  changedByAdminName: 'System Expiration Worker',
                  note: 'Reservation hold expired automatically; room inventory restored.',
                },
              });
            }

            return released;
          });

          if (releasedItems.length > 0) {
            expiredCount++;
            inventoryService.emitSyncEvents('INVENTORY_EXPIRED', releasedItems, hold.bookingId);
          }
        } catch (err: any) {
          logger.error(
            { err: err?.message, bookingId: hold.bookingId },
            '[ReservationExpirationWorker] Failed expiring booking hold'
          );
        }
      }
    } catch (err: any) {
      logger.warn(
        { err: err?.message },
        '[ReservationExpirationWorker] Cycle skipped due to database error'
      );
    } finally {
      this.isProcessing = false;
    }

    return { expiredCount };
  }

  start(intervalMs = 60_000) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.processExpiredReservations();
    }, intervalMs);
    this.timer.unref();
    logger.info({ intervalMs }, '[ReservationExpirationWorker] Started background hold expiration worker');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const reservationExpirationWorker = new ReservationExpirationWorker();
