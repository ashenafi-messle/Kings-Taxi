import { Ride, RideFilterParams, PaginatedResult } from '../types';
import { mockRides } from './mockData';

let ridesData: Ride[] = [...mockRides];

export class TripService {
  /**
   * Retrieves active rides for live GPS monitoring.
   */
  static async getActiveRides(): Promise<Ride[]> {
    await new Promise((r) => setTimeout(r, 150));
    return ridesData.filter(
      (r) => r.status === 'IN_PROGRESS' || r.status === 'DRIVER_APPROACHING' || r.status === 'DRIVER_ASSIGNED'
    );
  }

  /**
   * Retrieves completed or cancelled historical rides.
   */
  static async getRideHistory(params: RideFilterParams = {}): Promise<PaginatedResult<Ride>> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered = ridesData.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED');

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.rideReference.toLowerCase().includes(q) ||
          r.passengerName.toLowerCase().includes(q) ||
          r.driverName.toLowerCase().includes(q) ||
          r.vehiclePlate.toLowerCase().includes(q)
      );
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === params.status);
    }

    if (params.driverId) {
      filtered = filtered.filter((r) => r.driverId === params.driverId);
    }

    if (params.passengerId) {
      filtered = filtered.filter((r) => r.passengerId === params.passengerId);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getRideById(id: string): Promise<Ride | null> {
    await new Promise((r) => setTimeout(r, 150));
    return ridesData.find((r) => r.id === id || r.rideReference === id) || null;
  }

  /**
   * Simulates a live location step for a given active ride (demonstration data)
   */
  static simulateLocationStep(rideId: string): Ride | null {
    const ride = ridesData.find((r) => r.id === rideId);
    if (!ride || ride.status !== 'IN_PROGRESS') return null;

    // Jitter coordinates along Gondar street grid
    const deltaLat = (Math.random() - 0.48) * 0.0006;
    const deltaLng = (Math.random() - 0.48) * 0.0006;

    const newLat = Number((ride.currentDriverLocation.latitude + deltaLat).toFixed(6));
    const newLng = Number((ride.currentDriverLocation.longitude + deltaLng).toFixed(6));

    ride.currentDriverLocation = {
      latitude: newLat,
      longitude: newLng,
      timestamp: new Date().toISOString(),
    };

    ride.recordedRoute.push({
      latitude: newLat,
      longitude: newLng,
      speedKmh: Math.floor(30 + Math.random() * 25),
      timestamp: new Date().toISOString(),
    });

    ride.lastGpsUpdate = new Date().toISOString();
    return { ...ride };
  }
}
