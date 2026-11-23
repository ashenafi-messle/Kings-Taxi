import {
  HotelStatus,
  HotelCategory,
  HotelVerificationStatus,
  HotelPublicationStatus,
  RoomTypeStatus,
  VehicleType,
  PaymentMethod,
} from '@prisma/client';

export interface CreateHotelDto {
  name: string;
  slug?: string;
  partnerId?: string;
  category?: HotelCategory;
  coverImageUrl?: string;
  description: string;
  shortDescription?: string;
  address: string;
  city?: string;
  subCity?: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  starRating?: number;
  checkInTime?: string;
  checkOutTime?: string;
  timezone?: string;
  featured?: boolean;
  status?: HotelStatus;
  publicationStatus?: HotelPublicationStatus;
  publishImmediately?: boolean;
  publish?: boolean;
  amenitySlugs?: string[];
}

export interface UpdateHotelDto {
  name?: string;
  partnerId?: string;
  category?: HotelCategory;
  coverImageUrl?: string;
  description?: string;
  shortDescription?: string;
  address?: string;
  city?: string;
  subCity?: string;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  starRating?: number;
  checkInTime?: string;
  checkOutTime?: string;
  timezone?: string;
  featured?: boolean;
  status?: HotelStatus;
  verificationStatus?: HotelVerificationStatus;
  publicationStatus?: HotelPublicationStatus;
  rejectionReason?: string;
  amenitySlugs?: string[];
}

export interface CreateHotelImageDto {
  imageUrl: string;
  altText?: string;
  displayOrder?: number;
  isCover?: boolean;
}

export interface CreateRoomTypeDto {
  name: string;
  description?: string;
  maximumAdults?: number;
  maximumChildren?: number;
  maximumGuests?: number;
  totalInventory?: number;
  basePricePerNight: number;
  currency?: string;
  images?: (string | { imageUrl: string; caption?: string; displayOrder?: number; isPrimary?: boolean })[];
  galleryImages?: (string | { imageUrl: string; caption?: string; displayOrder?: number; isPrimary?: boolean })[];
}

export interface UpdateRoomTypeDto {
  name?: string;
  description?: string;
  maximumAdults?: number;
  maximumChildren?: number;
  maximumGuests?: number;
  totalInventory?: number;
  basePricePerNight?: number;
  currency?: string;
  status?: RoomTypeStatus;
}

export interface CreateRateDto {
  startDate: string;
  endDate: string;
  pricePerNight: number;
  currency?: string;
  minimumNights?: number;
}

export interface CreateAirportTransferRateDto {
  originName?: string;
  destinationName: string;
  vehicleType?: VehicleType;
  vehicleCapacity?: number;
  fixedPrice: number;
  currency?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface UpdateAirportTransferRateDto {
  originName?: string;
  destinationName?: string;
  vehicleType?: VehicleType;
  vehicleCapacity?: number;
  fixedPrice?: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  isActive?: boolean;
}

export interface HotelQuoteRequestDto {
  hotelId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms?: number;
  adults?: number;
  children?: number;
  includeAirportTransfer?: boolean;
  airportTransferVehicleType?: VehicleType;
}

export interface HotelQuoteResponseDto {
  hotel: {
    id: string;
    name: string;
    city: string;
    address: string;
    starRating: number | null;
  };
  roomType: {
    id: string;
    name: string;
    maximumGuests: number;
    basePricePerNight: number;
  };
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  numberOfRooms: number;
  adults: number;
  children: number;
  roomSubtotal: number;
  nightlyRateBreakdown: Array<{
    date: string;
    price: number;
    source: 'SEASONAL_RATE' | 'BASE_PRICE';
  }>;
  airportTransfer: {
    selected: boolean;
    rateId?: string;
    origin?: string;
    destination?: string;
    vehicleType?: string;
    fixedPrice: number;
  };
  additionalFees: number;
  discount: number;
  grandTotal: number;
  currency: string;
  quoteExpiration: string;
}

export interface CreateHotelBookingDto {
  hotelId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms?: number;
  adults?: number;
  children?: number;
  specialRequests?: string;
  includeAirportTransfer?: boolean;
  airportTransferVehicleType?: VehicleType;
  pickupTime?: string;
  flightNumber?: string;
  paymentMethod?: PaymentMethod;
}

export interface CreateLoungeDto {
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  contactEmail?: string;
  operatingHours?: string;
  amenities?: string[];
  featured?: boolean;
}

export interface UpdateLoungeDto {
  name?: string;
  description?: string;
  shortDescription?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours?: string;
  amenities?: string[];
  featured?: boolean;
  status?: HotelStatus;
}

export interface CreateLoungeReservationDto {
  loungeId: string;
  reservationDate: string;
  reservationTime: string;
  guestsCount?: number;
  specialRequests?: string;
}
