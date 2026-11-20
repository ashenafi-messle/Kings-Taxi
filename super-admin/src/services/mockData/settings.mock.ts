import { SystemSettings } from '../../types';

export const mockSystemSettings: SystemSettings = {
  platformName: 'Kings Taxi Mobility & Tourism Platform',
  supportEmail: 'support@kingstaxi.et',
  supportPhone: '+251 58 211 4400',
  headquartersAddress: 'Emperor Fasilides Boulevard, Piassa District, Gondar, Ethiopia',
  defaultCurrency: 'ETB',
  currencySymbol: 'ETB',
  
  driverCommissionPercentage: 15,
  hotelBookingCommissionPercentage: 10,
  heritageTourCommissionPercentage: 12,
  
  operatingCities: ['Gondar', 'Addis Ababa', 'Bahir Dar', 'Lalibela', 'Hawassa'],
  maxDriverSearchRadiusKm: 12,
  rideAcceptanceTimeoutSeconds: 45,
  
  gpsUpdateIntervalSeconds: 5,
  autoCancellationThresholdMinutes: 8,
  
  adminSessionTimeoutMinutes: 120,
  twoFactorAuthEnforced: true,
  ipWhitelistEnabled: false,
  
  smsAlertsEnabled: true,
  emailAlertsEnabled: true,
  telegramBotAlertsEnabled: true,
};
