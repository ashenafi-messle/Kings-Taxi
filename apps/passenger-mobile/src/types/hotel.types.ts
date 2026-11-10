import { AddressLocation } from './common.types';

export interface HotelRoom {
  id: string;
  title: string;
  description: string;
  pricePerNight: number;
  capacityAdults: number;
  capacityChildren: number;
  bedType: string;
  amenities: string[];
  photos: string[];
  availableCount: number;
}

export interface Hotel {
  id: string;
  name: string;
  slug?: string;
  city: string;
  category: 'luxury' | 'boutique' | 'resort' | 'business' | string;
  starRating: number;
  reviewScore: number;
  reviewCount: number;
  address: string;
  location?: AddressLocation;
  heroImage: string;
  photos: string[];
  description: string;
  amenities: string[];
  policies?: {
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: string;
  };
  phone?: string;
  email?: string;
  startingPricePerNight: number;
  rooms: HotelRoom[];
  transferAvailable?: boolean;
}

export interface AirportTransferRateDto {
  id: string;
  hotelId: string;
  vehicleCategory: string;
  vehicleCategoryLabel: string;
  fixedPriceETB: number;
  pickupLocation: string;
  dropoffLocation: string;
  estimatedMinutes: number;
  description?: string;
  status: string;
}

export interface HotelQuoteRequest {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  roomTypes: {
    roomTypeId: string;
    quantity: number;
  }[];
  airportTransfer?: {
    includeTransfer: boolean;
    vehicleCategory: string;
  };
}

export interface QuoteBreakdownItem {
  label: string;
  amount: number;
  description?: string;
}

export interface HotelQuoteResponse {
  nights: number;
  roomSubtotal: number;
  transferSubtotal: number;
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: QuoteBreakdownItem[];
}

export interface CreateHotelBookingDto {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  adultsCount: number;
  childrenCount?: number;
  roomItems: {
    roomTypeId: string;
    quantity: number;
  }[];
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  airportTransfer?: {
    includeTransfer: boolean;
    vehicleCategory: string;
    flightNumber?: string;
    pickupDate?: string;
    pickupTime?: string;
    passengerCount?: number;
    specialNotes?: string;
  };
}

export interface HotelReservation {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelCity: string;
  hotelImage: string;
  roomId?: string;
  roomTitle: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  guestsCount: number;
  totalPriceETB: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  reservationCode: string;
  createdAt: string;
  hasAirportTransfer?: boolean;
  airportTransferStatus?: string;
  airportTransferVehicle?: string;
}

export interface Lounge {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  coverImage: string;
  description: string;
  pricePerPerson: number;
  capacity: number;
  openingHours?: string;
  amenities: string[];
  images: string[];
  status: string;
}

export interface LoungeReservation {
  id: string;
  loungeId: string;
  loungeName?: string;
  reservationDate: string;
  timeSlot: string;
  guestCount: number;
  totalPriceETB: number;
  status: string;
  reservationCode: string;
  createdAt?: string;
}
