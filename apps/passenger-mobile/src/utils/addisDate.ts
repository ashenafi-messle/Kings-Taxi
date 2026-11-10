/**
 * Africa/Addis_Ababa dynamic date utilities for Kings Taxi Passenger Mobile.
 *
 * Guarantees that all hotel bookings and airport transfer schedules reflect
 * the actual local time in Ethiopia (UTC+3), with dynamic date arithmetic
 * and no hardcoded dates or years.
 */

export const ETHIOPIA_TIMEZONE = 'Africa/Addis_Ababa';

/**
 * Returns today's calendar date in Africa/Addis_Ababa as 'YYYY-MM-DD'.
 */
export function getAddisCurrentDateString(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ETHIOPIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(referenceDate);
}

/**
 * Parses a 'YYYY-MM-DD' calendar string into a UTC midnight Date.
 */
export function parseCalendarDate(dateString: string): Date {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid calendar date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Formats a Date object as 'YYYY-MM-DD'.
 */
export function formatCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds an integer number of days to a 'YYYY-MM-DD' string and returns the new 'YYYY-MM-DD'.
 */
export function addCalendarDays(dateString: string, days: number): string {
  const d = parseCalendarDate(dateString);
  d.setUTCDate(d.getUTCDate() + days);
  return formatCalendarDate(d);
}

/**
 * Calculates the exact integer nights between check-in and check-out.
 */
export function calculateCalendarNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = parseCalendarDate(checkInDate);
  const checkOut = parseCalendarDate(checkOutDate);
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return nights;
}

/**
 * Formats a 'YYYY-MM-DD' date into a friendly readable label, e.g., 'Nov 12, 2026'.
 */
export function formatCalendarDisplay(dateString: string, locale: string = 'en-US'): string {
  try {
    const d = parseCalendarDate(dateString);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return dateString;
  }
}

