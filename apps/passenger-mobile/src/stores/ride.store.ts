import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AddressLocation,
  DriverInfo,
  RideBooking,
  RideStatus,
  SubcityInfo,
  PublicDriverInfo,
  TripFareBreakdown,
  TripTrackingSessionInfo,
  RideDestinationRevisionInfo,
  VehicleCategory,
  VehicleOption,
} from '../types';
import { mockDriver, mockVehicleOptions } from '../mocks';
import { RideService, GONDAR_LOCATIONS } from '../services/ride.service';
import { calculateDistanceKm, estimateTravelTimeMinutes } from '../utils/geo';
import { useAuthStore, registerLogoutCleanup } from './auth.store';

const RIDE_HISTORY_STORAGE_KEY = '@kings_taxi_ride_history';

interface RideState {
  currentRide: RideBooking | null;
  lastCompletedRide: RideBooking | null;
  pickupLocation: AddressLocation;
  destinationLocation: AddressLocation | null;
  selectedCategory: VehicleCategory;
  availableVehicles: VehicleOption[];
  isSearchingDriver: boolean;
  rideHistory: RideBooking[];

  // Real Subcity & Driver Discovery State
  subcities: SubcityInfo[];
  selectedSubcity: SubcityInfo | null;
  availableDrivers: PublicDriverInfo[];
  selectedDriver: PublicDriverInfo | null;
  approvedDriver: PublicDriverInfo | DriverInfo | null;
  passengerPhone: string;
  additionalInstructions: string;
  fareEstimate: TripFareBreakdown | null;

  // Active Journey Telematics, Dynamic Fare & Revision State
  activeTracking: TripTrackingSessionInfo | null;
  destinationRevision: RideDestinationRevisionInfo | null;
  finalFareBreakdown: TripFareBreakdown | null;
  journeyDistanceMeters: number;
  journeyDurationSeconds: number;
  isLoadingSubcities: boolean;
  isLoadingDrivers: boolean;
  isBookingRide: boolean;
  bookingError: string | null;

  // Actions
  setPickup: (location: AddressLocation) => void;
  setDestination: (location: AddressLocation | null) => void;
  selectCategory: (category: VehicleCategory) => void;
  fetchSubcities: () => Promise<void>;
  selectSubcity: (subcity: SubcityInfo) => void;
  fetchDrivers: (subcityId?: string) => Promise<void>;
  selectDriver: (driver: PublicDriverInfo | null) => void;
  setPassengerPhone: (phone: string) => void;
  setAdditionalInstructions: (instructions: string) => void;
  calculateFareEstimates: () => Promise<void>;
  requestRide: () => Promise<boolean>;

  // On-Demand Request-Based Workflow Actions
  requestOnDemandRide: () => Promise<boolean>;
  selectVehicleForApprovedRide: (category: VehicleCategory) => Promise<void>;
  onDriverApproved: (driver: PublicDriverInfo | DriverInfo) => void;
  onTripStarted: () => void;
  onTripCompleted: (fareData?: any) => void;
  simulateDriverApproval: () => void;
  simulateDriverArrival: () => void;
  simulateTripStart: () => void;
  simulateTripCompletion: () => void;

  syncRideState: (rideId?: string) => Promise<void>;
  applyRealtimeRideEvent: (payload: any, forcedStatus?: RideStatus) => void;
  requestDestinationChange: (
    newDestination: string,
    newCoords: { latitude: number; longitude: number }
  ) => Promise<boolean>;
  simulateNextRideStep: () => void;
  cancelRide: (reason: string) => Promise<void>;
  completePayment: (paymentMethod?: string, ref?: string) => void;
  resetRide: () => void;
  fetchRideHistory: () => Promise<void>;
}

export const useRideStore = create<RideState>((set, get) => ({
  pickupLocation: GONDAR_LOCATIONS[0], // Maraki Campus
  destinationLocation: GONDAR_LOCATIONS[1], // Fasil Ghebbi
  selectedCategory: 'comfort',
  availableVehicles: mockVehicleOptions,
  currentRide: null,
  lastCompletedRide: null,
  isSearchingDriver: false,
  subcities: [],
  selectedSubcity: null,
  availableDrivers: [],
  selectedDriver: null,
  approvedDriver: null,
  passengerPhone: '',
  additionalInstructions: '',
  fareEstimate: null,
  activeTracking: null,
  destinationRevision: null,
  finalFareBreakdown: null,
  journeyDistanceMeters: 0,
  journeyDurationSeconds: 0,
  isLoadingSubcities: false,
  isLoadingDrivers: false,
  isBookingRide: false,
  bookingError: null,
  rideHistory: [
    {
      id: 'ride_hist_1',
      status: 'TRIP_COMPLETED',
      pickup: GONDAR_LOCATIONS[0],
      destination: GONDAR_LOCATIONS[1],
      vehicleCategory: 'comfort',
      estimatedPrice: 180,
      finalPrice: 180,
      distanceKm: 4.8,
      estimatedDurationMins: 14,
      driver: mockDriver,
      createdAt: '2026-11-01T14:15:00Z',
      completedAt: '2026-11-01T14:32:00Z',
      paymentMethod: 'telebirr',
    },
    {
      id: 'ride_hist_2',
      status: 'TRIP_COMPLETED',
      pickup: GONDAR_LOCATIONS[2],
      destination: GONDAR_LOCATIONS[0],
      vehicleCategory: 'economy',
      estimatedPrice: 320,
      finalPrice: 320,
      distanceKm: 12.2,
      estimatedDurationMins: 22,
      driver: mockDriver,
      createdAt: '2026-10-28T10:00:00Z',
      completedAt: '2026-10-28T10:25:00Z',
      paymentMethod: 'cbe_birr',
    },
  ],

  setPickup: (location: AddressLocation) => {
    set({ pickupLocation: location });
    get().calculateFareEstimates();
  },

  setDestination: (location: AddressLocation | null) => {
    set({ destinationLocation: location });
    if (location) {
      get().calculateFareEstimates();
    }
  },

  selectCategory: (category: VehicleCategory) => {
    set({ selectedCategory: category });
  },

  setPassengerPhone: (phone: string) => {
    set({ passengerPhone: phone });
  },

  setAdditionalInstructions: (instructions: string) => {
    set({ additionalInstructions: instructions });
  },

  fetchSubcities: async () => {
    set({ isLoadingSubcities: true, bookingError: null });
    try {
      const res = await RideService.getSubcities();
      if (res.success && res.data && res.data.length > 0) {
        set({
          subcities: res.data,
          selectedSubcity: get().selectedSubcity || res.data[0],
          isLoadingSubcities: false,
        });
        // Auto-fetch drivers for the active subcity
        await get().fetchDrivers(get().selectedSubcity?.id || res.data[0].id);
      } else {
        set({ isLoadingSubcities: false });
      }
    } catch {
      set({ isLoadingSubcities: false });
    }
  },

  selectSubcity: (subcity: SubcityInfo) => {
    set({ selectedSubcity: subcity, selectedDriver: null });
    get().fetchDrivers(subcity.id);
  },

  fetchDrivers: async (subcityId?: string) => {
    set({ isLoadingDrivers: true });
    try {
      const res = await RideService.getAvailableDrivers(subcityId);
      if (res.success && res.data) {
        set({
          availableDrivers: res.data,
          selectedDriver: res.data.length > 0 ? res.data[0] : null,
          isLoadingDrivers: false,
        });
      } else {
        set({ availableDrivers: [], selectedDriver: null, isLoadingDrivers: false });
      }
    } catch {
      set({ isLoadingDrivers: false });
    }
  },

  selectDriver: (driver: PublicDriverInfo | null) => {
    set({ selectedDriver: driver });
  },

  calculateFareEstimates: async () => {
    const { pickupLocation, destinationLocation, selectedCategory } = get();
    if (!destinationLocation) return;

    try {
      const vehicleTypeMap: Record<VehicleCategory, string> = {
        economy: 'STANDARD_SEDAN',
        comfort: 'COMFORT_VAN',
        vip: 'EXECUTIVE',
        minibus: 'MINIVAN_TOUR',
      };
      const vType = vehicleTypeMap[selectedCategory] || 'STANDARD_SEDAN';

      const res = await RideService.estimateFare(
        pickupLocation.coordinates.latitude,
        pickupLocation.coordinates.longitude,
        destinationLocation.coordinates.latitude,
        destinationLocation.coordinates.longitude,
        vType
      );

      if (res.success && res.data) {
        set({ fareEstimate: res.data });
      }
    } catch {
      // Fallback local calculation
      const distanceKm = calculateDistanceKm(pickupLocation.coordinates, destinationLocation.coordinates);
      const durationMins = estimateTravelTimeMinutes(distanceKm);
      const updatedVehicles = mockVehicleOptions.map((v) => ({
        ...v,
        estimatedPrice: Math.round(v.baseFare + distanceKm * v.ratePerKm + durationMins * v.ratePerMin),
      }));
      set({ availableVehicles: updatedVehicles });
    }
  },

  async requestRide(): Promise<boolean> {
    const {
      pickupLocation,
      destinationLocation,
      selectedCategory,
      selectedDriver,
      selectedSubcity,
      passengerPhone,
      additionalInstructions,
      fareEstimate,
    } = get();

    if (!destinationLocation) {
      set({ bookingError: 'Please select a destination' });
      return false;
    }

    // Default or user-provided phone
    const userPhone = passengerPhone || useAuthStore.getState().user?.phone || '0911223344';

    if (!selectedDriver) {
      set({ bookingError: 'Please select an available driver' });
      return false;
    }

    if (!selectedSubcity) {
      set({ bookingError: 'Please select a subcity' });
      return false;
    }

    set({ isBookingRide: true, bookingError: null });

    const vehicleTypeMap: Record<VehicleCategory, string> = {
      economy: 'STANDARD_SEDAN',
      comfort: 'COMFORT_VAN',
      vip: 'EXECUTIVE',
      minibus: 'MINIVAN_TOUR',
    };

    try {
      const res = await RideService.createBooking({
        driverId: selectedDriver.id,
        subcityId: selectedSubcity.id,
        pickupLocation: pickupLocation.title || pickupLocation.address,
        pickupLatitude: pickupLocation.coordinates.latitude,
        pickupLongitude: pickupLocation.coordinates.longitude,
        destinationLocation: destinationLocation.title || destinationLocation.address,
        destinationLatitude: destinationLocation.coordinates.latitude,
        destinationLongitude: destinationLocation.coordinates.longitude,
        passengerContactPhone: userPhone,
        additionalInstructions: additionalInstructions || undefined,
        vehicleCategory: selectedCategory,
      });

      if (res.success && res.data) {
        const backendRide = res.data;
        const driverInfo: DriverInfo = {
          id: selectedDriver.id,
          name: selectedDriver.fullName,
          phone: '', // Private
          rating: selectedDriver.rating,
          totalTrips: selectedDriver.totalTrips,
          photoUrl: selectedDriver.profileImage || mockDriver.photoUrl,
          vehicleMake: selectedDriver.vehicle?.vehicleModel?.split(' ')[0] || 'Toyota',
          vehicleModel: selectedDriver.vehicle?.vehicleModel || 'Corolla',
          vehiclePlate: selectedDriver.vehicle?.plateNumber || '3-A12345',
          vehicleColor: selectedDriver.vehicle?.vehicleColor || 'Silver',
        };

        const activeRide: RideBooking = {
          id: backendRide.id,
          status: backendRide.bookingStatus || 'REQUESTED',
          pickup: pickupLocation,
          destination: destinationLocation,
          vehicleCategory: selectedCategory,
          estimatedPrice: Number(backendRide.estimatedFare || fareEstimate?.totalFare || 150),
          distanceKm: (backendRide.estimatedDistanceMeters || 4500) / 1000,
          estimatedDurationMins: Math.round((backendRide.estimatedDurationSeconds || 720) / 60),
          driver: driverInfo,
          createdAt: backendRide.createdAt || new Date().toISOString(),
          startedAt: backendRide.startedAt,
          completedAt: backendRide.completedAt,
        };

        set({
          currentRide: activeRide,
          isBookingRide: false,
          isSearchingDriver: false,
        });

        return true;
      } else {
        set({
          isBookingRide: false,
          bookingError: res.error || 'Failed to create ride booking',
        });
        return false;
      }
    } catch (err: any) {
      set({
        isBookingRide: false,
        bookingError: err.message || 'Network error occurred during booking',
      });
      return false;
    }
  },

  async requestOnDemandRide(): Promise<boolean> {
    const {
      selectedSubcity,
      passengerPhone,
      additionalInstructions,
      selectedDriver,
      pickupLocation,
    } = get();

    const user = useAuthStore.getState().user;
    const phoneToUse = passengerPhone || user?.phone || '0911223344';

    if (!selectedSubcity) {
      set({ bookingError: 'Please select an operational subcity in Gondar' });
      return false;
    }

    if (!selectedDriver) {
      set({ bookingError: 'Please select an available driver in this subcity' });
      return false;
    }

    set({ isBookingRide: true, bookingError: null, isSearchingDriver: true });

    try {
      const res = await RideService.requestOnDemandRide({
        subcityId: selectedSubcity.id,
        subcityName: selectedSubcity.name,
        passengerContactPhone: phoneToUse,
        additionalInstructions: additionalInstructions || undefined,
        approximateLatitude: selectedSubcity.centerLatitude || pickupLocation.coordinates.latitude,
        approximateLongitude: selectedSubcity.centerLongitude || pickupLocation.coordinates.longitude,
        preferredDriverId: selectedDriver.id,
      });

      if (res.success && res.data) {
        set({
          currentRide: res.data,
          isBookingRide: false,
          isSearchingDriver: true,
          bookingError: null,
          journeyDistanceMeters: 0,
          journeyDurationSeconds: 0,
          finalFareBreakdown: null,
        });
        return true;
      } else {
        get().fetchDrivers(selectedSubcity.id).catch(() => {});
        set({
          isBookingRide: false,
          isSearchingDriver: false,
          bookingError: res.error || 'Failed to submit ride request',
        });
        return false;
      }
    } catch (err: any) {
      get().fetchDrivers(selectedSubcity.id).catch(() => {});
      set({
        isBookingRide: false,
        isSearchingDriver: false,
        bookingError: err.message || 'Network error occurred during ride request',
      });
      return false;
    }
  },

  async selectVehicleForApprovedRide(category: VehicleCategory): Promise<void> {
    const { currentRide } = get();
    if (!currentRide) return;

    set({ selectedCategory: category });

    const updated: RideBooking = {
      ...currentRide,
      vehicleCategory: category,
      status: 'DRIVER_ARRIVING',
    };

    set({ currentRide: updated });

    try {
      await RideService.selectApprovedVehicle(currentRide.id, category);
    } catch {
      // Non-blocking
    }
  },

  onDriverApproved(driver: PublicDriverInfo | DriverInfo) {
    const { currentRide } = get();
    if (!currentRide) return;

    const isPublicDriver = 'fullName' in driver;
    const driverInfo: DriverInfo = isPublicDriver
      ? {
          id: driver.id,
          name: driver.fullName,
          phone: '+251918000000',
          rating: driver.rating,
          totalTrips: driver.totalTrips,
          photoUrl: driver.profileImage || mockDriver.photoUrl,
          vehicleMake: driver.vehicle?.vehicleModel.split(' ')[0] || 'Toyota',
          vehicleModel: driver.vehicle?.vehicleModel || 'Corolla',
          vehiclePlate: driver.vehicle?.plateNumber || '3-A12345',
          vehicleColor: driver.vehicle?.vehicleColor || 'Silver',
          currentLocation: { latitude: 12.608, longitude: 37.469 },
        }
      : (driver as DriverInfo);

    set({
      approvedDriver: driver,
      isSearchingDriver: false,
      currentRide: {
        ...currentRide,
        status: 'DRIVER_APPROVED',
        driver: driverInfo,
      },
    });
  },

  onTripStarted() {
    const { currentRide } = get();
    if (!currentRide) return;
    set({
      currentRide: {
        ...currentRide,
        status: 'TRIP_STARTED',
        startedAt: new Date().toISOString(),
      },
    });
  },

  onTripCompleted(fareData?: any) {
    const { currentRide, selectedCategory } = get();
    if (!currentRide) return;

    const rates = selectedCategory === 'vip'
      ? { base: 200, km: 45, min: 4 }
      : selectedCategory === 'comfort'
      ? { base: 150, km: 35, min: 3 }
      : { base: 100, km: 25, min: 2 };

    const distanceMeters = fareData?.distanceMeters || get().journeyDistanceMeters || 4500;
    const durationSeconds = fareData?.durationSeconds || get().journeyDurationSeconds || 720;
    const distanceKm = distanceMeters / 1000;
    const durationMins = Math.max(1, Math.round(durationSeconds / 60));

    const distanceFare = Math.round(distanceKm * rates.km);
    const timeFare = Math.round(durationMins * rates.min);
    const totalFare = fareData?.totalFare || Math.round(rates.base + distanceFare + timeFare);

    const breakdown: TripFareBreakdown = {
      baseFare: rates.base,
      perKilometreRate: rates.km,
      perMinuteRate: rates.min,
      minimumFare: 50,
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMinutes: durationMins,
      distanceFare,
      timeFare,
      totalFare,
      currency: 'ETB',
    };

    set({
      journeyDistanceMeters: distanceMeters,
      journeyDurationSeconds: durationSeconds,
      finalFareBreakdown: breakdown,
      currentRide: {
        ...currentRide,
        status: 'TRIP_COMPLETED',
        completedAt: new Date().toISOString(),
        distanceKm,
        estimatedDurationMins: durationMins,
        finalPrice: totalFare,
        fareBreakdown: breakdown,
      },
    });
  },

  simulateDriverApproval() {
    const { currentRide, availableDrivers } = get();
    if (!currentRide) return;

    const matchedDriver = availableDrivers[0] || {
      id: 'driver_gondar_1',
      fullName: 'Dawit Haile',
      profileImage: mockDriver.photoUrl,
      rating: 4.9,
      totalTrips: 184,
      availabilityStatus: 'BUSY' as const,
      vehicle: {
        plateNumber: '3-A12345',
        vehicleModel: 'Toyota Corolla Silver',
        vehicleColor: 'Silver',
        vehicleType: 'STANDARD_SEDAN',
        seatingCapacity: 4,
      },
      subcities: [],
    };

    get().onDriverApproved(matchedDriver);
  },

  simulateDriverArrival() {
    const { currentRide } = get();
    if (!currentRide) return;
    set({
      currentRide: {
        ...currentRide,
        status: 'DRIVER_ARRIVED',
      },
    });
  },

  simulateTripStart() {
    const { currentRide } = get();
    if (!currentRide) return;
    const now = new Date().toISOString();
    set({
      currentRide: {
        ...currentRide,
        status: 'TRIP_STARTED',
        startedAt: now,
      },
      journeyDistanceMeters: 400,
      journeyDurationSeconds: 120,
    });
  },

  simulateTripCompletion() {
    get().onTripCompleted();
  },

  applyRealtimeRideEvent(payload: any, forcedStatus?: RideStatus) {
    if (!payload) return;
    const mapped = RideService.mapBackendRideRequest(payload);
    const nextStatus = forcedStatus || mapped.status;
    const current = get().currentRide;

    if (current && current.id !== mapped.id) {
      return;
    }

    const updated: RideBooking = {
      ...(current || mapped),
      ...mapped,
      status: nextStatus,
      driver: mapped.driver || current?.driver,
    };

    set({
      currentRide: updated,
      isSearchingDriver: nextStatus === 'WAITING_FOR_DRIVER',
      ...(nextStatus === 'DRIVER_APPROVED' && updated.driver
        ? { approvedDriver: updated.driver }
        : {}),
    });
  },

  async syncRideState(rideId?: string): Promise<void> {
    const active = get().currentRide;
    const id = rideId || active?.id;

    // Do not sync or revive if current ride is already paid or terminally closed
    if (
      active &&
      (active.status === 'PAYMENT_COMPLETED' ||
        active.status === 'CANCELLED' ||
        active.status === 'REJECTED' ||
        active.status === 'EXPIRED')
    ) {
      return;
    }

    try {
      const reqRes = id
        ? await RideService.getPassengerRequestById(id)
        : await RideService.getPassengerCurrentRequest();

      if (reqRes.success && reqRes.data) {
        const mapped = reqRes.data;
        const current = get().currentRide;
        if (current && current.id !== mapped.id) {
          return;
        }
        set({
          currentRide: {
            ...(current || mapped),
            ...mapped,
            driver: mapped.driver || current?.driver,
          },
          isSearchingDriver: mapped.status === 'WAITING_FOR_DRIVER',
        });
        return;
      }

      if (!id) return;

      const res = await RideService.getRideDetails(id);
      if (res.success && res.data) {
        const d = res.data;
        const current = get().currentRide;

        if (current && current.status !== 'PAYMENT_COMPLETED' && current.status !== 'CANCELLED') {
          const updated: RideBooking = {
            ...current,
            status: d.bookingStatus || current.status,
            finalPrice: d.finalFare ? Number(d.finalFare) : current.finalPrice,
            startedAt: d.startedAt || current.startedAt,
            completedAt: d.completedAt || current.completedAt,
          };

          if (d.destinationLocation && current.destination && d.destinationLocation !== current.destination.title) {
            updated.destination = {
              ...current.destination,
              title: d.destinationLocation,
              address: d.destinationLocation,
              coordinates: {
                latitude: d.destinationLatitude || current.destination.coordinates.latitude,
                longitude: d.destinationLongitude || current.destination.coordinates.longitude,
              },
            };
          }

          const officialMeters = d.trackingSession?.officialDistanceMeters || get().journeyDistanceMeters;
          const trackingSession = d.trackingSession || null;

          set({
            currentRide: updated,
            activeTracking: trackingSession,
            destinationRevision: d.destinationRevisions?.[0] || null,
            journeyDistanceMeters: officialMeters,
          });
        }
      }
    } catch {
      // Keep existing state if offline
    }
  },

  async requestDestinationChange(
    newDestination: string,
    newCoords: { latitude: number; longitude: number }
  ): Promise<boolean> {
    const { currentRide } = get();
    if (!currentRide) return false;

    try {
      const res = await RideService.requestDestinationChange(
        currentRide.id,
        newDestination,
        newCoords.latitude,
        newCoords.longitude
      );

      if (res.success && res.data) {
        set({ destinationRevision: res.data.revision });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  simulateNextRideStep: () => {
    const { currentRide } = get();
    if (!currentRide) return;

    const statusOrder: RideStatus[] = [
      'REQUESTED',
      'WAITING_FOR_DRIVER',
      'DRIVER_APPROVED',
      'VEHICLE_SELECTED',
      'DRIVER_ARRIVING',
      'DRIVER_ARRIVED',
      'TRIP_STARTED',
      'TRIP_COMPLETED',
      'PAYMENT_PENDING',
      'PAYMENT_COMPLETED',
    ];

    const currentIndex = statusOrder.indexOf(currentRide.status);
    if (currentIndex >= 0 && currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      if (nextStatus === 'DRIVER_APPROVED') {
        get().simulateDriverApproval();
      } else if (nextStatus === 'DRIVER_ARRIVED') {
        get().simulateDriverArrival();
      } else if (nextStatus === 'TRIP_STARTED') {
        get().simulateTripStart();
      } else if (nextStatus === 'TRIP_COMPLETED') {
        get().simulateTripCompletion();
      } else {
        set({
          currentRide: {
            ...currentRide,
            status: nextStatus,
          },
        });
      }
    }
  },

  async cancelRide(reason: string): Promise<void> {
    const { currentRide } = get();
    if (currentRide) {
      try {
        await RideService.cancelRide(currentRide.id, reason);
      } catch {
        // Handled locally
      }
      set({
        currentRide: {
          ...currentRide,
          status: 'CANCELLED',
          cancellationReason: reason,
        },
        isSearchingDriver: false,
      });
    }
  },

  completePayment: (paymentMethod?: string, ref?: string) => {
    const { currentRide, rideHistory } = get();
    if (currentRide) {
      const completedRide: RideBooking = {
        ...currentRide,
        status: 'PAYMENT_COMPLETED',
        paymentMethod: paymentMethod || currentRide.paymentMethod || 'telebirr',
        bookingReference: ref || currentRide.bookingReference,
        completedAt: currentRide.completedAt || new Date().toISOString(),
      };

      // Put completed ride at front of history and deduplicate
      const updatedHistory = [
        completedRide,
        ...rideHistory.filter((r) => r.id !== completedRide.id),
      ];

      // Persist permanently in AsyncStorage
      AsyncStorage.setItem(RIDE_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory)).catch(() => {});

      // Immediately clear currentRide so the ride in progress notification is removed from the home page!
      // Keep lastCompletedRide so receipt screen can render full itemized breakdown
      set({
        currentRide: null,
        lastCompletedRide: completedRide,
        rideHistory: updatedHistory,
        activeTracking: null,
        destinationRevision: null,
        finalFareBreakdown: null,
        journeyDistanceMeters: 0,
        journeyDurationSeconds: 0,
        isSearchingDriver: false,
        bookingError: null,
      });

      // Asynchronously record payment with backend if online
      RideService.recordPayment(
        completedRide.id,
        completedRide.paymentMethod || 'telebirr',
        completedRide.bookingReference || `KT-PAY-${Date.now()}`,
        completedRide.finalPrice || 150
      ).catch(() => {});
    }
  },

  resetRide: () => {
    set({
      currentRide: null,
      isSearchingDriver: false,
      bookingError: null,
      activeTracking: null,
      destinationRevision: null,
      approvedDriver: null,
      finalFareBreakdown: null,
      journeyDistanceMeters: 0,
      journeyDurationSeconds: 0,
    });
  },

  fetchRideHistory: async () => {
    try {
      // 1. Load locally cached ride history from persistent storage
      const raw = await AsyncStorage.getItem(RIDE_HISTORY_STORAGE_KEY);
      let localHistory: RideBooking[] = raw ? JSON.parse(raw) : [];

      const currentHistory = get().rideHistory;
      const historyMap = new Map<string, RideBooking>();

      // Populate existing history
      for (const item of currentHistory) historyMap.set(item.id, item);
      for (const item of localHistory) historyMap.set(item.id, item);

      // 2. Fetch authenticated backend history if available
      try {
        const res = await RideService.getPassengerRides(1, 20);
        if (res.success && res.data?.rides) {
          for (const b of res.data.rides) {
            const formatted: RideBooking = {
              id: b.id,
              bookingReference: b.bookingReference,
              status: b.bookingStatus,
              subcityName: b.subcity?.name,
              passengerContactPhone: b.passengerContactPhone,
              pickup: {
                id: `pickup_${b.id}`,
                title: b.pickupLocation || 'Pickup Location',
                address: b.pickupLocation || 'Gondar',
                coordinates: { latitude: b.pickupLatitude || 12.6074, longitude: b.pickupLongitude || 37.4589 },
                city: 'Gondar',
              },
              destination: {
                id: `dest_${b.id}`,
                title: b.destinationLocation || 'Destination',
                address: b.destinationLocation || 'Gondar',
                coordinates: { latitude: b.destinationLatitude || 12.608, longitude: b.destinationLongitude || 37.469 },
                city: 'Gondar',
              },
              vehicleCategory: (b.vehicle?.vehicleType?.toLowerCase() as any) || 'comfort',
              estimatedPrice: Number(b.estimatedFare) || 150,
              finalPrice: b.finalFare ? Number(b.finalFare) : Number(b.estimatedFare) || 150,
              distanceKm: b.actualDistanceMeters ? b.actualDistanceMeters / 1000 : 0,
              estimatedDurationMins: b.actualDurationSeconds ? Math.round(b.actualDurationSeconds / 60) : 0,
              createdAt: b.createdAt,
              completedAt: b.completedAt,
              driver: b.driver
                ? {
                    id: b.driver.id,
                    name: b.driver.fullName,
                    phone: '+251918000000',
                    rating: b.driver.rating || 5.0,
                    totalTrips: 100,
                    photoUrl: b.driver.profileImage || mockDriver.photoUrl,
                    vehicleMake: 'Toyota',
                    vehicleModel: b.vehicle?.vehicleModel || 'Corolla',
                    vehiclePlate: b.vehicle?.plateNumber || '3-A12345',
                    vehicleColor: 'Silver',
                  }
                : undefined,
            };
            historyMap.set(formatted.id, formatted);
          }
        }
      } catch {
        // Offline or unauthenticated fallback
      }

      const mergedList = Array.from(historyMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // If currentRide is already completed or cancelled, ensure it is removed from active slot
      const current = get().currentRide;
      const shouldClear = current && (current.status === 'PAYMENT_COMPLETED' || current.status === 'CANCELLED');

      set({
        rideHistory: mergedList,
        ...(shouldClear ? { currentRide: null, lastCompletedRide: current } : {}),
      });

      await AsyncStorage.setItem(RIDE_HISTORY_STORAGE_KEY, JSON.stringify(mergedList));
    } catch {
      // Keep in-memory state
    }
  },
}));

registerLogoutCleanup(() => {
  useRideStore.getState().resetRide();
  useRideStore.setState({ rideHistory: [], lastCompletedRide: null });
});
