import { Vehicle, VehicleFilterParams, PaginatedResult } from '../types';
import { apiRequest } from './apiClient';
import { mockVehicles } from './mockData';

let fallbackVehiclesData: Vehicle[] = [...mockVehicles];

export class VehicleService {
  /**
   * Retrieves paginated vehicles from the central backend with filtering and search
   */
  static async getVehicles(params: VehicleFilterParams = {}): Promise<PaginatedResult<Vehicle>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const endpoint = `/admin/vehicles?${query.toString()}`;

    try {
      const res = await apiRequest<PaginatedResult<Vehicle>>(endpoint);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[VehicleService] API error on getVehicles, falling back to local dataset:', err);
    }

    // Local fallback
    let filtered = [...fallbackVehiclesData];

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

  /**
   * Retrieves aggregate vehicle fleet statistics
   */
  static async getStatistics(): Promise<{
    totalVehicles: number;
    activeVehicles: number;
    availableVehicles: number;
    assignedVehicles: number;
    underMaintenance: number;
    pendingVerification: number;
    suspendedVehicles: number;
  }> {
    try {
      const res = await apiRequest<{
        totalVehicles: number;
        activeVehicles: number;
        availableVehicles: number;
        assignedVehicles: number;
        underMaintenance: number;
        pendingVerification: number;
        suspendedVehicles: number;
      }>('/admin/vehicles/statistics');

      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[VehicleService] API error on getStatistics:', err);
    }

    // Local fallback
    const totalVehicles = fallbackVehiclesData.length;
    const activeVehicles = fallbackVehiclesData.filter((v) => v.status === 'ACTIVE').length;
    const availableVehicles = fallbackVehiclesData.filter((v) => v.status === 'AVAILABLE').length;
    const assignedVehicles = fallbackVehiclesData.filter((v) => v.assignedDriverId || v.status === 'ASSIGNED').length;
    const underMaintenance = fallbackVehiclesData.filter((v) => v.status === 'UNDER_MAINTENANCE' || v.status === 'MAINTENANCE').length;
    const pendingVerification = fallbackVehiclesData.filter((v) => !v.isVerified).length;
    const suspendedVehicles = fallbackVehiclesData.filter((v) => v.status === 'INACTIVE').length;

    return {
      totalVehicles,
      activeVehicles,
      availableVehicles,
      assignedVehicles,
      underMaintenance,
      pendingVerification,
      suspendedVehicles,
    };
  }

  /**
   * Retrieves single vehicle specifications and assignment history
   */
  static async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const res = await apiRequest<Vehicle>(`/admin/vehicles/${id}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[VehicleService] API error on getVehicleById:', err);
    }

    return fallbackVehiclesData.find((v) => v.id === id || v.plateNumber === id) || null;
  }

  /**
   * Registers a new vehicle in fleet
   */
  static async createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const res = await apiRequest<Vehicle>('/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: payload.plateNumber,
          vinNumber: payload.vinNumber,
          make: payload.make,
          model: payload.model,
          year: payload.year,
          color: payload.color,
          category: payload.category,
          capacity: payload.capacity,
          fuelType: payload.fuelType,
          imageUrl: payload.imageUrl,
          insurancePolicyNumber: payload.insurancePolicyNumber,
          insuranceExpiry: payload.insuranceExpiry,
          inspectionExpiry: payload.inspectionExpiry,
          assignedDriverId: payload.assignedDriverId,
          documents: payload.documents,
        }),
      });

      if (res.success && res.data) {
        fallbackVehiclesData = [res.data, ...fallbackVehiclesData];
        return res.data;
      }
      if (res.error) {
        throw new Error(res.error);
      }
    } catch (err) {
      console.warn('[VehicleService] Failed to create vehicle via API:', err);
      throw err;
    }

    // Local fallback
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
      imageUrl: payload.imageUrl,
      status: payload.status || 'AVAILABLE',
      assignedDriverId: payload.assignedDriverId,
      assignedDriverName: payload.assignedDriverName,
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

    fallbackVehiclesData = [newVehicle, ...fallbackVehiclesData];
    return newVehicle;
  }

  /**
   * Updates vehicle specification
   */
  static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    try {
      const res = await apiRequest<Vehicle>(`/admin/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.success && res.data) {
        const index = fallbackVehiclesData.findIndex((v) => v.id === id);
        if (index !== -1) fallbackVehiclesData[index] = res.data;
        return res.data;
      }
    } catch (err) {
      console.warn('[VehicleService] API error on updateVehicle:', err);
    }

    const index = fallbackVehiclesData.findIndex((v) => v.id === id);
    if (index === -1) return null;

    fallbackVehiclesData[index] = {
      ...fallbackVehiclesData[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return fallbackVehiclesData[index];
  }

  /**
   * Assigns an approved driver to a vehicle
   */
  static async assignDriver(vehicleId: string, driverId: string, notes?: string): Promise<Vehicle | null> {
    try {
      const res = await apiRequest<Vehicle>(`/admin/vehicles/${vehicleId}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, notes }),
      });

      if (res.success && res.data) {
        return this.getVehicleById(vehicleId);
      }
      if (res.error) {
        throw new Error(res.error);
      }
    } catch (err) {
      console.warn('[VehicleService] API error on assignDriver:', err);
      throw err;
    }

    return this.updateVehicle(vehicleId, { assignedDriverId: driverId, status: 'ASSIGNED' });
  }

  /**
   * Unassigns driver from vehicle
   */
  static async unassignDriver(vehicleId: string, notes?: string): Promise<Vehicle | null> {
    try {
      const res = await apiRequest<Vehicle>(`/admin/vehicles/${vehicleId}/unassign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (res.success && res.data) {
        return this.getVehicleById(vehicleId);
      }
    } catch (err) {
      console.warn('[VehicleService] API error on unassignDriver:', err);
    }

    return this.updateVehicle(vehicleId, {
      assignedDriverId: undefined,
      assignedDriverName: undefined,
      status: 'AVAILABLE',
    });
  }

  /**
   * Alias for addMaintenance
   */
  static async addMaintenanceRecord(vehicleId: string, maintenance: any) {
    return this.addMaintenance(vehicleId, maintenance);
  }

  /**
   * Records maintenance service
   */
  static async addMaintenance(
    vehicleId: string,
    maintenance: {
      maintenanceType: string;
      description: string;
      serviceCenter?: string;
      costETB?: number;
      mileageKm?: number;
      serviceDate: string;
      nextServiceDate?: string;
      status?: string;
      notes?: string;
    }
  ): Promise<any> {
    try {
      const res = await apiRequest<any>(`/admin/vehicles/${vehicleId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenance),
      });

      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[VehicleService] API error on addMaintenance:', err);
    }

    return {
      id: `maint_${Date.now()}`,
      ...maintenance,
      costETB: maintenance.costETB || 0,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Review a specific vehicle document
   */
  static async reviewVehicleDocument(
    vehicleId: string,
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ): Promise<Vehicle | null> {
    try {
      // 1. Try dedicated admin document verification endpoint
      let res = await apiRequest<any>(`/admin/documents/${documentId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });

      if (!res?.success) {
        res = await apiRequest<any>(`/admin/vehicles/${vehicleId}/documents/${documentId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(review),
        });
      }

      if (res?.success) {
        return this.getVehicleById(vehicleId);
      }
    } catch (err) {
      console.warn('[VehicleService] API error on reviewVehicleDocument:', err);
    }

    const vehicle = fallbackVehiclesData.find((v) => v.id === vehicleId || v.plateNumber === vehicleId);
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

  static async deleteVehicle(id: string): Promise<boolean> {
    const initialLen = fallbackVehiclesData.length;
    fallbackVehiclesData = fallbackVehiclesData.filter((v) => v.id !== id);
    return fallbackVehiclesData.length < initialLen;
  }
}
