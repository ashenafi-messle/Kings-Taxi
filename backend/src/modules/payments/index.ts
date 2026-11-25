import { Router, Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { ApiResponse } from '../../core/response/apiResponse';
import { inventoryService } from '../hospitality/inventory.service';

/**
 * Kings Taxi — Multi-Gateway Payment Module (Phase 5 Architectural Boundary)
 *
 * Responsibilities:
 * - Payment intent creation (Telebirr, Chapa, CBE Birr, Cash)
 * - Cryptographic webhook / callback verification
 * - Idempotency enforcement (UUIDv4 idempotency keys)
 * - Reconciliation and receipt generation
 */

export const paymentRouter = Router();

paymentRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'payments',
      status: 'operational',
      description: 'Payment gateway dispatch, Telebirr/CBE/Chapa, and digital receipt services',
    },
    'Payment service status operational'
  );
});

/**
 * POST /api/v1/payments/webhook
 * Idempotent Webhook notification handler for Telebirr, CBE Birr, Chapa
 */
paymentRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { transactionReference, paymentStatus, gatewayReference } = req.body;

    if (!transactionReference) {
      return res.status(400).json({ success: false, message: 'transactionReference is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionReference },
      include: {
        heritageTourBooking: true,
        hotelBooking: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Idempotency: if already SUCCESS, acknowledge without re-executing transitions
    if (payment.paymentStatus === PaymentStatus.SUCCESS) {
      return res.status(200).json({
        success: true,
        message: 'Payment already processed (idempotent)',
        data: payment,
      });
    }

    const nextStatus = paymentStatus === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

    const txResult = await prisma.$transaction(async (tx) => {
      // Update Payment
      const updatedPayment = await tx.payment.update({
        where: { transactionReference },
        data: {
          paymentStatus: nextStatus,
          gatewayReference: gatewayReference || payment.gatewayReference,
          paidAt: nextStatus === PaymentStatus.SUCCESS ? new Date() : null,
        },
      });

      // If Heritage Tour Booking, transition status to CONFIRMED
      if (payment.heritageTourBookingId && nextStatus === PaymentStatus.SUCCESS) {
        await tx.heritageTourBooking.update({
          where: { id: payment.heritageTourBookingId },
          data: {
            bookingStatus: 'CONFIRMED',
            paymentStatus: PaymentStatus.SUCCESS,
          },
        });
      }

      // If Hotel Booking, transition inventory & booking status atomically
      let syncItems: Array<{ hotelId: string; roomTypeId: string; dates: string[] }> = [];
      if (payment.hotelBookingId) {
        if (nextStatus === PaymentStatus.SUCCESS) {
          syncItems = await inventoryService.confirmReservation(
            tx,
            payment.hotelBookingId,
            'PAYMENT_WEBHOOK'
          );

          await tx.hotelBooking.update({
            where: { id: payment.hotelBookingId },
            data: {
              bookingStatus: 'CONFIRMED',
              paymentStatus: PaymentStatus.SUCCESS,
              confirmedAt: new Date(),
            },
          });
        } else {
          syncItems = await inventoryService.releaseReservation(
            tx,
            payment.hotelBookingId,
            'RELEASED',
            'PAYMENT_WEBHOOK',
            'Payment failed via gateway webhook'
          );

          await tx.hotelBooking.update({
            where: { id: payment.hotelBookingId },
            data: {
              paymentStatus: PaymentStatus.FAILED,
            },
          });
        }
      }

      return { updatedPayment, syncItems };
    });

    if (payment.hotelBookingId && txResult.syncItems.length > 0) {
      inventoryService.emitSyncEvents(
        nextStatus === PaymentStatus.SUCCESS ? 'INVENTORY_CONFIRMED' : 'INVENTORY_RELEASED',
        txResult.syncItems,
        payment.hotelBookingId
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Payment webhook processed successfully',
      data: txResult.updatedPayment,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Webhook processing failed',
    });
  }
});

export interface IPaymentService {
  // Phase 5 implementation contract
}
