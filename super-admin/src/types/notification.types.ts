/**
 * System Notifications Type Definitions
 */

export type NotificationCategory = 
  | 'DRIVER_REGISTRATION'
  | 'DRIVER_VERIFICATION'
  | 'PASSENGER_REGISTRATION'
  | 'HOTEL_BOOKING'
  | 'HERITAGE_BOOKING'
  | 'ACTIVE_RIDE_ALERT'
  | 'RIDE_COMPLETION'
  | 'SUPPORT_ALERT'
  | 'PLATFORM_ANNOUNCEMENT';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface AdminNotification {
  id: string;
  category: NotificationCategory;
  categoryLabel: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  isRead: boolean;
  linkUrl?: string;
  entityId?: string;
  createdAt: string;
}
