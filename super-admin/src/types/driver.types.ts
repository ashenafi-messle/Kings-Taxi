/**
 * Driver Entity & Operation Type Definitions
 */

export type DriverVerificationStatus = 'VERIFIED' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'DOCUMENT_REQUIRED';
export type DriverAvailabilityStatus = 'ONLINE' | 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'ON_TRIP' | 'SUSPENDED' | 'TEMPORARILY_UNAVAILABLE';
export type DocumentReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
export type DriverOnboardingStatus =
  | 'PENDING_ONBOARDING'
  | 'ONBOARDING_EMAIL_SENT'
  | 'ONBOARDING_EMAIL_FAILED'
  | 'ACTIVE'
  | 'ONBOARDING_EXPIRED';
export type OnboardingEmailStatus = 'NOT_SENT' | 'PENDING' | 'SENT' | 'FAILED';

export interface DriverProvisioningResult {
  emailSent: boolean;
  onboardingStatus: DriverOnboardingStatus;
  onboardingEmailStatus: OnboardingEmailStatus;
  provider?: string;
  error?: string;
  deduplicated?: boolean;
}

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
  subcityId?: string | null;
  subcityName?: string | null;
  subcities?: Array<{
    id: string;
    name: string;
    slug?: string;
    city?: string;
    isPrimary?: boolean;
  }>;
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
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    make?: string;
    vehicleModel: string;
    vehicleColor?: string;
    vehicleType?: string;
    status?: string;
    verificationStatus?: string;
    assignmentStatus?: string;
    assignedAt?: string | null;
    assignedBy?: string | null;
  } | null;
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

  // Account Provisioning & Onboarding Lifecycle
  accountStatus?: string;
  mustChangePassword?: boolean;
  onboardingStatus?: DriverOnboardingStatus;
  onboardingEmailStatus?: OnboardingEmailStatus;
  onboardingEmailSentAt?: string | null;
  onboardingEmailLastAttemptAt?: string | null;
  onboardingEmailError?: string | null;
  tempPasswordExpiresAt?: string | null;
  accountProvisionedAt?: string | null;
  accountActivatedAt?: string | null;
  provisionedBy?: string | null;
  idempotencyKey?: string;
  provisioning?: DriverProvisioningResult;

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

