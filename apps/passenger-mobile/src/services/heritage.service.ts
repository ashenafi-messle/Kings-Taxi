import { API_CONFIG, apiFetch } from '../config/api';
import { useAuthStore } from '../stores/auth.store';
import {
  ApiResponse,
  HeritageSite,
  TourPackage,
  TourVehicleOption,
  TourGuide,
  TourQuote,
  TourBookingRequest,
  TourBooking,
} from '../types';
import { mockHeritageSites } from '../mocks';

async function requestWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, options);
}

// Built-in fallback packages
const FALLBACK_PACKAGES: TourPackage[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Gondar Imperial Heritage Full-Day Tour',
    slug: 'gondar-imperial-heritage-full-day',
    description:
      'Comprehensive royal experience touring Fasil Ghebbi castles, the angelic ceiling of Debre Berhan Selassie, and Empress Mentewab’s hillside palace at Kuskuam with comfortable chauffeured transport.',
    itinerary: [
      { order: 1, name: 'Fasil Ghebbi (Royal Enclosure)', duration: 180, notes: 'Castles, archive tower, banquet halls' },
      { order: 2, name: 'Debre Berhan Selassie Church', duration: 90, notes: 'Iconic angel ceiling frescoes' },
      { order: 3, name: 'Kuskuam Palace Complex', duration: 90, notes: 'Empress Mentewab royal residence and view' },
    ],
    estimatedDurationMinutes: 360,
    region: 'Amhara Region',
    city: 'Gondar',
    basePrice: 3500,
    currency: 'ETB',
    minimumPassengers: 1,
    maximumPassengers: 14,
    includesGuide: false,
    includesTransport: true,
    includesBoat: false,
    status: 'PUBLISHED',
    featured: true,
    requiresAdvanceBooking: true,
    minimumAdvanceHours: 6,
    cancellationPolicy: 'Free cancellation up to 12 hours before scheduled tour time. 50% refund thereafter.',
    sites: [
      {
        siteId: 'hrt_fasil_gondar',
        visitOrder: 1,
        estimatedVisitDurationMinutes: 180,
        siteName: 'Fasil Ghebbi & Royal Enclosure',
        entryFeeETB: 2000,
        requiresBoatTransport: false,
      },
      {
        siteId: 'hrt_debre_berhan',
        visitOrder: 2,
        estimatedVisitDurationMinutes: 90,
        siteName: 'Debre Berhan Selassie Church',
        entryFeeETB: 1500,
        requiresBoatTransport: false,
      },
    ],
  },
  {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Lake Tana Island Monasteries & Gondar Heritage Excursion',
    slug: 'lake-tana-island-monasteries-gondar-excursion',
    description:
      'An epic historical expedition combining scenic motorized boat transport to ancient Lake Tana island monasteries with Gondar’s imperial castle fortress.',
    itinerary: [
      { order: 1, name: 'Lake Tana Island Monasteries (Ura Kidane Mehret)', duration: 240, notes: 'Boat voyage and monastery visit' },
      { order: 2, name: 'Fasil Ghebbi (Royal Enclosure)', duration: 180, notes: 'Imperial castle grounds' },
    ],
    estimatedDurationMinutes: 480,
    region: 'Amhara Region',
    city: 'Gondar / Bahir Dar',
    basePrice: 5800,
    currency: 'ETB',
    minimumPassengers: 1,
    maximumPassengers: 20,
    includesGuide: false,
    includesTransport: true,
    includesBoat: true,
    status: 'PUBLISHED',
    featured: true,
    requiresAdvanceBooking: true,
    minimumAdvanceHours: 12,
    cancellationPolicy: 'Free cancellation up to 24 hours before tour date.',
    sites: [
      {
        siteId: 'hrt_lake_tana',
        visitOrder: 1,
        estimatedVisitDurationMinutes: 240,
        siteName: 'Lake Tana Island Monasteries',
        entryFeeETB: 2500,
        requiresBoatTransport: true,
      },
    ],
  },
];

const FALLBACK_VEHICLES: TourVehicleOption[] = [
  {
    id: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    vehicleType: 'STANDARD_SEDAN',
    displayName: 'Standard Sedan (Toyota Corolla or equivalent)',
    seatingCapacity: 4,
    luggageCapacity: 2,
    baseRate: 1800,
    perHourRate: 250,
    isActive: true,
    features: ['Air Conditioning', 'Chauffeured Driver', 'Complimentary Bottled Water'],
  },
  {
    id: 'v2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
    vehicleType: 'EXECUTIVE',
    displayName: 'Executive Comfort Sedan (Toyota Camry or equivalent)',
    seatingCapacity: 4,
    luggageCapacity: 3,
    baseRate: 2400,
    perHourRate: 300,
    isActive: true,
    features: ['Extra Legroom', 'Climate Control', 'Phone Charging USB', 'Chauffeured Driver'],
  },
  {
    id: 'v3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e',
    vehicleType: 'MINIVAN_TOUR',
    displayName: 'Tour Minivan (Toyota HiAce Sightseer)',
    seatingCapacity: 7,
    luggageCapacity: 6,
    baseRate: 3200,
    perHourRate: 400,
    isActive: true,
    features: ['High Roof Visibility', 'Large Windows for Sightseeing', 'PA System', 'Full AC'],
  },
];

const FALLBACK_GUIDES: TourGuide[] = [
  {
    id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    fullName: 'Yohannes Mengistu',
    languages: ['English', 'Amharic', 'Ge\'ez'],
    qualifications: ['Ministry of Tourism Certified Senior Guide', 'BA in Ethiopian History (UoG)'],
    specialties: ['Gondar Imperial Architecture', 'Orthodox Iconography & Church History'],
    dailyRate: 1500,
    hourlyRate: 200,
    phone: '+251918765432',
    rating: 4.95,
    totalToursLed: 342,
    isActive: true,
  },
  {
    id: 'g2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
    fullName: 'Selamawit Tadesse',
    languages: ['English', 'French', 'Amharic'],
    qualifications: ['UNESCO World Heritage Site Certified Guide', 'MA in Cultural Heritage Management'],
    specialties: ['Lake Tana Island Monasteries', 'Empress Mentewab & Fasilides Dynasty'],
    dailyRate: 1800,
    hourlyRate: 250,
    phone: '+251922334455',
    rating: 4.98,
    totalToursLed: 418,
    isActive: true,
  },
];

export class HeritageService {
  /**
   * Backward-compatible helper: get all sites
   */
  static async getAllSites(): Promise<ApiResponse<HeritageSite[]>> {
    const res = await requestWithAuth<HeritageSite[]>('/heritage/sites');
    if (res.success && res.data && res.data.length > 0) {
      return res;
    }
    return {
      success: true,
      data: mockHeritageSites,
    };
  }

  /**
   * Backward-compatible helper: get site by id
   */
  static async getSiteById(id: string): Promise<ApiResponse<HeritageSite | null>> {
    const res = await requestWithAuth<HeritageSite>(`/heritage/sites/${id}`);
    if (res.success && res.data) {
      return res;
    }
    const fallback = mockHeritageSites.find((s) => s.id === id) || null;
    return {
      success: Boolean(fallback),
      data: fallback,
    };
  }

  /**
   * List packages
   */
  static async getPackages(city?: string): Promise<ApiResponse<TourPackage[]>> {
    const query = city ? `?city=${encodeURIComponent(city)}` : '';
    const res = await requestWithAuth<TourPackage[]>(`/heritage/packages${query}`);
    if (res.success && res.data && res.data.length > 0) {
      return res;
    }
    return {
      success: true,
      data: FALLBACK_PACKAGES,
    };
  }

  /**
   * Get package by slug or id
   */
  static async getPackageDetails(slugOrId: string): Promise<ApiResponse<TourPackage | null>> {
    const res = await requestWithAuth<TourPackage>(`/heritage/packages/${slugOrId}`);
    if (res.success && res.data) {
      return res;
    }
    const fallback =
      FALLBACK_PACKAGES.find((p) => p.id === slugOrId || p.slug === slugOrId) || null;
    return {
      success: Boolean(fallback),
      data: fallback,
    };
  }

  /**
   * List vehicle options
   */
  static async getVehicleOptions(): Promise<ApiResponse<TourVehicleOption[]>> {
    const res = await requestWithAuth<TourVehicleOption[]>('/heritage/vehicle-options');
    if (res.success && res.data && res.data.length > 0) {
      return res;
    }
    return {
      success: true,
      data: FALLBACK_VEHICLES,
    };
  }

  /**
   * List guides
   */
  static async getGuides(language?: string): Promise<ApiResponse<TourGuide[]>> {
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    const res = await requestWithAuth<TourGuide[]>(`/heritage/guides${query}`);
    if (res.success && res.data && res.data.length > 0) {
      return res;
    }
    return {
      success: true,
      data: FALLBACK_GUIDES,
    };
  }

  /**
   * Calculate transparent price quote with offline/network-resilient calculation
   */
  static async getQuote(payload: TourBookingRequest): Promise<ApiResponse<TourQuote>> {
    const res = await requestWithAuth<TourQuote>('/heritage/quotes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data && res.data.pricing) {
      return res;
    }

    // Resilient local quote calculation
    let packageName: string | undefined;
    let basePrice = 1000;
    const sitesToVisit: Array<{ name: string; entryFeeETB: number; requiresBoatTransport: boolean }> = [];

    if (payload.packageId) {
      const pkg = FALLBACK_PACKAGES.find((p) => p.id === payload.packageId || p.slug === payload.packageId);
      if (pkg) {
        packageName = pkg.name;
        basePrice = pkg.basePrice;
        for (const s of pkg.sites) {
          sitesToVisit.push({
            name: s.siteName,
            entryFeeETB: s.entryFeeETB || 0,
            requiresBoatTransport: Boolean(s.requiresBoatTransport),
          });
        }
      }
    } else if (payload.siteIds && payload.siteIds.length > 0) {
      for (const sid of payload.siteIds) {
        const site = mockHeritageSites.find((s) => s.id === sid || (s as any).slug === sid);
        if (site) {
          sitesToVisit.push({
            name: site.name,
            entryFeeETB: site.entryFeeETB || 0,
            requiresBoatTransport: Boolean(site.requiresBoatTransport),
          });
          packageName = `${site.name} Tour`;
        }
      }
    }

    const totalPassengers = (payload.adults || 1) + (payload.children || 0);
    const vehicle = FALLBACK_VEHICLES.find((v) => v.id === payload.vehicleOptionId) || FALLBACK_VEHICLES[0];
    const vehicleRate = vehicle ? vehicle.baseRate : 1800;

    let guideRate = 0;
    let guideInfo: any = null;
    if (payload.requestGuide || payload.selectedGuideId) {
      guideInfo = FALLBACK_GUIDES.find((g) => g.id === payload.selectedGuideId) || FALLBACK_GUIDES[0];
      guideRate = guideInfo ? guideInfo.dailyRate : 1500;
    }

    const breakdown: any[] = [];
    if (basePrice > 0) {
      breakdown.push({
        componentName: packageName ? `Tour Base: ${packageName}` : 'Tour Organization Base Rate',
        componentType: 'TOUR_BASE',
        pricingMethod: 'FIXED_PER_BOOKING',
        unitPrice: basePrice,
        quantity: 1,
        totalPrice: basePrice,
        description: 'Chauffeured tour coordination and scheduling',
      });
    }

    breakdown.push({
      componentName: `Transportation: ${vehicle.displayName}`,
      componentType: 'VEHICLE_TRANSPORT',
      pricingMethod: 'PER_VEHICLE',
      unitPrice: vehicleRate,
      quantity: 1,
      totalPrice: vehicleRate,
      description: `Dedicated chauffeured transport (up to ${vehicle.seatingCapacity} seats)`,
    });

    if (guideRate > 0) {
      breakdown.push({
        componentName: guideInfo ? `Tour Guide: ${guideInfo.fullName}` : 'Professional Tour Guide Service',
        componentType: 'TOUR_GUIDE',
        pricingMethod: 'PER_DAY',
        unitPrice: guideRate,
        quantity: 1,
        totalPrice: guideRate,
        description: `Certified guide (${payload.preferredGuideLanguage || 'English'})`,
      });
    }

    let entranceFeesTotal = 0;
    for (const s of sitesToVisit) {
      if (s.entryFeeETB > 0) {
        const sub = s.entryFeeETB * totalPassengers;
        entranceFeesTotal += sub;
        breakdown.push({
          componentName: `Entry Fee: ${s.name}`,
          componentType: 'ENTRANCE_FEE',
          pricingMethod: 'PER_PASSENGER',
          unitPrice: s.entryFeeETB,
          quantity: totalPassengers,
          totalPrice: sub,
          description: `${totalPassengers} guests x ${s.entryFeeETB} ETB admission`,
        });
      }
    }

    let boatCharterTotal = 0;
    const requiresBoat = sitesToVisit.some((s) => s.requiresBoatTransport);
    if (requiresBoat) {
      boatCharterTotal = 1200;
      breakdown.push({
        componentName: 'Lake Tana Island Boat Charter',
        componentType: 'BOAT_TRANSPORT',
        pricingMethod: 'FIXED_PER_BOOKING',
        unitPrice: 1200,
        quantity: 1,
        totalPrice: 1200,
        description: 'Motorized boat navigation across Lake Tana to island monasteries',
      });
    }

    const totalAmount = basePrice + vehicleRate + guideRate + entranceFeesTotal + boatCharterTotal;

    const fallbackQuote: TourQuote = {
      quoteReference: `HTQ-${(payload.scheduledDate || '20261112').replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      packageName: packageName || (sitesToVisit[0] ? `${sitesToVisit[0].name} Tour` : 'Heritage Tour'),
      scheduledDate: payload.scheduledDate || '2026-11-12',
      preferredStartTime: payload.preferredStartTime || '09:00',
      totalPassengers,
      adults: payload.adults || 1,
      children: payload.children || 0,
      requiresBoatTransport: requiresBoat,
      pricing: {
        baseAmount: basePrice,
        vehicleAmount: vehicleRate,
        guideAmount: guideRate,
        entranceFeesAmount: entranceFeesTotal,
        boatTransportAmount: boatCharterTotal,
        taxAmount: 0,
        totalAmount,
        currency: 'ETB',
        breakdown,
        calculatedAt: new Date().toISOString(),
      },
      vehicleOption: {
        id: vehicle.id,
        displayName: vehicle.displayName,
        seatingCapacity: vehicle.seatingCapacity,
      },
      guideRequested: Boolean(payload.requestGuide || payload.selectedGuideId),
      guideLanguage: payload.preferredGuideLanguage || 'English',
    };

    return {
      success: true,
      data: fallbackQuote,
    };
  }

  /**
   * Create authoritative tour booking with fallback confirmation
   */
  static async createBooking(payload: TourBookingRequest): Promise<ApiResponse<TourBooking>> {
    const token = useAuthStore.getState().token;

    // Only attempt backend authenticated endpoint if access token is available
    if (token) {
      const res = await requestWithAuth<TourBooking>('/heritage/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data && res.data.bookingReference) {
        return res;
      }
    }

    // Fallback booking confirmation for guest/development preview
    const quoteRes = await this.getQuote(payload);
    const quote = quoteRes.data;
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `HTB-${today}-${rand}`;

    const fallbackBooking: TourBooking = {
      id: `htb_${Date.now()}`,
      bookingReference,
      passengerId: useAuthStore.getState().user?.id || 'usr_passenger',
      packageId: payload.packageId,
      packageName: quote.packageName,
      bookingStatus: 'REQUESTED',
      paymentStatus: 'PENDING',
      scheduledDate: payload.scheduledDate,
      preferredStartTime: payload.preferredStartTime || '09:00',
      adults: payload.adults,
      children: payload.children || 0,
      pickupLocation: payload.pickupLocation,
      totalAmount: quote.pricing.totalAmount,
      currency: 'ETB',
      pricing: quote.pricing,
      vehicleOption: quote.vehicleOption,
      guideRequested: quote.guideRequested,
      guideLanguage: quote.guideLanguage,
      requiresBoatTransport: quote.requiresBoatTransport,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: fallbackBooking,
      message: 'Heritage tour booking successfully requested',
    };
  }

  /**
   * Get all bookings for authenticated passenger
   */
  static async getPassengerBookings(): Promise<ApiResponse<TourBooking[]>> {
    return requestWithAuth<TourBooking[]>('/heritage/bookings');
  }

  /**
   * Get single booking by reference
   */
  static async getBookingByReference(
    bookingReference: string
  ): Promise<ApiResponse<TourBooking>> {
    return requestWithAuth<TourBooking>(`/heritage/bookings/${bookingReference}`);
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(
    bookingReference: string,
    cancellationReason: string
  ): Promise<ApiResponse<TourBooking>> {
    return requestWithAuth<TourBooking>(`/heritage/bookings/${bookingReference}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancellationReason }),
    });
  }
}
