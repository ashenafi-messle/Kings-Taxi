import { LocationCoordinates } from '../types/common.types';

/**
 * Calculates great-circle distance between two points on Earth using Haversine formula
 */
export function calculateDistanceKm(
  start: LocationCoordinates,
  end: LocationCoordinates
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(end.latitude - start.latitude);
  const dLon = toRad(end.longitude - start.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(start.latitude)) *
      Math.cos(toRad(end.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

/**
 * Estimates travel time in minutes assuming average urban speed (28 km/h) + traffic buffer
 */
export function estimateTravelTimeMinutes(distanceKm: number): number {
  const avgSpeedKmh = 28;
  const rawHours = distanceKm / avgSpeedKmh;
  const baseMinutes = Math.round(rawHours * 60);
  // Add 3 minutes baseline waiting/maneuvering
  return Math.max(5, baseMinutes + 3);
}
