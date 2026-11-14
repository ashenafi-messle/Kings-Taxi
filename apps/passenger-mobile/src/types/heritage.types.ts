import { AddressLocation } from './common.types';

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

export interface HeritageSite {
  id: string;
  name: string;
  slug?: string;
  region: string;
  city?: string;
  unescoDesignated: boolean;
  unescoYear?: number;
  shortDescription: string;
  historicalOverview: string;
  culturalSignificance: string;
  recommendedDuration: string;
  visitingHours: string;
  heroImage: string;
  gallery: string[];
  location: AddressLocation;
  keyHighlights: string[];
  entryFeeETB: number;
  requiresBoatTransport?: boolean;
  destinationType?: HeritageDestinationType;
  featured?: boolean;
}

export interface TourPackageSite {
  siteId: string;
  siteName: string;
  visitOrder: number;
  estimatedVisitDurationMinutes: number;
  entryFeeETB: number;
  requiresBoatTransport: boolean;
}

export interface TourPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  itinerary: Array<{
    order: number;
    name: string;
    duration: number;
    notes?: string;
  }>;
  estimatedDurationMinutes: number;
  region: string;
  city: string;
  basePrice: number;
  currency: string;
  minimumPassengers: number;
  maximumPassengers: number;
  includesGuide: boolean;
  includesTransport: boolean;
  includesBoat: boolean;
  status: 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED' | 'ARCHIVED';
  featured: boolean;
  requiresAdvanceBooking: boolean;
  minimumAdvanceHours: number;
  cancellationPolicy?: string;
  sites: TourPackageSite[];
}

export interface TourVehicleOption {
  id: string;
  vehicleType: string;
  displayName: string;
  seatingCapacity: number;
  luggageCapacity: number;
  baseRate: number;
  perHourRate: number;
  isActive: boolean;
  features: string[];
}

export interface TourGuide {
  id: string;
  fullName: string;
  languages: string[];
  qualifications: string[];
  specialties: string[];
  dailyRate: number;
  hourlyRate?: number;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  rating: number;
  totalToursLed: number;
  isActive: boolean;
}

export interface TourPriceBreakdownItem {
  componentName: string;
  componentType: TourComponentType;
  pricingMethod: TourPricingMethod;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  description?: string;
}

export interface TourPricingSnapshot {
  baseAmount: number;
  vehicleAmount: number;
  guideAmount: number;
  entranceFeesAmount: number;
  boatTransportAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: TourPriceBreakdownItem[];
  calculatedAt: string;
}

export interface TourQuote {
  quoteReference: string;
  packageName?: string;
  scheduledDate: string;
  preferredStartTime: string;
  totalPassengers: number;
  adults: number;
  children: number;
  requiresBoatTransport: boolean;
  pricing: TourPricingSnapshot;
  vehicleOption?: {
    id: string;
    displayName: string;
    seatingCapacity: number;
  };
  guideRequested: boolean;
  guideLanguage?: string;
}

export interface TourBookingRequest {
  packageId?: string;
  siteIds?: string[];
  scheduledDate: string;
  preferredStartTime?: string;
  adults: number;
  children?: number;
  vehicleOptionId?: string;
  requestGuide?: boolean;
  preferredGuideLanguage?: string;
  selectedGuideId?: string;
  pickupLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  specialRequests?: string;
  paymentMethod?: 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA';
}

export interface TourBooking {
  id: string;
  bookingReference: string;
  passengerId: string;
  packageId?: string;
  packageName?: string;
  bookingStatus: HeritageTourBookingStatus;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  scheduledDate: string;
  preferredStartTime: string;
  adults: number;
  children: number;
  pickupLocation: string;
  totalAmount: number;
  currency: string;
  pricing: TourPricingSnapshot;
  vehicleOption?: {
    id: string;
    displayName: string;
    seatingCapacity: number;
  };
  guideRequested: boolean;
  guideLanguage?: string;
  requiresBoatTransport?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Legacy Custom Contract types (preserved for compatibility)
export interface CustomContractStop {
  id: string;
  heritageSiteId: string;
  siteName: string;
  region: string;
  durationHours: number;
  order: number;
}

export interface FullContractTransportationRequest {
  id: string;
  departureLocation: AddressLocation;
  selectedStops: CustomContractStop[];
  startDate: string;
  endDate?: string;
  departureTime: string;
  passengersCount: number;
  vehicleCategory: 'suv' | 'van' | 'minibus' | 'coaster_bus';
  durationDays: number;
  estimatedPriceETB: number;
  status: 'DRAFT' | 'QUOTED' | 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}
