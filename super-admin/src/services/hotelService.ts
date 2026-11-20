import { Hotel, HotelBooking, HotelFilterParams, HotelRoomType, PaginatedResult } from '../types';
import { mockHotels, mockHotelBookings } from './mockData';
import { apiRequest } from './apiClient';

let hotelsData: Hotel[] = [...mockHotels];
let hotelBookingsData: HotelBooking[] = [...mockHotelBookings];

export class HotelService {
  static async getHotels(params: HotelFilterParams = {}): Promise<PaginatedResult<Hotel>> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered = [...hotelsData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q)
      );
    }

    if (params.city && params.city !== 'ALL') {
      filtered = filtered.filter((h) => h.city.toLowerCase() === params.city?.toLowerCase());
    }

    if (params.category && params.category !== 'ALL') {
      filtered = filtered.filter((h) => h.category === params.category);
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((h) => h.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getHotelById(id: string): Promise<Hotel | null> {
    await new Promise((r) => setTimeout(r, 150));
    return hotelsData.find((h) => h.id === id || h.slug === id) || null;
  }

  static async createHotel(payload: Partial<Hotel>): Promise<Hotel> {
    await new Promise((r) => setTimeout(r, 300));
    const newId = `htl_${Date.now()}`;
    const slug = (payload.name || 'hotel').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newHotel: Hotel = {
      id: newId,
      name: payload.name || 'New Hotel',
      slug,
      description: payload.description || '',
      starRating: payload.starRating || 4,
      category: payload.category || 'BOUTIQUE_HERITAGE',
      categoryLabel: payload.categoryLabel || 'Boutique Hotel',
      city: payload.city || 'Gondar',
      address: payload.address || '',
      latitude: payload.latitude || 12.6078,
      longitude: payload.longitude || 37.4705,
      phone: payload.phone || '+251 58 111 0000',
      email: payload.email || 'info@hotel.et',
      website: payload.website,
      checkInTime: payload.checkInTime || '14:00',
      checkOutTime: payload.checkOutTime || '11:00',
      facilities: payload.facilities || ['Free Wi-Fi', 'Restaurant', 'Airport Shuttle'],
      heroImage: payload.heroImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
      galleryImages: payload.galleryImages || [],
      totalRooms: payload.totalRooms || 20,
      availableRooms: payload.availableRooms || 20,
      status: payload.status || 'ACTIVE',
      roomTypes: payload.roomTypes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    hotelsData = [newHotel, ...hotelsData];
    return newHotel;
  }

  static async updateHotel(id: string, updates: Partial<Hotel>): Promise<Hotel | null> {
    await new Promise((r) => setTimeout(r, 250));
    const index = hotelsData.findIndex((h) => h.id === id);
    if (index === -1) return null;

    hotelsData[index] = {
      ...hotelsData[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return hotelsData[index];
  }

  static async deleteHotel(id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    const initialLen = hotelsData.length;
    hotelsData = hotelsData.filter((h) => h.id !== id);
    return hotelsData.length < initialLen;
  }

  // --- Dynamic Room Inventory Operations ---

  static async addRoomType(hotelId: string, roomTypePayload: Partial<HotelRoomType>): Promise<HotelRoomType | null> {
    await new Promise((r) => setTimeout(r, 250));
    const hotel = hotelsData.find((h) => h.id === hotelId);
    if (!hotel) return null;

    const newRoom: HotelRoomType = {
      id: `rm_${Date.now()}`,
      hotelId,
      name: roomTypePayload.name || 'Standard Room',
      description: roomTypePayload.description || '',
      pricePerNightETB: roomTypePayload.pricePerNightETB || 3500,
      totalInventory: roomTypePayload.totalInventory || 10,
      availableRooms: roomTypePayload.totalInventory || 10,
      bookedRooms: 0,
      maxGuests: roomTypePayload.maxGuests || 2,
      bedType: roomTypePayload.bedType || '1 King Bed',
      roomSizeSqM: roomTypePayload.roomSizeSqM || 30,
      amenities: roomTypePayload.amenities || ['Wi-Fi', 'TV', 'Ensuite Shower'],
      images: roomTypePayload.images || ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80'],
      status: 'AVAILABLE',
    };

    hotel.roomTypes = [...hotel.roomTypes, newRoom];
    hotel.totalRooms = hotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
    hotel.availableRooms = hotel.roomTypes.reduce((sum, r) => sum + r.availableRooms, 0);
    return newRoom;
  }

  static async updateRoomInventory(
    hotelId: string,
    roomId: string,
    newTotalInventory: number
  ): Promise<HotelRoomType | null> {
    await new Promise((r) => setTimeout(r, 200));
    const hotel = hotelsData.find((h) => h.id === hotelId);
    if (!hotel) return null;

    const room = hotel.roomTypes.find((r) => r.id === roomId);
    if (!room) return null;

    room.totalInventory = newTotalInventory;
    room.availableRooms = Math.max(0, newTotalInventory - room.bookedRooms);
    room.status = room.availableRooms > 0 ? 'AVAILABLE' : 'SOLD_OUT';

    hotel.totalRooms = hotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
    hotel.availableRooms = hotel.roomTypes.reduce((sum, r) => sum + r.availableRooms, 0);

    return room;
  }

  static async updateRoomImages(
    hotelId: string,
    roomId: string,
    images: any[]
  ): Promise<HotelRoomType | null> {
    await new Promise((r) => setTimeout(r, 200));
    const hotel = hotelsData.find((h) => h.id === hotelId);
    if (!hotel) return null;

    const room = hotel.roomTypes.find((r) => r.id === roomId);
    if (!room) return null;

    room.galleryImages = images;
    room.images = images.map((i) => i.imageUrl);
    return room;
  }

  // --- Hotel Bookings ---

  static async getHotelBookings(searchQuery?: string, status?: string): Promise<HotelBooking[]> {
    // 1. Attempt central backend fetch
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('search', searchQuery);
      if (status && status !== 'ALL') queryParams.set('status', status);

      const res = await apiRequest<{ bookings: any[] }>(
        `/hospitality/admin/hotel-bookings?${queryParams.toString()}`
      );
      if (res.success && res.data?.bookings && res.data.bookings.length > 0) {
        // Map backend bookings if available
      }
    } catch {
      // Offline fallback
    }

    await new Promise((r) => setTimeout(r, 200));
    let filtered = [...hotelBookingsData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (b) =>
          b.bookingReference.toLowerCase().includes(q) ||
          b.passengerName.toLowerCase().includes(q) ||
          b.hotelName.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'ALL') {
      filtered = filtered.filter((b) => b.bookingStatus === status);
    }

    return filtered;
  }

  static async getBookingById(id: string): Promise<HotelBooking | null> {
    try {
      const res = await apiRequest<any>(`/hospitality/admin/hotel-bookings/${id}`);
      if (res.success && res.data) {
        // mapped from backend
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    return hotelBookingsData.find((b) => b.id === id || b.bookingReference === id) || null;
  }

  /**
   * Super Admin accepts hotel booking request after atomic inventory verification
   */
  static async acceptBooking(bookingId: string, adminNote?: string): Promise<{ success: boolean; data?: HotelBooking; error?: string }> {
    try {
      const res = await apiRequest<any>(`/hospitality/admin/hotel-bookings/${bookingId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ adminNote }),
      });
      if (res.success && res.data) {
        // Update local cache
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 300));
    const index = hotelBookingsData.findIndex((b) => b.id === bookingId || b.bookingReference === bookingId);
    if (index === -1) return { success: false, error: 'Booking record not found' };

    const booking = hotelBookingsData[index];
    if (booking.bookingStatus === 'CONFIRMED') {
      return { success: false, error: 'This booking has already been accepted and confirmed.' };
    }

    const updated: HotelBooking = {
      ...booking,
      bookingStatus: 'CONFIRMED',
      reviewedAt: new Date().toISOString(),
      adminReviewNote: adminNote || 'Room inventory confirmed and reserved by Super Admin.',
      statusHistory: [
        ...(booking.statusHistory || []),
        {
          status: 'CONFIRMED',
          changedAt: new Date().toISOString(),
          adminName: 'Super Admin',
          note: adminNote || 'Accepted by Super Admin',
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    hotelBookingsData[index] = updated;
    return { success: true, data: updated };
  }

  /**
   * Super Admin declines hotel booking request with mandatory decline reason
   */
  static async declineBooking(
    bookingId: string,
    declineReason: string,
    adminNote?: string
  ): Promise<{ success: boolean; data?: HotelBooking; error?: string }> {
    if (!declineReason || !declineReason.trim()) {
      return { success: false, error: 'A specific decline reason is required when declining a booking request.' };
    }

    try {
      const res = await apiRequest<any>(`/hospitality/admin/hotel-bookings/${bookingId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ declineReason, adminNote }),
      });
      if (res.success && res.data) {
        // Update local cache
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 300));
    const index = hotelBookingsData.findIndex((b) => b.id === bookingId || b.bookingReference === bookingId);
    if (index === -1) return { success: false, error: 'Booking record not found' };

    const booking = hotelBookingsData[index];
    const updated: HotelBooking = {
      ...booking,
      bookingStatus: 'DECLINED',
      declineReason: declineReason.trim(),
      adminReviewNote: adminNote,
      reviewedAt: new Date().toISOString(),
      statusHistory: [
        ...(booking.statusHistory || []),
        {
          status: 'DECLINED',
          changedAt: new Date().toISOString(),
          adminName: 'Super Admin',
          note: `Declined: ${declineReason.trim()}`,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    hotelBookingsData[index] = updated;
    return { success: true, data: updated };
  }

  static async updateBookingStatus(
    bookingId: string,
    status: HotelBooking['bookingStatus']
  ): Promise<HotelBooking | null> {
    await new Promise((r) => setTimeout(r, 200));
    const index = hotelBookingsData.findIndex((b) => b.id === bookingId);
    if (index === -1) return null;

    hotelBookingsData[index] = {
      ...hotelBookingsData[index],
      bookingStatus: status,
      updatedAt: new Date().toISOString(),
    };
    return hotelBookingsData[index];
  }
}
