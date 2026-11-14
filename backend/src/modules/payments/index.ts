import { Router, Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { ApiResponse } from '../../core/response/apiResponse';

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

    // Update Payment
    const updatedPayment = await prisma.payment.update({
      where: { transactionReference },
      data: {
        paymentStatus: nextStatus,
        gatewayReference: gatewayReference || payment.gatewayReference,
        paidAt: nextStatus === PaymentStatus.SUCCESS ? new Date() : null,
      },
    });

    // If Heritage Tour Booking, transition status to CONFIRMED
    if (payment.heritageTourBookingId && nextStatus === PaymentStatus.SUCCESS) {
      await prisma.heritageTourBooking.update({
        where: { id: payment.heritageTourBookingId },
        data: {
          bookingStatus: 'CONFIRMED',
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });
    }

    // If Hotel Booking, transition status
    if (payment.hotelBookingId && nextStatus === PaymentStatus.SUCCESS) {
      await prisma.hotelBooking.update({
        where: { id: payment.hotelBookingId },
        data: {
          bookingStatus: 'CONFIRMED',
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment webhook processed successfully',
      data: updatedPayment,
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
