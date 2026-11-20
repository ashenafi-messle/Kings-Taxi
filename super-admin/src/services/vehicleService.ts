import { Vehicle, VehicleFilterParams, PaginatedResult } from '../types';
import { mockVehicles } from './mockData';

let vehiclesData: Vehicle[] = [...mockVehicles];

export class VehicleService {
  static async getVehicles(params: VehicleFilterParams = {}): Promise<PaginatedResult<Vehicle>> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered = [...vehiclesData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (v) =>
          v.plateNumber.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(q))
      );
    }

    if (params.category && params.category !== 'ALL') {
      filtered = filtered.filter((v) => v.category === params.category);
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((v) => v.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  static async getVehicleById(id: string): Promise<Vehicle | null> {
    await new Promise((r) => setTimeout(r, 150));
    return vehiclesData.find((v) => v.id === id || v.plateNumber === id) || null;
  }

  static async createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
    await new Promise((r) => setTimeout(r, 300));
    const newId = `veh_${Date.now()}`;

    const newVehicle: Vehicle = {
      id: newId,
      plateNumber: payload.plateNumber || '3-PENDING-ET',
      vinNumber: payload.vinNumber || '',
      make: payload.make || 'Toyota',
      model: payload.model || 'Standard',
      year: payload.year || 2024,
      color: payload.color || 'White',
      category: payload.category || 'SEDAN_STANDARD',
      categoryName: payload.categoryName || 'Standard Sedan',
      capacity: payload.capacity || 4,
      imageUrl: payload.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80',
      status: payload.status || 'AVAILABLE',
      assignedDriverId: payload.assignedDriverId,
      assignedDriverName: payload.assignedDriverName,
      assignedDriverPhone: payload.assignedDriverPhone,
      insurancePolicyNumber: payload.insurancePolicyNumber,
      insuranceExpiry: payload.insuranceExpiry || '2026-01-01',
      inspectionExpiry: payload.inspectionExpiry || '2026-01-01',
      isVerified: true,
      mileageKm: payload.mileageKm || 0,
      fuelType: payload.fuelType || 'PETROL',
      maintenanceRecords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vehiclesData = [newVehicle, ...vehiclesData];
    return newVehicle;
  }

  static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    await new Promise((r) => setTimeout(r, 250));
    const index = vehiclesData.findIndex((v) => v.id === id);
    if (index === -1) return null;

    vehiclesData[index] = {
      ...vehiclesData[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return vehiclesData[index];
  }

  static async deleteVehicle(id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    const initialLen = vehiclesData.length;
    vehiclesData = vehiclesData.filter((v) => v.id !== id);
    return vehiclesData.length < initialLen;
  }

  static async reviewVehicleDocument(
    vehicleId: string,
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ): Promise<Vehicle | null> {
    await new Promise((r) => setTimeout(r, 200));
    const vehicle = vehiclesData.find((v) => v.id === vehicleId || v.plateNumber === vehicleId);
    if (!vehicle) return null;

    if (!vehicle.documents) vehicle.documents = [];
    const docIndex = vehicle.documents.findIndex((doc) => doc.id === documentId);
    if (docIndex !== -1) {
      vehicle.documents[docIndex] = {
        ...vehicle.documents[docIndex],
        status: review.status,
        rejectionReason: review.status === 'REJECTED' ? review.rejectionReason : undefined,
        reviewNotes: review.reviewNotes,
        reviewedBy: 'Super Admin',
        reviewedAt: new Date().toISOString(),
      };
    }

    // Recalculate overall verificationStatus
    const hasRejection = vehicle.documents.some((d) => d.status === 'REJECTED');
    if (hasRejection) {
      vehicle.verificationStatus = 'REJECTED';
      vehicle.isVerified = false;
    } else {
      const requiredTypes = [
        'REGISTRATION_CERTIFICATE',
        'VEHICLE_TITLE_LIBRE',
        'INSURANCE_CERTIFICATE',
        'ANNUAL_INSPECTION_BOLO',
      ];
      const approvedTypes = new Set(
        vehicle.documents.filter((d) => d.status === 'APPROVED').map((d) => d.documentType?.toUpperCase())
      );
      const allApproved = requiredTypes.every((t) => approvedTypes.has(t));
      vehicle.verificationStatus = allApproved ? 'VERIFIED' : 'PENDING';
      vehicle.isVerified = allApproved;
    }

    vehicle.updatedAt = new Date().toISOString();
    return vehicle;
  }
}

