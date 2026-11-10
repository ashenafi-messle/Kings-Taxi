/**
 * Kings Taxi Hospitality Module — Africa/Addis_Ababa Date & Time Utilities
 *
 * Implements authoritative business calendar date calculations for Gondar hotels.
 * Guaranteed timezone: Africa/Addis_Ababa (UTC+3, no daylight savings).
 * All hotel calendar dates represent local calendar days without hardcoded dates.
 */

export const ADDIS_TIMEZONE = 'Africa/Addis_Ababa';

/**
 * Returns the current calendar date string (YYYY-MM-DD) in Africa/Addis_Ababa
 */
export function getAddisCurrentDateString(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADDIS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Parses YYYY-MM-DD into a Date normalized at 00:00:00 UTC
 */
export function parseCalendarDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    const y = dateStr.getUTCFullYear();
    const m = String(dateStr.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getUTCDate()).padStart(2, '0');
    return new Date(Date.UTC(y, Number(m) - 1, Number(d)));
  }

  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) {
    throw new Error(`INVALID_DATE_FORMAT: Date must be YYYY-MM-DD, received "${dateStr}"`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`INVALID_CALENDAR_DATE: "${dateStr}" is not a valid calendar date`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatCalendarDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds calendar days to a Date
 */
export function addCalendarDays(dateStrOrObj: string | Date, days: number): Date {
  const d = parseCalendarDate(dateStrOrObj);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Calculates true calendar nights between check-in and check-out
 */
export function calculateCalendarNights(checkIn: string | Date, checkOut: string | Date): number {
  const d1 = parseCalendarDate(checkIn);
  const d2 = parseCalendarDate(checkOut);
  const diffMs = d2.getTime() - d1.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.round(diffMs / oneDayMs);
}

/**
 * Validates check-in and check-out dates against Africa/Addis_Ababa business calendar
 */
export function validateBookingDates(
  checkIn: string | Date,
  checkOut: string | Date,
  minNights = 1,
  maxNights = 30
): {
  valid: boolean;
  nights: number;
  checkInDate: Date;
  checkOutDate: Date;
  error?: string;
} {
  const checkInDate = parseCalendarDate(checkIn);
  const checkOutDate = parseCalendarDate(checkOut);

  const addisTodayStr = getAddisCurrentDateString();
  const addisToday = parseCalendarDate(addisTodayStr);

  // Check-in cannot be in the past
  if (checkInDate.getTime() < addisToday.getTime()) {
    return {
      valid: false,
      nights: 0,
      checkInDate,
      checkOutDate,
      error: `PAST_CHECKIN_DATE: Check-in date (${formatCalendarDate(checkInDate)}) cannot be in the past. Current Gondar date is ${addisTodayStr}.`,
    };
  }

  // Check-out must be after check-in
  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    return {
      valid: false,
      nights: 0,
      checkInDate,
      checkOutDate,
      error: `INVALID_CHECKOUT_DATE: Check-out date (${formatCalendarDate(checkOutDate)}) must be after check-in date (${formatCalendarDate(checkInDate)}).`,
    };
  }

  const nights = calculateCalendarNights(checkInDate, checkOutDate);

  if (nights < minNights) {
    return {
      valid: false,
      nights,
      checkInDate,
      checkOutDate,
      error: `MINIMUM_STAY_NOT_MET: Minimum stay requirement is ${minNights} night(s). Selected: ${nights} night(s).`,
    };
  }

  if (nights > maxNights) {
    return {
      valid: false,
      nights,
      checkInDate,
      checkOutDate,
      error: `MAXIMUM_STAY_EXCEEDED: Maximum booking window is ${maxNights} nights. Selected: ${nights} nights.`,
    };
  }

  return {
    valid: true,
    nights,
    checkInDate,
    checkOutDate,
  };
}

