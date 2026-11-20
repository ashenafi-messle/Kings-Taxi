/**
 * Kings Taxi Super Admin - Data Formatting Utilities
 */

/**
 * Formats a numeric value into Ethiopian Birr (ETB) currency.
 * e.g. 12500 -> "12,500.00 ETB"
 */
export function formatETB(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0.00 ETB';
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
  
  return `${formatted} ETB`;
}

/**
 * Formats standard numbers with commas (e.g. 124800 -> "124,800")
 */
export function formatNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Formats distance in kilometers
 */
export function formatDistance(distanceKm: number): string {
  if (isNaN(distanceKm)) return '0.0 km';
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Formats duration in minutes to readable hours and minutes
 */
export function formatDuration(durationMinutes: number): string {
  if (isNaN(durationMinutes) || durationMinutes <= 0) return '0m';
  if (durationMinutes < 60) return `${Math.round(durationMinutes)}m`;
  
  const hours = Math.floor(durationMinutes / 60);
  const mins = Math.round(durationMinutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Normalizes phone numbers for display
 */
export function formatPhone(phone?: string): string {
  if (!phone) return '-';
  const clean = phone.trim();
  if (clean.startsWith('+251')) return clean;
  if (clean.startsWith('09')) return `+251 ${clean.substring(1)}`;
  if (clean.startsWith('9')) return `+251 ${clean}`;
  return clean;
}

/**
 * Capitalizes string nicely
 */
export function capitalizeWord(str?: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace(/_/g, ' ');
}
