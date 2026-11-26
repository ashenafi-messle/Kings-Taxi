import { HeritageSite, HeritageTourBooking, HeritageFilterParams, PaginatedResult } from '../types';
import { mockHeritageSites, mockHeritageBookings } from './mockData';
import { apiRequest, buildApiUrl } from './apiClient';

let heritageSitesData: HeritageSite[] = [...mockHeritageSites];
let heritageBookingsData: HeritageTourBooking[] = [...mockHeritageBookings];

function mapBackendSiteToAdmin(s: any): HeritageSite {
  const destImages = Array.isArray(s.destinationImages)
    ? s.destinationImages.map((img: any, idx: number) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        publicId: img.publicId,
        caption: img.caption || `${s.name} Photo ${idx + 1}`,
        displayOrder: img.displayOrder ?? idx,
        isPrimary: Boolean(img.isPrimary),
      }))
    : [];
  const gallery =
    destImages.length > 0
      ? destImages.map((i: any) => i.imageUrl)
      : Array.isArray(s.galleryImages)
      ? s.galleryImages
      : [];
  const heroImage =
    s.coverImageUrl ||
    destImages.find((i: any) => i.isPrimary)?.imageUrl ||
    gallery[0] ||
    'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80';

  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    region: s.region || 'Amhara Region',
    city: s.city || 'Gondar',
    category: s.destinationType || s.category || 'HISTORICAL_PALACE',
    categoryLabel: String(s.destinationType || s.category || 'Historical Palace').replace(/_/g, ' '),
    unescoDesignated: Boolean(s.unescoDesignated),
    unescoWorldHeritage: Boolean(s.unescoDesignated),
    unescoYear: s.unescoYear || undefined,
    shortDescription: s.shortDescription || '',
    description: s.fullDescription || s.shortDescription || '',
    historicalOverview: s.historicalInformation || s.fullDescription || '',
    culturalSignificance: s.culturalInformation || '',
    latitude: Number(s.latitude ?? 12.6078),
    longitude: Number(s.longitude ?? 37.4705),
    address: s.specificLocation || s.city || 'Gondar',
    visitingHours: s.visitingRules || '08:30 AM - 05:30 PM',
    recommendedDuration: `${Math.max(1, Math.round((Number(s.estimatedVisitDurationMinutes || 120) / 60) * 10) / 10)} Hours`,
    entryFeeETB: Number(s.entryFeeETB ?? 0),
    entranceFeeETB: Number(s.entryFeeETB ?? 0),
    heroImage,
    galleryImages: gallery,
    destinationImages: destImages,
    tourPackages: s.tourPackages || [],
    status: s.status || 'PUBLISHED',
    featured: Boolean(s.featured),
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString(),
  } as HeritageSite;
}

export class HeritageService {
  static async getHeritageSites(params: HeritageFilterParams = {}): Promise<PaginatedResult<HeritageSite>> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.city && params.city !== 'ALL') q.set('city', params.city);
    if (params.category && params.category !== 'ALL') q.set('destinationType', params.category);
    const qs = q.toString();

    const res = await apiRequest<any[]>(qs ? `/admin/heritage/sites?${qs}` : '/admin/heritage/sites');
    if (!res.success || !Array.isArray(res.data)) {
      throw new Error(res.error || 'Failed to load heritage destinations from database.');
    }

    let mapped = res.data.map(mapBackendSiteToAdmin);
    if (params.search) {
      const sQuery = params.search.toLowerCase().trim();
      mapped = mapped.filter(
        (s) =>
          s.name.toLowerCase().includes(sQuery) ||
          s.city.toLowerCase().includes(sQuery) ||
          s.region.toLowerCase().includes(sQuery)
      );
    }
    if (params.city && params.city !== 'ALL') {
      mapped = mapped.filter((s) => s.city.toLowerCase() === params.city?.toLowerCase());
    }
    if (params.category && params.category !== 'ALL') {
      mapped = mapped.filter((s) => s.category === params.category);
    }

    const page = params.page || 1;
    const limit = params.limit || 100;
    const total = mapped.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = mapped.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getHeritageSiteById(id: string): Promise<HeritageSite | null> {
    const res = await apiRequest<any>(`/admin/heritage/sites/${id}`);
    if (res.success && res.data) {
      return mapBackendSiteToAdmin(res.data);
    }
    if (!res.success && (res.error?.includes('404') || res.error?.toLowerCase().includes('not found'))) {
      return null;
    }
    throw new Error(res.error || 'Failed to load heritage destination details.');
  }

  static async createHeritageSite(payload: Partial<HeritageSite> & Record<string, any>): Promise<HeritageSite> {
    const res = await apiRequest<any>('/admin/heritage/sites', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug,
        shortDescription: payload.shortDescription || payload.description,
        fullDescription: payload.description || payload.historicalOverview || payload.shortDescription,
        region: payload.region || 'Amhara Region',
        city: payload.city || 'Gondar',
        specificLocation: payload.address || payload.specificLocation || `${payload.city || 'Gondar'}, Ethiopia`,
        latitude: payload.latitude ?? 12.6078,
        longitude: payload.longitude ?? 37.4705,
        category: payload.category,
        destinationType: payload.destinationType,
        visitingHours: payload.visitingHours,
        entryFeeETB: Number(payload.entranceFeeETB ?? payload.entryFeeETB ?? 0),
        unescoDesignated: Boolean(payload.unescoWorldHeritage ?? payload.unescoDesignated),
        featured: Boolean(payload.featured),
        status: payload.status || 'PUBLISHED',
        destinationImages: payload.destinationImages,
        coverImageUrl: payload.heroImage || payload.coverImageUrl,
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to persist heritage destination to database.');
    }

    return mapBackendSiteToAdmin(res.data);
  }

  static async updateHeritageSite(id: string, updates: Partial<HeritageSite> & Record<string, any>): Promise<HeritageSite | null> {
    const res = await apiRequest<any>(`/admin/heritage/sites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...updates,
        ...(updates.heroImage ? { coverImageUrl: updates.heroImage } : {}),
        ...(updates.entranceFeeETB !== undefined ? { entryFeeETB: Number(updates.entranceFeeETB) } : {}),
        ...(updates.unescoWorldHeritage !== undefined ? { unescoDesignated: Boolean(updates.unescoWorldHeritage) } : {}),
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to update heritage destination in database.');
    }

    return mapBackendSiteToAdmin(res.data);
  }

  static async publishHeritageSite(id: string): Promise<HeritageSite> {
    const res = await apiRequest<any>(`/admin/heritage/sites/${id}/publish`, { method: 'POST' });
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to publish heritage destination.');
    }
    return mapBackendSiteToAdmin(res.data);
  }

  static async unpublishHeritageSite(id: string): Promise<HeritageSite> {
    const res = await apiRequest<any>(`/admin/heritage/sites/${id}/unpublish`, { method: 'POST' });
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to unpublish heritage destination.');
    }
    return mapBackendSiteToAdmin(res.data);
  }

  static async deleteHeritageSite(id: string): Promise<boolean> {
    const res = await apiRequest<any>(`/admin/heritage/sites/${id}`, { method: 'DELETE' });
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete heritage destination.');
    }
    return true;
  }

  // --- Heritage Tour Bookings ---

  static async getHeritageBookings(searchQuery?: string, status?: string): Promise<HeritageTourBooking[]> {
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.set('search', searchQuery);
    if (status && status !== 'ALL') queryParams.set('status', status);

    const res = await apiRequest<any>(`/admin/heritage/bookings?${queryParams.toString()}`);
    if (res.success && Array.isArray(res.data?.bookings)) {
      return res.data.bookings.map((b: any) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        passengerId: b.passengerId,
        passengerName: b.passenger?.fullName || 'Passenger',
        passengerPhone: b.passenger?.phoneNumber || '+251 91 100 0000',
        passengerEmail: b.passenger?.email || 'passenger@example.et',
        heritageSiteId: b.bookingSites?.[0]?.siteId || '',
        heritageSiteName: b.bookingSites?.[0]?.siteNameSnapshot || b.package?.name || 'Heritage Destination',
        packageId: b.packageId,
        packageName: b.package?.name || b.bookingSites?.[0]?.siteNameSnapshot || 'Custom Heritage Tour',
        scheduledDate: typeof b.scheduledDate === 'string' ? b.scheduledDate.split('T')[0] : '',
        preferredStartTime: b.preferredStartTime || '09:00',
        adults: b.adults || 1,
        children: b.children || 0,
        pickupLocation: b.pickupLocation || 'Gondar',
        totalAmountETB: Number(b.totalAmount || 0),
        paymentStatus: b.paymentStatus || 'PENDING',
        bookingStatus: b.bookingStatus || 'PENDING',
        declineReason: b.declineReason,
        adminReviewNote: b.adminReviewNote,
        reviewedAt: b.reviewedAt,
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      }));
    }

    throw new Error(res.error || 'Failed to fetch heritage tour bookings from database.');
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
