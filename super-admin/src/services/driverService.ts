import { Driver, DriverFilterParams, PaginatedResult } from '../types';
import { mockDrivers } from './mockData';

let driversData: Driver[] = [...mockDrivers];

export class DriverService {
  static async getDrivers(params: DriverFilterParams = {}): Promise<PaginatedResult<Driver>> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered = [...driversData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.driverId.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.licenseNumber.toLowerCase().includes(q)
      );
    }

    if (params.verificationStatus && params.verificationStatus !== 'ALL') {
      filtered = filtered.filter((d) => d.verificationStatus === params.verificationStatus);
    }

    if (params.availabilityStatus && params.availabilityStatus !== 'ALL') {
      filtered = filtered.filter((d) => d.availabilityStatus === params.availabilityStatus);
    }

    if (params.city && params.city !== 'ALL') {
      filtered = filtered.filter((d) => d.city.toLowerCase() === params.city?.toLowerCase());
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getDriverById(id: string): Promise<Driver | null> {
    await new Promise((r) => setTimeout(r, 150));
    return driversData.find((d) => d.id === id || d.driverId === id) || null;
  }

  static async createDriver(payload: Partial<Driver>): Promise<Driver> {
    await new Promise((r) => setTimeout(r, 300));
    const newId = `drv_${Date.now()}`;
    const newDriverId = `DRV-${1050 + driversData.length}`;

    const newDriver: Driver = {
      id: newId,
      driverId: newDriverId,
      fullName: payload.fullName || 'New Driver',
      email: payload.email || '',
      phone: payload.phone || '',
      avatarUrl: payload.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      gender: payload.gender || 'MALE',
      dateOfBirth: payload.dateOfBirth || '1990-01-01',
      city: payload.city || 'Gondar',
      address: payload.address || '',
      licenseNumber: payload.licenseNumber || 'ETH-PENDING',
      licenseExpiry: payload.licenseExpiry || '2027-12-31',
      verificationStatus: payload.verificationStatus || 'PENDING',
      documents: payload.documents || [],
      availabilityStatus: 'OFFLINE',
      assignedVehicleId: payload.assignedVehicleId,
      assignedVehiclePlate: payload.assignedVehiclePlate,
      assignedVehicleModel: payload.assignedVehicleModel,
      rating: 5.0,
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      totalEarningsETB: 0,
      distanceCoveredKm: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    driversData = [newDriver, ...driversData];
    return newDriver;
  }

  static async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver | null> {
    await new Promise((r) => setTimeout(r, 250));
    const index = driversData.findIndex((d) => d.id === id);
    if (index === -1) return null;

    driversData[index] = {
      ...driversData[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return driversData[index];
  }

  static async toggleDriverStatus(id: string, status: Driver['availabilityStatus']): Promise<Driver | null> {
    return this.updateDriver(id, { availabilityStatus: status });
  }

  static async deleteDriver(id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    const initialLen = driversData.length;
    driversData = driversData.filter((d) => d.id !== id);
    return driversData.length < initialLen;
  }

  static async reviewDriverDocument(
    driverId: string,
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ): Promise<Driver | null> {
    await new Promise((r) => setTimeout(r, 200));
    const driver = driversData.find((d) => d.id === driverId || d.driverId === driverId);
    if (!driver) return null;

    if (!driver.documents) driver.documents = [];
    const docIndex = driver.documents.findIndex((doc) => doc.id === documentId);
    if (docIndex !== -1) {
      driver.documents[docIndex] = {
        ...driver.documents[docIndex],
        status: review.status,
        rejectionReason: review.status === 'REJECTED' ? review.rejectionReason : undefined,
        reviewNotes: review.reviewNotes,
        reviewedBy: 'Super Admin',
        reviewedAt: new Date().toISOString(),
      };
    }

    // Recalculate overall verificationStatus
    const hasRejection = driver.documents.some((d) => d.status === 'REJECTED');
    if (hasRejection) {
      driver.verificationStatus = 'REJECTED';
    } else {
      const requiredTypes = ['DRIVING_LICENSE', 'NATIONAL_ID', 'POLICE_CLEARANCE'];
      const approvedTypes = new Set(
        driver.documents.filter((d) => d.status === 'APPROVED').map((d) => d.documentType?.toUpperCase())
      );
      const allApproved = requiredTypes.every((t) => approvedTypes.has(t));
      driver.verificationStatus = allApproved ? 'VERIFIED' : 'PENDING';
    }

    driver.updatedAt = new Date().toISOString();
    return driver;
  }
}

