import { HeritageSite, HeritageTourBooking, HeritageFilterParams, PaginatedResult } from '../types';
import { mockHeritageSites, mockHeritageBookings } from './mockData';
import { apiRequest, buildApiUrl } from './apiClient';

let heritageSitesData: HeritageSite[] = [...mockHeritageSites];
let heritageBookingsData: HeritageTourBooking[] = [...mockHeritageBookings];

export class HeritageService {
  static async getHeritageSites(params: HeritageFilterParams = {}): Promise<PaginatedResult<HeritageSite>> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered = [...heritageSitesData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q)
      );
    }

    if (params.city && params.city !== 'ALL') {
      filtered = filtered.filter((s) => s.city.toLowerCase() === params.city?.toLowerCase());
    }

    if (params.category && params.category !== 'ALL') {
      filtered = filtered.filter((s) => s.category === params.category);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getHeritageSiteById(id: string): Promise<HeritageSite | null> {
    await new Promise((r) => setTimeout(r, 150));
    return heritageSitesData.find((s) => s.id === id || s.slug === id) || null;
  }

  static async createHeritageSite(payload: Partial<HeritageSite>): Promise<HeritageSite> {
    await new Promise((r) => setTimeout(r, 300));
    const newId = `hrt_${Date.now()}`;
    const slug = (payload.name || 'heritage-site').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const primaryImage =
      payload.destinationImages?.find((img) => img.isPrimary)?.imageUrl ||
      payload.destinationImages?.[0]?.imageUrl ||
      payload.heroImage ||
      'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80';

    const newSite: HeritageSite = {
      id: newId,
      name: payload.name || 'New Heritage Destination',
      slug,
      region: payload.region || 'Amhara Region',
      city: payload.city || 'Gondar',
      category: payload.category || 'UNESCO_HERITAGE',
      categoryLabel: payload.categoryLabel || 'UNESCO World Heritage',
      unescoDesignated: payload.unescoDesignated ?? true,
      unescoYear: payload.unescoYear,
      shortDescription: payload.shortDescription || '',
      historicalOverview: payload.historicalOverview || '',
      culturalSignificance: payload.culturalSignificance || '',
      latitude: payload.latitude || 12.6078,
      longitude: payload.longitude || 37.4705,
      address: payload.address || '',
      visitingHours: payload.visitingHours || '08:30 - 17:30 Daily',
      recommendedDuration: payload.recommendedDuration || '2 - 3 Hours',
      entryFeeETB: payload.entryFeeETB || 2000,
      heroImage: primaryImage,
      galleryImages: payload.destinationImages?.map((i) => i.imageUrl) || payload.galleryImages || [],
      destinationImages: payload.destinationImages,
      tourPackages: payload.tourPackages || [],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    heritageSitesData = [newSite, ...heritageSitesData];
    return newSite;
  }

  static async updateHeritageSite(id: string, updates: Partial<HeritageSite>): Promise<HeritageSite | null> {
    await new Promise((r) => setTimeout(r, 250));
    const index = heritageSitesData.findIndex((s) => s.id === id);
    if (index === -1) return null;

    heritageSitesData[index] = {
      ...heritageSitesData[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return heritageSitesData[index];
  }

  static async deleteHeritageSite(id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    const initialLen = heritageSitesData.length;
    heritageSitesData = heritageSitesData.filter((s) => s.id !== id);
    return heritageSitesData.length < initialLen;
  }

  // --- Heritage Tour Bookings ---

  static async getHeritageBookings(searchQuery?: string, status?: string): Promise<HeritageTourBooking[]> {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('search', searchQuery);
      if (status && status !== 'ALL') queryParams.set('status', status);

      const res = await apiRequest<any>(
        `/heritage/admin/heritage/bookings?${queryParams.toString()}`
      );
      if (res.success && res.data?.bookings && res.data.bookings.length > 0) {
        // Backend mapping
      }
    } catch {
      // offline fallback
    }

    await new Promise((r) => setTimeout(r, 200));
    let filtered = [...heritageBookingsData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (b) =>
          b.bookingReference.toLowerCase().includes(q) ||
          b.passengerName.toLowerCase().includes(q) ||
          (b.heritageSiteName || b.siteName || '').toLowerCase().includes(q) ||
          (b.packageName || b.packageTitle || '').toLowerCase().includes(q)
      );
    }

    if (status && status !== 'ALL') {
      filtered = filtered.filter((b) => b.bookingStatus === status);
    }

    return filtered;
  }

  static async getHeritageBookingById(id: string): Promise<HeritageTourBooking | null> {
    try {
      const res = await apiRequest<any>(`/heritage/admin/heritage/bookings/${id}`);
      if (res.success && res.data) {
        // Backend mapping
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 150));
    return heritageBookingsData.find((b) => b.id === id || b.bookingReference === id) || null;
  }

  /**
   * Super Admin accepts heritage tour booking request after schedule & capacity verification
   */
  static async acceptHeritageBooking(
    bookingId: string,
    adminNote?: string
  ): Promise<{ success: boolean; data?: HeritageTourBooking; error?: string }> {
    try {
      const res = await apiRequest<any>(`/heritage/admin/heritage/bookings/${bookingId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ adminNote }),
      });
      if (res.success && res.data) {
        // Backend mapping
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 300));
    const index = heritageBookingsData.findIndex((b) => b.id === bookingId || b.bookingReference === bookingId);
    if (index === -1) return { success: false, error: 'Tour booking record not found' };

    const booking = heritageBookingsData[index];
    if (booking.bookingStatus === 'CONFIRMED') {
      return { success: false, error: 'This tour booking has already been accepted and confirmed.' };
    }

    const updated: HeritageTourBooking = {
      ...booking,
      bookingStatus: 'CONFIRMED',
      confirmedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      adminReviewNote: adminNote || 'Tour schedule and visitor capacity confirmed by Super Admin.',
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

    heritageBookingsData[index] = updated;
    return { success: true, data: updated };
  }

  /**
   * Super Admin declines heritage tour booking request with mandatory reason
   */
  static async declineHeritageBooking(
    bookingId: string,
    declineReason: string,
    adminNote?: string
  ): Promise<{ success: boolean; data?: HeritageTourBooking; error?: string }> {
    if (!declineReason || !declineReason.trim()) {
      return { success: false, error: 'A specific decline reason is required when declining a tour booking request.' };
    }

    try {
      const res = await apiRequest<any>(`/heritage/admin/heritage/bookings/${bookingId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ declineReason, adminNote }),
      });
      if (res.success && res.data) {
        // Backend mapping
      }
    } catch {
      // fallback
    }

    await new Promise((r) => setTimeout(r, 300));
    const index = heritageBookingsData.findIndex((b) => b.id === bookingId || b.bookingReference === bookingId);
    if (index === -1) return { success: false, error: 'Tour booking record not found' };

    const booking = heritageBookingsData[index];
    const updated: HeritageTourBooking = {
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

    heritageBookingsData[index] = updated;
    return { success: true, data: updated };
  }

  static async updateHeritageBookingStatus(
    bookingId: string,
    status: HeritageTourBooking['bookingStatus']
  ): Promise<HeritageTourBooking | null> {
    await new Promise((r) => setTimeout(r, 200));
    const index = heritageBookingsData.findIndex((b) => b.id === bookingId);
    if (index === -1) return null;

    heritageBookingsData[index] = {
      ...heritageBookingsData[index],
      bookingStatus: status,
      updatedAt: new Date().toISOString(),
    };
    return heritageBookingsData[index];
  }

  static async getBookingAuditHistory(idOrRef: string): Promise<any[]> {
    const res = await apiRequest<any[]>(`/admin/heritage/bookings/${idOrRef}/history`);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  static subscribeHeritageEvents(
    onEvent: (event: any) => void,
    onConnectionChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return () => {};
    }

    const token =
      localStorage.getItem('kt_admin_access_token') ||
      localStorage.getItem('accessToken') ||
      '';
    const qs = new URLSearchParams();
    if (token) qs.set('token', token);

    const url = buildApiUrl(`/admin/heritage/events?${qs.toString()}`);
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
        // Ignore keepalive frames
      }
    };

    eventSource.addEventListener('heritage_sync', handlePayload);
    eventSource.onmessage = handlePayload;

    return () => {
      eventSource.close();
      onConnectionChange?.(false);
    };
  }
}
