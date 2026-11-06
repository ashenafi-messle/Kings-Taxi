/**
 * Kings Taxi - Central Application Configuration & Store Links
 *
 * Configurable app links, store identifiers, and share messages.
 * When store listings are published, toggle isStorePublished to true.
 */

export interface AppConfig {
  appName: string;
  tagline: string;
  serviceCity: string;
  officialWebsite: string;
  downloadUrl: string;
  playStoreId: string;
  playStoreUrl: string;
  appStoreId: string;
  appStoreUrl: string;
  telegramBotUsername: string;
  isStorePublished: boolean;
}

export const APP_CONFIG: AppConfig = {
  appName: 'Kings Taxi',
  tagline: 'Your convenient transportation companion in Gondar City!',
  serviceCity: 'Gondar City, Ethiopia',
  officialWebsite: 'https://kingstaxi.et',
  downloadUrl: 'https://kingstaxi.et/download',
  playStoreId: 'et.kingstaxi.passenger',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=et.kingstaxi.passenger',
  appStoreId: '6470000000',
  appStoreUrl: 'https://apps.apple.com/app/kings-taxi-passenger/id6470000000',
  telegramBotUsername: 'KingsTaxiAuthBot',
  // Toggle when official Google Play / Apple App Store listing is publicly active
  isStorePublished: false,
};

export const SHARE_APP_MESSAGE = `Discover Kings Taxi – Your convenient transportation companion in Gondar City!

Download the Kings Taxi Passengers App and enjoy a modern, convenient way to access taxi services.

Join us today!
${APP_CONFIG.downloadUrl}`;

