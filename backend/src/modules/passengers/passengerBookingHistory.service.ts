import { prisma, isDbConnectionError } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';
import { heritageTourBookingService } from '../heritage/booking.service';
import { fallbackHotelBookingsCache } from '../hospitality/booking.service';

export type BookingType = 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';
export type NormalizedBookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
export type UnifiedPaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PassengerBookingHistoryQuery {
  type?: 'ALL' | 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';
  status?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
  sort?: 'NEWEST' | 'OLDEST';
  fromDate?: string;
  toDate?: string;
}

export interface UnifiedBookingSummaryDetails {
  // Ride specific
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string | null;
  driverPhone?: string | null;
  driverRating?: number | null;
  vehicleModel?: string | null;
  plateNumber?: string | null;
  vehicleType?: string | null;
  distanceKm?: number | null;
  durationMins?: number | null;

  // Hotel specific
  hotelName?: string;
  hotelCity?: string;
  hotelAddress?: string;
  roomTypeName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nightsCount?: number;
  adults?: number;
  children?: number;
  numberOfRooms?: number;
  hasAirportTransfer?: boolean;

  // Lounge specific
  loungeName?: string;
  loungeCity?: string;
  loungeAddress?: string;
  reservationTime?: string;
  guestsCount?: number;

  // Heritage Tour specific
  packageName?: string;
  vehicleOptionName?: string;
  assignedDriverName?: string | null;
  assignedGuideName?: string | null;
  guideRequested?: boolean;
  scheduledDate?: string;
  preferredStartTime?: string;
  siteNames?: string[];
  stopsCount?: number;

  // Underlying domain statuses
  requestStatus?: string;
  tripStatus?: string | null;
  paymentStatus?: string;
}

export interface UnifiedBookingItem {
  id: string;
  reference: string;
  type: BookingType;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  createdAt: string;
  scheduledAt: string;
  status: string;
  normalizedStatus: NormalizedBookingStatus;
  requestStatus?: string;
  tripStatus?: string | null;
  paymentStatus: UnifiedPaymentStatus;
  currency: string;
  totalAmount: number;
  summaryDetails: UnifiedBookingSummaryDetails;
}

export interface BookingHistoryPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PassengerBookingHistorySummary {
  totalBookings: number;
  totalRides: number;
  totalHotels: number;
  totalLounges: number;
  totalHeritageTours: number;
  completed: number;
  pending: number;
}

export interface UnifiedBookingHistoryResult {
  items: UnifiedBookingItem[];
  pagination: BookingHistoryPagination;
  summary: PassengerBookingHistorySummary;
}

export interface PassengerRecentActivityItem {
  id: string;
  reference: string;
  type: BookingType;
  title: string;
  subtitle: string;
  category: 'ride' | 'hotel' | 'lounge' | 'tour' | 'payment';
  status: string;
  normalizedStatus: NormalizedBookingStatus;
  paymentStatus: UnifiedPaymentStatus;
  currency: string;
  totalAmount: number;
  timestamp: string;
  createdAt: string;
  iconType: 'car' | 'hotel' | 'lounge' | 'compass' | 'credit-card';
}

export interface PassengerRecentActivitiesResult {
  activities: PassengerRecentActivityItem[];
  total: number;
}

export function normalizeBookingStatus(type: BookingType, rawStatus: string): NormalizedBookingStatus {
  const s = (rawStatus || '').toUpperCase();
  if (type === 'RIDE') {
    if (s === 'TRIP_COMPLETED') return 'COMPLETED';
    if (s === 'CANCELLED') return 'CANCELLED';
    if (['TRIP_STARTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(s)) return 'IN_PROGRESS';
    if (s === 'DRIVER_ASSIGNED') return 'CONFIRMED';
    return 'PENDING';
  } else if (type === 'HOTEL') {
    if (s === 'COMPLETED') return 'COMPLETED';
    if (s === 'CONFIRMED') return 'CONFIRMED';
    if (s === 'CHECKED_IN') return 'IN_PROGRESS';
    if (s === 'DECLINED') return 'DECLINED';
    if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(s)) return 'CANCELLED';
    return 'PENDING';
  } else if (type === 'LOUNGE') {
    if (s === 'COMPLETED') return 'COMPLETED';
    if (s === 'CONFIRMED') return 'CONFIRMED';
    if (['CANCELLED'].includes(s)) return 'CANCELLED';
    return 'PENDING';
  } else {
    // HERITAGE
    if (s === 'COMPLETED') return 'COMPLETED';
    if (['CONFIRMED', 'GUIDE_ASSIGNED', 'VEHICLE_ASSIGNED'].includes(s)) return 'CONFIRMED';
    if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (['CANCELLED', 'REJECTED'].includes(s)) return 'CANCELLED';
    return 'PENDING';
  }
}

export function resolveStatusFilter(type: BookingType, requestedStatus?: string): string[] | undefined {
  if (!requestedStatus) return undefined;
  const s = requestedStatus.toUpperCase();

  if (s === 'COMPLETED') {
    if (type === 'RIDE') return ['TRIP_COMPLETED'];
    if (type === 'HOTEL') return ['COMPLETED'];
    if (type === 'LOUNGE') return ['COMPLETED'];
    if (type === 'HERITAGE') return ['COMPLETED'];
  }
  if (s === 'DECLINED') {
    if (type === 'HOTEL') return ['DECLINED'];
    if (type === 'HERITAGE') return ['REJECTED'];
    return [];
  }
  if (s === 'CANCELLED') {
    if (type === 'RIDE') return ['CANCELLED'];
    if (type === 'HOTEL') return ['CANCELLED', 'REJECTED', 'EXPIRED'];
    if (type === 'LOUNGE') return ['CANCELLED'];
    if (type === 'HERITAGE') return ['CANCELLED', 'REJECTED'];
  }
  if (s === 'IN_PROGRESS') {
    if (type === 'RIDE') return ['TRIP_STARTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'];
    if (type === 'HOTEL') return ['CHECKED_IN'];
    if (type === 'LOUNGE') return [];
    if (type === 'HERITAGE') return ['IN_PROGRESS'];
  }
  if (s === 'CONFIRMED') {
    if (type === 'RIDE') return ['DRIVER_ASSIGNED'];
    if (type === 'HOTEL') return ['CONFIRMED'];
    if (type === 'LOUNGE') return ['CONFIRMED'];
    if (type === 'HERITAGE') return ['CONFIRMED', 'GUIDE_ASSIGNED', 'VEHICLE_ASSIGNED'];
  }
  if (s === 'PENDING') {
    if (type === 'RIDE') return ['DRAFT', 'REQUESTED', 'SEARCHING_DRIVER'];
    if (type === 'HOTEL') return ['PENDING'];
    if (type === 'LOUNGE') return ['PENDING'];
    if (type === 'HERITAGE') return ['DRAFT', 'REQUESTED', 'UNDER_REVIEW'];
  }

  return [s];
}

export class PassengerBookingHistoryService {
  /**
   * Retrieves unified booking history for an authenticated passenger.
   * Merges Rides, Hotels, and Heritage Tours into a single chronologically sorted dataset.
   */
  async getUnifiedBookings(
    passengerId: string,
    query: PassengerBookingHistoryQuery = {}
  ): Promise<UnifiedBookingHistoryResult> {
    const requestedType = (query.type || 'ALL').toUpperCase();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const sort = (query.sort || 'NEWEST').toUpperCase() === 'OLDEST' ? 'OLDEST' : 'NEWEST';
    const sortAscending = sort === 'OLDEST';

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    const createdAtFilter = fromDate || toDate ? {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    } : undefined;

    try {
      // Resilient parallel computation of passenger-wide summary counts
      const [
        rideTotal,
        hotelTotal,
        loungeTotal,
        heritageTotal,
        rideCompleted,
        hotelCompleted,
        loungeCompleted,
        heritageCompleted,
        ridePending,
        hotelPending,
        loungePending,
        heritagePending,
      ] = await Promise.all([
        prisma.booking.count({ where: { passengerId } }).catch(() => 0),
        prisma.hotelBooking.count({ where: { passengerId } }).catch(() => 0),
        prisma.loungeReservation.count({ where: { passengerId } }).catch(() => 0),
        prisma.heritageTourBooking.count({ where: { passengerId } }).catch(() => 0),
        prisma.booking.count({ where: { passengerId, bookingStatus: 'TRIP_COMPLETED' } }).catch(() => 0),
        prisma.hotelBooking.count({ where: { passengerId, bookingStatus: 'COMPLETED' } }).catch(() => 0),
        prisma.loungeReservation.count({ where: { passengerId, status: 'COMPLETED' } }).catch(() => 0),
        prisma.heritageTourBooking.count({ where: { passengerId, bookingStatus: 'COMPLETED' } }).catch(() => 0),
        prisma.booking.count({
          where: {
            passengerId,
            bookingStatus: { in: ['DRAFT', 'REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED'] },
          },
        }).catch(() => 0),
        prisma.hotelBooking.count({
          where: {
            passengerId,
            bookingStatus: { in: ['PENDING', 'CONFIRMED'] },
          },
        }).catch(() => 0),
        prisma.loungeReservation.count({
          where: {
            passengerId,
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        }).catch(() => 0),
        prisma.heritageTourBooking.count({
          where: {
            passengerId,
            bookingStatus: { in: ['DRAFT', 'REQUESTED', 'UNDER_REVIEW', 'CONFIRMED', 'GUIDE_ASSIGNED', 'VEHICLE_ASSIGNED', 'IN_PROGRESS'] },
          },
        }).catch(() => 0),
      ]);

      const summary: PassengerBookingHistorySummary = {
        totalBookings: rideTotal + hotelTotal + loungeTotal + heritageTotal,
        totalRides: rideTotal,
        totalHotels: hotelTotal,
        totalLounges: loungeTotal,
        totalHeritageTours: heritageTotal,
        completed: rideCompleted + hotelCompleted + loungeCompleted + heritageCompleted,
        pending: ridePending + hotelPending + loungePending + heritagePending,
      };

      const fetchRides = requestedType === 'ALL' || requestedType === 'RIDE';
      const fetchHotels = requestedType === 'ALL' || requestedType === 'HOTEL';
      const fetchLounges = requestedType === 'ALL' || requestedType === 'LOUNGE';
      const fetchHeritage = requestedType === 'ALL' || requestedType === 'HERITAGE';

      const rideStatusList = resolveStatusFilter('RIDE', query.status);
      const hotelStatusList = resolveStatusFilter('HOTEL', query.status);
      const loungeStatusList = resolveStatusFilter('LOUNGE', query.status);
      const heritageStatusList = resolveStatusFilter('HERITAGE', query.status);

      const promises: Promise<UnifiedBookingItem[]>[] = [];

    // 1. Fetch Taxi Rides
    if (fetchRides) {
      promises.push(
        (async () => {
          if (rideStatusList && rideStatusList.length === 0) return [];
          try {
            const rows = await prisma.booking.findMany({
              where: {
                passengerId,
                ...(rideStatusList ? { bookingStatus: { in: rideStatusList as any } } : {}),
                ...(query.paymentStatus ? { payment: { paymentStatus: query.paymentStatus as any } } : {}),
                ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
              },
              include: {
                driver: {
                  select: {
                    id: true,
                    fullName: true,
                    profileImage: true,
                    rating: true,
                    phoneNumber: true,
                  },
                },
                vehicle: {
                  select: {
                    id: true,
                    vehicleModel: true,
                    plateNumber: true,
                    vehicleType: true,
                    vehicleColor: true,
                  },
                },
                subcity: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                trip: {
                  select: {
                    id: true,
                    tripStatus: true,
                    actualDistanceMeters: true,
                    actualDurationSeconds: true,
                    startedAt: true,
                    completedAt: true,
                    passengerRating: true,
                    passengerFeedback: true,
                  },
                },
                payment: {
                  select: {
                    id: true,
                    amount: true,
                    currency: true,
                    paymentMethod: true,
                    paymentStatus: true,
                    transactionReference: true,
                    paidAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: sortAscending ? 'asc' : 'desc',
              },
            });

            return rows.map((b): UnifiedBookingItem => {
              const pickupShort = (b.pickupLocation || '').split(',')[0].trim() || b.subcity?.name || 'Gondar';
              const destShort = (b.destinationLocation || '').split(',')[0].trim() || 'Destination';
              const vehicleCat = b.vehicle?.vehicleType?.toUpperCase() || (b.serviceType as string) || 'TAXI';
              const driverName = b.driver?.fullName || 'Assigned Driver';
              const fare = b.finalFare ? Number(b.finalFare) : (Number(b.estimatedFare) || 0);

              const distanceKm = b.trip?.actualDistanceMeters
                ? Math.round((b.trip.actualDistanceMeters / 1000) * 10) / 10
                : (b.estimatedDistanceMeters ? Math.round((b.estimatedDistanceMeters / 1000) * 10) / 10 : null);

              const durationMins = b.trip?.actualDurationSeconds
                ? Math.round(b.trip.actualDurationSeconds / 60)
                : (b.estimatedDurationSeconds ? Math.round(b.estimatedDurationSeconds / 60) : null);

              return {
                id: b.id,
                reference: b.bookingReference,
                type: 'RIDE',
                title: `${pickupShort} → ${destShort}`,
                subtitle: `${vehicleCat} • Driver: ${driverName}`,
                imageUrl: null,
                createdAt: b.createdAt.toISOString(),
                scheduledAt: (b.startedAt || b.createdAt).toISOString(),
                status: b.bookingStatus,
                normalizedStatus: normalizeBookingStatus('RIDE', b.bookingStatus),
                requestStatus: b.bookingStatus,
                tripStatus: b.trip?.tripStatus || null,
                paymentStatus: (b.payment?.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
                currency: b.currency || 'ETB',
                totalAmount: fare,
                summaryDetails: {
                  pickupLocation: b.pickupLocation,
                  destinationLocation: b.destinationLocation,
                  driverName: b.driver?.fullName,
                  driverPhone: b.driver?.phoneNumber,
                  driverRating: b.driver?.rating ? Number(b.driver.rating) : null,
                  vehicleModel: b.vehicle?.vehicleModel,
                  plateNumber: b.vehicle?.plateNumber,
                  vehicleType: b.vehicle?.vehicleType,
                  distanceKm,
                  durationMins,
                  requestStatus: b.bookingStatus,
                  tripStatus: b.trip?.tripStatus || null,
                  paymentStatus: b.payment?.paymentStatus || 'PENDING',
                },
              };
            });
          } catch (rideErr: any) {
            logger.warn({ err: rideErr.message, passengerId }, '[BookingHistory] Error fetching rides from DB');
            return [];
          }
        })()
      );
    }

    // 2. Fetch Hotel Reservations
    if (fetchHotels) {
      promises.push(
        (async () => {
          if (hotelStatusList && hotelStatusList.length === 0) return [];
          try {
            const rows = await prisma.hotelBooking.findMany({
              where: {
                passengerId,
                ...(hotelStatusList ? { bookingStatus: { in: hotelStatusList as any } } : {}),
                ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as any } : {}),
                ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
              },
              include: {
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    address: true,
                    starRating: true,
                    images: {
                      where: { isCover: true },
                      take: 1,
                      select: { imageUrl: true },
                    },
                  },
                },
                bookingRooms: {
                  include: {
                    roomType: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                transferBooking: true,
                payment: {
                  select: {
                    id: true,
                    amount: true,
                    currency: true,
                    paymentMethod: true,
                    paymentStatus: true,
                    transactionReference: true,
                    paidAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: sortAscending ? 'asc' : 'desc',
              },
            });

            return rows.map((h): UnifiedBookingItem => {
              const checkIn = new Date(h.checkInDate);
              const checkOut = new Date(h.checkOutDate);
              const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
              const primaryRoom = h.bookingRooms?.[0]?.roomType?.name || 'Room';
              const guestsLabel = `${h.adults} Adults${h.children > 0 ? `, ${h.children} Children` : ''}`;
              const transferBadge = h.transferBooking ? ' • GDQ Airport Transfer' : '';

              return {
                id: h.id,
                reference: h.bookingReference,
                type: 'HOTEL',
                title: h.hotel?.name || 'Hotel Reservation',
                subtitle: `${primaryRoom} • ${nights} Nights (${guestsLabel})${transferBadge}`,
                imageUrl: h.hotel?.images?.[0]?.imageUrl || null,
                createdAt: h.createdAt.toISOString(),
                scheduledAt: h.checkInDate.toISOString(),
                status: h.bookingStatus,
                normalizedStatus: normalizeBookingStatus('HOTEL', h.bookingStatus),
                requestStatus: h.bookingStatus,
                tripStatus: null,
                paymentStatus: (h.payment?.paymentStatus || h.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
                currency: h.currency || 'ETB',
                totalAmount: Number(h.grandTotal) || 0,
                summaryDetails: {
                  hotelName: h.hotel?.name,
                  hotelCity: h.hotel?.city,
                  hotelAddress: h.hotel?.address,
                  roomTypeName: primaryRoom,
                  checkInDate: h.checkInDate.toISOString(),
                  checkOutDate: h.checkOutDate.toISOString(),
                  nightsCount: nights,
                  adults: h.adults,
                  children: h.children,
                  numberOfRooms: h.numberOfRooms,
                  hasAirportTransfer: Boolean(h.transferBooking),
                  requestStatus: h.bookingStatus,
                  tripStatus: null,
                  paymentStatus: h.payment?.paymentStatus || h.paymentStatus || 'PENDING',
                },
              };
            });
          } catch (hotelErr: any) {
            logger.warn({ err: hotelErr.message, passengerId }, '[BookingHistory] Error fetching hotels from DB');
            return [];
          }
        })()
      );
    }

    // 3. Fetch Lounge Reservations
    if (fetchLounges) {
      promises.push(
        (async () => {
          if (loungeStatusList && loungeStatusList.length === 0) return [];
          try {
            const rows = await prisma.loungeReservation.findMany({
              where: {
                passengerId,
                ...(loungeStatusList ? { status: { in: loungeStatusList as any } } : {}),
                ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
              },
              include: {
                lounge: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    address: true,
                    contactPhone: true,
                    images: {
                      where: { isCover: true },
                      take: 1,
                      select: { imageUrl: true },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: sortAscending ? 'asc' : 'desc',
              },
            });

            return rows.map((l): UnifiedBookingItem => {
              const coverImage = l.lounge?.images?.[0]?.imageUrl || null;
              const title = l.lounge?.name || 'Lounge Reservation';
              const subtitle = `${l.lounge?.city || 'Gondar'} • ${l.guestsCount} Guest${l.guestsCount > 1 ? 's' : ''} • ${l.reservationTime}`;

              return {
                id: l.id,
                reference: l.reservationReference,
                type: 'LOUNGE',
                title,
                subtitle,
                imageUrl: coverImage,
                createdAt: l.createdAt.toISOString(),
                scheduledAt: l.reservationDate.toISOString(),
                status: l.status,
                normalizedStatus: normalizeBookingStatus('LOUNGE', l.status),
                requestStatus: l.status,
                tripStatus: null,
                paymentStatus: 'SUCCESS',
                currency: 'ETB',
                totalAmount: 0,
                summaryDetails: {
                  loungeName: l.lounge?.name,
                  loungeCity: l.lounge?.city,
                  loungeAddress: l.lounge?.address,
                  reservationTime: l.reservationTime,
                  guestsCount: l.guestsCount,
                  requestStatus: l.status,
                  tripStatus: null,
                  paymentStatus: 'SUCCESS',
                },
              };
            });
          } catch (loungeErr: any) {
            logger.warn({ err: loungeErr.message, passengerId }, '[BookingHistory] Error fetching lounges from DB');
            return [];
          }
        })()
      );
    }

    // 4. Fetch Heritage Tours
    if (fetchHeritage) {
      promises.push(
        (async () => {
          if (heritageStatusList && heritageStatusList.length === 0) return [];
          try {
            const rows = await prisma.heritageTourBooking.findMany({
              where: {
                passengerId,
                ...(heritageStatusList ? { bookingStatus: { in: heritageStatusList as any } } : {}),
                ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as any } : {}),
                ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
              },
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    estimatedDurationMinutes: true,
                  },
                },
                vehicleOption: {
                  select: {
                    id: true,
                    displayName: true,
                    vehicleType: true,
                    seatingCapacity: true,
                  },
                },
                assignedDriver: {
                  select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    profileImage: true,
                  },
                },
                assignedGuide: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    profileImageUrl: true,
                  },
                },
                bookingSites: {
                  select: {
                    siteNameSnapshot: true,
                    visitOrder: true,
                    site: {
                      select: {
                        coverImageUrl: true,
                      },
                    },
                  },
                  orderBy: {
                    visitOrder: 'asc',
                  },
                },
                priceItems: true,
                guideRequests: true,
                payment: {
                  select: {
                    id: true,
                    amount: true,
                    currency: true,
                    paymentMethod: true,
                    paymentStatus: true,
                    transactionReference: true,
                    paidAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: sortAscending ? 'asc' : 'desc',
              },
            });

            return rows.map((t): UnifiedBookingItem => {
              const siteNames = (t.bookingSites || []).map((s) => s.siteNameSnapshot);
              const title = t.package?.name || (siteNames.length > 0 ? siteNames.slice(0, 2).join(' + ') : 'Heritage Tour');
              const vehicleLabel = t.vehicleOption?.displayName || 'Dedicated Vehicle';
              const stopsCount = siteNames.length;
              const subtitle = `${vehicleLabel} • ${stopsCount} Stops • ${t.preferredStartTime}`;
              const coverImage = t.bookingSites?.[0]?.site?.coverImageUrl || null;

              return {
                id: t.id,
                reference: t.bookingReference,
                type: 'HERITAGE',
                title,
                subtitle,
                imageUrl: coverImage,
                createdAt: t.createdAt.toISOString(),
                scheduledAt: t.scheduledDate.toISOString(),
                status: t.bookingStatus,
                normalizedStatus: normalizeBookingStatus('HERITAGE', t.bookingStatus),
                requestStatus: t.bookingStatus,
                tripStatus: null,
                paymentStatus: (t.payment?.paymentStatus || t.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
                currency: t.currency || 'ETB',
                totalAmount: Number(t.totalAmount) || 0,
                summaryDetails: {
                  packageName: t.package?.name,
                  vehicleOptionName: t.vehicleOption?.displayName,
                  assignedDriverName: t.assignedDriver?.fullName,
                  assignedGuideName: t.assignedGuide?.fullName,
                  guideRequested: Boolean(t.assignedGuideId || t.guideRequests?.length > 0),
                  scheduledDate: t.scheduledDate.toISOString(),
                  preferredStartTime: t.preferredStartTime,
                  siteNames,
                  stopsCount,
                  requestStatus: t.bookingStatus,
                  tripStatus: null,
                  paymentStatus: t.payment?.paymentStatus || t.paymentStatus || 'PENDING',
                },
              };
            });
          } catch (herErr: any) {
            logger.warn({ err: herErr.message, passengerId }, '[BookingHistory] Error fetching heritage tours from DB');
            return [];
          }
        })()
      );
    }

    const results = await Promise.all(promises);
    const merged = results.flat();

    // Global Chronological Sort
    merged.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    });

    const totalCount = merged.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const paginatedItems = merged.slice(startIndex, startIndex + limit);
    const hasMore = page < totalPages;

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
      },
      summary,
    };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message, passengerId },
          '[BookingHistory] Database unreachable. Checking environment fallback policy.'
        );
        if (process.env.NODE_ENV === 'production') {
          throw new AppError(
            'Booking history service temporarily unavailable.',
            503,
            'SERVICE_UNAVAILABLE'
          );
        }
        return this.getFallbackUnifiedBookings(passengerId, query);
      }
      throw err;
    }
  }

  /**
   * Resilient fallback dataset serving cached heritage tour bookings and mock dataset
   * when database or SSH tunnel is disconnected.
   */
  private async getFallbackUnifiedBookings(
    passengerId: string,
    query: PassengerBookingHistoryQuery = {}
  ): Promise<UnifiedBookingHistoryResult> {
    const requestedType = (query.type || 'ALL').toUpperCase();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const sort = (query.sort || 'NEWEST').toUpperCase() === 'OLDEST' ? 'OLDEST' : 'NEWEST';
    const sortAscending = sort === 'OLDEST';

    const fallbackItems: UnifiedBookingItem[] = [];

    // Query heritage offline cache if applicable
    const fetchHeritage = requestedType === 'ALL' || requestedType === 'HERITAGE';
    if (fetchHeritage) {
      try {
        const tourBookings = await heritageTourBookingService.getPassengerBookings(passengerId);
        for (const t of tourBookings) {
          const siteNames = (t.bookingSites || []).map((s: any) => s.siteNameSnapshot || s.name || 'Heritage Site');
          const title = t.package?.name || (siteNames.length > 0 ? siteNames.slice(0, 2).join(' + ') : 'Heritage Tour');
          const vehicleLabel = t.vehicleOption?.displayName || 'Dedicated Vehicle';
          const stopsCount = siteNames.length;
          const subtitle = `${vehicleLabel} • ${stopsCount} Stops • ${t.preferredStartTime || '09:00'}`;

          fallbackItems.push({
            id: t.id,
            reference: t.bookingReference,
            type: 'HERITAGE',
            title,
            subtitle,
            imageUrl: null,
            createdAt: typeof t.createdAt === 'string' ? t.createdAt : (t.createdAt?.toISOString?.() || new Date().toISOString()),
            scheduledAt: typeof t.scheduledDate === 'string' ? t.scheduledDate : (t.scheduledDate?.toISOString?.() || new Date().toISOString()),
            status: t.bookingStatus || 'CONFIRMED',
            normalizedStatus: normalizeBookingStatus('HERITAGE', t.bookingStatus),
            paymentStatus: (t.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
            currency: t.currency || 'ETB',
            totalAmount: Number(t.totalAmount) || 0,
            summaryDetails: {
              packageName: t.package?.name,
              vehicleOptionName: vehicleLabel,
              assignedDriverName: t.assignedDriver?.fullName || null,
              assignedGuideName: t.assignedGuide?.fullName || null,
              guideRequested: Boolean(t.guideRequested || t.assignedGuideId),
              scheduledDate: typeof t.scheduledDate === 'string' ? t.scheduledDate : (t.scheduledDate?.toISOString?.() || new Date().toISOString()),
              preferredStartTime: t.preferredStartTime,
              siteNames,
              stopsCount,
            },
          });
        }
      } catch {
        // Fallback silently if heritage cache unavailable
      }
    }

    // Query hotel offline cache if applicable
    const fetchHotels = requestedType === 'ALL' || requestedType === 'HOTEL';
    if (fetchHotels) {
      try {
        const hotelBookings = Array.from(fallbackHotelBookingsCache.values()).filter(
          (b) => b.passengerId === passengerId
        );
        for (const h of hotelBookings) {
          const checkIn = new Date(h.checkInDate);
          const checkOut = new Date(h.checkOutDate);
          const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
          const primaryRoom = h.bookingRooms?.[0]?.roomType?.name || 'Standard Room';
          const guestsLabel = `${h.adults} Adults${h.children > 0 ? `, ${h.children} Children` : ''}`;
          const transferBadge = h.transferBooking ? ' • GDQ Airport Transfer' : '';

          fallbackItems.push({
            id: h.id,
            reference: h.bookingReference,
            type: 'HOTEL',
            title: h.hotel?.name || 'Hotel Reservation',
            subtitle: `${primaryRoom} • ${nights} Nights (${guestsLabel})${transferBadge}`,
            imageUrl: h.hotel?.images?.[0]?.imageUrl || null,
            createdAt: typeof h.createdAt === 'string' ? h.createdAt : (h.createdAt?.toISOString?.() || new Date().toISOString()),
            scheduledAt: typeof h.checkInDate === 'string' ? h.checkInDate : (h.checkInDate?.toISOString?.() || new Date().toISOString()),
            status: h.bookingStatus || 'CONFIRMED',
            normalizedStatus: normalizeBookingStatus('HOTEL', h.bookingStatus),
            paymentStatus: (h.paymentStatus || 'PENDING') as UnifiedPaymentStatus,
            currency: h.currency || 'ETB',
            totalAmount: Number(h.grandTotal) || 0,
            summaryDetails: {
              hotelName: h.hotel?.name,
              hotelCity: h.hotel?.city,
              hotelAddress: h.hotel?.address,
              roomTypeName: primaryRoom,
              checkInDate: typeof h.checkInDate === 'string' ? h.checkInDate : (h.checkInDate?.toISOString?.() || new Date().toISOString()),
              checkOutDate: typeof h.checkOutDate === 'string' ? h.checkOutDate : (h.checkOutDate?.toISOString?.() || new Date().toISOString()),
              nightsCount: nights,
              adults: h.adults,
              children: h.children,
              numberOfRooms: h.numberOfRooms,
              hasAirportTransfer: Boolean(h.transferBooking),
            },
          });
        }
      } catch {
        // Fallback silently if hotel cache unavailable
      }
    }

    // Apply status filter if provided
    let filtered = fallbackItems;
    if (query.status) {
      const targetStatus = query.status.toUpperCase();
      filtered = filtered.filter(
        (item) => item.status.toUpperCase() === targetStatus || item.normalizedStatus === targetStatus
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    });

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);
    const hasMore = page < totalPages;

    const summary: PassengerBookingHistorySummary = {
      totalBookings: fallbackItems.length,
      totalRides: fallbackItems.filter((i) => i.type === 'RIDE').length,
      totalHotels: fallbackItems.filter((i) => i.type === 'HOTEL').length,
      totalLounges: fallbackItems.filter((i) => i.type === 'LOUNGE').length,
      totalHeritageTours: fallbackItems.filter((i) => i.type === 'HERITAGE').length,
      completed: fallbackItems.filter((i) => i.normalizedStatus === 'COMPLETED').length,
      pending: fallbackItems.filter((i) => i.normalizedStatus === 'PENDING').length,
    };

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
      },
      summary,
    };
  }

  /**
   * Retrieves single deep booking details with strict passenger ownership verification.
   * Prevents IDOR vulnerabilities.
   */
  async getBookingDetail(
    passengerId: string,
    rawType: string,
    idOrRef: string
  ): Promise<{ type: BookingType; booking: any } | null> {
    const typeUpper = (rawType || '').toUpperCase() as BookingType;
    if (!['RIDE', 'HOTEL', 'LOUNGE', 'HERITAGE'].includes(typeUpper)) {
      throw new Error(`Invalid booking type: ${rawType}. Must be RIDE, HOTEL, LOUNGE, or HERITAGE.`);
    }

    try {
      if (typeUpper === 'RIDE') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
        const booking = await prisma.booking.findFirst({
          where: isUuid
            ? { id: idOrRef }
            : { bookingReference: idOrRef },
          include: {
            passenger: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            driver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                profileImage: true,
                rating: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                vehicleModel: true,
                plateNumber: true,
                vehicleType: true,
                vehicleColor: true,
              },
            },
            subcity: true,
            trip: true,
            payment: true,
            destinationRevisions: {
              orderBy: { requestedAt: 'asc' },
            },
            fareSnapshot: true,
          },
        });

        if (!booking) return null;
        if (booking.passengerId !== passengerId) {
          const error: any = new Error('Access denied: Booking belongs to another passenger');
          error.code = 'FORBIDDEN';
          throw error;
        }

        return { type: 'RIDE', booking };
      }

      if (typeUpper === 'HOTEL') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
        const booking = await prisma.hotelBooking.findFirst({
          where: isUuid
            ? { id: idOrRef }
            : { bookingReference: idOrRef },
          include: {
            passenger: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            hotel: {
              include: {
                images: true,
              },
            },
            bookingRooms: {
              include: {
                roomType: true,
              },
            },
            transferBooking: true,
            payment: true,
          },
        });

        if (!booking) return null;
        if (booking.passengerId !== passengerId) {
          const error: any = new Error('Access denied: Hotel booking belongs to another passenger');
          error.code = 'FORBIDDEN';
          throw error;
        }

        return { type: 'HOTEL', booking };
      }

      if (typeUpper === 'LOUNGE') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
        const booking = await prisma.loungeReservation.findFirst({
          where: isUuid
            ? { id: idOrRef }
            : { reservationReference: idOrRef },
          include: {
            passenger: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            lounge: {
              include: {
                images: true,
              },
            },
          },
        });

        if (!booking) return null;
        if (booking.passengerId !== passengerId) {
          const error: any = new Error('Access denied: Lounge reservation belongs to another passenger');
          error.code = 'FORBIDDEN';
          throw error;
        }

        return { type: 'LOUNGE', booking };
      }

      if (typeUpper === 'HERITAGE') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
        const booking = await prisma.heritageTourBooking.findFirst({
          where: isUuid
            ? { id: idOrRef }
            : { bookingReference: idOrRef },
          include: {
            passenger: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            package: {
              include: {
                packageSites: {
                  include: {
                    site: true,
                  },
                  orderBy: {
                    visitOrder: 'asc',
                  },
                },
              },
            },
            vehicleOption: true,
            assignedVehicle: true,
            assignedDriver: true,
            assignedGuide: true,
            bookingSites: {
              include: {
                site: true,
              },
              orderBy: {
                visitOrder: 'asc',
              },
            },
            priceItems: true,
            guideRequests: true,
            payment: true,
          },
        });

        if (!booking) return null;
        if (booking.passengerId !== passengerId) {
          const error: any = new Error('Access denied: Heritage tour booking belongs to another passenger');
          error.code = 'FORBIDDEN';
          throw error;
        }

        return { type: 'HERITAGE', booking };
      }
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') throw err;
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message, passengerId, idOrRef },
          '[BookingHistory] Database unreachable during getBookingDetail, checking offline fallback.'
        );
        if (typeUpper === 'HERITAGE') {
          try {
            const fallbackTour = await heritageTourBookingService.getBookingByReference(passengerId, idOrRef);
            if (fallbackTour) return { type: 'HERITAGE', booking: fallbackTour };
          } catch (inner: any) {
            if (inner.message.includes('Access denied')) {
              const err: any = new Error(inner.message);
              err.code = 'FORBIDDEN';
              throw err;
            }
          }
        }
        if (typeUpper === 'HOTEL') {
          const fallback = Array.from(fallbackHotelBookingsCache.values()).find(
            (b) => (b.id === idOrRef || b.bookingReference === idOrRef) && b.passengerId === passengerId
          );
          if (fallback) return { type: 'HOTEL', booking: fallback };
        }
        return null;
      }
      throw err;
    }

    return null;
  }

  /**
   * Retrieves normalized recent activities for the authenticated passenger's home dashboard.
   * Strictly scopes data by passenger ID.
   */
  async getRecentActivities(
    passengerId: string,
    limit: number = 5
  ): Promise<PassengerRecentActivitiesResult> {
    const history = await this.getUnifiedBookings(passengerId, {
      limit,
      page: 1,
      sort: 'NEWEST',
    });

    const activities: PassengerRecentActivityItem[] = history.items.map((item) => {
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
        createdAt: item.createdAt,
        iconType,
      };
    });

    return {
      activities,
      total: history.pagination.totalCount,
    };
  }
}

export const passengerBookingHistoryService = new PassengerBookingHistoryService();
