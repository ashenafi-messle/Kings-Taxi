import {
  Hotel,
  HotelBooking,
  HotelFilterParams,
  HotelRoomType,
  HotelPartner,
  HotelPartnerFilterParams,
  PaginatedResult,
} from '../types';
import { mockHotels, mockHotelBookings } from './mockData';
import { apiRequest } from './apiClient';

export const mockHotelPartners: HotelPartner[] = [
  {
    id: 'hp-gondar-hospitality-corp',
    partnerCode: 'HP-10001',
    businessName: 'Gondar Heritage Hospitality Group Ltd',
    tradeName: 'Gondar Heritage Hotels',
    contactPerson: 'Alemayehu Tadesse',
    email: 'partners@gondarheritage.et',
    phone: '+251918112233',
    alternativePhone: '+251581112233',
    businessAddress: 'Royal Castle Avenue, P.O. Box 450',
    city: 'Gondar',
    region: 'Amhara',
    country: 'Ethiopia',
    businessLicenseNumber: 'BL-AMH-2024-9812',
    taxIdentificationNumber: '0039485721',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccountNumber: '1000392817293',
    bankAccountName: 'Gondar Heritage Hospitality Group Ltd',
    commissionRate: 10.0,
    profileImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedAt: '2026-01-15T10:00:00.000Z',
    internalNotes: 'Premier hospitality partner operating Goha Hotel and Castle lodges.',
    totalHotels: 2,
    totalDocuments: 2,
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'hp-simien-mountain-resorts',
    partnerCode: 'HP-10002',
    businessName: 'Simien Mountain Eco Lodges PLC',
    tradeName: 'Simien Lodges',
    contactPerson: 'Biruk Hailu',
    email: 'reservations@simienlodge.et',
    phone: '+251918445566',
    businessAddress: 'Debark Highway, Amhara',
    city: 'Gondar',
    region: 'Amhara',
    country: 'Ethiopia',
    businessLicenseNumber: 'BL-DBK-2024-3401',
    taxIdentificationNumber: '0041289473',
    bankName: 'Dashen Bank',
    bankAccountNumber: '5019283746102',
    bankAccountName: 'Simien Mountain Eco Lodges PLC',
    commissionRate: 12.0,
    profileImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedAt: '2026-02-01T14:00:00.000Z',
    internalNotes: 'Eco-tourism partner providing highland safari lodges.',
    totalHotels: 1,
    totalDocuments: 1,
    createdAt: '2026-01-20T09:00:00.000Z',
    updatedAt: '2026-02-01T14:00:00.000Z',
  },
  {
    id: 'hp-lalibela-cross-hospitality',
    partnerCode: 'HP-10003',
    businessName: 'Lalibela Rock Heritage Resorts',
    tradeName: 'Lalibela Grand',
    contactPerson: 'Marta Getachew',
    email: 'management@lalibelagrand.et',
    phone: '+251911998877',
    businessAddress: 'Church View Rd, Lalibela',
    city: 'Lalibela',
    region: 'Amhara',
    country: 'Ethiopia',
    businessLicenseNumber: 'BL-LAL-2025-1109',
    taxIdentificationNumber: '0059382710',
    bankName: 'Awash Bank',
    bankAccountNumber: '01392817264810',
    bankAccountName: 'Lalibela Rock Heritage Resorts',
    commissionRate: 10.0,
    profileImageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
    status: 'PENDING',
    verificationStatus: 'PENDING',
    internalNotes: 'Awaiting commercial registration and tourism accreditation document verification.',
    totalHotels: 1,
    totalDocuments: 1,
    createdAt: '2026-03-01T11:20:00.000Z',
    updatedAt: '2026-03-01T11:20:00.000Z',
  },
];

let partnersData: HotelPartner[] = [...mockHotelPartners];
let hotelsData: Hotel[] = [...mockHotels];
let hotelBookingsData: HotelBooking[] = [...mockHotelBookings];

export class HotelService {
  // ============================================================================
  // 1. HOTEL PARTNERS MANAGEMENT
  // ============================================================================

  static async getPartners(params: HotelPartnerFilterParams = {}): Promise<PaginatedResult<HotelPartner>> {
    try {
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
    } catch {
      // Graceful offline fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    let filtered = [...partnersData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.businessName.toLowerCase().includes(q) ||
          p.contactPerson.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.partnerCode.toLowerCase().includes(q)
      );
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((p) => p.status === params.status);
    }

    if (params.verificationStatus && params.verificationStatus !== 'ALL') {
      filtered = filtered.filter((p) => p.verificationStatus === params.verificationStatus);
    }

    if (params.city && params.city !== 'ALL') {
      filtered = filtered.filter((p) => p.city.toLowerCase() === params.city?.toLowerCase());
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getPartnerById(id: string): Promise<HotelPartner | null> {
    try {
      const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Graceful offline fallback
    }

    await new Promise((r) => setTimeout(r, 100));
    return partnersData.find((p) => p.id === id || p.partnerCode === id) || null;
  }

  static async createPartner(payload: Partial<HotelPartner>): Promise<HotelPartner> {
    try {
      const res = await apiRequest<HotelPartner>('/admin/hotel-partners', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        partnersData = [res.data, ...partnersData];
        return res.data;
      }
    } catch {
      // Graceful offline fallback
    }

    await new Promise((r) => setTimeout(r, 200));
    const newPartner: HotelPartner = {
      id: `hp-${Date.now()}`,
      partnerCode: `HP-${Math.floor(10000 + Math.random() * 90000)}`,
      businessName: payload.businessName || 'New Hotel Partner',
      tradeName: payload.tradeName,
      contactPerson: payload.contactPerson || 'Contact Person',
      email: payload.email || 'partner@example.et',
      phone: payload.phone || '+251911000000',
      alternativePhone: payload.alternativePhone,
      businessAddress: payload.businessAddress || 'Gondar, Ethiopia',
      city: payload.city || 'Gondar',
      region: payload.region || 'Amhara',
      country: payload.country || 'Ethiopia',
      businessLicenseNumber: payload.businessLicenseNumber,
      taxIdentificationNumber: payload.taxIdentificationNumber,
      bankName: payload.bankName,
      bankAccountNumber: payload.bankAccountNumber,
      bankAccountName: payload.bankAccountName,
      commissionRate: payload.commissionRate ?? 10.0,
      profileImageUrl: payload.profileImageUrl,
      status: 'PENDING',
      verificationStatus: 'PENDING',
      totalHotels: 0,
      totalDocuments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    partnersData = [newPartner, ...partnersData];
    return newPartner;
  }

  static async updatePartner(id: string, updates: Partial<HotelPartner>): Promise<HotelPartner | null> {
    try {
      const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (res.success && res.data) {
        const idx = partnersData.findIndex((p) => p.id === id);
        if (idx !== -1) partnersData[idx] = res.data;
        return res.data;
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    const idx = partnersData.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    partnersData[idx] = {
      ...partnersData[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return partnersData[idx];
  }

  static async updatePartnerStatus(id: string, status: string, reason?: string): Promise<HotelPartner | null> {
    try {
      const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
      if (res.success && res.data) {
        const idx = partnersData.findIndex((p) => p.id === id);
        if (idx !== -1) partnersData[idx] = res.data;
        return res.data;
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    const idx = partnersData.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    partnersData[idx] = {
      ...partnersData[idx],
      status: status as any,
      rejectionReason: reason || partnersData[idx].rejectionReason,
      updatedAt: new Date().toISOString(),
    };
    return partnersData[idx];
  }

  static async verifyPartner(id: string, verificationStatus: string, reason?: string): Promise<HotelPartner | null> {
    try {
      const res = await apiRequest<HotelPartner>(`/admin/hotel-partners/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus, reason }),
      });
      if (res.success && res.data) {
        const idx = partnersData.findIndex((p) => p.id === id);
        if (idx !== -1) partnersData[idx] = res.data;
        return res.data;
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    const idx = partnersData.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    partnersData[idx] = {
      ...partnersData[idx],
      verificationStatus: verificationStatus as any,
      status: verificationStatus === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
      verifiedAt: verificationStatus === 'APPROVED' ? new Date().toISOString() : undefined,
      rejectionReason: reason || undefined,
      updatedAt: new Date().toISOString(),
    };
    return partnersData[idx];
  }

  static async uploadPartnerDocument(partnerId: string, documentPayload: any): Promise<any> {
    try {
      const res = await apiRequest<any>(`/admin/hotel-partners/${partnerId}/documents`, {
        method: 'POST',
        body: JSON.stringify(documentPayload),
      });
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    return {
      id: `doc-${Date.now()}`,
      partnerId,
      ...documentPayload,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
    };
  }

  static async getPartnerStats() {
    try {
      const res = await apiRequest<any>('/admin/hotel-partners/stats');
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    return {
      totalPartners: partnersData.length,
      activePartners: partnersData.filter((p) => p.status === 'ACTIVE').length,
      pendingPartners: partnersData.filter((p) => p.verificationStatus === 'PENDING').length,
      totalHotels: hotelsData.length,
    };
  }

  // ============================================================================
  // 2. HOTEL MANAGEMENT
  // ============================================================================

  static async getHotels(params: HotelFilterParams = {}): Promise<PaginatedResult<Hotel>> {
    try {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));

      const res = await apiRequest<any>(`/admin/hotels?${q.toString()}`);
      if (res.success && res.data?.hotels && Array.isArray(res.data.hotels)) {
        const mappedHotels: Hotel[] = res.data.hotels.map((h: any) => ({
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
          totalRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.totalInventory || 0), 0) || 20,
          availableRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.totalInventory || 0), 0) || 20,
          status: (h.status === 'PUBLISHED' ? 'ACTIVE' : (h.status || 'ACTIVE')) as any,
          partnerId: h.partnerId,
          partner: h.partner,
          verificationStatus: h.verificationStatus,
          publicationStatus: h.publicationStatus,
          rejectionReason: h.rejectionReason,
          roomTypes: (h.roomTypes || []).map((r: any) => ({
            id: r.id,
            hotelId: h.id,
            name: r.name,
            description: r.description || '',
            pricePerNightETB: Number(r.basePricePerNight || 3500),
            totalInventory: r.totalInventory || 10,
            availableRooms: r.totalInventory || 10,
            bookedRooms: 0,
            maxGuests: r.maximumGuests || 2,
            bedType: '1 King Bed',
            roomSizeSqM: 30,
            amenities: ['Wi-Fi', 'Balcony'],
            images: [],
            status: 'AVAILABLE',
          })),
          createdAt: h.createdAt || new Date().toISOString(),
          updatedAt: h.updatedAt || new Date().toISOString(),
        }));

        // Merge any newly added hotels in memory that are not yet returned by backend
        const backendIds = new Set(mappedHotels.map((h) => h.id));
        const localCreated = hotelsData.filter((h) => !backendIds.has(h.id));
        let allHotels = [...localCreated, ...mappedHotels];

        if (params.city && params.city !== 'ALL') {
          allHotels = allHotels.filter((h) => h.city?.toLowerCase() === params.city?.toLowerCase());
        }

        return {
          items: allHotels,
          total: allHotels.length,
          page: res.data.pagination?.page || 1,
          limit: res.data.pagination?.limit || 100,
          totalPages: res.data.pagination?.totalPages || 1,
        };
      }
    } catch {
      // Offline fallback
    }

    await new Promise((r) => setTimeout(r, 100));
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

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((h) => h.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 100;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getHotelById(id: string): Promise<Hotel | null> {
    try {
      const res = await apiRequest<any>(`/admin/hotels/${id}`);
      if (res.success && res.data) {
        const h = res.data;
        return {
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
          totalRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.totalInventory || 0), 0) || 20,
          availableRooms: (h.roomTypes || []).reduce((sum: number, r: any) => sum + (r.totalInventory || 0), 0) || 20,
          status: (h.status === 'PUBLISHED' ? 'ACTIVE' : (h.status || 'ACTIVE')) as any,
          partnerId: h.partnerId,
          partner: h.partner,
          verificationStatus: h.verificationStatus,
          publicationStatus: h.publicationStatus,
          rejectionReason: h.rejectionReason,
          roomTypes: (h.roomTypes || []).map((r: any) => ({
            id: r.id,
            hotelId: h.id,
            name: r.name,
            description: r.description || '',
            pricePerNightETB: Number(r.basePricePerNight || 3500),
            totalInventory: r.totalInventory || 10,
            availableRooms: r.totalInventory || 10,
            bookedRooms: 0,
            maxGuests: r.maximumGuests || 2,
            bedType: '1 King Bed',
            roomSizeSqM: 30,
            amenities: ['Wi-Fi', 'Balcony'],
            images: (r.images || []).map((img: any) => img.imageUrl),
            galleryImages: r.images || [],
            status: 'AVAILABLE',
          })),
          createdAt: h.createdAt || new Date().toISOString(),
          updatedAt: h.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    return hotelsData.find((h) => h.id === id || h.slug === id) || null;
  }

  static async createHotel(payload: Partial<Hotel>): Promise<Hotel> {
    try {
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
        }),
      });

      if (res.success && res.data) {
        // Refresh local cache
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
          totalRooms: 10,
          availableRooms: 10,
          status: 'ACTIVE',
          roomTypes: [],
          createdAt: res.data.createdAt || new Date().toISOString(),
          updatedAt: res.data.updatedAt || new Date().toISOString(),
        };
        hotelsData = [created, ...hotelsData.filter((h) => h.id !== created.id)];
        return created;
      }
    } catch {
      // Fallback
    }

    const newId = `htl_${Date.now()}`;
    const slug = (payload.name || 'hotel').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newHotel: Hotel = {
      id: newId,
      name: payload.name || 'New Hotel',
      slug,
      description: payload.description || '',
      starRating: payload.starRating || 4,
      category: 'BOUTIQUE_HERITAGE',
      categoryLabel: 'Boutique Hotel',
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
      heroImage: payload.heroImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      galleryImages: payload.galleryImages || [],
      totalRooms: payload.totalRooms || 20,
      availableRooms: payload.availableRooms || 20,
      status: 'ACTIVE',
      partnerId: undefined,
      roomTypes: payload.roomTypes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    hotelsData = [newHotel, ...hotelsData.filter((h) => h.id !== newHotel.id)];
    return newHotel;
  }

  static async updateHotel(id: string, updates: Partial<Hotel>): Promise<Hotel | null> {
    try {
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

      if (res.success && res.data) {
        const idx = hotelsData.findIndex((h) => h.id === id);
        if (idx !== -1) {
          hotelsData[idx] = { ...hotelsData[idx], ...updates, updatedAt: new Date().toISOString() };
        }
        return hotelsData[idx] || null;
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
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
    try {
      await apiRequest(`/admin/hotels/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    const initialLen = hotelsData.length;
    hotelsData = hotelsData.filter((h) => h.id !== id);
    return hotelsData.length < initialLen;
  }

  static async publishHotel(id: string): Promise<boolean> {
    try {
      const res = await apiRequest(`/admin/hotels/${id}/publish`, { method: 'POST' });
      return res.success;
    } catch {
      return true;
    }
  }

  static async unpublishHotel(id: string): Promise<boolean> {
    try {
      const res = await apiRequest(`/admin/hotels/${id}/unpublish`, { method: 'POST' });
      return res.success;
    } catch {
      return true;
    }
  }

  static async verifyHotel(id: string, verificationStatus: string, reason?: string): Promise<boolean> {
    try {
      const res = await apiRequest(`/admin/hotels/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verificationStatus, reason }),
      });
      return res.success;
    } catch {
      return true;
    }
  }

  static async addHotelImage(hotelId: string, imagePayload: { imageUrl: string; isCover?: boolean; altText?: string }) {
    try {
      const res = await apiRequest(`/admin/hotels/${hotelId}/images`, {
        method: 'POST',
        body: JSON.stringify(imagePayload),
      });
      return res.data;
    } catch {
      return imagePayload;
    }
  }

  // ============================================================================
  // 3. DYNAMIC ROOM INVENTORY OPERATIONS
  // ============================================================================

  static async addRoomType(hotelId: string, roomTypePayload: Partial<HotelRoomType>): Promise<HotelRoomType | null> {
    try {
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
        }),
      });

      if (res.success && res.data) {
        const newRoom: HotelRoomType = {
          id: res.data.id,
          hotelId,
          name: res.data.name,
          description: res.data.description || '',
          pricePerNightETB: Number(res.data.basePricePerNight),
          totalInventory: res.data.totalInventory,
          availableRooms: res.data.totalInventory,
          bookedRooms: 0,
          maxGuests: res.data.maximumGuests,
          bedType: roomTypePayload.bedType || '1 King Bed',
          roomSizeSqM: 30,
          amenities: roomTypePayload.amenities || ['Wi-Fi'],
          images: [],
          status: 'AVAILABLE',
        };
        return newRoom;
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 200));
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
      images: roomTypePayload.images || ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'],
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
    try {
      await apiRequest(`/admin/hotels/${hotelId}/room-types/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ totalInventory: newTotalInventory }),
      });
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
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
    try {
      await apiRequest(`/admin/hotels/${hotelId}/room-types/${roomId}/images`, {
        method: 'PUT',
        body: JSON.stringify({ images }),
      });
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    const hotel = hotelsData.find((h) => h.id === hotelId);
    if (!hotel) return null;

    const room = hotel.roomTypes.find((r) => r.id === roomId);
    if (!room) return null;

    room.galleryImages = images;
    room.images = images.map((i) => i.imageUrl);
    return room;
  }

  // ============================================================================
  // 4. HOTEL BOOKINGS MANAGEMENT
  // ============================================================================

  static async getHotelBookings(searchQuery?: string, status?: string): Promise<HotelBooking[]> {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('search', searchQuery);
      if (status && status !== 'ALL') queryParams.set('status', status);

      const res = await apiRequest<any>(
        `/admin/hotel-bookings?${queryParams.toString()}`
      );
      if (res.success && res.data?.bookings && res.data.bookings.length > 0) {
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
    } catch {
      // Offline fallback
    }

    await new Promise((r) => setTimeout(r, 150));
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
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 100));
    return hotelBookingsData.find((b) => b.id === id || b.bookingReference === id) || null;
  }

  static async acceptBooking(bookingId: string, adminNote?: string): Promise<{ success: boolean; data?: HotelBooking; error?: string }> {
    try {
      const res = await apiRequest<any>(`/admin/hotel-bookings/${bookingId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ adminNote }),
      });
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 200));
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

  static async declineBooking(
    bookingId: string,
    declineReason: string,
    adminNote?: string
  ): Promise<{ success: boolean; data?: HotelBooking; error?: string }> {
    if (!declineReason || !declineReason.trim()) {
      return { success: false, error: 'A specific decline reason is required when declining a booking request.' };
    }

    try {
      const res = await apiRequest<any>(`/admin/hotel-bookings/${bookingId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ declineReason, adminNote }),
      });
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 200));
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
    try {
      const res = await apiRequest<any>(`/admin/hotel-bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 150));
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
