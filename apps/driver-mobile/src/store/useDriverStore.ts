import { create } from 'zustand';
import { INITIAL_MOCK_RIDES, MOCK_PROVISIONED_DRIVERS } from '../data/mockDriverData';
import {
  ActiveTripSession,
  AuthSession,
  DriverLanguage,
  DriverProfile,
  RideCategory,
  RideItem,
} from '../types/driver.types';
import { calculateDemoFare } from '../services/mockDriverService';

interface DriverStoreState {
  auth: AuthSession;
  profile: DriverProfile | null;
  isOnline: boolean;
  selectedRideTab: RideCategory;
  rides: RideItem[];
  activeTrip: ActiveTripSession | null;
  language: DriverLanguage;
  pushAlertsEnabled: boolean;
  soundAlertsEnabled: boolean;

  loginSuccess: (profile: DriverProfile, identifierUsed: string) => void;
  logout: () => void;
  toggleAvailability: () => void;
  setSelectedRideTab: (tab: RideCategory) => void;
  startTrip: (rideId: string) => { ok: boolean; error?: string };
  tickActiveTrip: () => void;
  endActiveTrip: () => { ok: boolean; rideId?: string; error?: string };
  submitRidePayment: (
    rideId: string,
    institutionName: string,
    transactionReference: string
  ) => void;
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
  profile: MOCK_PROVISIONED_DRIVERS[0].profile,
  isOnline: false,
  selectedRideTab: 'PENDING',
  rides: INITIAL_MOCK_RIDES,
  activeTrip: null,
  language: 'en',
  pushAlertsEnabled: true,
  soundAlertsEnabled: true,

  loginSuccess: (profile, identifierUsed) =>
    set({
      auth: {
        isAuthenticated: true,
        driverId: profile.id,
        identifierUsed,
        authenticatedAt: new Date().toISOString(),
      },
      profile,
    }),

  logout: () =>
    set({
      auth: {
        isAuthenticated: false,
        driverId: null,
        identifierUsed: null,
        authenticatedAt: null,
      },
      isOnline: false,
      activeTrip: null,
    }),

  toggleAvailability: () =>
    set((state) => ({
      isOnline: !state.isOnline,
    })),

  setSelectedRideTab: (tab) => set({ selectedRideTab: tab }),

  startTrip: (rideId) => {
    const state = get();
    if (state.activeTrip) {
      return {
        ok: false,
        error: 'An active trip is already in progress. End the current trip before starting another.',
      };
    }

    const target = state.rides.find((r) => r.id === rideId);
    if (!target) {
      return { ok: false, error: 'Ride not found.' };
    }
    if (target.status !== 'PENDING') {
      return {
        ok: false,
        error: 'Only pending ride requests can be started from this state.',
      };
    }

    set({
      isOnline: true,
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
      const maxDist = ride ? ride.estimatedDistanceKm : 12;
      const nextSeconds = state.activeTrip.elapsedSeconds + 1;
      // Smoothly advance simulated distance up to estimatedDistanceKm
      const nextDist = Math.min(
        maxDist,
        Number((state.activeTrip.simulatedDistanceKm + 0.08).toFixed(2))
      );
      const nextPct = Math.min(
        96,
        Math.max(8, Math.round((nextDist / Math.max(1, maxDist)) * 100))
      );

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
    if (!state.activeTrip) {
      return { ok: false, error: 'No active trip in progress.' };
    }
    const ride = state.rides.find((r) => r.id === state.activeTrip?.rideId);
    if (!ride) {
      return { ok: false, error: 'Active ride record not found.' };
    }

    const actualDist = Math.max(
      1.2,
      Number(
        Math.max(state.activeTrip.simulatedDistanceKm, ride.estimatedDistanceKm * 0.65).toFixed(1)
      )
    );
    const actualMin = Math.max(
      4,
      Math.round(Math.max(state.activeTrip.elapsedSeconds / 60, ride.estimatedDurationMin * 0.7))
    );
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
  togglePushAlerts: () =>
    set((state) => ({ pushAlertsEnabled: !state.pushAlertsEnabled })),
  toggleSoundAlerts: () =>
    set((state) => ({ soundAlertsEnabled: !state.soundAlertsEnabled })),
}));
