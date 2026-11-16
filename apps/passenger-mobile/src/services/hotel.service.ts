import { API_CONFIG, apiFetch } from '../config/api';
import { useAuthStore } from '../stores/auth.store';
import {
  ApiResponse,
  Hotel,
  HotelRoom,
  HotelReservation,
  AirportTransferRateDto,
  HotelQuoteRequest,
  HotelQuoteResponse,
  CreateHotelBookingDto,
  Lounge,
  LoungeReservation,
} from '../types';
import { mockHotels } from '../mocks';

async function requestWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, options);
}

function mapBackendHotelToMobile(h: any): Hotel {
  const rooms: HotelRoom[] = (h.roomTypes || []).map((r: any) => ({
    id: r.id,
    title: r.name,
    description: r.description || '',
    pricePerNight: Number(r.basePricePerNight ?? r.basePriceETB ?? 0),
    capacityAdults: r.capacityAdults || r.maximumAdults || 2,
    capacityChildren: r.capacityChildren || r.maximumChildren || 1,
    bedType: r.bedType || 'King Bed',
    amenities: r.amenities || ['Free Wi-Fi', 'Room Service'],
    photos: r.images || [h.coverImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
    availableCount: r.inventoryCount || r.totalInventory || 5,
  }));

  const amenities = (h.amenities || []).map((a: any) =>
    typeof a === 'string' ? a : a.amenity?.name || a.name || 'Amenity'
  );

  return {
    id: h.id,
    name: h.name,
    slug: h.slug,
    city: h.city || 'Gondar',
    category: (h.category?.toLowerCase() as any) || 'luxury',
    starRating: h.starRating || 5,
    reviewScore: Number(h.reviewScore || 4.8),
    reviewCount: h.reviewCount || 120,
    address: h.address || 'Gondar, Ethiopia',
    location: {
      id: h.id,
      title: h.name,
      address: h.address || 'Gondar, Ethiopia',
      city: h.city || 'Gondar',
      coordinates: {
        latitude: Number(h.latitude || 12.6074),
        longitude: Number(h.longitude || 37.4589),
      },
    },
    heroImage: h.coverImage || (h.images && h.images[0]?.imageUrl) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    photos: (h.images || []).map((img: any) => img.imageUrl || img),
    description: h.description || '',
    amenities: amenities.length > 0 ? amenities : ['Wi-Fi', 'Free Parking', 'Airport Transfer', 'Breakfast Included'],
    policies: {
      checkInTime: h.checkInTime || '14:00',
      checkOutTime: h.checkOutTime || '11:00',
      cancellationPolicy: h.cancellationPolicy || 'Free cancellation up to 24 hours before check-in',
    },
    phone: h.contactPhone || h.phone || '+251 58 111 0000',
    email: h.contactEmail || h.email || 'hospitality@kingstaxi.et',
    startingPricePerNight: Number(h.startingPrice ?? h.startingPriceETB ?? (rooms[0]?.pricePerNight || 3500)),
    rooms: rooms.length > 0 ? rooms : [
      {
        id: `${h.id}-deluxe`,
        title: 'Deluxe Panorama Room',
        description: 'Spacious guest room with panoramic valley and city views.',
        pricePerNight: Number(h.startingPrice ?? h.startingPriceETB ?? 3500),
        capacityAdults: 2,
        capacityChildren: 1,
        bedType: '1 King Bed',
        amenities: ['Free Wi-Fi', 'Balcony', 'Breakfast', 'Ensuite Bath'],
        photos: [h.coverImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
        availableCount: 4,
      },
    ],
    transferAvailable: true,
  };
}

export class HotelService {
  /**
   * Search hotels from backend, falling back to mock hotels if backend is offline.
   */
  static async searchHotels(query?: string, city?: string): Promise<ApiResponse<Hotel[]>> {
    const params = new URLSearchParams();
    if (city && city !== 'ALL') params.append('city', city);
    if (query) params.append('search', query);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await requestWithAuth<any>(`/hotels${queryStr}`);
    const rawList: any[] | null = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.hotels)
      ? res.data.hotels
      : null;

    if (res.success && rawList && rawList.length > 0) {
      const mapped = rawList.map(mapBackendHotelToMobile);
      return { success: true, data: mapped };
    }

    // Fallback filter over mockHotels
    let list = [...mockHotels];
    if (city && city !== 'ALL') {
      list = list.filter((h) => h.city.toLowerCase() === city.toLowerCase());
    }
    if (query) {
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(query.toLowerCase()) ||
          h.city.toLowerCase().includes(query.toLowerCase())
      );
    }
    return {
      success: true,
      data: list,
    };
  }

  /**
   * Get featured hotels.
   */
  static async getFeaturedHotels(): Promise<ApiResponse<Hotel[]>> {
    const res = await requestWithAuth<any>('/hotels/featured');
    const rawList: any[] | null = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.hotels)
      ? res.data.hotels
      : null;

    if (res.success && rawList && rawList.length > 0) {
      return { success: true, data: rawList.map(mapBackendHotelToMobile) };
    }
    return {
      success: true,
      data: mockHotels.slice(0, 3),
    };
  }

  /**
   * Get single hotel details by ID or Slug.
   */
  static async getHotelById(idOrSlug: string): Promise<ApiResponse<Hotel | null>> {
    const res = await requestWithAuth<any>(`/hotels/${idOrSlug}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: mapBackendHotelToMobile(res.data),
      };
    }

    const clean = (s: string) => (s || '').toLowerCase().replace(/^(htl_|h_)/, '').replace(/[-_]/g, '');
    const target = clean(idOrSlug);
    const fallback =
      mockHotels.find(
        (h) => h.id === idOrSlug || (h as any).slug === idOrSlug || clean(h.id) === target
      ) || null;
    return {
      success: Boolean(fallback),
      data: fallback,
    };
  }

  /**
   * Get airport transfer rates configured for a hotel (GDQ Airport -> Hotel).
   */
  static async getTransferRates(hotelId: string): Promise<ApiResponse<AirportTransferRateDto[]>> {
    const res = await requestWithAuth<AirportTransferRateDto[]>(
      `/hotels/${hotelId}/transfer-rates`
    );
    if (res.success && Array.isArray(res.data)) {
      return res;
    }

    // Default Gondar Airport rates fallback
    const defaults: AirportTransferRateDto[] = [
      {
        id: 'gdq_sedan',
        hotelId,
        vehicleCategory: 'SEDAN',
        vehicleCategoryLabel: 'Standard Sedan (up to 3 guests)',
        fixedPriceETB: 1200,
        pickupLocation: 'Atse Tewodros Airport (GDQ), Gondar',
        dropoffLocation: 'Hotel Entry Gate',
        estimatedMinutes: 25,
        description: 'Comfortable air-conditioned private sedan transfer.',
        status: 'ACTIVE',
      },
      {
        id: 'gdq_suv',
        hotelId,
        vehicleCategory: 'SUV',
        vehicleCategoryLabel: 'Executive SUV (up to 4 guests)',
        fixedPriceETB: 2000,
        pickupLocation: 'Atse Tewodros Airport (GDQ), Gondar',
        dropoffLocation: 'Hotel Entry Gate',
        estimatedMinutes: 25,
        description: 'Spacious luxury 4x4 SUV with premium luggage space.',
        status: 'ACTIVE',
      },
      {
        id: 'gdq_van',
        hotelId,
        vehicleCategory: 'VAN',
        vehicleCategoryLabel: 'Passenger Van (up to 8 guests)',
        fixedPriceETB: 2800,
        pickupLocation: 'Atse Tewodros Airport (GDQ), Gondar',
        dropoffLocation: 'Hotel Entry Gate',
        estimatedMinutes: 30,
        description: 'Ideal for travel groups and families with extra baggage.',
        status: 'ACTIVE',
      },
    ];
    return {
      success: true,
      data: defaults,
    };
  }

  /**
   * Request authoritative quote from backend.
   */
  static async getQuote(request: HotelQuoteRequest): Promise<ApiResponse<HotelQuoteResponse>> {
    return requestWithAuth<HotelQuoteResponse>('/hotel-bookings/quote', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Create confirmed hotel reservation with optional airport transfer.
   */
  static async createBooking(dto: CreateHotelBookingDto): Promise<ApiResponse<any>> {
    return requestWithAuth<any>('/hotel-bookings', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Get logged-in passenger's hotel bookings.
   */
  static async getPassengerBookings(): Promise<ApiResponse<HotelReservation[]>> {
    const res = await requestWithAuth<any[]>('/hotel-bookings');
    if (res.success && Array.isArray(res.data)) {
      const mapped: HotelReservation[] = res.data.map((b) => ({
        id: b.id,
        hotelId: b.hotelId,
        hotelName: b.hotel?.name || 'Kings Luxury Hotel',
        hotelCity: b.hotel?.city || 'Gondar',
        hotelImage: b.hotel?.coverImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        roomId: b.rooms?.[0]?.roomTypeId,
        roomTitle: b.rooms?.[0]?.roomType?.name || 'Selected Suite',
        checkInDate: typeof b.checkInDate === 'string' ? b.checkInDate.split('T')[0] : '2026-11-12',
        checkOutDate: typeof b.checkOutDate === 'string' ? b.checkOutDate.split('T')[0] : '2026-11-14',
        nightsCount: b.nightsCount || 2,
        guestsCount: b.guestCount || 2,
        totalPriceETB: Number(b.totalAmount || 0),
        status: b.status || 'CONFIRMED',
        reservationCode: b.bookingReference,
        createdAt: b.createdAt || new Date().toISOString(),
        hasAirportTransfer: Boolean(b.transferBooking),
        airportTransferStatus: b.transferBooking?.status,
        airportTransferVehicle: b.transferBooking?.vehicleCategory,
      }));
      return { success: true, data: mapped };
    }
    return { success: false, data: [] };
  }

  /**
   * Cancel hotel booking by reference.
   */
  static async cancelBooking(bookingReference: string, reason?: string): Promise<ApiResponse<any>> {
    return requestWithAuth<any>(`/hotel-bookings/${bookingReference}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * List lounges.
   */
  static async listLounges(city?: string): Promise<ApiResponse<Lounge[]>> {
    const params = new URLSearchParams();
    if (city && city !== 'ALL') params.append('city', city);
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    const res = await requestWithAuth<any>(`/lounges${queryStr}`);
    const rawList: any[] | null = Array.isArray(res.data)
      ? res.data
      : Array.isArray((res.data as any)?.lounges)
      ? (res.data as any).lounges
      : null;

    if (res.success && rawList && rawList.length > 0) {
      const mapped: Lounge[] = rawList.map((l: any) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        city: l.city || 'Gondar',
        address: l.address || 'Gondar, Ethiopia',
        coverImage: l.coverImage || (l.images && l.images[0]?.imageUrl) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        description: l.description || '',
        pricePerPerson: Number(l.pricePerPerson || 450),
        capacity: l.capacity || 40,
        openingHours: l.operatingHours || l.openingHours || '07:00 - 23:00',
        amenities: l.amenities || ['Premium Espresso', 'Wi-Fi', 'Private Cabanas', 'Terrace View'],
        images: (l.images || []).map((img: any) => img.imageUrl || img),
        status: l.status || 'PUBLISHED',
      }));
      return { success: true, data: mapped };
    }

    // Default Gondar Lounges fallback
    const defaults: Lounge[] = [
      {
        id: 'lng_fasil_terrace',
        name: 'Fasil Imperial Terrace & Coffee Lounge',
        slug: 'fasil-imperial-terrace',
        city: 'Gondar',
        address: 'Piasa Heritage Square, Gondar',
        coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        description: 'Panoramic outdoor terrace overlooking Gondar Castles, offering traditional Ethiopian single-origin coffee ceremony, artisanal pastries, and sunset cocktails.',
        pricePerPerson: 450,
        capacity: 40,
        openingHours: '07:00 - 23:00',
        amenities: ['Panoramic Castle View', 'Single Origin Coffee', 'Free High-Speed Wi-Fi', 'VIP Seating'],
        images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'],
        status: 'PUBLISHED',
      },
      {
        id: 'lng_royal_executive',
        name: 'Atse Tewodros Executive Airport Lounge',
        slug: 'atse-tewodros-executive-lounge',
        city: 'Gondar',
        address: 'Atse Tewodros Airport Terminal, Gondar',
        coverImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        description: 'Quiet premium airport departure lounge with private desks, high-speed Wi-Fi, refreshments, and direct boarding notifications.',
        pricePerPerson: 750,
        capacity: 25,
        openingHours: '06:00 - 20:00',
        amenities: ['Flight Boarding Updates', 'Complimentary Buffet', 'Fast Wi-Fi', 'Workstations'],
        images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
        status: 'PUBLISHED',
      },
    ];

    return { success: true, data: defaults };
  }

  /**
   * Reserve lounge access.
   */
  static async createLoungeReservation(request: {
    loungeId: string;
    reservationDate: string;
    timeSlot: string;
    guestCount: number;
    specialRequests?: string;
  }): Promise<ApiResponse<LoungeReservation>> {
    return requestWithAuth<LoungeReservation>('/lounge-reservations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}
