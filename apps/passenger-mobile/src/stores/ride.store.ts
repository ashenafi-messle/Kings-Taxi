import { create } from 'zustand';
import {
  AddressLocation,
  DriverInfo,
  RideBooking,
  RideStatus,
  VehicleCategory,
  VehicleOption,
} from '../types';
import {
  mockDriver,
  mockLocations,
  mockVehicleOptions,
} from '../mocks';
import { calculateDistanceKm, estimateTravelTimeMinutes } from '../utils/geo';

interface RideState {
  currentRide: RideBooking | null;
  pickupLocation: AddressLocation;
  destinationLocation: AddressLocation | null;
  selectedCategory: VehicleCategory;
  availableVehicles: VehicleOption[];
  isSearchingDriver: boolean;
  rideHistory: RideBooking[];

  // Actions
  setPickup: (location: AddressLocation) => void;
  setDestination: (location: AddressLocation | null) => void;
  selectCategory: (category: VehicleCategory) => void;
  calculateFareEstimates: () => void;
  requestRide: () => Promise<void>;
  simulateNextRideStep: () => void;
  cancelRide: (reason: string) => void;
  completePayment: () => void;
  resetRide: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  pickupLocation: mockLocations[0], // Bole Airport
  destinationLocation: mockLocations[1], // Skylight Hotel
  selectedCategory: 'comfort',
  availableVehicles: mockVehicleOptions,
  currentRide: null,
  isSearchingDriver: false,
  rideHistory: [
    {
      id: 'ride_hist_1',
      status: 'TRIP_COMPLETED',
      pickup: mockLocations[0],
      destination: mockLocations[1],
      vehicleCategory: 'comfort',
      estimatedPrice: 480,
      finalPrice: 480,
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
      pickup: mockLocations[2],
      destination: mockLocations[3],
      vehicleCategory: 'economy',
      estimatedPrice: 320,
      finalPrice: 320,
      distanceKm: 3.2,
      estimatedDurationMins: 12,
      driver: mockDriver,
      createdAt: '2026-10-28T10:00:00Z',
      completedAt: '2026-10-28T10:15:00Z',
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

  calculateFareEstimates: () => {
    const { pickupLocation, destinationLocation } = get();
    if (!destinationLocation) return;

    const distanceKm = calculateDistanceKm(
      pickupLocation.coordinates,
      destinationLocation.coordinates
    );
    const durationMins = estimateTravelTimeMinutes(distanceKm);

    const updatedVehicles = mockVehicleOptions.map((v) => {
      const estimatedPrice = Math.round(
        v.baseFare + distanceKm * v.ratePerKm + durationMins * v.ratePerMin
      );
      return {
        ...v,
        estimatedPrice,
      };
    });

    set({ availableVehicles: updatedVehicles });
  },

  requestRide: async () => {
    const { pickupLocation, destinationLocation, selectedCategory, availableVehicles } = get();
    if (!destinationLocation) return;

    const selectedVehicle =
      availableVehicles.find((v) => v.id === selectedCategory) || availableVehicles[0];

    const distanceKm = calculateDistanceKm(
      pickupLocation.coordinates,
      destinationLocation.coordinates
    );
    const durationMins = estimateTravelTimeMinutes(distanceKm);

    const newBooking: RideBooking = {
      id: `ride_${Date.now()}`,
      status: 'SEARCHING_DRIVER',
      pickup: pickupLocation,
      destination: destinationLocation,
      vehicleCategory: selectedCategory,
      estimatedPrice: selectedVehicle.estimatedPrice,
      distanceKm,
      estimatedDurationMins: durationMins,
      createdAt: new Date().toISOString(),
    };

    set({
      currentRide: newBooking,
      isSearchingDriver: true,
    });

    // Simulate backend driver dispatch after 2.5 seconds
    setTimeout(() => {
      const current = get().currentRide;
      if (current && current.status === 'SEARCHING_DRIVER') {
        set({
          isSearchingDriver: false,
          currentRide: {
            ...current,
            status: 'DRIVER_ASSIGNED',
            driver: mockDriver,
          },
        });
      }
    }, 2500);
  },

  simulateNextRideStep: () => {
    const { currentRide } = get();
    if (!currentRide) return;

    const statusOrder: RideStatus[] = [
      'REQUESTED',
      'SEARCHING_DRIVER',
      'DRIVER_ASSIGNED',
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
      set({
        currentRide: {
          ...currentRide,
          status: nextStatus,
          driver: currentRide.driver || mockDriver,
          finalPrice: nextStatus === 'TRIP_COMPLETED' || nextStatus === 'PAYMENT_PENDING'
            ? currentRide.estimatedPrice
            : currentRide.finalPrice,
        },
      });
    }
  },

  cancelRide: (reason: string) => {
    const { currentRide } = get();
    if (currentRide) {
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

  completePayment: () => {
    const { currentRide, rideHistory } = get();
    if (currentRide) {
      const completedRide: RideBooking = {
        ...currentRide,
        status: 'PAYMENT_COMPLETED',
        completedAt: new Date().toISOString(),
      };
      set({
        currentRide: completedRide,
        rideHistory: [completedRide, ...rideHistory],
      });
    }
  },

  resetRide: () => {
    set({
      currentRide: null,
      isSearchingDriver: false,
    });
  },
}));
