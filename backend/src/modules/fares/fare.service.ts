import { prisma } from '../../core/database/prisma';
import { VehicleType } from '@prisma/client';
import { logger } from '../../core/logging/logger';

export interface FareCalculationResult {
  baseFare: number;
  perKilometreRate: number;
  perMinuteRate: number;
  minimumFare: number;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  currency: string;
}

export interface FareRates {
  baseFare: number;
  perKilometreRate: number;
  perMinuteRate: number;
  minimumFare: number;
  currency: string;
}

// Default fallback rates for Gondar City if not yet configured in DB
const DEFAULT_RATES: Record<VehicleType, FareRates> = {
  STANDARD_SEDAN: { baseFare: 100, perKilometreRate: 25, perMinuteRate: 2.0, minimumFare: 50, currency: 'ETB' },
  COMFORT_VAN: { baseFare: 150, perKilometreRate: 35, perMinuteRate: 3.0, minimumFare: 75, currency: 'ETB' },
  EXECUTIVE: { baseFare: 200, perKilometreRate: 45, perMinuteRate: 4.0, minimumFare: 100, currency: 'ETB' },
  MINIVAN_TOUR: { baseFare: 180, perKilometreRate: 40, perMinuteRate: 3.5, minimumFare: 90, currency: 'ETB' },
  LUXURY_VIP: { baseFare: 250, perKilometreRate: 50, perMinuteRate: 4.5, minimumFare: 120, currency: 'ETB' },
  TOURISM_4WD: { baseFare: 220, perKilometreRate: 45, perMinuteRate: 4.0, minimumFare: 110, currency: 'ETB' },
  MINIVAN_GROUP: { baseFare: 190, perKilometreRate: 40, perMinuteRate: 3.5, minimumFare: 95, currency: 'ETB' },
  SUV: { baseFare: 200, perKilometreRate: 45, perMinuteRate: 4.0, minimumFare: 100, currency: 'ETB' },
  MINIBUS: { baseFare: 220, perKilometreRate: 42, perMinuteRate: 3.8, minimumFare: 100, currency: 'ETB' },
};

export class FareService {
  /**
   * Fetch active fare configuration for a vehicle type from database
   */
  async getActiveFareConfig(vehicleType: VehicleType): Promise<FareRates> {
    let config;
    try {
      config = await prisma.vehicleFareConfiguration.findFirst({
        where: {
          vehicleType,
          isActive: true,
        },
        orderBy: { effectiveFrom: 'desc' },
      });
    } catch (err: any) {
      logger.error({ err, vehicleType }, '[FareService] Database error querying vehicle fare configuration');
      throw new Error('FARE_CONFIG_UNAVAILABLE: Database error fetching vehicle fare configuration');
    }

    if (config) {
      return {
        baseFare: Number(config.baseFare),
        perKilometreRate: Number(config.perKilometreRate),
        perMinuteRate: Number(config.perMinuteRate),
        minimumFare: Number(config.minimumFare),
        currency: config.currency,
      };
    }

    return DEFAULT_RATES[vehicleType] || DEFAULT_RATES.STANDARD_SEDAN;
  }

  /**
   * Great-circle distance between two GPS coordinates using the Haversine formula (in meters)
   */
  calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's mean radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Estimate distance & duration for a city journey
   * Gondar urban topography includes hills and winding streets; we apply a 1.25 routing factor
   * and average urban speed of 24 km/h (~6.67 m/s).
   */
  estimateTripMetrics(
    pickupLat: number,
    pickupLon: number,
    destLat: number,
    destLon: number
  ): { distanceMeters: number; durationSeconds: number } {
    const crowFlyMeters = this.calculateHaversineDistanceMeters(pickupLat, pickupLon, destLat, destLon);
    // 1.25 road-winding correction factor for Gondar city network
    const distanceMeters = Math.max(500, Math.round(crowFlyMeters * 1.25));

    // Average speed ~ 24 km/h = 400 meters per minute
    // Plus 3 minutes base traffic / boarding buffer
    const durationMinutes = Math.max(3, Math.ceil(distanceMeters / 400) + 2);
    const durationSeconds = durationMinutes * 60;

    return { distanceMeters, durationSeconds };
  }

  /**
   * Calculate deterministic fare given distance, duration, and pricing rates
   */
  computeFare(
    rates: FareRates,
    distanceMeters: number,
    durationSeconds: number
  ): FareCalculationResult {
    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
    const durationMinutes = Math.round((durationSeconds / 60) * 10) / 10;

    const distanceFare = Math.round(distanceKm * rates.perKilometreRate * 100) / 100;
    const timeFare = Math.round(durationMinutes * rates.perMinuteRate * 100) / 100;

    const subtotal = rates.baseFare + distanceFare + timeFare;
    const totalFare = Math.round(Math.max(rates.minimumFare, subtotal) * 100) / 100;

    return {
      baseFare: rates.baseFare,
      perKilometreRate: rates.perKilometreRate,
      perMinuteRate: rates.perMinuteRate,
      minimumFare: rates.minimumFare,
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMinutes,
      distanceFare,
      timeFare,
      totalFare,
      currency: rates.currency,
    };
  }

  /**
   * Authoritative estimate calculation for passenger booking screen
   */
  async estimateFare(
    pickupLat: number,
    pickupLon: number,
    destLat: number,
    destLon: number,
    vehicleType: VehicleType = VehicleType.STANDARD_SEDAN
  ): Promise<FareCalculationResult> {
    const rates = await this.getActiveFareConfig(vehicleType);
    const metrics = this.estimateTripMetrics(pickupLat, pickupLon, destLat, destLon);
    return this.computeFare(rates, metrics.distanceMeters, metrics.durationSeconds);
  }
}

export const fareService = new FareService();
