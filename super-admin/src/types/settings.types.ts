/**
 * System Settings & Platform Configuration Type Definitions
 */

export interface SystemSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  headquartersAddress: string;
  defaultCurrency: string; // "ETB"
  currencySymbol: string; // "ETB"
  
  // Commission & Fee Settings
  driverCommissionPercentage: number; // e.g. 15%
  hotelBookingCommissionPercentage: number; // e.g. 10%
  heritageTourCommissionPercentage: number; // e.g. 12%
  
  // Operation Settings
  operatingCities: string[];
  maxDriverSearchRadiusKm: number;
  rideAcceptanceTimeoutSeconds: number;
  
  // Dispatch & GPS Tracking
  gpsUpdateIntervalSeconds: number; // e.g. 5
  autoCancellationThresholdMinutes: number;
  
  // Security & Sessions
  adminSessionTimeoutMinutes: number;
  twoFactorAuthEnforced: boolean;
  ipWhitelistEnabled: boolean;
  
  // Notifications
  smsAlertsEnabled: boolean;
  emailAlertsEnabled: boolean;
  telegramBotAlertsEnabled: boolean;
}
