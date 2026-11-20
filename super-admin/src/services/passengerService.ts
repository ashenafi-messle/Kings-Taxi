import { Passenger, PassengerFilterParams, PaginatedResult } from '../types';
import { mockPassengers } from './mockData';

let passengersData: Passenger[] = [...mockPassengers];

export class PassengerService {
  static async getPassengers(params: PassengerFilterParams = {}): Promise<PaginatedResult<Passenger>> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered = [...passengersData];

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

  static async getPassengerById(id: string): Promise<Passenger | null> {
    await new Promise((r) => setTimeout(r, 150));
    return passengersData.find((p) => p.id === id || p.passengerId === id) || null;
  }

  static async updatePassengerStatus(id: string, status: Passenger['accountStatus']): Promise<Passenger | null> {
    await new Promise((r) => setTimeout(r, 200));
    const index = passengersData.findIndex((p) => p.id === id);
    if (index === -1) return null;

    passengersData[index] = {
      ...passengersData[index],
      accountStatus: status,
      updatedAt: new Date().toISOString(),
    };
    return passengersData[index];
  }

  static async deletePassenger(id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    const initialLen = passengersData.length;
    passengersData = passengersData.filter((p) => p.id !== id);
    return passengersData.length < initialLen;
  }
}
