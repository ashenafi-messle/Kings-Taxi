/**
 * Heritage Tourism & Tour Package Management Type Definitions
 */

export type HeritageSiteCategory = 'UNESCO_HERITAGE' | 'HISTORICAL_CASTLE' | 'ANCIENT_CHURCH' | 'NATURAL_WONDER';
export type HeritageBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface TourPackage {
  id: string;
  name: string; // e.g., "Full-Day Royal Gondar Imperial Tour"
  description: string;
  durationHours: number;
  pricePerPersonETB: number;
  maxParticipants: number;
  includedServices: string[];
  scheduleDepartureTime: string; // "09:00 AM"
  isActive: boolean;
  title?: string;
  includesTransport?: boolean;
  includesGuide?: boolean;
  includesEntranceFees?: boolean;
}

export interface HeritageDestinationGalleryImage {
  id?: string;
  siteId?: string;
  imageUrl: string;
  publicId?: string;
  caption?: string;
  displayOrder: number;
  isPrimary: boolean;
  fileFormat?: string;
  fileSize?: number;
}

export interface HeritageSite {
  id: string;
  name: string; // e.g. "Fasil Ghebbi & Royal Enclosure"
  slug: string;
  region: string; // e.g. "Amhara Region"
  city: string; // e.g. "Gondar"
  category: HeritageSiteCategory;
  categoryLabel: string;
  unescoDesignated: boolean;
  unescoWorldHeritage?: boolean;
  description?: string;
  entranceFeeETB?: number;
  unescoYear?: number;
  
  shortDescription: string;
  historicalOverview: string;
  culturalSignificance: string;
  
  latitude: number;
  longitude: number;
  address: string;
  
  visitingHours: string; // "08:30 - 17:30 Daily"
  recommendedDuration: string; // "2 - 3 Hours"
  entryFeeETB: number;
  
  heroImage: string;
  galleryImages: string[];
  destinationImages?: HeritageDestinationGalleryImage[];
  
  tourPackages: TourPackage[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSURE';
  
  createdAt: string;
  updatedAt: string;
}

export interface HeritageTourBooking {
  id: string;
  bookingReference: string; // e.g. "HRT-2026-3021"
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  
  heritageSiteId: string;
  heritageSiteName: string;
  destinationCity: string;
  
  packageId?: string;
  packageName: string;
  
  tourDate: string;
  scheduledTime: string;
  numberOfVisitors: number;
  
  totalAmountETB: number;
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
  bookingStatus: HeritageBookingStatus;
  status?: HeritageBookingStatus | string;
  siteName?: string;
  packageTitle?: string;
  pickupLocation?: string;
  guideName?: string;
  totalPriceETB?: number;
  
  guideAssigned?: string;
  transportIncluded: boolean;
  numberOfVehicles?: number;
  requestedTransportService?: string;
  vehicleCategory?: string;
  transportQuotationETB?: number;
  destinationImages?: string[];
  destinationDescription?: string;
  destinationLocation?: string;
  tourDurationHours?: number;
  maxVisitorCapacity?: number;
  includedServices?: string[];
  paymentMethod?: string;
  transactionReference?: string;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  reviewedAt?: string;
  confirmedAt?: string;
  declineReason?: string;
  adminReviewNote?: string;
  statusHistory?: Array<{ status: string; changedAt: string; adminName?: string; note?: string }>;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface HeritageFilterParams {
  search?: string;
  city?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

