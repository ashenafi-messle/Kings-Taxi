import {
  Hotel,
  HotelBooking,
  HotelFilterParams,
  HotelRoomType,
  HotelPartner,
  HotelPartnerFilterParams,
  PaginatedResult,
} from '../types';
import { apiRequest, buildApiUrl } from './apiClient';

export class HotelService {
  // ============================================================================
  // 1. HOTEL PARTNERS MANAGEMENT
  // ============================================================================

  static async getPartners(params: HotelPartnerFilterParams = {}): Promise<PaginatedResult<HotelPartner>> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.verificationStatus && params.verificationStatus !== 'ALL') q.set('verificationStatus', params.verificationStatus);
    if (params.city && params.city !== 'ALL') q.set('city', params.city);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const res = await apiRequest<{ items: HotelPartner[]; total: number; page: number; limit: number; totalPages: number }>(
      `/admin/hotel-partners?${q.toString()}`
    );

    if (res.success && res.data) {
      return res.data;
    }

    throw new Error(res.error || 'Failed to fetch hotel partners from database.');
  }

  static async getPartnerById(id: string): Promise<HotelPartner | null> {
    const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    if (!res.success && (res.error?.includes('not found') || res.error?.includes('404'))) {
      return null;
    }
    throw new Error(res.error || 'Failed to fetch hotel partner details.');
  }

  static async createPartner(payload: Partial<HotelPartner>): Promise<HotelPartner> {
    const res = await apiRequest<HotelPartner>('/admin/hotel-partners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to create hotel partner record on database.');
  }

  static async updatePartner(id: string, updates: Partial<HotelPartner>): Promise<HotelPartner | null> {
    const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to update hotel partner on database.');
  }

  static async updatePartnerStatus(id: string, status: string, reason?: string): Promise<HotelPartner | null> {
    const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to update partner status on database.');
  }

  static async verifyPartner(id: string, verificationStatus: string, reason?: string): Promise<HotelPartner | null> {
    const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus, reason }),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to update partner verification status.');
  }

  static async uploadPartnerDocument(partnerId: string, documentPayload: any): Promise<any> {
    const res = await apiRequest<any>(`/admin/hotel-partners/${partnerId}/documents`, {
      method: 'POST',
      body: JSON.stringify(documentPayload),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to upload partner verification document.');
  }

  static async getPartnerStats() {
    const res = await apiRequest<any>('/admin/hotel-partners/stats');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to fetch partner statistics.');
  }

  // ============================================================================
  // 2. HOTEL MANAGEMENT
  // ============================================================================

  static async getHotels(params: HotelFilterParams = {}): Promise<PaginatedResult<Hotel>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const qs = q.toString();
    const res = await apiRequest<any>(qs ? `/admin/hotels?${qs}` : '/admin/hotels');
    if (res.success && res.data?.hotels && Array.isArray(res.data.hotels)) {
      let mappedHotels: Hotel[] = res.data.hotels.map((h: any) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        starRating: h.starRating || 4,
        category: h.category || 'BOUTIQUE_HERITAGE',
        categoryLabel: (h.category ? String(h.category).replace(/_/g, ' ') : 'Boutique Hotel'),
        city: h.city || 'Gondar',
        address: h.address,
        latitude: Number(h.latitude || 12.6078),
        longitude: Number(h.longitude || 37.4705),
        phone: h.contactPhone || h.phone || '+251 58 111 0000',
        email: h.contactEmail || h.email || 'info@hotel.et',
        website: h.website,
        checkInTime: h.checkInTime || '14:00',
        checkOutTime: h.checkOutTime || '11:00',
        facilities: ['Free Wi-Fi', 'Airport Shuttle', 'Breakfast'],
        heroImage: h.coverImageUrl || h.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        galleryImages: (h.images || []).map((i: any) => i.imageUrl),
        totalRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.totalInventory || 0), 0) || 0,
        availableRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0), 0) || 0,
        status: (h.status || (h.publicationStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')) as any,
        partnerId: h.partnerId,
        partner: h.partner,
        verificationStatus: h.verificationStatus || 'APPROVED',
        publicationStatus: h.publicationStatus || (h.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'),
        rejectionReason: h.rejectionReason,
        roomTypes: (h.roomTypes || []).map((r: any) => ({
          id: r.id,
          hotelId: h.id,
          name: r.name,
          description: r.description || '',
          pricePerNightETB: Number(r.basePricePerNight || 3500),
          totalInventory: r.totalInventory || 0,
          availableRooms: r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0,
          bookedRooms: Math.max(0, (r.totalInventory || 0) - (r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0)),
          maxGuests: r.maximumGuests || 2,
          bedType: '1 King Bed',
          roomSizeSqM: 30,
          amenities: ['Wi-Fi', 'Balcony'],
          images: (r.images || []).map((img: any) => (typeof img === 'string' ? img : img.imageUrl)),
          galleryImages: r.images || [],
          status: (r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0) > 0 ? 'AVAILABLE' : 'SOLD_OUT',
        })),
        createdAt: h.createdAt || new Date().toISOString(),
        updatedAt: h.updatedAt || new Date().toISOString(),
      }));

      if (params.city && params.city !== 'ALL') {
        mappedHotels = mappedHotels.filter((h) => h.city?.toLowerCase() === params.city?.toLowerCase());
      }

      if (params.search) {
        const qSearch = params.search.toLowerCase().trim();
        mappedHotels = mappedHotels.filter(
          (h) =>
            h.name.toLowerCase().includes(qSearch) ||
            h.city.toLowerCase().includes(qSearch) ||
            h.address.toLowerCase().includes(qSearch)
        );
      }

      if (params.status && params.status !== 'ALL') {
        mappedHotels = mappedHotels.filter((h) => h.status === params.status);
      }

      return {
        items: mappedHotels,
        total: res.data.pagination?.total || mappedHotels.length,
        page: res.data.pagination?.page || 1,
        limit: res.data.pagination?.limit || 100,
        totalPages: res.data.pagination?.totalPages || 1,
      };
    }

    throw new Error(res.error || 'Failed to fetch hotels from database.');
  }

  static async getHotelById(id: string): Promise<Hotel | null> {
    const res = await apiRequest<any>(`/admin/hotels/${id}`);
    if (res.success && res.data) {
      const h = res.data;
      const mapped: Hotel = {
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        starRating: h.starRating || 4,
        category: h.category || 'BOUTIQUE_HERITAGE',
        categoryLabel: (h.category ? String(h.category).replace(/_/g, ' ') : 'Boutique Hotel'),
        city: h.city || 'Gondar',
        address: h.address,
        latitude: Number(h.latitude || 12.6078),
        longitude: Number(h.longitude || 37.4705),
        phone: h.contactPhone || h.phone || '+251 58 111 0000',
        email: h.contactEmail || h.email || 'info@hotel.et',
        website: h.website,
        checkInTime: h.checkInTime || '14:00',
        checkOutTime: h.checkOutTime || '11:00',
        facilities: ['Free Wi-Fi', 'Airport Shuttle', 'Breakfast'],
        heroImage: h.coverImageUrl || h.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        galleryImages: (h.images || []).map((i: any) => i.imageUrl),
        totalRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.totalInventory || 0), 0) || 0,
        availableRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0), 0) || 0,
        status: (h.status || (h.publicationStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')) as any,
        partnerId: h.partnerId,
        partner: h.partner,
        verificationStatus: h.verificationStatus || 'APPROVED',
        publicationStatus: h.publicationStatus || (h.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'),
        rejectionReason: h.rejectionReason,
        roomTypes: (h.roomTypes || []).map((r: any) => ({
          id: r.id,
          hotelId: h.id,
          name: r.name,
          description: r.description || '',
          pricePerNightETB: Number(r.basePricePerNight || 3500),
          totalInventory: r.totalInventory || 0,
          availableRooms: r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0,
          bookedRooms: Math.max(0, (r.totalInventory || 0) - (r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0)),
          maxGuests: r.maximumGuests || 2,
          bedType: '1 King Bed',
          roomSizeSqM: 30,
          amenities: ['Wi-Fi', 'Balcony'],
          images: (r.images || []).map((img: any) => (typeof img === 'string' ? img : img.imageUrl)),
          galleryImages: r.images || [],
          status: (r.availableInventory ?? r.availableRooms ?? r.totalInventory ?? 0) > 0 ? 'AVAILABLE' : 'SOLD_OUT',
        })),
        createdAt: h.createdAt || new Date().toISOString(),
        updatedAt: h.updatedAt || new Date().toISOString(),
      };
      return mapped;
    }

    if (!res.success && (res.error?.includes('not found') || res.error?.includes('404'))) {
      return null;
    }

    throw new Error(res.error || `Failed to fetch hotel details for ${id}.`);
  }

  static async createHotel(payload: Partial<Hotel> & { publishImmediately?: boolean }): Promise<Hotel> {
    const shouldPublish = payload.publishImmediately !== false && (payload.status === 'PUBLISHED' || payload.status === undefined || payload.status === 'ACTIVE');
    const targetStatus = shouldPublish ? 'PUBLISHED' : (payload.status || 'DRAFT');

    const res = await apiRequest<any>('/admin/hotels', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug,
        partnerId: payload.partnerId || null,
        category: payload.category || 'BOUTIQUE_HERITAGE',
        coverImageUrl: payload.heroImage,
        description: payload.description || 'Hotel description',
        address: payload.address || 'Gondar, Ethiopia',
        city: payload.city || 'Gondar',
        latitude: payload.latitude || 12.6078,
        longitude: payload.longitude || 37.4705,
        contactPhone: payload.phone || '+251 58 111 0000',
        contactEmail: payload.email,
        website: payload.website,
        starRating: payload.starRating || 4,
        checkInTime: payload.checkInTime || '14:00',
        checkOutTime: payload.checkOutTime || '11:00',
        status: targetStatus,
        publicationStatus: shouldPublish ? 'PUBLISHED' : 'DRAFT',
        publishImmediately: shouldPublish,
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create partner hotel on backend database.');
    }

    const created: Hotel = {
      id: res.data.id,
      name: res.data.name,
      slug: res.data.slug,
      description: res.data.description,
      starRating: res.data.starRating || 4,
      category: res.data.category || 'BOUTIQUE_HERITAGE',
      categoryLabel: (res.data.category ? String(res.data.category).replace(/_/g, ' ') : 'Boutique Hotel'),
      city: res.data.city || 'Gondar',
      address: res.data.address,
      latitude: Number(res.data.latitude || 12.6078),
      longitude: Number(res.data.longitude || 37.4705),
      phone: res.data.contactPhone || '+251 58 111 0000',
      email: res.data.contactEmail || 'info@hotel.et',
      website: res.data.website,
      checkInTime: res.data.checkInTime || '14:00',
      checkOutTime: res.data.checkOutTime || '11:00',
      facilities: ['Free Wi-Fi', 'Airport Shuttle'],
      heroImage: res.data.coverImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      galleryImages: [],
      totalRooms: 0,
      availableRooms: 0,
      status: (res.data.status || (shouldPublish ? 'PUBLISHED' : 'DRAFT')) as any,
      publicationStatus: res.data.publicationStatus || (shouldPublish ? 'PUBLISHED' : 'DRAFT'),
      verificationStatus: res.data.verificationStatus || 'APPROVED',
      roomTypes: [],
      createdAt: res.data.createdAt || new Date().toISOString(),
      updatedAt: res.data.updatedAt || new Date().toISOString(),
    };

    return created;
  }

  static async updateHotel(id: string, updates: Partial<Hotel>): Promise<Hotel | null> {
    const res = await apiRequest<any>(`/admin/hotels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: updates.name,
        partnerId: updates.partnerId,
        category: updates.category,
        coverImageUrl: updates.heroImage,
        description: updates.description,
        address: updates.address,
        city: updates.city,
        latitude: updates.latitude,
        longitude: updates.longitude,
        contactPhone: updates.phone,
        contactEmail: updates.email,
        website: updates.website,
        starRating: updates.starRating,
        checkInTime: updates.checkInTime,
        checkOutTime: updates.checkOutTime,
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to update hotel on database.');
    }

    return res.data;
  }

  static async deleteHotel(id: string): Promise<boolean> {
    const res = await apiRequest(`/admin/hotels/${id}`, { method: 'DELETE' });
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete hotel.');
    }
    return true;
  }

  static async publishHotel(id: string): Promise<boolean> {
    const res = await apiRequest(`/admin/hotels/${id}/publish`, { method: 'POST' });
    if (!res.success) {
      throw new Error(res.error || 'Failed to publish hotel.');
    }
    return true;
  }

  static async unpublishHotel(id: string): Promise<boolean> {
    const res = await apiRequest(`/admin/hotels/${id}/unpublish`, { method: 'POST' });
    if (!res.success) {
      throw new Error(res.error || 'Failed to unpublish hotel.');
    }
    return true;
  }

  static async verifyHotel(id: string, verificationStatus: string, reason?: string): Promise<boolean> {
    const res = await apiRequest(`/admin/hotels/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verificationStatus, reason }),
    });
    if (!res.success) {
      throw new Error(res.error || 'Failed to verify hotel.');
    }
    return true;
  }

  static async uploadHotelCover(hotelId: string, fileData: string): Promise<Hotel | null> {
    const res = await apiRequest<any>(`/admin/hotels/${hotelId}/cover-image`, {
      method: 'POST',
      body: JSON.stringify({ fileData }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to upload hotel cover image.');
    }
    return res.data;
  }

  static async addHotelImage(hotelId: string, imagePayload: { imageUrl: string; isCover?: boolean; altText?: string }) {
    const res = await apiRequest(`/admin/hotels/${hotelId}/images`, {
      method: 'POST',
      body: JSON.stringify(imagePayload),
    });
    if (!res.success) {
      throw new Error(res.error || 'Failed to add hotel image.');
    }
    return res.data;
  }

  // ============================================================================
  // 3. DYNAMIC ROOM INVENTORY OPERATIONS
  // ============================================================================

  static async addRoomType(hotelId: string, roomTypePayload: Partial<HotelRoomType>): Promise<HotelRoomType | null> {
    const formattedImages = (roomTypePayload.galleryImages || roomTypePayload.images || []).map((img: any, idx: number) =>
      typeof img === 'string'
        ? { imageUrl: img, displayOrder: idx, isPrimary: idx === 0 }
        : { imageUrl: img.imageUrl, caption: img.caption, displayOrder: img.displayOrder ?? idx, isPrimary: img.isPrimary ?? idx === 0 }
    );

    const res = await apiRequest<any>(`/admin/hotels/${hotelId}/room-types`, {
      method: 'POST',
      body: JSON.stringify({
        name: roomTypePayload.name,
        description: roomTypePayload.description,
        maximumAdults: roomTypePayload.maxGuests || 2,
        maximumChildren: 1,
        maximumGuests: roomTypePayload.maxGuests || 3,
        totalInventory: roomTypePayload.totalInventory || 10,
        basePricePerNight: roomTypePayload.pricePerNightETB || 3500,
        currency: 'ETB',
        images: formattedImages,
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create room type on backend database.');
    }

    const created = res.data;
    const newRoom: HotelRoomType = {
      id: created.id,
      hotelId: created.hotelId || hotelId,
      name: created.name,
      description: created.description || '',
      pricePerNightETB: Number(created.basePricePerNight || roomTypePayload.pricePerNightETB || 3500),
      totalInventory: created.totalInventory || roomTypePayload.totalInventory || 10,
      availableRooms: created.availableInventory ?? created.availableRooms ?? created.totalInventory ?? 10,
      bookedRooms: 0,
      maxGuests: created.maximumGuests || roomTypePayload.maxGuests || 2,
      bedType: roomTypePayload.bedType || '1 King Bed',
      roomSizeSqM: roomTypePayload.roomSizeSqM || 30,
      amenities: roomTypePayload.amenities || ['Wi-Fi', 'TV', 'Ensuite Shower'],
      images: (created.images || []).map((img: any) => (typeof img === 'string' ? img : img.imageUrl)),
      galleryImages: created.images || [],
      status: 'AVAILABLE',
    };

    return newRoom;
  }

  static async updateRoomInventory(
    hotelId: string,
    roomId: string,
    newTotalInventory: number
  ): Promise<HotelRoomType | null> {
    const res = await apiRequest<any>(`/admin/hotels/${hotelId}/room-types/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify({ totalInventory: newTotalInventory }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to update room inventory.');
    }

    return res.data;
  }

  static async updateRoomImages(
    hotelId: string,
    roomId: string,
    images: any[]
  ): Promise<HotelRoomType | null> {
    const formattedImages = images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return { imageUrl: img, displayOrder: idx, isPrimary: idx === 0 };
      }
      return {
        imageUrl: img.imageUrl,
        caption: img.caption,
        displayOrder: img.displayOrder ?? idx,
        isPrimary: img.isPrimary ?? idx === 0,
      };
    });

    const res = await apiRequest<any>(`/admin/hotels/${hotelId}/room-types/${roomId}/images`, {
      method: 'PUT',
      body: JSON.stringify({ images: formattedImages }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to update room gallery images on database.');
    }

    return res.data;
  }

  // ============================================================================
  // 4. HOTEL BOOKINGS MANAGEMENT
  // ============================================================================

  static async getHotelBookings(searchQuery?: string, status?: string): Promise<HotelBooking[]> {
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.set('search', searchQuery);
    if (status && status !== 'ALL') queryParams.set('status', status);

    const res = await apiRequest<any>(
      `/admin/hotel-bookings?${queryParams.toString()}`
    );

    if (res.success && res.data?.bookings) {
      return res.data.bookings.map((b: any) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        passengerId: b.passengerId,
        passengerName: b.passenger?.fullName || 'Passenger',
        passengerPhone: b.passenger?.phoneNumber || '+251 91 100 0000',
        passengerEmail: b.passenger?.email || 'passenger@example.et',
        hotelId: b.hotelId,
        hotelName: b.hotel?.name || 'Hotel',
        hotelCity: b.hotel?.city || 'Gondar',
        roomTypeId: b.bookingRooms?.[0]?.roomTypeId || '',
        roomTypeName: b.bookingRooms?.[0]?.roomType?.name || 'Standard Room',
        numberOfRooms: b.numberOfRooms || 1,
        numberOfGuests: b.adults + b.children,
        checkInDate: typeof b.checkInDate === 'string' ? b.checkInDate.split('T')[0] : '2026-11-25',
        checkOutDate: typeof b.checkOutDate === 'string' ? b.checkOutDate.split('T')[0] : '2026-11-27',
        totalNights: 2,
        pricePerNightETB: Number(b.bookingRooms?.[0]?.nightlyRateSnapshot || 3500),
        totalAmountETB: Number(b.grandTotal || 7000),
        paymentStatus: b.paymentStatus || 'PENDING',
        bookingStatus: b.bookingStatus || 'PENDING',
        specialRequests: b.specialRequests,
        reviewedAt: b.reviewedAt,
        declineReason: b.declineReason,
        adminReviewNote: b.adminReviewNote,
        statusHistory: (b.statusHistory || []).map((sh: any) => ({
          status: sh.toStatus,
          changedAt: sh.createdAt,
          adminName: sh.changedByAdminName || 'Super Admin',
          note: sh.note,
        })),
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      }));
    }

    throw new Error(res.error || 'Failed to fetch hotel bookings from database.');
  }

  static async getBookingById(id: string): Promise<HotelBooking | null> {
    const res = await apiRequest<any>(`/admin/hotel-bookings/${id}`);
    if (res.success && res.data) {
      const b = res.data;
      return {
        id: b.id,
        bookingReference: b.bookingReference,
        passengerId: b.passengerId,
        passengerName: b.passenger?.fullName || 'Passenger',
        passengerPhone: b.passenger?.phoneNumber || '+251 91 100 0000',
        passengerEmail: b.passenger?.email || 'passenger@example.et',
        hotelId: b.hotelId,
        hotelName: b.hotel?.name || 'Hotel',
        hotelCity: b.hotel?.city || 'Gondar',
        roomTypeId: b.bookingRooms?.[0]?.roomTypeId || '',
        roomTypeName: b.bookingRooms?.[0]?.roomType?.name || 'Standard Room',
        numberOfRooms: b.numberOfRooms || 1,
        numberOfGuests: b.adults + b.children,
        checkInDate: typeof b.checkInDate === 'string' ? b.checkInDate.split('T')[0] : '2026-11-25',
        checkOutDate: typeof b.checkOutDate === 'string' ? b.checkOutDate.split('T')[0] : '2026-11-27',
        totalNights: 2,
        pricePerNightETB: Number(b.bookingRooms?.[0]?.nightlyRateSnapshot || 3500),
        totalAmountETB: Number(b.grandTotal || 7000),
        paymentStatus: b.paymentStatus || 'PENDING',
        bookingStatus: b.bookingStatus || 'PENDING',
        specialRequests: b.specialRequests,
        reviewedAt: b.reviewedAt,
        declineReason: b.declineReason,
        adminReviewNote: b.adminReviewNote,
        statusHistory: (b.statusHistory || []).map((sh: any) => ({
          status: sh.toStatus,
          changedAt: sh.createdAt,
          adminName: sh.changedByAdminName || 'Super Admin',
          note: sh.note,
        })),
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      };
    }

    if (!res.success && (res.error?.includes('not found') || res.error?.includes('404'))) {
      return null;
    }

    throw new Error(res.error || `Failed to fetch booking details for ${id}.`);
  }

  static async acceptBooking(bookingId: string, adminNote?: string): Promise<{ success: boolean; data?: HotelBooking; error?: string }> {
    const res = await apiRequest<any>(`/admin/hotel-bookings/${bookingId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ adminNote }),
    });
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to accept booking.' };
  }

  static async declineBooking(
    bookingId: string,
    declineReason: string,
    adminNote?: string
  ): Promise<{ success: boolean; data?: HotelBooking; error?: string }> {
    if (!declineReason || !declineReason.trim()) {
      return { success: false, error: 'A specific decline reason is required when declining a booking request.' };
    }

    const res = await apiRequest<any>(`/admin/hotel-bookings/${bookingId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ declineReason, adminNote }),
    });
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to decline booking.' };
  }

  static async updateBookingStatus(
    bookingId: string,
    status: HotelBooking['bookingStatus']
  ): Promise<HotelBooking | null> {
    const res = await apiRequest<any>(`/admin/hotel-bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to update booking status on database.');
  }

  // ============================================================================
  // 5. REAL-TIME DATE-BASED ROOM INVENTORY SYNCHRONIZATION
  // ============================================================================

  static async getHotelInventorySummary(
    hotelId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const q = new URLSearchParams();
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    const qs = q.toString();
    const res = await apiRequest<any>(
      qs ? `/admin/hotels/${hotelId}/inventory?${qs}` : `/admin/hotels/${hotelId}/inventory`
    );
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to load hotel room inventory summary.');
  }

  static async adjustRoomInventory(
    hotelId: string,
    roomTypeId: string,
    totalInventory: number,
    note?: string
  ): Promise<any> {
    const res = await apiRequest<any>(
      `/admin/hotels/${hotelId}/room-types/${roomTypeId}/inventory`,
      {
        method: 'PATCH',
        body: JSON.stringify({ totalInventory, note }),
      }
    );
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to adjust room inventory.');
  }

  static async blockRoomInventory(
    hotelId: string,
    roomTypeId: string,
    payload: {
      startDate: string;
      endDate: string;
      quantity: number;
      action: 'BLOCK' | 'UNBLOCK';
      note?: string;
    }
  ): Promise<any> {
    const res = await apiRequest<any>(
      `/admin/hotels/${hotelId}/room-types/${roomTypeId}/block`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to update blocked room inventory.');
  }

  static subscribeInventoryEvents(
    hotelId: string | undefined,
    onEvent: (event: any) => void,
    onConnectionChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return () => {};
    }

    const token =
      localStorage.getItem('kt_admin_token') ||
      localStorage.getItem('kt_admin_access_token') ||
      localStorage.getItem('accessToken') ||
      '';
    if (!token) {
      return () => {};
    }
    const qs = new URLSearchParams({ token });
    if (hotelId) qs.set('hotelId', hotelId);

    const url = buildApiUrl(`/admin/hotels/inventory/events?${qs.toString()}`);
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      onConnectionChange?.(true);
    };

    eventSource.onerror = () => {
      onConnectionChange?.(false);
    };

    const handlePayload = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch {
        // Ignore malformed keepalive frames
      }
    };

    eventSource.addEventListener('inventory_sync', handlePayload);
    eventSource.addEventListener('inventory', handlePayload);
    eventSource.onmessage = handlePayload;

    return () => {
      eventSource.close();
      onConnectionChange?.(false);
    };
  }
}
