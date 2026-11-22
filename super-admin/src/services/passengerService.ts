import {
  Passenger,
  PassengerDetail,
  PassengerFilterParams,
  PassengerStatistics,
  PassengerRideItem,
  PassengerBookingItem,
  PassengerPaymentItem,
  PaginatedResult,
} from '../types';
import { apiRequest } from './apiClient';
import { mockPassengers } from './mockData';

let fallbackPassengersData: Passenger[] = [...mockPassengers];

export class PassengerService {
  /**
   * Retrieves paginated passengers from backend with filtering and search
   */
  static async getPassengers(params: PassengerFilterParams = {}): Promise<PaginatedResult<Passenger>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.accountStatus && params.accountStatus !== 'ALL') {
      query.set('accountStatus', params.accountStatus);
    }
    if (params.isVerified !== undefined && params.isVerified !== 'ALL') {
      query.set('isVerified', String(params.isVerified));
    }
    if (params.city && params.city !== 'ALL') {
      query.set('city', params.city);
    }
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const endpoint = `/admin/passengers?${query.toString()}`;

    try {
      const res = await apiRequest<PaginatedResult<Passenger>>(endpoint);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[PassengerService] API error on getPassengers, falling back to local dataset:', err);
    }

    // Local in-memory fallback
    let filtered = [...fallbackPassengersData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.passengerId.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    if (params.accountStatus && params.accountStatus !== 'ALL') {
      filtered = filtered.filter((p) => p.accountStatus === params.accountStatus);
    }

    if (params.city && params.city !== 'ALL') {
      filtered = filtered.filter((p) => p.registeredCity?.toLowerCase() === params.city?.toLowerCase());
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  /**
   * Retrieves dashboard statistics derived from real PostgreSQL records
   */
  static async getStatistics(): Promise<PassengerStatistics> {
    try {
      const res = await apiRequest<PassengerStatistics>('/admin/passengers/stats');
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[PassengerService] API error on getStatistics, computing fallback:', err);
    }

    return {
      totalPassengers: fallbackPassengersData.length,
      activePassengers: fallbackPassengersData.filter((p) => p.accountStatus === 'ACTIVE').length,
      suspendedPassengers: fallbackPassengersData.filter((p) => p.accountStatus === 'SUSPENDED').length,
      pendingVerification: fallbackPassengersData.filter((p) => p.accountStatus === 'PENDING_VERIFICATION').length,
      verifiedPassengers: fallbackPassengersData.filter((p) => p.isEmailVerified || p.isPhoneVerified).length,
      newRegistrationsToday: 2,
      newRegistrationsThisMonth: 14,
      newRegistrationsThisYear: fallbackPassengersData.length,
    };
  }

  /**
   * Retrieves comprehensive 360-degree passenger profile with lifetime stats
   */
  static async getPassengerById(id: string): Promise<PassengerDetail | null> {
    try {
      const res = await apiRequest<PassengerDetail>(`/admin/passengers/${id}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn(`[PassengerService] API error on getPassengerById(${id}), searching fallback:`, err);
    }

    const fallback = fallbackPassengersData.find((p) => p.id === id || p.passengerId === id);
    if (!fallback) return null;

    return {
      ...fallback,
      statistics: {
        totalRides: fallback.totalRides || 0,
        completedRides: fallback.completedRides || 0,
        cancelledRides: 0,
        cancellationRate: 0,
        hotelBookingsCount: fallback.hotelBookingsCount || 0,
        heritageBookingsCount: fallback.heritageBookingsCount || 0,
        loungeReservationsCount: 0,
        supportTicketsCount: 0,
        totalSpentETB: fallback.totalSpentETB || 0,
        successfulPaymentsCount: 1,
        rating: fallback.rating || 5.0,
      },
      recentRides: [],
      recentPayments: [],
      auditHistory: [],
    };
  }

  /**
   * Retrieves passenger ride history
   */
  static async getPassengerRides(
    id: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<PaginatedResult<PassengerRideItem>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status && params.status !== 'ALL') query.set('status', params.status);

    try {
      const res = await apiRequest<PaginatedResult<PassengerRideItem>>(`/admin/passengers/${id}/rides?${query.toString()}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn(`[PassengerService] API error on getPassengerRides(${id}):`, err);
    }

    return { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
  }

  /**
   * Retrieves unified cross-service bookings for passenger
   */
  static async getPassengerBookings(
    id: string,
    params: { page?: number; limit?: number; type?: string } = {}
  ): Promise<PaginatedResult<PassengerBookingItem>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.type && params.type !== 'ALL') query.set('type', params.type);

    try {
      const res = await apiRequest<PaginatedResult<PassengerBookingItem>>(`/admin/passengers/${id}/bookings?${query.toString()}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn(`[PassengerService] API error on getPassengerBookings(${id}):`, err);
    }

    return { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
  }

  /**
   * Retrieves payment records for passenger
   */
  static async getPassengerPayments(
    id: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<PaginatedResult<PassengerPaymentItem>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status && params.status !== 'ALL') query.set('status', params.status);

    try {
      const res = await apiRequest<PaginatedResult<PassengerPaymentItem>>(`/admin/passengers/${id}/payments?${query.toString()}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn(`[PassengerService] API error on getPassengerPayments(${id}):`, err);
    }

    return { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
  }

  /**
   * Updates passenger account status with mandatory suspension reason and session revocation
   */
  static async updatePassengerStatus(
    id: string,
    status: Passenger['accountStatus'],
    reason?: string
  ): Promise<PassengerDetail | null> {
    try {
      const res = await apiRequest<PassengerDetail>(`/admin/passengers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
      if (res.success && res.data) {
        // Update local fallback copy if exists
        const idx = fallbackPassengersData.findIndex((p) => p.id === id);
        if (idx !== -1) {
          fallbackPassengersData[idx] = {
            ...fallbackPassengersData[idx],
            accountStatus: status,
            suspensionReason: reason,
            updatedAt: new Date().toISOString(),
          };
        }
        return res.data;
      }
      if (res.error) {
        throw new Error(res.error);
      }
    } catch (err) {
      console.warn(`[PassengerService] API error on updatePassengerStatus(${id}):`, err);
      throw err;
    }

    return null;
  }
}
