/**
 * Hotel Entity & Dynamic Room Inventory Management Type Definitions
 */

export type HotelStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_RENOVATION';
export type HotelCategory = 'LUXURY_5_STAR' | 'BOUTIQUE_HERITAGE' | 'BUSINESS_4_STAR' | 'RESORT_LODGE';

export interface HotelAmenity {
  id: string;
  name: string;
  icon?: string;
  category: 'GENERAL' | 'ROOM' | 'LEISURE' | 'WELLNESS' | 'BUSINESS';
}

export interface RoomGalleryImage {
  id?: string;
  roomTypeId?: string;
  imageUrl: string;
  publicId?: string;
  caption?: string;
  displayOrder: number;
  isPrimary: boolean;
  fileFormat?: string;
  fileSize?: number;
}

export interface HotelRoomType {
  id: string;
  hotelId: string;
  name: string; // e.g. "Imperial Suite", "Royal King Deluxe"
  description: string;
  pricePerNightETB: number;
  totalInventory: number;
  availableRooms: number;
  availableInventory?: number;
  bookedRooms: number;
  maxGuests: number;
  bedType: string; // e.g. "1 King Bed" or "2 Queen Beds"
  roomSizeSqM: number;
  amenities: string[];
  images: string[];
  galleryImages?: RoomGalleryImage[];
  status: 'AVAILABLE' | 'SOLD_OUT' | 'MAINTENANCE';
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  description: string;
  starRating: number; // 1 to 5
  category: HotelCategory;
  categoryLabel: string;

  // Location
  city: string; // "Gondar", "Addis Ababa", "Bahir Dar", "Lalibela"
  address: string;
  latitude: number;
  longitude: number;

  // Contact
  phone: string;
  email: string;
  website?: string;

  // Hospitality details
  checkInTime: string; // "14:00"
  checkOutTime: string; // "11:00"
  facilities: string[];
  heroImage: string;
  galleryImages: string[];

  // Inventory summary
  totalRooms: number;
  availableRooms: number;
  status: HotelStatus;

  roomTypes: HotelRoomType[];

  createdAt: string;
  updatedAt: string;
}

export type HotelBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';

export interface HotelBooking {
  id: string;
  bookingReference: string; // e.g. "HTL-2026-8910"
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;

  hotelId: string;
  hotelName: string;
  hotelCity: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelImages?: string[];

  roomTypeId: string;
  roomTypeName: string;
  roomImages?: string[];
  numberOfRooms: number;
  numberOfGuests: number;

  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  numberOfNights?: number;

  pricePerNightETB: number;
  totalAmountETB: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  transactionReference?: string;
  amountPaidETB?: number;

  bookingStatus: HotelBookingStatus;
  specialRequests?: string;

  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  reviewedAt?: string;
  declineReason?: string;
  adminReviewNote?: string;
  statusHistory?: Array<{ status: string; changedAt: string; adminName?: string; note?: string }>;

  createdAt: string;
  updatedAt: string;
}

export interface HotelFilterParams {
  search?: string;
  city?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

