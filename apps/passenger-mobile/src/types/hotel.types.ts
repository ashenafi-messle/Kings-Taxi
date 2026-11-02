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
  city: string;
  category: 'luxury' | 'boutique' | 'resort' | 'business';
  starRating: number;
  reviewScore: number;
  reviewCount: number;
  address: string;
  location: AddressLocation;
  heroImage: string;
  photos: string[];
  description: string;
  amenities: string[];
  policies: {
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: string;
  };
  phone: string;
  email: string;
  startingPricePerNight: number;
  rooms: HotelRoom[];
}

export interface HotelReservation {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelCity: string;
  hotelImage: string;
  roomId: string;
  roomTitle: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  guestsCount: number;
  totalPriceETB: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  reservationCode: string;
  createdAt: string;
}
