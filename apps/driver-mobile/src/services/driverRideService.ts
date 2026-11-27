import { DRIVER_API_ENDPOINTS } from '../config/api';
import { driverApiRequest } from './apiClient';

export interface BackendRideRequestDto {
  id: string;
  bookingReference: string;
  status: 'REQUESTED' | 'DRIVER_ASSIGNED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'TRIP_COMPLETED' | string;
  passengerId: string;
  driverId: string | null;
  subcityId: string | null;
  subcityName: string | null;
  passengerName: string;
  passengerAvatar: string | null;
  passengerContactPhone: string | null;
  pickupLocation: string;
  destinationLocation: string;
  additionalInstructions: string | null;
  createdAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
}

export interface DriverAvailabilityStateDto {
  id: string;
  availabilityStatus: string;
  isOnline: boolean;
  isSocketConnected: boolean;
  lastHeartbeatAt: string | null;
  primarySubcity: { id: string; name: string; slug: string; city: string } | null;
  subcities: Array<{ id: string; name: string; slug: string; city: string; isPrimary: boolean }>;
  activeRequest: { id: string; bookingReference: string; bookingStatus: string; expiresAt: string | null } | null;
}

export const driverRideService = {
  getMyAvailability(): Promise<DriverAvailabilityStateDto> {
    return driverApiRequest<DriverAvailabilityStateDto>(DRIVER_API_ENDPOINTS.availabilityMe, {
      method: 'GET',
    });
  },

  goOnline(): Promise<{ id: string; availabilityStatus: string }> {
    return driverApiRequest<{ id: string; availabilityStatus: string }>(
      DRIVER_API_ENDPOINTS.availabilityOnline,
      { method: 'POST' }
    );
  },

  goOffline(): Promise<{ id: string; availabilityStatus: string }> {
    return driverApiRequest<{ id: string; availabilityStatus: string }>(
      DRIVER_API_ENDPOINTS.availabilityOffline,
      { method: 'POST' }
    );
  },

  getPendingRequests(): Promise<BackendRideRequestDto[]> {
    return driverApiRequest<BackendRideRequestDto[]>(DRIVER_API_ENDPOINTS.pendingRequests, {
      method: 'GET',
    });
  },

  getCurrentRequest(): Promise<BackendRideRequestDto | null> {
    return driverApiRequest<BackendRideRequestDto | null>(DRIVER_API_ENDPOINTS.currentRequest, {
      method: 'GET',
    });
  },

  getRequestHistory(page = 1, limit = 20): Promise<{ items: BackendRideRequestDto[]; total: number }> {
    return driverApiRequest<{ items: BackendRideRequestDto[]; total: number }>(
      `${DRIVER_API_ENDPOINTS.requestHistory}?page=${page}&limit=${limit}`,
      { method: 'GET' }
    );
  },

  acceptRequest(requestId: string): Promise<BackendRideRequestDto> {
    return driverApiRequest<BackendRideRequestDto>(DRIVER_API_ENDPOINTS.acceptRequest(requestId), {
      method: 'POST',
    });
  },

  rejectRequest(requestId: string, reason?: string): Promise<BackendRideRequestDto> {
    return driverApiRequest<BackendRideRequestDto>(DRIVER_API_ENDPOINTS.rejectRequest(requestId), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
