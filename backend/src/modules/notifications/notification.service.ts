import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { RecipientType, NotificationType } from '@prisma/client';

export interface NotificationPayload {
  recipientId: string;
  recipientType: RecipientType;
  title: string;
  message: string;
  notificationType: NotificationType;
  metadata?: Record<string, any>;
}

// In-memory fallback notification buffer for offline local testing
const inMemoryNotifications: Array<NotificationPayload & { id: string; createdAt: Date; isRead: boolean }> = [];

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async dispatch(payload: NotificationPayload): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          recipientId: payload.recipientId,
          recipientType: payload.recipientType,
          title: payload.title,
          message: payload.message,
          notificationType: payload.notificationType,
          metadata: payload.metadata || {},
          passengerId: payload.recipientType === 'PASSENGER' ? payload.recipientId : undefined,
        },
      });
      logger.info({ recipientId: payload.recipientId, title: payload.title }, '[NotificationService] Notification saved to database');
    } catch (err: any) {
      // Graceful fallback when database connection is offline during local test runs
      logger.warn({ err: err.message }, '[NotificationService] Database unavailable; buffering notification in-memory');
      inMemoryNotifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...payload,
        createdAt: new Date(),
        isRead: false,
      });
    }
  }

  // --- Specialized Passenger Booking Notifications ---

  public async sendHotelBookingAcceptedNotification(booking: {
    passengerId: string;
    bookingReference: string;
    hotelName?: string;
    roomTypeName?: string;
    checkInDate?: string | Date;
  }): Promise<void> {
    const formattedDate = booking.checkInDate ? new Date(booking.checkInDate).toISOString().split('T')[0] : '';
    await this.dispatch({
      recipientId: booking.passengerId,
      recipientType: RecipientType.PASSENGER,
      title: 'Hotel Booking Confirmed! 🎉',
      message: `Your reservation [${booking.bookingReference}] at ${booking.hotelName || 'the hotel'} has been accepted and confirmed by Super Admin. Check-in: ${formattedDate}.`,
      notificationType: NotificationType.SYSTEM_NOTICE,
      metadata: {
        bookingReference: booking.bookingReference,
        type: 'HOTEL_BOOKING_ACCEPTED',
      },
    });
  }

  public async sendHotelBookingDeclinedNotification(
    booking: {
      passengerId: string;
      bookingReference: string;
      hotelName?: string;
    },
    declineReason: string
  ): Promise<void> {
    await this.dispatch({
      recipientId: booking.passengerId,
      recipientType: RecipientType.PASSENGER,
      title: 'Hotel Booking Request Declined',
      message: `Your booking request [${booking.bookingReference}] for ${booking.hotelName || 'the hotel'} could not be confirmed. Reason: ${declineReason}. Any pre-authorization will be refunded according to platform policy.`,
      notificationType: NotificationType.SYSTEM_NOTICE,
      metadata: {
        bookingReference: booking.bookingReference,
        type: 'HOTEL_BOOKING_DECLINED',
        declineReason,
      },
    });
  }

  public async sendHeritageBookingAcceptedNotification(booking: {
    passengerId: string;
    bookingReference: string;
    siteName?: string;
    tourDate?: string | Date;
  }): Promise<void> {
    const formattedDate = booking.tourDate ? new Date(booking.tourDate).toISOString().split('T')[0] : '';
    await this.dispatch({
      recipientId: booking.passengerId,
      recipientType: RecipientType.PASSENGER,
      title: 'Heritage Tour Confirmed! 🏛️',
      message: `Your heritage tour booking [${booking.bookingReference}] for ${booking.siteName || 'Gondar Heritage'} scheduled on ${formattedDate} has been confirmed. Your guide and itinerary are secured.`,
      notificationType: NotificationType.SYSTEM_NOTICE,
      metadata: {
        bookingReference: booking.bookingReference,
        type: 'HERITAGE_TOUR_ACCEPTED',
      },
    });
  }

  public async sendHeritageBookingDeclinedNotification(
    booking: {
      passengerId: string;
      bookingReference: string;
      siteName?: string;
    },
    declineReason: string
  ): Promise<void> {
    await this.dispatch({
      recipientId: booking.passengerId,
      recipientType: RecipientType.PASSENGER,
      title: 'Heritage Tour Request Declined',
      message: `Your tour request [${booking.bookingReference}] for ${booking.siteName || 'Gondar Heritage'} could not be accepted. Reason: ${declineReason}.`,
      notificationType: NotificationType.SYSTEM_NOTICE,
      metadata: {
        bookingReference: booking.bookingReference,
        type: 'HERITAGE_TOUR_DECLINED',
        declineReason,
      },
    });
  }

  public getInMemoryNotifications(recipientId?: string) {
    if (!recipientId) return inMemoryNotifications;
    return inMemoryNotifications.filter((n) => n.recipientId === recipientId);
  }
}

export const notificationService = NotificationService.getInstance();
