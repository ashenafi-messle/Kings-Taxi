import { Driver, DriverFilterParams, PaginatedResult } from '../types';
import { apiRequest } from './apiClient';
import { mockDrivers } from './mockData';

let fallbackDriversData: Driver[] = [...mockDrivers];

export class DriverService {
  /**
   * Retrieves paginated drivers from the central backend with filtering and search
   */
  static async getDrivers(params: DriverFilterParams = {}): Promise<PaginatedResult<Driver>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.verificationStatus && params.verificationStatus !== 'ALL') {
      query.set('verificationStatus', params.verificationStatus);
    }
    if (params.availabilityStatus && params.availabilityStatus !== 'ALL') {
      query.set('availabilityStatus', params.availabilityStatus);
    }
    if (params.city && params.city !== 'ALL') {
      query.set('city', params.city);
    }
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const endpoint = `/admin/drivers?${query.toString()}`;

    try {
      const res = await apiRequest<PaginatedResult<Driver>>(endpoint);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] API error, falling back to local dataset:', err);
    }

    // Fallback in-memory implementation for offline/local resilience
    let filtered = [...fallbackDriversData];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.driverId.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q))
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

  /**
   * Retrieves statistics summary for driver management operations
   */
  static async getStatistics(): Promise<{
    totalDrivers: number;
    approvedDrivers: number;
    pendingVerification: number;
    rejectedDrivers: number;
    suspendedDrivers: number;
    onlineDrivers: number;
    driversOnTrip: number;
    offlineDrivers: number;
  }> {
    try {
      const res = await apiRequest<{
        totalDrivers: number;
        approvedDrivers: number;
        pendingVerification: number;
        rejectedDrivers: number;
        suspendedDrivers: number;
        onlineDrivers: number;
        driversOnTrip: number;
        offlineDrivers: number;
      }>('/admin/drivers/statistics');

      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] Failed to load statistics from API:', err);
    }

    // Fallback calculation from local data
    const totalDrivers = fallbackDriversData.length;
    const approvedDrivers = fallbackDriversData.filter((d) => d.verificationStatus === 'APPROVED' || d.verificationStatus === 'VERIFIED').length;
    const pendingVerification = fallbackDriversData.filter((d) => d.verificationStatus === 'PENDING').length;
    const rejectedDrivers = fallbackDriversData.filter((d) => d.verificationStatus === 'REJECTED').length;
    const suspendedDrivers = fallbackDriversData.filter((d) => d.verificationStatus === 'SUSPENDED').length;
    const onlineDrivers = fallbackDriversData.filter((d) => d.availabilityStatus === 'ONLINE' || d.availabilityStatus === 'AVAILABLE').length;
    const driversOnTrip = fallbackDriversData.filter((d) => d.availabilityStatus === 'ON_TRIP').length;
    const offlineDrivers = fallbackDriversData.filter((d) => d.availabilityStatus === 'OFFLINE').length;

    return {
      totalDrivers,
      approvedDrivers,
      pendingVerification,
      rejectedDrivers,
      suspendedDrivers,
      onlineDrivers,
      driversOnTrip,
      offlineDrivers,
    };
  }

  /**
   * Retrieves single driver profile with full verification & vehicle details
   */
  static async getDriverById(id: string): Promise<Driver | null> {
    try {
      const res = await apiRequest<Driver>(`/admin/drivers/${id}`);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] API error on getDriverById:', err);
    }

    return fallbackDriversData.find((d) => d.id === id || d.driverId === id) || null;
  }

  /**
   * Registers a new driver in PostgreSQL through the central backend
   */
  static async createDriver(payload: Partial<Driver>): Promise<Driver> {
    try {
      const res = await apiRequest<Driver>('/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: payload.fullName,
          phone: payload.phone,
          email: payload.email,
          city: payload.city,
          address: payload.address,
          licenseNumber: payload.licenseNumber,
          licenseExpiry: payload.licenseExpiry,
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          emergencyContactName: payload.emergencyContact?.name,
          emergencyContactPhone: payload.emergencyContact?.phone,
          emergencyContactRelationship: payload.emergencyContact?.relationship,
          documents: payload.documents,
        }),
      });

      if (res.success && res.data) {
        fallbackDriversData = [res.data, ...fallbackDriversData];
        return res.data;
      }
      if (res.error) {
        throw new Error(res.error);
      }
    } catch (err) {
      console.warn('[DriverService] Failed to create driver via API:', err);
      throw err;
    }

    // Offline fallback
    const newId = `drv_${Date.now()}`;
    const newDriver: Driver = {
      id: newId,
      driverId: `DRV-${1050 + fallbackDriversData.length}`,
      fullName: payload.fullName || 'New Driver',
      email: payload.email || '',
      phone: payload.phone || '',
      city: payload.city || 'Gondar',
      licenseNumber: payload.licenseNumber || 'ETH-PENDING',
      licenseExpiry: payload.licenseExpiry || '2027-12-31',
      verificationStatus: payload.verificationStatus || 'PENDING',
      documents: payload.documents || [],
      availabilityStatus: 'OFFLINE',
      rating: 5.0,
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      totalEarningsETB: 0,
      distanceCoveredKm: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fallbackDriversData = [newDriver, ...fallbackDriversData];
    return newDriver;
  }

  /**
   * Updates driver profile
   */
  static async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver | null> {
    try {
      const res = await apiRequest<Driver>(`/admin/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.success && res.data) {
        const index = fallbackDriversData.findIndex((d) => d.id === id);
        if (index !== -1) fallbackDriversData[index] = res.data;
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] API error on updateDriver:', err);
    }

    const index = fallbackDriversData.findIndex((d) => d.id === id);
    if (index === -1) return null;

    fallbackDriversData[index] = {
      ...fallbackDriversData[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return fallbackDriversData[index];
  }

  /**
   * Updates driver verification status (APPROVED, REJECTED, SUSPENDED)
   */
  static async updateVerificationStatus(
    id: string,
    verificationStatus: string,
    rejectionReason?: string
  ): Promise<Driver | null> {
    try {
      const res = await apiRequest<Driver>(`/admin/drivers/${id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: verificationStatus, rejectionReason }),
      });

      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] API error on updateVerificationStatus:', err);
    }

    return this.updateDriver(id, { verificationStatus: verificationStatus as any });
  }

  /**
   * Updates driver account status (ACTIVE, SUSPENDED)
   */
  static async updateAccountStatus(id: string, accountStatus: string, reason?: string): Promise<Driver | null> {
    try {
      const res = await apiRequest<Driver>(`/admin/drivers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: accountStatus, reason }),
      });

      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] API error on updateAccountStatus:', err);
    }

    return this.updateDriver(id, {
      verificationStatus: accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'APPROVED',
    });
  }

  /**
   * Review a specific driver document
   */
  static async reviewDriverDocument(
    driverId: string,
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ): Promise<Driver | null> {
    try {
      // Review specific document endpoint
      const res = await apiRequest<any>(`/drivers/${driverId}/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });

      if (res.success) {
        return this.getDriverById(driverId);
      }
    } catch (err) {
      console.warn('[DriverService] API error on reviewDriverDocument:', err);
    }

    // Local fallback
    const driver = fallbackDriversData.find((d) => d.id === driverId || d.driverId === driverId);
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

    const hasRejection = driver.documents.some((d) => d.status === 'REJECTED');
    if (hasRejection) {
      driver.verificationStatus = 'REJECTED';
    } else {
      const requiredTypes = ['DRIVING_LICENSE', 'NATIONAL_ID', 'POLICE_CLEARANCE'];
      const approvedTypes = new Set(
        driver.documents.filter((d) => d.status === 'APPROVED').map((d) => d.documentType?.toUpperCase())
      );
      const allApproved = requiredTypes.every((t) => approvedTypes.has(t));
      driver.verificationStatus = allApproved ? 'APPROVED' : 'PENDING';
    }

    driver.updatedAt = new Date().toISOString();
    return driver;
  }

  /**
   * Alias for getEligibleDrivers for vehicle assignment pairing
   */
  static async getAssignmentCandidates(vehicleId?: string): Promise<Array<{
    id: string;
    driverId: string;
    fullName: string;
    phone: string;
    rating: number;
    verificationStatus: string;
    isCurrentlyAssigned: boolean;
    city?: string;
  }>> {
    const list = await this.getEligibleDrivers(vehicleId);
    return list.map((item) => {
      const match = fallbackDriversData.find((d) => d.id === item.id);
      return {
        ...item,
        city: match?.city || 'Gondar',
      };
    });
  }

  /**
   * Gets eligible drivers available for vehicle assignment
   */
  static async getEligibleDrivers(vehicleId?: string): Promise<Array<{
    id: string;
    driverId: string;
    fullName: string;
    phone: string;
    rating: number;
    verificationStatus: string;
    isCurrentlyAssigned: boolean;
  }>> {
    try {
      const endpoint = vehicleId ? `/admin/drivers/eligible?vehicleId=${vehicleId}` : '/admin/drivers/eligible';
      const res = await apiRequest<any[]>(endpoint);
      if (res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[DriverService] Failed to load eligible drivers from API:', err);
    }

    return fallbackDriversData
      .filter((d) => d.verificationStatus === 'APPROVED' || d.verificationStatus === 'VERIFIED')
      .map((d) => ({
        id: d.id,
        driverId: d.driverId,
        fullName: d.fullName,
        phone: d.phone,
        rating: d.rating,
        verificationStatus: d.verificationStatus,
        isCurrentlyAssigned: !!d.assignedVehicleId,
      }));
  }
}
