import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type HeritageDestinationType =
  | 'HISTORICAL_PALACE'
  | 'RELIGIOUS_MONASTERY'
  | 'ANCIENT_RUIN'
  | 'NATURAL_LANDMARK'
  | 'CULTURAL_VILLAGE';

export type HeritageTourBookingStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'CONFIRMED'
  | 'GUIDE_ASSIGNED'
  | 'VEHICLE_ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type TourComponentType =
  | 'TOUR_BASE'
  | 'VEHICLE_TRANSPORT'
  | 'TOUR_GUIDE'
  | 'ENTRANCE_FEE'
  | 'BOAT_TRANSPORT'
  | 'PARKING'
  | 'ADDITIONAL_SERVICE';

export type TourPricingMethod =
  | 'FIXED_PER_BOOKING'
  | 'PER_PASSENGER'
  | 'PER_VEHICLE'
  | 'PER_HOUR'
  | 'PER_DAY';

export type GuideAvailabilityStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_LEAVE' | 'INACTIVE';

export type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

// ============================================================================
// VALIDATION SCHEMAS (ZOD)
// ============================================================================

export const createHeritageSiteSchema = z.object({
  name: z.string().min(2).max(128),
  slug: z.string().min(2).max(128).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)'),
  shortDescription: z.string().min(10).max(255),
  fullDescription: z.string().min(20),
  region: z.string().default('Amhara Region'),
  city: z.string().default('Gondar'),
  specificLocation: z.string().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  destinationType: z.enum([
    'HISTORICAL_PALACE',
    'RELIGIOUS_MONASTERY',
    'ANCIENT_RUIN',
    'NATURAL_LANDMARK',
    'CULTURAL_VILLAGE',
  ]).default('HISTORICAL_PALACE'),
  estimatedVisitDurationMinutes: z.number().int().min(15).max(1440).default(120),
  historicalInformation: z.string().optional(),
  culturalInformation: z.string().optional(),
  visitingRules: z.string().optional(),
  coverImageUrl: z.string().url(),
  galleryImages: z.array(z.string().url()).default([]),
  highlights: z.array(z.string()).default([]),
  entryFeeETB: z.number().min(0).default(0),
  requiresBoatTransport: z.boolean().default(false),
  unescoDesignated: z.boolean().default(false),
  unescoYear: z.number().int().min(1900).max(2100).optional(),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const updateHeritageSiteSchema = createHeritageSiteSchema.partial();

export const searchHeritageSitesSchema = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  destinationType: z.enum([
    'HISTORICAL_PALACE',
    'RELIGIOUS_MONASTERY',
    'ANCIENT_RUIN',
    'NATURAL_LANDMARK',
    'CULTURAL_VILLAGE',
  ]).optional(),
  unescoOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  featuredOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  search: z.string().optional(),
  limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100)).optional(),
  offset: z.preprocess((val) => (val ? Number(val) : 0), z.number().int().min(0)).optional(),
});

export const createHeritageTourPackageSchema = z.object({
  name: z.string().min(2).max(128),
  slug: z.string().min(2).max(128).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  itinerary: z.any().optional(),
  estimatedDurationMinutes: z.number().int().min(30).max(1440).default(240),
  region: z.string().default('Amhara Region'),
  city: z.string().default('Gondar'),
  basePrice: z.number().min(0),
  currency: z.string().default('ETB'),
  minimumPassengers: z.number().int().min(1).default(1),
  maximumPassengers: z.number().int().min(1).max(50).default(20),
  includesGuide: z.boolean().default(false),
  includesTransport: z.boolean().default(true),
  includesBoat: z.boolean().default(false),
  featured: z.boolean().default(false),
  requiresAdvanceBooking: z.boolean().default(true),
  minimumAdvanceHours: z.number().int().min(1).max(720).default(6),
  cancellationPolicy: z.string().optional(),
  siteIds: z.array(z.string().min(1)).optional(),
});

export const updateHeritageTourPackageSchema = createHeritageTourPackageSchema.partial();

export const tourQuoteRequestSchema = z
  .object({
    packageId: z.string().min(1).optional(),
    siteIds: z.array(z.string().min(1)).optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be YYYY-MM-DD'),
    preferredStartTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'preferredStartTime must be HH:MM').default('09:00'),
    adults: z.number().int().min(1).max(50).default(1),
    children: z.number().int().min(0).max(50).default(0),
    vehicleOptionId: z.string().min(1).optional(),
    requestGuide: z.boolean().default(false),
    preferredGuideLanguage: z.string().default('English'),
    selectedGuideId: z.string().min(1).optional(),
    pickupLocation: z.string().optional(),
    specialRequests: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'TELEBIRR', 'CBE_BIRR', 'CHAPA']).optional(),
  })
  .passthrough();

export const createTourBookingSchema = tourQuoteRequestSchema.extend({
  pickupLocation: z.string().min(3).max(255),
  pickupLatitude: z.number().min(-90).max(90).optional(),
  pickupLongitude: z.number().min(-180).max(180).optional(),
  specialRequests: z.string().max(1000).optional(),
  paymentMethod: z.enum(['CASH', 'TELEBIRR', 'CBE_BIRR', 'CHAPA']).default('CASH'),
});

export const updateTourBookingStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'REQUESTED',
    'UNDER_REVIEW',
    'CONFIRMED',
    'GUIDE_ASSIGNED',
    'VEHICLE_ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
  ]),
  assignedGuideId: z.string().uuid().optional(),
  assignedVehicleId: z.string().uuid().optional(),
  assignedDriverId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const cancelTourBookingSchema = z.object({
  cancellationReason: z.string().min(3).max(500),
});

// ============================================================================
// DTO & RESPONSE TYPES
// ============================================================================

export interface TourPriceItemDTO {
  componentName: string;
  componentType: TourComponentType;
  pricingMethod: TourPricingMethod;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  description?: string;
}

export interface TourPricingSnapshotDTO {
  baseAmount: number;
  vehicleAmount: number;
  guideAmount: number;
  entranceFeesAmount: number;
  boatTransportAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: TourPriceItemDTO[];
  calculatedAt: string;
}

export interface TourQuoteResponseDTO {
  quoteReference: string;
  packageName?: string;
  scheduledDate: string;
  preferredStartTime: string;
  totalPassengers: number;
  adults: number;
  children: number;
  requiresBoatTransport: boolean;
  pricing: TourPricingSnapshotDTO;
  vehicleOption?: {
    id: string;
    displayName: string;
    seatingCapacity: number;
  };
  guideRequested: boolean;
  guideLanguage?: string;
}

