import { create } from 'zustand';
import {
  FullContractTransportationRequest,
  HotelReservation,
} from '../types';
import { mockHotels } from '../mocks';

interface BookingStoreState {
  hotelReservations: HotelReservation[];
  tourContracts: FullContractTransportationRequest[];

  // Actions
  addHotelReservation: (reservation: Omit<HotelReservation, 'id' | 'createdAt' | 'reservationCode'>) => HotelReservation;
  cancelHotelReservation: (id: string) => void;
  createTourContract: (request: Omit<FullContractTransportationRequest, 'id' | 'createdAt' | 'status'>) => FullContractTransportationRequest;
  cancelTourContract: (id: string) => void;
}

export const useBookingStore = create<BookingStoreState>((set) => ({
  hotelReservations: [
    {
      id: 'res_htl_8829',
      hotelId: mockHotels[0].id,
      hotelName: mockHotels[0].name,
      hotelCity: mockHotels[0].city,
      hotelImage: mockHotels[0].heroImage,
      roomId: mockHotels[0].rooms[0].id,
      roomTitle: mockHotels[0].rooms[0].title,
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-12',
      nightsCount: 2,
      guestsCount: 2,
      totalPriceETB: 17000,
      status: 'CONFIRMED',
      reservationCode: 'SKY-8921',
      createdAt: '2026-10-24T09:16:00Z',
    },
  ],

  tourContracts: [
    {
      id: 'tour_req_1092',
      departureLocation: {
        id: 'loc_gondar_center',
        title: 'Gondar City Center',
        address: 'Gondar, Ethiopia',
        coordinates: { latitude: 12.6078, longitude: 37.4705 },
      },
      selectedStops: [
        {
          id: 'stop_1',
          heritageSiteId: 'hrt_fasil_gondar',
          siteName: 'Fasil Ghebbi Royal Enclosure',
          region: 'Gondar',
          durationHours: 4,
          order: 1,
        },
        {
          id: 'stop_2',
          heritageSiteId: 'hrt_debre_berhan',
          siteName: 'Debre Berhan Selassie Church',
          region: 'Gondar',
          durationHours: 3,
          order: 2,
        },
      ],
      startDate: '2026-11-15',
      departureTime: '08:30 AM',
      passengersCount: 4,
      vehicleCategory: 'suv',
      durationDays: 1,
      estimatedPriceETB: 8500,
      status: 'CONFIRMED',
      notes: 'English speaking certified historical guide requested.',
      createdAt: '2026-10-18T11:00:00Z',
    },
  ],

  addHotelReservation: (reservationData) => {
    const newReservation: HotelReservation = {
      ...reservationData,
      id: `res_htl_${Date.now()}`,
      reservationCode: `KT-HTL-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      hotelReservations: [newReservation, ...state.hotelReservations],
    }));

    return newReservation;
  },

  cancelHotelReservation: (id: string) => {
    set((state) => ({
      hotelReservations: state.hotelReservations.map((r) =>
        r.id === id ? { ...r, status: 'CANCELLED' } : r
      ),
    }));
  },

  createTourContract: (requestData) => {
    const newContract: FullContractTransportationRequest = {
      ...requestData,
      id: `tour_req_${Date.now()}`,
      status: 'REQUESTED',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      tourContracts: [newContract, ...state.tourContracts],
    }));

    return newContract;
  },

  cancelTourContract: (id: string) => {
    set((state) => ({
      tourContracts: state.tourContracts.map((t) =>
        t.id === id ? { ...t, status: 'CANCELLED' } : t
      ),
    }));
  },
}));
