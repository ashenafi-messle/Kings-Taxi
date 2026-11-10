import { describe, it, expect } from 'vitest';
import { fareService } from '../../src/modules/fares/fare.service';
import { normalizeEthiopianPhone } from '../../src/modules/bookings/booking.service';
import { LocationValidationStatus } from '@prisma/client';

describe('Ride Booking & Dynamic Fare Unit Tests', () => {
  describe('Phone Number Validation & Normalization', () => {
    it('should normalize standard Ethiopian mobile numbers starting with 09', () => {
      expect(normalizeEthiopianPhone('0911223344')).toBe('+251911223344');
    });

    it('should normalize Safaricom numbers starting with 07', () => {
      expect(normalizeEthiopianPhone('0712345678')).toBe('+251712345678');
    });

    it('should accept numbers already in international +251 format', () => {
      expect(normalizeEthiopianPhone('+251918112233')).toBe('+251918112233');
    });

    it('should accept 9-digit numbers without prefix', () => {
      expect(normalizeEthiopianPhone('911223344')).toBe('+251911223344');
    });

    it('should strip hyphens, spaces, and parentheses', () => {
      expect(normalizeEthiopianPhone('0911-22 33 (44)')).toBe('+251911223344');
    });

    it('should reject invalid or foreign phone numbers', () => {
      expect(normalizeEthiopianPhone('12345')).toBeNull();
      expect(normalizeEthiopianPhone('+15551234567')).toBeNull();
      expect(normalizeEthiopianPhone('0811223344')).toBeNull();
      expect(normalizeEthiopianPhone('')).toBeNull();
    });
  });

  describe('Haversine Distance & Spatial Calculations', () => {
    it('should return 0 meters for identical GPS coordinates', () => {
      const dist = fareService.calculateHaversineDistanceMeters(12.6074, 37.4589, 12.6074, 37.4589);
      expect(dist).toBe(0);
    });

    it('should accurately calculate distance between Gondar landmark coordinates', () => {
      // Maraki Campus (12.6074, 37.4589) to Gondar Piasa (12.6080, 37.4640)
      const dist = fareService.calculateHaversineDistanceMeters(12.6074, 37.4589, 12.6080, 37.4640);
      // Straight line ~ 550m
      expect(dist).toBeGreaterThan(450);
      expect(dist).toBeLessThan(700);
    });

    it('should estimate road distance with winding factor', () => {
      const metrics = fareService.estimateTripMetrics(12.6074, 37.4589, 12.6080, 37.4640);
      expect(metrics.distanceMeters).toBeGreaterThan(500);
      expect(metrics.durationSeconds).toBeGreaterThanOrEqual(180);
    });
  });

  describe('Dynamic Vehicle Fare Engine', () => {
    const standardRates = {
      baseFare: 100,
      perKilometreRate: 25,
      perMinuteRate: 2.0,
      minimumFare: 50,
      currency: 'ETB',
    };

    it('should correctly calculate fare: Base + (DistKm * RateKm) + (DurationMins * RateMin)', () => {
      // 10 km, 20 minutes
      // Base: 100, Distance: 10 * 25 = 250, Time: 20 * 2 = 40. Total = 390
      const result = fareService.computeFare(standardRates, 10000, 1200);
      expect(result.baseFare).toBe(100);
      expect(result.distanceFare).toBe(250);
      expect(result.timeFare).toBe(40);
      expect(result.totalFare).toBe(390);
      expect(result.currency).toBe('ETB');
    });

    it('should enforce minimum fare for ultra-short trips', () => {
      // 100m, 1 minute -> subtotal = 100 + 2.5 + 2 = 104.5
      // If minFare was 150:
      const highMinRates = { ...standardRates, minimumFare: 150 };
      const result = fareService.computeFare(highMinRates, 100, 60);
      expect(result.totalFare).toBe(150);
    });
  });
});

