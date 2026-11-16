import { API_CONFIG, buildApiUrl } from '../config/api';
import { useAuthStore } from '../stores/auth.store';
import {
  ApiResponse,
  UnifiedBookingHistoryResult,
  BookingHistoryFilterParams,
  UnifiedBookingItem,
  NormalizedBookingStatus,
  UnifiedPaymentStatus,
  PassengerRecentActivity,
} from '../types';
import { RideService } from './ride.service';
import { HotelService } from './hotel.service';
import { HeritageService } from './heritage.service';

export class PassengerBookingsService {
  /**
   * Retrieves unified booking history with summary metrics and pagination from the central backend.
   * Includes fallback resilience if the backend process has not reloaded the unified endpoint yet.
   */
  static async getBookingsHistory(
    params: BookingHistoryFilterParams = {}
  ): Promise<ApiResponse<UnifiedBookingHistoryResult>> {
    const token = useAuthStore.getState().token;

    // If unauthenticated (guest / dev preview mode), return empty dataset gracefully without failing network request
    if (!token) {
      return {
        success: true,
        data: {
          items: [],
          pagination: {
            page: 1,
            limit: params.limit || 15,
            totalCount: 0,
            totalPages: 1,
            hasMore: false,
          },
          summary: {
            totalBookings: 0,
            totalRides: 0,
            totalHotels: 0,
            totalLounges: 0,
            totalHeritageTours: 0,
            completed: 0,
            pending: 0,
          },
        },
      };
    }

    const queryParts: string[] = [];

    if (params.type && params.type !== 'ALL') {
      queryParts.push(`type=${encodeURIComponent(params.type)}`);
    }
    if (params.status) {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    if (params.paymentStatus) {
      queryParts.push(`paymentStatus=${encodeURIComponent(params.paymentStatus)}`);
    }
    if (params.page) {
      queryParts.push(`page=${params.page}`);
    }
    if (params.limit) {
      queryParts.push(`limit=${params.limit}`);
    }
    if (params.sort) {
      queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    }
    if (params.fromDate) {
      queryParts.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
    }
    if (params.toDate) {
      queryParts.push(`toDate=${encodeURIComponent(params.toDate)}`);
    }

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Primary Attempt: /passengers/bookings
    try {
      const url = buildApiUrl(`/passengers/bookings${qs}`);
      const res = await fetch(url, { headers });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        return {
          success: true,
          data: (json?.data !== undefined ? json.data : json) as UnifiedBookingHistoryResult,
        };
      }

      // If 401 (unauthenticated / expired token), return empty dataset gracefully
      if (res.status === 401) {
        return {
          success: true,
          data: {
            items: [],
            pagination: {
              page: 1,
              limit: params.limit || 15,
              totalCount: 0,
              totalPages: 1,
              hasMore: false,
            },
            summary: {
              totalBookings: 0,
              totalRides: 0,
              totalHotels: 0,
              totalLounges: 0,
              totalHeritageTours: 0,
              completed: 0,
              pending: 0,
            },
          },
        };
      }

      // If 404, try alias /bookings/history
      if (res.status === 404) {
        const altUrl = buildApiUrl(`/bookings/history${qs}`);
        const altRes = await fetch(altUrl, { headers });
        if (altRes.ok) {
          const altJson = await altRes.json().catch(() => null);
          return {
            success: true,
            data: (altJson?.data !== undefined ? altJson.data : altJson) as UnifiedBookingHistoryResult,
          };
        }
      }
    } catch {
      // Continue to individual endpoint fallback
    }

    // 2. Resilient Fallback: Retrieve from individual services and merge client-side
    try {
      const fallbackResult = await this.fetchAndMergeIndividualServices(params);
      return {
        success: true,
        data: fallbackResult,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: fallbackErr?.message || 'Failed to load booking history. Please check your connection and retry.',
        data: null as any,
      };
    }
  }

  /**
   * Resilient fallback aggregator that queries individual services and normalizes them into unified items.
   */
  private static async fetchAndMergeIndividualServices(
    params: BookingHistoryFilterParams
  ): Promise<UnifiedBookingHistoryResult> {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const requestedType = (params.type || 'ALL').toUpperCase();

    const fetchRides = requestedType === 'ALL' || requestedType === 'RIDE';
    const fetchHotels = requestedType === 'ALL' || requestedType === 'HOTEL';
    const fetchLounges = requestedType === 'ALL' || requestedType === 'LOUNGE';
    const fetchHeritage = requestedType === 'ALL' || requestedType === 'HERITAGE';

    const token = useAuthStore.getState().token;
    const fetchLoungesFn = async () => {
      if (!token) return { success: true, data: [] };
      try {
        const res = await fetch(buildApiUrl('/lounge-reservations'), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (!res.ok) return { success: false, data: [] };
        const json = await res.json().catch(() => null);
        return { success: true, data: json?.data || json || [] };
      } catch {
        return { success: false, data: [] };
      }
    };

    const [ridesSettled, hotelsSettled, loungesSettled, toursSettled] = await Promise.allSettled([
      fetchRides ? RideService.getPassengerRides(1, 50) : Promise.resolve({ success: true, data: { rides: [] } }),
      fetchHotels ? HotelService.getPassengerBookings() : Promise.resolve({ success: true, data: [] }),
      fetchLounges ? fetchLoungesFn() : Promise.resolve({ success: true, data: [] }),
      fetchHeritage ? HeritageService.getPassengerBookings() : Promise.resolve({ success: true, data: [] }),
    ]);

    const items: UnifiedBookingItem[] = [];

    // Map Rides
    if (ridesSettled.status === 'fulfilled' && ridesSettled.value.success && ridesSettled.value.data?.rides) {
      for (const r of ridesSettled.value.data.rides) {
        const fare = r.finalFare ? Number(r.finalFare) : (Number(r.estimatedFare) || 0);
        const pickupShort = (r.pickupLocation || '').split(',')[0].trim() || 'Gondar';
        const destShort = (r.destinationLocation || '').split(',')[0].trim() || 'Destination';
        const vehicleCat = r.vehicle?.vehicleType?.toUpperCase() || r.serviceType || 'TAXI';
        const driverName = r.driver?.fullName || 'Assigned Driver';

        let normStatus: NormalizedBookingStatus = 'PENDING';
        if (r.bookingStatus === 'TRIP_COMPLETED') normStatus = 'COMPLETED';
        else if (r.bookingStatus === 'CANCELLED') normStatus = 'CANCELLED';
        else if (['TRIP_STARTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(r.bookingStatus)) normStatus = 'IN_PROGRESS';
        else if (r.bookingStatus === 'DRIVER_ASSIGNED') normStatus = 'CONFIRMED';

        items.push({
          id: r.id,
          reference: r.bookingReference,
          type: 'RIDE',
          title: `${pickupShort} → ${destShort}`,
          subtitle: `${vehicleCat} • Driver: ${driverName}`,
          imageUrl: null,
          createdAt: r.createdAt || new Date().toISOString(),
          scheduledAt: r.startedAt || r.createdAt || new Date().toISOString(),
          status: r.bookingStatus,
          normalizedStatus: normStatus,
          paymentStatus: (r.payment?.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
          currency: r.currency || 'ETB',
          totalAmount: fare,
          summaryDetails: {
            pickupLocation: r.pickupLocation,
            destinationLocation: r.destinationLocation,
            driverName: r.driver?.fullName,
            driverPhone: r.driver?.phoneNumber,
            driverRating: r.driver?.rating ? Number(r.driver.rating) : null,
            vehicleModel: r.vehicle?.vehicleModel,
            plateNumber: r.vehicle?.plateNumber,
            vehicleType: r.vehicle?.vehicleType,
            distanceKm: r.actualDistanceMeters ? r.actualDistanceMeters / 1000 : null,
            durationMins: r.actualDurationSeconds ? Math.round(r.actualDurationSeconds / 60) : null,
          },
        });
      }
    }

    // Map Hotels
    if (hotelsSettled.status === 'fulfilled' && hotelsSettled.value.success && Array.isArray(hotelsSettled.value.data)) {
      for (const h of hotelsSettled.value.data) {
        let normStatus: NormalizedBookingStatus = 'PENDING';
        const rawStatus = (h.status || 'CONFIRMED').toUpperCase();
        if (rawStatus === 'COMPLETED') normStatus = 'COMPLETED';
        else if (rawStatus === 'CONFIRMED') normStatus = 'CONFIRMED';
        else if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(rawStatus)) normStatus = 'CANCELLED';

        const hotelId = h.id ? String(h.id) : `htl_${Math.random().toString(36).substring(2, 9)}`;
        items.push({
          id: hotelId,
          reference: h.reservationCode || `HB-${hotelId.slice(0, 8).toUpperCase()}`,
          type: 'HOTEL',
          title: h.hotelName || 'Hotel Reservation',
          subtitle: `${h.roomTitle || 'Room'} • ${h.nightsCount || 1} Nights (${h.guestsCount || 1} Guests)${h.hasAirportTransfer ? ' • GDQ Airport Transfer' : ''}`,
          imageUrl: h.hotelImage || null,
          createdAt: h.createdAt || new Date().toISOString(),
          scheduledAt: h.checkInDate || new Date().toISOString(),
          status: h.status || 'CONFIRMED',
          normalizedStatus: normStatus,
          paymentStatus: 'SUCCESS',
          currency: 'ETB',
          totalAmount: h.totalPriceETB || 0,
          summaryDetails: {
            hotelName: h.hotelName,
            hotelCity: h.hotelCity,
            roomTypeName: h.roomTitle,
            checkInDate: h.checkInDate,
            checkOutDate: h.checkOutDate,
            nightsCount: h.nightsCount,
            adults: h.guestsCount,
            hasAirportTransfer: h.hasAirportTransfer,
          },
        });
      }
    }

    // Map Lounges
    if (loungesSettled.status === 'fulfilled' && loungesSettled.value.success && Array.isArray(loungesSettled.value.data)) {
      for (const l of loungesSettled.value.data) {
        let normStatus: NormalizedBookingStatus = 'CONFIRMED';
        const rawStatus = (l.status || 'CONFIRMED').toUpperCase();
        if (rawStatus === 'COMPLETED') normStatus = 'COMPLETED';
        else if (rawStatus === 'CANCELLED') normStatus = 'CANCELLED';
        else if (rawStatus === 'PENDING') normStatus = 'PENDING';

        items.push({
          id: l.id,
          reference: l.reference || l.reservationReference || `KT-LNG-${String(l.id).slice(0, 8).toUpperCase()}`,
          type: 'LOUNGE',
          title: l.loungeName || 'Lounge Reservation',
          subtitle: `${l.city || 'Gondar'} • ${l.guests || 1} Guest${(l.guests || 1) > 1 ? 's' : ''} • ${l.time || '18:00'}`,
          imageUrl: l.image || null,
          createdAt: l.createdAt || new Date().toISOString(),
          scheduledAt: l.date || new Date().toISOString(),
          status: l.status || 'CONFIRMED',
          normalizedStatus: normStatus,
          paymentStatus: 'SUCCESS',
          currency: 'ETB',
          totalAmount: 0,
          summaryDetails: {
            loungeName: l.loungeName,
            loungeCity: l.city,
            loungeAddress: l.address,
            reservationTime: l.time,
            guestsCount: l.guests,
          },
        });
      }
    }

    // Map Heritage Tours
    if (toursSettled.status === 'fulfilled' && toursSettled.value.success && Array.isArray(toursSettled.value.data)) {
      for (const t of toursSettled.value.data) {
        let normStatus: NormalizedBookingStatus = 'PENDING';
        const rawStatus = (t.bookingStatus || 'CONFIRMED').toUpperCase();
        if (rawStatus === 'COMPLETED') normStatus = 'COMPLETED';
        else if (['CONFIRMED', 'GUIDE_ASSIGNED', 'VEHICLE_ASSIGNED'].includes(rawStatus)) normStatus = 'CONFIRMED';
        else if (rawStatus === 'IN_PROGRESS') normStatus = 'IN_PROGRESS';
        else if (['CANCELLED', 'REJECTED'].includes(rawStatus)) normStatus = 'CANCELLED';

        const title = t.packageName || 'Gondar Heritage Tour';
        const vehicleLabel = t.vehicleOption?.displayName || 'Dedicated Vehicle';

        items.push({
          id: t.id,
          reference: t.bookingReference,
          type: 'HERITAGE',
          title,
          subtitle: `${vehicleLabel} • Time: ${t.preferredStartTime || '09:00'}`,
          imageUrl: null,
          createdAt: t.createdAt || new Date().toISOString(),
          scheduledAt: t.scheduledDate || new Date().toISOString(),
          status: t.bookingStatus || 'CONFIRMED',
          normalizedStatus: normStatus,
          paymentStatus: (t.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
          currency: t.currency || 'ETB',
          totalAmount: Number(t.totalAmount) || 0,
          summaryDetails: {
            packageName: t.packageName,
            vehicleOptionName: vehicleLabel,
            guideRequested: Boolean(t.guideRequested),
            scheduledDate: t.scheduledDate,
            preferredStartTime: t.preferredStartTime,
          },
        });
      }
    }

    // Sort Descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    const totalRides = items.filter((i) => i.type === 'RIDE').length;
    const totalHotels = items.filter((i) => i.type === 'HOTEL').length;
    const totalLounges = items.filter((i) => i.type === 'LOUNGE').length;
    const totalHeritageTours = items.filter((i) => i.type === 'HERITAGE').length;
    const completed = items.filter((i) => i.normalizedStatus === 'COMPLETED').length;
    const pending = items.filter((i) => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(i.normalizedStatus)).length;

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        totalBookings: totalCount,
        totalRides,
        totalHotels,
        totalLounges,
        totalHeritageTours,
        completed,
        pending,
      },
    };
  }

  /**
   * Retrieves deep details of a specific booking with strict passenger ownership.
   */
  static async getBookingDetail(
    type: string,
    id: string
  ): Promise<ApiResponse<{ type: string; booking: any }>> {
    const token = useAuthStore.getState().token;
    if (!token) {
      return {
        success: false,
        data: null as any,
        error: 'Authentication required',
      };
    }

    const url = buildApiUrl(`/passengers/bookings/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    try {
      const res = await fetch(url, { headers });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          data: null as any,
          error: json?.message || `HTTP ${res.status}: Failed to load booking details`,
        };
      }

      return {
        success: true,
        data: (json?.data !== undefined ? json.data : json) as { type: string; booking: any },
      };
    } catch (err: any) {
      return {
        success: false,
        data: null as any,
        error: err.message || 'Network error fetching booking details',
      };
    }
  }

  /**
   * Retrieves recent activities for the home dashboard.
   * Calls dedicated endpoint /passenger/recent-activities with graceful fallback to getBookingsHistory.
   */
  static async getRecentActivities(
    limit: number = 5
  ): Promise<ApiResponse<PassengerRecentActivity[]>> {
    const token = useAuthStore.getState().token;
    if (!token) {
      return { success: true, data: [] };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Primary attempt: /passenger/recent-activities
    try {
      const url = buildApiUrl(`/passenger/recent-activities?limit=${limit}`);
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const rawActivities = json?.data?.activities || json?.data || json?.activities;
        if (Array.isArray(rawActivities)) {
          return {
            success: true,
            data: rawActivities,
          };
        }
      }
    } catch {
      // Continue to fallback
    }

    // Secondary attempt: /passengers/recent-activities
    try {
      const altUrl = buildApiUrl(`/passengers/recent-activities?limit=${limit}`);
      const altRes = await fetch(altUrl, { headers });
      if (altRes.ok) {
        const json = await altRes.json().catch(() => null);
        const rawActivities = json?.data?.activities || json?.data || json?.activities;
        if (Array.isArray(rawActivities)) {
          return {
            success: true,
            data: rawActivities,
          };
        }
      }
    } catch {
      // Continue to history fallback
    }

    // Resilient client-side fallback using getBookingsHistory
    try {
      const historyRes = await this.getBookingsHistory({ limit, page: 1, sort: 'NEWEST' });
      if (historyRes.success && historyRes.data) {
        const items = historyRes.data.items || [];
        const mapped: PassengerRecentActivity[] = items.map((item) => {
          let category: 'ride' | 'hotel' | 'lounge' | 'tour' | 'payment' = 'ride';
          let iconType: 'car' | 'hotel' | 'lounge' | 'compass' | 'credit-card' = 'car';
          if (item.type === 'RIDE') {
            category = 'ride';
            iconType = 'car';
          } else if (item.type === 'HOTEL') {
            category = 'hotel';
            iconType = 'hotel';
          } else if (item.type === 'LOUNGE') {
            category = 'lounge';
            iconType = 'lounge';
          } else if (item.type === 'HERITAGE') {
            category = 'tour';
            iconType = 'compass';
          }

          return {
            id: item.id,
            reference: item.reference,
            type: item.type,
            title: item.title,
            subtitle: item.subtitle,
            category,
            status: item.status,
            normalizedStatus: item.normalizedStatus,
            paymentStatus: item.paymentStatus,
            currency: item.currency,
            totalAmount: item.totalAmount,
            timestamp: item.createdAt,
            iconType,
          };
        });
        return { success: true, data: mapped };
      }
    } catch {
      // Return empty list
    }

    return {
      success: true,
      data: [],
    };
  }
}
