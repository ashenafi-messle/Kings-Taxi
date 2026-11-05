import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enAuth from './locales/en/auth.json';
import enHome from './locales/en/home.json';
import enTransportation from './locales/en/transportation.json';
import enHotels from './locales/en/hotels.json';
import enHeritage from './locales/en/heritage.json';
import enBookings from './locales/en/bookings.json';
import enPayments from './locales/en/payments.json';
import enProfile from './locales/en/profile.json';
import enNotifications from './locales/en/notifications.json';
import enValidation from './locales/en/validation.json';

import amCommon from './locales/am/common.json';
import amNavigation from './locales/am/navigation.json';
import amAuth from './locales/am/auth.json';
import amHome from './locales/am/home.json';
import amTransportation from './locales/am/transportation.json';
import amHotels from './locales/am/hotels.json';
import amHeritage from './locales/am/heritage.json';
import amBookings from './locales/am/bookings.json';
import amPayments from './locales/am/payments.json';
import amProfile from './locales/am/profile.json';
import amNotifications from './locales/am/notifications.json';
import amValidation from './locales/am/validation.json';

import omCommon from './locales/om/common.json';
import omNavigation from './locales/om/navigation.json';
import omAuth from './locales/om/auth.json';
import omHome from './locales/om/home.json';
import omTransportation from './locales/om/transportation.json';
import omHotels from './locales/om/hotels.json';
import omHeritage from './locales/om/heritage.json';
import omBookings from './locales/om/bookings.json';
import omPayments from './locales/om/payments.json';
import omProfile from './locales/om/profile.json';
import omNotifications from './locales/om/notifications.json';
import omValidation from './locales/om/validation.json';

export const defaultNamespace = 'common';

export const namespaces = [
  'common',
  'navigation',
  'auth',
  'home',
  'transportation',
  'hotels',
  'heritage',
  'bookings',
  'payments',
  'profile',
  'notifications',
  'validation',
] as const;

export type Namespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    home: enHome,
    transportation: enTransportation,
    hotels: enHotels,
    heritage: enHeritage,
    bookings: enBookings,
    payments: enPayments,
    profile: enProfile,
    notifications: enNotifications,
    validation: enValidation,
  },
  am: {
    common: amCommon,
    navigation: amNavigation,
    auth: amAuth,
    home: amHome,
    transportation: amTransportation,
    hotels: amHotels,
    heritage: amHeritage,
    bookings: amBookings,
    payments: amPayments,
    profile: amProfile,
    notifications: amNotifications,
    validation: amValidation,
  },
  om: {
    common: omCommon,
    navigation: omNavigation,
    auth: omAuth,
    home: omHome,
    transportation: omTransportation,
    hotels: omHotels,
    heritage: omHeritage,
    bookings: omBookings,
    payments: omPayments,
    profile: omProfile,
    notifications: omNotifications,
    validation: omValidation,
  },
} as const;

