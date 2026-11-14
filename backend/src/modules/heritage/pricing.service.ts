import { Prisma } from '@prisma/client';
import {
  TourPriceItemDTO,
  TourPricingSnapshotDTO,
} from './heritage.types';

export interface PricingCalculationInput {
  packageName?: string;
  basePrice?: number;
  sites: Array<{
    name: string;
    entryFeeETB: number;
    requiresBoatTransport: boolean;
  }>;
  totalPassengers: number;
  vehicleOption?: {
    displayName: string;
    baseRate: number;
  } | null;
  guideRequested: boolean;
  guide?: {
    fullName: string;
    dailyRate: number;
  } | null;
  currency?: string;
}

export class HeritageTourPricingService {
  /**
   * Authoritative Quote & Pricing Calculation using Prisma.Decimal
   */
  calculatePricing(input: PricingCalculationInput): TourPricingSnapshotDTO {
    const currency = input.currency || 'ETB';
    const breakdown: TourPriceItemDTO[] = [];

    // 1. Tour Base Amount
    const baseDecimal = new Prisma.Decimal(input.basePrice ?? 0);
    if (baseDecimal.greaterThan(0)) {
      breakdown.push({
        componentName: input.packageName ? `Package Base: ${input.packageName}` : 'Tour Package Base Rate',
        componentType: 'TOUR_BASE',
        pricingMethod: 'FIXED_PER_BOOKING',
        unitPrice: Number(baseDecimal.toFixed(2)),
        quantity: 1,
        totalPrice: Number(baseDecimal.toFixed(2)),
        description: 'Base package organization, itinerary coordination and management',
      });
    }

    // 2. Vehicle Transport Amount
    let vehicleDecimal = new Prisma.Decimal(0);
    if (input.vehicleOption) {
      vehicleDecimal = new Prisma.Decimal(input.vehicleOption.baseRate);
      breakdown.push({
        componentName: `Transportation: ${input.vehicleOption.displayName}`,
        componentType: 'VEHICLE_TRANSPORT',
        pricingMethod: 'PER_VEHICLE',
        unitPrice: Number(vehicleDecimal.toFixed(2)),
        quantity: 1,
        totalPrice: Number(vehicleDecimal.toFixed(2)),
        description: 'Dedicated chauffeured transport with professional Kings Taxi driver',
      });
    }

    // 3. Tour Guide Amount
    let guideDecimal = new Prisma.Decimal(0);
    if (input.guideRequested) {
      const guideRate = input.guide ? input.guide.dailyRate : 1500;
      guideDecimal = new Prisma.Decimal(guideRate);
      breakdown.push({
        componentName: input.guide ? `Tour Guide: ${input.guide.fullName}` : 'Professional Tour Guide Service',
        componentType: 'TOUR_GUIDE',
        pricingMethod: 'PER_DAY',
        unitPrice: Number(guideDecimal.toFixed(2)),
        quantity: 1,
        totalPrice: Number(guideDecimal.toFixed(2)),
        description: 'Licensed heritage tour guide with historical and cultural expertise',
      });
    }

    // 4. Entrance Fees Amount (Per-passenger for each destination)
    let entranceFeesDecimal = new Prisma.Decimal(0);
    for (const site of input.sites) {
      if (site.entryFeeETB > 0) {
        const siteUnitPrice = new Prisma.Decimal(site.entryFeeETB);
        const siteTotalFee = siteUnitPrice.times(input.totalPassengers);
        entranceFeesDecimal = entranceFeesDecimal.plus(siteTotalFee);

        breakdown.push({
          componentName: `Entry Fee: ${site.name}`,
          componentType: 'ENTRANCE_FEE',
          pricingMethod: 'PER_PASSENGER',
          unitPrice: Number(siteUnitPrice.toFixed(2)),
          quantity: input.totalPassengers,
          totalPrice: Number(siteTotalFee.toFixed(2)),
          description: `Site admission fee (${input.totalPassengers} x ${site.entryFeeETB} ${currency})`,
        });
      }
    }

    // 5. Boat Transport Amount (if any site requires boat transport)
    let boatTransportDecimal = new Prisma.Decimal(0);
    const requiresBoat = input.sites.some((s) => s.requiresBoatTransport);
    if (requiresBoat) {
      // Boat excursion fare: 1200 ETB per boat charter / group
      boatTransportDecimal = new Prisma.Decimal(1200);
      breakdown.push({
        componentName: 'Lake Tana Island Boat Charter',
        componentType: 'BOAT_TRANSPORT',
        pricingMethod: 'FIXED_PER_BOOKING',
        unitPrice: 1200,
        quantity: 1,
        totalPrice: 1200,
        description: 'Motorized boat navigation across Lake Tana to island monasteries',
      });
    }

    // 6. Tax / Service Charge (Transparent Ethiopian VAT or 0 if exempt)
    const taxDecimal = new Prisma.Decimal(0);

    // 7. Grand Total
    const totalDecimal = baseDecimal
      .plus(vehicleDecimal)
      .plus(guideDecimal)
      .plus(entranceFeesDecimal)
      .plus(boatTransportDecimal)
      .plus(taxDecimal);

    return {
      baseAmount: Number(baseDecimal.toFixed(2)),
      vehicleAmount: Number(vehicleDecimal.toFixed(2)),
      guideAmount: Number(guideDecimal.toFixed(2)),
      entranceFeesAmount: Number(entranceFeesDecimal.toFixed(2)),
      boatTransportAmount: Number(boatTransportDecimal.toFixed(2)),
      taxAmount: Number(taxDecimal.toFixed(2)),
      totalAmount: Number(totalDecimal.toFixed(2)),
      currency,
      breakdown,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const heritageTourPricingService = new HeritageTourPricingService();

