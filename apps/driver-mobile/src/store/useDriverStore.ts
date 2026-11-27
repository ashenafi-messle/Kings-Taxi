import { create } from 'zustand';
import {
  ActiveTripSession,
  AuthSession,
  DriverLanguage,
  DriverProfile,
  RideCategory,
  RideItem,
  RideStatus,
} from '../types/driver.types';
import { calculateDemoFare } from '../services/mockDriverService';
import { logoutDriver, restoreDriverSession } from '../services/driverAuthService';
import { registerSessionExpiredHandler } from '../services/apiClient';
import { BackendRideRequestDto, driverRideService } from '../services/driverRideService';
import { driverSocketClient } from '../services/driverSocketService';

function mapBackendStatus(status: string): RideStatus {
  switch (status) {
    case 'REQUESTED':
      return 'PENDING';
    case 'DRIVER_ASSIGNED':
    case 'DRIVER_ARRIVING':
    case 'DRIVER_ARRIVED':
      return 'CONFIRMED';
    case 'TRIP_STARTED':
      return 'IN_PROGRESS';
    case 'TRIP_COMPLETED':
      return 'COMPLETED';
    case 'REJECTED':
      return 'REJECTED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'CANCELLED':
    default:
      return 'CANCELLED';
  }
}

function mapDtoToRideItem(dto: BackendRideRequestDto): RideItem {
  const created = new Date(dto.createdAt);
  const dateStr = created.toLocaleDateString();
  const timeStr = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: dto.id,
    referenceCode: dto.bookingReference,
    passengerName: dto.passengerName || 'Passenger',
    passengerPhone: dto.passengerContactPhone || 'Not provided',
    passengerAvatar:
      dto.passengerAvatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(dto.passengerName || 'Passenger')}&background=E5E7EB&color=111111&size=96`,
    pickupLocation: dto.pickupLocation,
    destination: dto.destinationLocation || 'On-Demand Ride',
    requestedService: dto.subcityName ? `On-Demand (${dto.subcityName})` : 'On-Demand Ride',
    subcityName: dto.subcityName,
    expiresAt: dto.expiresAt,
    requestDate: dateStr,
    requestTime: timeStr,
    estimatedDistanceKm: 0,
    estimatedDurationMin: 0,
    estimatedPriceETB: 0,
    status: mapBackendStatus(dto.status),
    notes: dto.additionalInstructions || undefined,
    completedAt: dto.acceptedAt || dto.cancelledAt || dto.rejectedAt || undefined,
  };
}

function upsertRideList(existing: RideItem[], incoming: RideItem): RideItem[] {
  const idx = existing.findIndex((r) => r.id === incoming.id);
  if (idx === -1) {
    return [incoming, ...existing];
  }
  const next = [...existing];
  next[idx] = incoming;
  return next;
}

interface DriverStoreState {
  auth: AuthSession;
  isRestoringSession: boolean;
  profile: DriverProfile | null;
  isOnline: boolean;
  isAvailabilityLoading: boolean;
  availabilityError: string | null;
  isSocketConnected: boolean;
  isSyncingRides: boolean;
  ridesError: string | null;
  selectedRideTab: RideCategory;
  rides: RideItem[];
  activeTrip: ActiveTripSession | null;
  language: DriverLanguage;
  pushAlertsEnabled: boolean;
  soundAlertsEnabled: boolean;

  restoreSession: () => Promise<void>;
  loginSuccess: (profile: DriverProfile, identifierUsed: string) => void;
  logout: () => Promise<void>;
  toggleAvailability: () => Promise<void>;
  syncDriverState: () => Promise<void>;
  connectRealtime: () => Promise<void>;
  disconnectRealtime: () => void;
  setSelectedRideTab: (tab: RideCategory) => void;
  acceptRideRequest: (rideId: string) => Promise<{ ok: boolean; error?: string }>;
  rejectRideRequest: (rideId: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
  startTrip: (rideId: string) => { ok: boolean; error?: string };
  tickActiveTrip: () => void;
  endActiveTrip: () => { ok: boolean; rideId?: string; error?: string };
  submitRidePayment: (rideId: string, institutionName: string, transactionReference: string) => void;
  completeCheckout: (rideId: string) => void;
  setLanguage: (lang: DriverLanguage) => void;
  togglePushAlerts: () => void;
  toggleSoundAlerts: () => void;
}

export const useDriverStore = create<DriverStoreState>((set, get) => ({
  auth: {
    isAuthenticated: false,
    driverId: null,
    identifierUsed: null,
    authenticatedAt: null,
  },
  isRestoringSession: true,
  profile: null,
  isOnline: false,
  isAvailabilityLoading: false,
  availabilityError: null,
  isSocketConnected: false,
  isSyncingRides: false,
  ridesError: null,
  selectedRideTab: 'PENDING',
  rides: [],
  activeTrip: null,
  language: 'en',
  pushAlertsEnabled: true,
  soundAlertsEnabled: true,

  restoreSession: async () => {
    registerSessionExpiredHandler(() => {
      driverSocketClient.disconnect();
      set({
        auth: {
          isAuthenticated: false,
          driverId: null,
          identifierUsed: null,
          authenticatedAt: null,
        },
        profile: null,
        isOnline: false,
        isSocketConnected: false,
        rides: [],
        activeTrip: null,
      });
    });

    set({ isRestoringSession: true });
    try {
      const restored = await restoreDriverSession();
      if (restored) {
        set({
          auth: {
            isAuthenticated: true,
            driverId: restored.id,
            identifierUsed: restored.email || restored.phone,
            authenticatedAt: new Date().toISOString(),
          },
          profile: restored,
          isRestoringSession: false,
        });
        return;
      }
    } catch {
      // Fallback to unauthenticated
    }
    set({
      auth: {
        isAuthenticated: false,
        driverId: null,
        identifierUsed: null,
        authenticatedAt: null,
      },
      profile: null,
      isRestoringSession: false,
    });
  },

  loginSuccess: (profile, identifierUsed) =>
    set({
      auth: {
        isAuthenticated: true,
        driverId: profile.id,
        identifierUsed,
        authenticatedAt: new Date().toISOString(),
      },
      profile,
      isRestoringSession: false,
      availabilityError: null,
      ridesError: null,
    }),

  logout: async () => {
    driverSocketClient.disconnect();
    await logoutDriver();
    set({
      auth: {
        isAuthenticated: false,
        driverId: null,
        identifierUsed: null,
        authenticatedAt: null,
      },
      profile: null,
      isOnline: false,
      isSocketConnected: false,
      rides: [],
      activeTrip: null,
    });
  },

  toggleAvailability: async () => {
    const state = get();
    if (state.isAvailabilityLoading) return;
    const targetOnline = !state.isOnline;

    set({ isAvailabilityLoading: true, availabilityError: null });
    try {
      const res = targetOnline
        ? await driverRideService.goOnline()
        : await driverRideService.goOffline();
      const onlineNow =
        res.availabilityStatus === 'AVAILABLE' || res.availabilityStatus === 'ONLINE';
      set({ isOnline: onlineNow, isAvailabilityLoading: false });
    } catch (err: any) {
      set({
        isAvailabilityLoading: false,
        availabilityError: err?.message || 'Unable to update driver availability.',
      });
    }
  },

  syncDriverState: async () => {
    if (!get().auth.isAuthenticated) return;
    set({ isSyncingRides: true, ridesError: null });
    try {
      const [avail, pending, current, history] = await Promise.all([
        driverRideService.getMyAvailability(),
        driverRideService.getPendingRequests(),
        driverRideService.getCurrentRequest(),
        driverRideService.getRequestHistory(1, 20),
      ]);

      const mergedMap = new Map<string, RideItem>();
      for (const dto of [...pending, ...(current ? [current] : []), ...(history.items || [])]) {
        mergedMap.set(dto.id, mapDtoToRideItem(dto));
      }

      set({
        isOnline: avail.isOnline,
        rides: Array.from(mergedMap.values()),
        isSyncingRides: false,
      });
    } catch (err: any) {
      set({
        isSyncingRides: false,
        ridesError: err?.message || 'Unable to synchronize ride requests.',
      });
    }
  },

  connectRealtime: async () => {
    await driverSocketClient.connect({
      onConnectionChange: (connected) => {
        set({ isSocketConnected: connected });
      },
      onReconnectedSync: (payload) => {
        const online =
          payload.availabilityStatus === 'AVAILABLE' ||
          payload.availabilityStatus === 'ONLINE';
        set({ isOnline: online });
        void get().syncDriverState();
      },
      onAvailabilityChanged: (payload) => {
        const currentDriverId = get().auth.driverId;
        if (currentDriverId && payload.driverId === currentDriverId) {
          set({
            isOnline:
              payload.availabilityStatus === 'AVAILABLE' ||
              payload.availabilityStatus === 'ONLINE',
          });
        }
      },
      onNewRequest: (dto) => {
        const mapped = mapDtoToRideItem(dto);
        set((s) => ({
          rides: upsertRideList(s.rides, mapped),
          selectedRideTab: 'PENDING',
        }));
      },
      onRequestAccepted: (dto) => {
        const mapped = mapDtoToRideItem(dto);
        set((s) => ({ rides: upsertRideList(s.rides, mapped) }));
      },
      onRequestRejected: (dto) => {
        const mapped = mapDtoToRideItem(dto);
        set((s) => ({ rides: upsertRideList(s.rides, mapped) }));
      },
      onRequestCancelled: (dto) => {
        const mapped = mapDtoToRideItem(dto);
        set((s) => ({ rides: upsertRideList(s.rides, mapped) }));
      },
      onRequestExpired: (payload) => {
        set((s) => ({
          rides: s.rides.map((r) =>
            r.id === payload.id ? { ...r, status: 'EXPIRED' } : r
          ),
        }));
      },
    });
  },

  disconnectRealtime: () => {
    driverSocketClient.disconnect();
    set({ isSocketConnected: false });
  },

  setSelectedRideTab: (tab) => set({ selectedRideTab: tab }),

  acceptRideRequest: async (rideId) => {
    try {
      const updated = await driverRideService.acceptRequest(rideId);
      const mapped = mapDtoToRideItem(updated);
      set((s) => ({
        rides: upsertRideList(s.rides, mapped),
        isOnline: false, // Driver is BUSY once accepted
        selectedRideTab: 'CONFIRMED',
      }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Unable to accept ride request.' };
    }
  },

  rejectRideRequest: async (rideId, reason) => {
    try {
      const updated = await driverRideService.rejectRequest(rideId, reason);
      const mapped = mapDtoToRideItem(updated);
      set((s) => ({
        rides: upsertRideList(s.rides, mapped),
      }));
      void get().syncDriverState();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Unable to reject ride request.' };
    }
  },

  startTrip: (rideId) => {
    const state = get();
    if (state.activeTrip) {
      return {
        ok: false,
        error: 'An active trip is already in progress. End the current trip before starting another.',
      };
    }

    const target = state.rides.find((r) => r.id === rideId);
    if (!target) return { ok: false, error: 'Ride not found.' };
    if (target.status !== 'PENDING' && target.status !== 'CONFIRMED') {
      return { ok: false, error: 'Only pending or confirmed rides can be started.' };
    }

    set({
      rides: state.rides.map((r) =>
        r.id === rideId ? { ...r, status: 'IN_PROGRESS' } : r
      ),
      activeTrip: {
        rideId,
        startedAtMs: Date.now(),
        elapsedSeconds: 0,
        simulatedDistanceKm: 0.2,
        currentProgressPct: 8,
        isSimulating: true,
      },
    });
    return { ok: true };
  },

  tickActiveTrip: () =>
    set((state) => {
      if (!state.activeTrip || !state.activeTrip.isSimulating) return state;
      const ride = state.rides.find((r) => r.id === state.activeTrip?.rideId);
      const maxDist = ride && ride.estimatedDistanceKm > 0 ? ride.estimatedDistanceKm : 12;
      const nextSeconds = state.activeTrip.elapsedSeconds + 1;
      const nextDist = Math.min(
        maxDist,
        Number((state.activeTrip.simulatedDistanceKm + 0.08).toFixed(2))
      );
      const nextPct = Math.min(96, Math.max(8, Math.round((nextDist / Math.max(1, maxDist)) * 100)));

      return {
        activeTrip: {
          ...state.activeTrip,
          elapsedSeconds: nextSeconds,
          simulatedDistanceKm: nextDist,
          currentProgressPct: nextPct,
        },
      };
    }),

  endActiveTrip: () => {
    const state = get();
    if (!state.activeTrip) return { ok: false, error: 'No active trip in progress.' };
    const ride = state.rides.find((r) => r.id === state.activeTrip?.rideId);
    if (!ride) return { ok: false, error: 'Active ride record not found.' };

    const actualDist = Math.max(1.2, Number(state.activeTrip.simulatedDistanceKm.toFixed(1)));
    const actualMin = Math.max(4, Math.round(state.activeTrip.elapsedSeconds / 60));
    const fare = calculateDemoFare(actualDist, actualMin);

    set({
      activeTrip: null,
      rides: state.rides.map((r) =>
        r.id === ride.id
          ? {
              ...r,
              status: 'AWAITING_PAYMENT',
              actualDistanceKm: fare.distanceKm,
              actualDurationMin: fare.durationMin,
              finalFareETB: fare.totalFareETB,
              paymentVerificationStatus: 'UNSUBMITTED',
            }
          : r
      ),
    });

    return { ok: true, rideId: ride.id };
  },

  submitRidePayment: (rideId, institutionName, transactionReference) =>
    set((state) => ({
      rides: state.rides.map((r) =>
        r.id === rideId
          ? {
              ...r,
              status: 'PAYMENT_PENDING_VERIFICATION',
              paymentInstitution: institutionName,
              paymentReference: transactionReference.trim(),
              paymentVerificationStatus: 'PENDING_VERIFICATION',
            }
          : r
      ),
    })),

  completeCheckout: (rideId) =>
    set((state) => ({
      selectedRideTab: 'HISTORY',
      rides: state.rides.map((r) =>
        r.id === rideId
          ? {
              ...r,
              status: 'COMPLETED',
              completedAt: 'Just now',
            }
          : r
      ),
    })),

  setLanguage: (language) => set({ language }),
  togglePushAlerts: () => set((s) => ({ pushAlertsEnabled: !s.pushAlertsEnabled })),
  toggleSoundAlerts: () => set((s) => ({ soundAlertsEnabled: !s.soundAlertsEnabled })),
}));
