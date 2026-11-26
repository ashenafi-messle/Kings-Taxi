export type BookingFilterType = 'ALL' | 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';
export type NormalizedBookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
export type UnifiedPaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface UnifiedBookingSummaryDetails {
  // Ride specific
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string | null;
  driverPhone?: string | null;
  driverRating?: number | null;
  vehicleModel?: string | null;
  plateNumber?: string | null;
  vehicleType?: string | null;
  distanceKm?: number | null;
  durationMins?: number | null;

  // Hotel specific
  hotelName?: string;
  hotelCity?: string;
  hotelAddress?: string;
  roomTypeName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nightsCount?: number;
  adults?: number;
  children?: number;
  numberOfRooms?: number;
  hasAirportTransfer?: boolean;

  // Lounge specific
  loungeName?: string;
  loungeCity?: string;
  loungeAddress?: string;
  reservationTime?: string;
  guestsCount?: number;

  // Heritage Tour specific
  packageName?: string;
  vehicleOptionName?: string;
  assignedDriverName?: string | null;
  assignedGuideName?: string | null;
  guideRequested?: boolean;
  scheduledDate?: string;
  preferredStartTime?: string;
  siteNames?: string[];
  stopsCount?: number;
}

export interface UnifiedBookingItem {
  id: string;
  reference: string;
  type: 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  createdAt: string;
  scheduledAt: string;
  status: string;
  normalizedStatus: NormalizedBookingStatus;
  paymentStatus: UnifiedPaymentStatus;
  currency: string;
  totalAmount: number;
  summaryDetails: UnifiedBookingSummaryDetails;
}

export interface BookingHistoryPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PassengerBookingHistorySummary {
  totalBookings: number;
  totalRides: number;
  totalHotels: number;
  totalLounges: number;
  totalHeritageTours: number;
  completed: number;
  pending: number;
}

export interface UnifiedBookingHistoryResult {
  items: UnifiedBookingItem[];
  pagination: BookingHistoryPagination;
  summary: PassengerBookingHistorySummary;
}

export interface BookingHistoryFilterParams {
  type?: BookingFilterType;
  status?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
  sort?: 'NEWEST' | 'OLDEST';
  fromDate?: string;
  toDate?: string;
}

export interface PassengerRecentActivity {
  id: string;
  reference: string;
  type: 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';
  title: string;
  subtitle: string;
  category: 'ride' | 'hotel' | 'lounge' | 'tour' | 'payment';
  status: string;
  normalizedStatus: NormalizedBookingStatus;
  paymentStatus: UnifiedPaymentStatus;
  currency: string;
  totalAmount: number;
  timestamp: string;
  iconType: 'car' | 'hotel' | 'lounge' | 'compass' | 'credit-card';
}

