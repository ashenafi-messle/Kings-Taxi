/**
 * Driver Entity & Operation Type Definitions
 */

export type DriverVerificationStatus = 'VERIFIED' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'DOCUMENT_REQUIRED';
export type DriverAvailabilityStatus = 'ONLINE' | 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'ON_TRIP' | 'SUSPENDED' | 'TEMPORARILY_UNAVAILABLE';
export type DocumentReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';

export interface DriverDocument {
  id: string;
  type?: string;
  documentType: 'DRIVING_LICENSE' | 'NATIONAL_ID' | 'POLICE_CLEARANCE' | 'PROFILE_PHOTO' | 'ROAD_TRANSPORT_BADGE' | string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl: string;
  publicId?: string;
  previewUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  status: DocumentReviewStatus;
  isVerified?: boolean;
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  driverId: string; // e.g. "DRV-1042"
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  city: string; // e.g., "Gondar", "Addis Ababa"
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  // Verification & Compliance
  licenseNumber: string;
  licenseExpiry: string;
  verificationStatus: DriverVerificationStatus;
  documents: DriverDocument[];

  totalTrips?: number;
  completionRate?: number;
  earningsETB?: number;

  // Operational Details
  availabilityStatus: DriverAvailabilityStatus;
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  assignedVehicleModel?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
    updatedAt: string;
  };

  // Performance & Stats
  rating: number; // e.g. 4.88
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalEarningsETB: number;
  distanceCoveredKm: number;

  createdAt: string;
  updatedAt: string;
}

export interface DriverFilterParams {
  search?: string;
  verificationStatus?: string;
  availabilityStatus?: string;
  city?: string;
  page?: number;
  limit?: number;
}

