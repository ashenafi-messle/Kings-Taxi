/**
 * Vehicle Entity & Fleet Management Type Definitions
 */

export type VehicleCategory =
  | 'STANDARD_SEDAN'
  | 'LUXURY_VIP'
  | 'TOURISM_4WD'
  | 'MINIVAN_GROUP'
  | 'COMFORT_VAN'
  | 'EXECUTIVE'
  | 'MINIVAN_TOUR'
  | 'SUV'
  | 'MINIBUS'
  | 'SEDAN_STANDARD'
  | 'LUXURY_EXECUTIVE'
  | 'SUV_PREMIUM'
  | 'VAN_TOURISM'
  | 'AIRPORT_SHUTTLE';
export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'UNDER_MAINTENANCE' | 'INACTIVE' | 'ACTIVE' | 'MAINTENANCE';
export type VehicleVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VehicleDocumentType =
  | 'REGISTRATION_CERTIFICATE'
  | 'VEHICLE_TITLE_LIBRE'
  | 'INSURANCE_CERTIFICATE'
  | 'ANNUAL_INSPECTION_BOLO'
  | 'VEHICLE_COMMERCIAL_PERMIT';

export interface VehicleDocument {
  id: string;
  vehicleId?: string;
  documentType: VehicleDocumentType | string;
  documentNumber?: string;
  fileUrl: string;
  publicId?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  expiryDate?: string;
  createdAt?: string;
}

export interface VehicleMaintenanceRecord {
  id: string;
  serviceDate: string;
  description: string;
  costETB: number;
  serviceCenter: string;
  mileageKm: number;
}

export interface Vehicle {
  id: string;
  plateNumber: string; // e.g. "3-A42159-ET"
  vinNumber?: string;
  make: string; // e.g. "Toyota"
  model: string; // e.g. "Corolla Executive"
  year: number; // e.g. 2024
  color: string;
  category: VehicleCategory;
  categoryName: string;
  capacity: number; // seating capacity
  imageUrl?: string;
  
  // Status & Assignment
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignmentStatus?: 'ASSIGNED' | 'UNASSIGNED';
  assignedAt?: string | null;
  assignedBy?: string | null;
  
  // Insurance & Compliance
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  isVerified: boolean;
  verificationStatus?: VehicleVerificationStatus;
  documents?: VehicleDocument[];
  
  // Metrics
  mileageKm: number;
  fuelType: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  maintenanceRecords: VehicleMaintenanceRecord[];
  
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilterParams {
  search?: string;
  category?: string;
  status?: string;
  isAssigned?: string;
  page?: number;
  limit?: number;
}

