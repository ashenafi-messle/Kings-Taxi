/**
 * Kings Taxi Heritage Tour Module — Dynamic Calendar & Date Utilities
 *
 * Uses Africa/Addis_Ababa (UTC+3) business calendar for authoritative date validation,
 * advance booking calculations, and scheduling.
 */

export const ADDIS_ABABA_TIMEZONE = 'Africa/Addis_Ababa';

/**
 * Returns current date in Africa/Addis_Ababa as YYYY-MM-DD
 */
export function getAddisAbabaTodayDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADDIS_ABABA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns current timestamp in Africa/Addis_Ababa
 */
export function getAddisAbabaNow(): Date {
  const now = new Date();
  const utcOffset = 3 * 60; // UTC+3 in minutes
  const localOffset = now.getTimezoneOffset(); // in minutes
  const addisMs = now.getTime() + (utcOffset + localOffset) * 60 * 1000;
  return new Date(addisMs);
}

/**
 * Validates YYYY-MM-DD date format
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Adds calendar days to a YYYY-MM-DD date string
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + days);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates scheduled date against Africa/Addis_Ababa calendar and advance hours
 */
export function validateTourBookingDate(
  scheduledDateStr: string,
  preferredTimeStr: string = '09:00',
  minimumAdvanceHours: number = 6
): { valid: boolean; error?: string } {
  if (!isValidCalendarDate(scheduledDateStr)) {
    return { valid: false, error: 'Scheduled date must be in valid YYYY-MM-DD format.' };
  }

  const todayStr = getAddisAbabaTodayDate();

  if (scheduledDateStr < todayStr) {
    return { valid: false, error: `Scheduled date (${scheduledDateStr}) cannot be in the past.` };
  }

  // Check advance hours if booking for today
  if (scheduledDateStr === todayStr) {
    const timeParts = preferredTimeStr.split(':').map(Number);
    const hour = timeParts[0] || 9;
    const minute = timeParts[1] || 0;

    const now = getAddisAbabaNow();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const tourTimeMinutes = hour * 60 + minute;
    const nowTimeMinutes = currentHour * 60 + currentMinute;
    const advanceMinutes = tourTimeMinutes - nowTimeMinutes;

    if (advanceMinutes < minimumAdvanceHours * 60) {
      return {
        valid: false,
        error: `Same-day tours require at least ${minimumAdvanceHours} hours advance notice.`,
      };
    }
  }

  return { valid: true };
}

