import crypto from 'crypto';
import { prisma } from '../../core/database/prisma';
import {
  VehicleOperationalStatus,
  VehicleVerificationStatus,
  VehicleType,
  AccountStatus,
  DriverVerificationStatus,
  DriverAvailabilityStatus,
  ActorType,
} from '@prisma/client';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { ACTIVE_RIDE_BOOKING_STATUSES, emitAvailabilityChanged } from '../realtime/rideSocket';
import {
  validateAndUploadDocument,
  cleanupUploadedAssets,
  UploadedAssetReference,
} from '../../utils/documentStorage';

export interface VehicleListParams {
  search?: string;
  category?: string;
  status?: string;
  verificationStatus?: string;
  isAssigned?: string | boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Normalizes input vehicle category / vehicleType strings into valid Prisma VehicleType enums.
 * Supports legacy frontend category codes and common synonyms for full compatibility.
 * Throws AppError(..., 400) when an unrecognized category is provided.
 */
export function normalizeVehicleType(rawType?: string | null): VehicleType {
  if (!rawType || !String(rawType).trim()) {
    return VehicleType.STANDARD_SEDAN;
  }

  const clean = String(rawType).trim().toUpperCase();

  // Direct match to enum
  if (Object.values(VehicleType).includes(clean as VehicleType)) {
    return clean as VehicleType;
  }

  // Synonym mappings for frontend compatibility and legacy categories
  const synonymMap: Record<string, VehicleType> = {
    SEDAN_STANDARD: VehicleType.STANDARD_SEDAN,
    SEDAN: VehicleType.STANDARD_SEDAN,
    STANDARD: VehicleType.STANDARD_SEDAN,
    LUXURY_EXECUTIVE: VehicleType.LUXURY_VIP,
    VIP: VehicleType.LUXURY_VIP,
    LUXURY: VehicleType.LUXURY_VIP,
    EXECUTIVE_LUXURY: VehicleType.LUXURY_VIP,
    SUV_PREMIUM: VehicleType.SUV,
    '4WD': VehicleType.TOURISM_4WD,
    TOURISM: VehicleType.TOURISM_4WD,
    VAN_TOURISM: VehicleType.MINIVAN_GROUP,
    VAN: VehicleType.COMFORT_VAN,
    AIRPORT_SHUTTLE: VehicleType.MINIVAN_GROUP,
    GROUP_SHUTTLE: VehicleType.MINIVAN_GROUP,
    MINIVAN: VehicleType.MINIVAN_GROUP,
    BUS: VehicleType.MINIBUS,
  };

  if (synonymMap[clean]) {
    return synonymMap[clean];
  }

  const allowed = Object.values(VehicleType).join(', ');
  throw new AppError(`Invalid vehicle category "${rawType}". Allowed categories: ${allowed}`, 400);
}

/**
 * Gets a clean human-readable display name for a given VehicleType.
 */
export function getCategoryDisplayName(type: VehicleType): string {
  switch (type) {
    case VehicleType.STANDARD_SEDAN:
      return 'Standard Sedan';
    case VehicleType.LUXURY_VIP:
      return 'Luxury VIP';
    case VehicleType.TOURISM_4WD:
      return 'Tourism 4WD';
    case VehicleType.MINIVAN_GROUP:
      return 'Minivan Group';
    case VehicleType.COMFORT_VAN:
      return 'Comfort Van';
    case VehicleType.EXECUTIVE:
      return 'Executive';
    case VehicleType.MINIVAN_TOUR:
      return 'Minivan Tour';
    case VehicleType.SUV:
      return 'SUV Premium';
    case VehicleType.MINIBUS:
      return 'Minibus';
    default:
      return String(type).replace(/_/g, ' ');
  }
}

export interface CreateVehiclePayload {
  plateNumber: string;
  vinNumber?: string;
  make?: string;
  model: string;
  year?: number;
  color?: string;
  category?: VehicleType | string;
  vehicleType?: VehicleType | string;
  categoryName?: string;
  capacity?: number;
  fuelType?: string;
  transmission?: string;
  mileageKm?: number;
  imageUrl?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  assignedDriverId?: string;
  documents?: Array<{
    documentType: string;
    documentNumber?: string;
    fileUrl: string;
    publicId?: string;
    fileName?: string;
    fileFormat?: string;
    fileSize?: number;
    expiryDate?: string;
  }>;
}

export interface UpdateVehiclePayload {
  plateNumber?: string;
  vinNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  category?: VehicleType | string;
  vehicleType?: VehicleType | string;
  categoryName?: string;
  capacity?: number;
  fuelType?: string;
  transmission?: string;
  mileageKm?: number;
  imageUrl?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  status?: VehicleOperationalStatus;
  verificationStatus?: VehicleVerificationStatus;
}

export interface CreateMaintenancePayload {
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

export class AdminVehicleService {
  /**
   * Alias for listVehicles
   */
  async getVehicles(params: VehicleListParams) {
    return this.listVehicles(params);
  }

  /**
   * Alias for getVehicleStatistics
   */
  async getFleetStatistics() {
    return this.getVehicleStatistics();
  }

  /**
   * List vehicles with searching, filtering, and database pagination
   */
  async listVehicles(params: VehicleListParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { plateNumber: { contains: q, mode: 'insensitive' } },
        { vinNumber: { contains: q, mode: 'insensitive' } },
        { vehicleModel: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { driver: { fullName: { contains: q, mode: 'insensitive' } } },
        { assignments: { some: { isActive: true, driver: { fullName: { contains: q, mode: 'insensitive' } } } } },
      ];
    }

    if (params.category && params.category !== 'ALL') {
      try {
        where.vehicleType = normalizeVehicleType(params.category);
      } catch {
        where.vehicleType = params.category as VehicleType;
      }
    }

    if (params.status && params.status !== 'ALL') {
      where.status = params.status as VehicleOperationalStatus;
    }

    if (params.verificationStatus && params.verificationStatus !== 'ALL') {
      where.verificationStatus = params.verificationStatus as VehicleVerificationStatus;
    }

    if (params.isAssigned !== undefined && params.isAssigned !== 'ALL') {
      const assigned = params.isAssigned === true || params.isAssigned === 'true';
      if (assigned) {
        where.driverId = { not: null };
      } else {
        where.driverId = null;
      }
    }

    const orderBy: any = {};
    const sortField = params.sortBy || 'createdAt';
    const orderDirection = params.sortOrder === 'asc' ? 'asc' : 'desc';

    if (['plateNumber', 'createdAt', 'manufacturingYear', 'mileageKm'].includes(sortField)) {
      orderBy[sortField] = orderDirection;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              rating: true,
              verificationStatus: true,
              profileImage: true,
            },
          },
          assignments: {
            where: { isActive: true },
            take: 1,
            include: {
              driver: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              documentNumber: true,
              status: true,
              expiryDate: true,
            },
          },
          maintenances: {
            orderBy: { serviceDate: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const items = vehicles.map((v) => {
      const activeDriver = v.assignments?.[0]?.driver || v.driver;

      return {
        id: v.id,
        plateNumber: v.plateNumber,
        vinNumber: v.vinNumber || '',
        make: v.make,
        model: v.vehicleModel,
        year: v.manufacturingYear,
        color: v.vehicleColor,
        category: v.vehicleType,
        categoryName: v.categoryName || v.vehicleType.replace(/_/g, ' '),
        capacity: v.seatingCapacity,
        imageUrl: v.imageUrl,
        status: v.status,
        verificationStatus: v.verificationStatus,
        isVerified: v.verificationStatus === VehicleVerificationStatus.VERIFIED,
        isActive: v.isActive,
        fuelType: v.fuelType,
        transmission: v.transmission,
        mileageKm: v.mileageKm,
        insurancePolicyNumber: v.insurancePolicyNumber,
        insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.toISOString().split('T')[0] : '',
        inspectionExpiry: v.inspectionExpiry ? v.inspectionExpiry.toISOString().split('T')[0] : '',
        assignedDriverId: activeDriver?.id,
        assignedDriverName: activeDriver?.fullName,
        assignedDriverPhone: activeDriver?.phoneNumber,
        assignmentStatus: activeDriver ? 'ASSIGNED' : 'UNASSIGNED',
        assignedAt: v.assignments?.[0]?.assignedAt ? v.assignments[0].assignedAt.toISOString() : null,
        assignedBy: v.assignments?.[0]?.assignedBy || null,
        documentsCount: v.documents?.length || 0,
        lastMaintenanceDate: v.maintenances?.[0]?.serviceDate ? v.maintenances[0].serviceDate.toISOString().split('T')[0] : undefined,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Aggregate statistics for vehicle fleet management
   */
  async getVehicleStatistics() {
    const [
      totalVehicles,
      activeVehicles,
      availableVehicles,
      assignedVehicles,
      maintenanceVehicles,
      pendingVehicles,
      suspendedVehicles,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: VehicleOperationalStatus.ACTIVE } }),
      prisma.vehicle.count({ where: { status: VehicleOperationalStatus.AVAILABLE } }),
      prisma.vehicle.count({
        where: {
          OR: [
            { status: VehicleOperationalStatus.ASSIGNED },
            { driverId: { not: null } },
          ],
        },
      }),
      prisma.vehicle.count({ where: { status: VehicleOperationalStatus.UNDER_MAINTENANCE } }),
      prisma.vehicle.count({ where: { verificationStatus: VehicleVerificationStatus.PENDING } }),
      prisma.vehicle.count({ where: { status: VehicleOperationalStatus.SUSPENDED } }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      availableVehicles,
      assignedVehicles,
      underMaintenance: maintenanceVehicles,
      pendingVerification: pendingVehicles,
      suspendedVehicles,
    };
  }

  /**
   * Get single vehicle details by ID
   */
  async getVehicleById(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            rating: true,
            profileImage: true,
            verificationStatus: true,
            availabilityStatus: true,
          },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            driver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        maintenances: {
          orderBy: { serviceDate: 'desc' },
        },
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const activeAssignment = vehicle.assignments.find((a) => a.isActive);
    const assignedDriver = activeAssignment?.driver || vehicle.driver;

    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      vinNumber: vehicle.vinNumber || '',
      make: vehicle.make,
      model: vehicle.vehicleModel,
      year: vehicle.manufacturingYear,
      color: vehicle.vehicleColor,
      category: vehicle.vehicleType,
      categoryName: vehicle.categoryName || vehicle.vehicleType.replace(/_/g, ' '),
      capacity: vehicle.seatingCapacity,
      imageUrl: vehicle.imageUrl,
      status: vehicle.status,
      verificationStatus: vehicle.verificationStatus,
      isVerified: vehicle.verificationStatus === VehicleVerificationStatus.VERIFIED,
      isActive: vehicle.isActive,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      mileageKm: vehicle.mileageKm,
      insurancePolicyNumber: vehicle.insurancePolicyNumber,
      insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.toISOString().split('T')[0] : '',
      inspectionExpiry: vehicle.inspectionExpiry ? vehicle.inspectionExpiry.toISOString().split('T')[0] : '',
      assignedDriverId: assignedDriver?.id,
      assignedDriverName: assignedDriver?.fullName,
      assignedDriverPhone: assignedDriver?.phoneNumber,
      assignedDriver,
      documents: (vehicle.documents || []).map((doc: any) => ({
        ...doc,
        previewUrl: `/api/v1/admin/documents/${doc.id}/preview`,
        downloadUrl: `/api/v1/admin/documents/${doc.id}/download`,
      })),
      assignmentHistory: vehicle.assignments,
      maintenanceRecords: vehicle.maintenances,
      recentTrips: vehicle.trips,
      rejectionReason: vehicle.rejectionReason,
      suspensionReason: vehicle.suspensionReason,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }

  /**
   * Register a new vehicle in fleet
   */
  async createVehicle(payload: CreateVehiclePayload, adminIdentifier: string) {
    const cleanPlate = payload.plateNumber.trim().toUpperCase();

    // Normalize and validate service category
    const rawCategory = payload.category || (payload as any).vehicleType;
    const vehicleType = normalizeVehicleType(rawCategory);
    const categoryName = payload.categoryName || getCategoryDisplayName(vehicleType);

    // Verify plate uniqueness
    const existingPlate = await prisma.vehicle.findUnique({
      where: { plateNumber: cleanPlate },
    });
    if (existingPlate) {
      throw new AppError(`A vehicle with plate number ${cleanPlate} already exists.`, 409);
    }

    // Verify VIN uniqueness if provided
    let cleanVin: string | undefined = undefined;
    if (payload.vinNumber && payload.vinNumber.trim()) {
      cleanVin = payload.vinNumber.trim().toUpperCase();
      const existingVin = await prisma.vehicle.findUnique({
        where: { vinNumber: cleanVin },
      });
      if (existingVin) {
        throw new AppError(`A vehicle with VIN number ${cleanVin} already exists.`, 409);
      }
    }

    const vehicleId = crypto.randomUUID();

    // Pre-process, validate and upload any documents/image to storage before database transaction
    const processedDocuments: Array<{
      documentType: string;
      documentNumber?: string | null;
      fileUrl: string;
      publicId?: string | null;
      fileName?: string | null;
      fileFormat?: string | null;
      fileSize?: number | null;
      expiryDate?: Date | null;
    }> = [];
    const uploadedAssets: UploadedAssetReference[] = [];

    let cleanImageUrl = payload.imageUrl || null;
    if (cleanImageUrl && (cleanImageUrl.startsWith('data:') || cleanImageUrl.length > 512)) {
      try {
        const imgUpload = await validateAndUploadDocument(cleanImageUrl, {
          folder: `kings-taxi/vehicles/${vehicleId}/images`,
          publicIdPrefix: 'photo',
          fileName: 'vehicle-photo.jpg',
        });
        cleanImageUrl = imgUpload.fileUrl;
        if (imgUpload.isUploaded && imgUpload.publicId) {
          uploadedAssets.push({
            publicId: imgUpload.publicId,
            resourceType: imgUpload.resourceType,
          });
        }
      } catch (imgErr: any) {
        logger.warn({ error: imgErr.message }, '[AdminVehicleService] Vehicle photo upload failed, skipping');
      }
    }

    if (payload.documents && payload.documents.length > 0) {
      for (const doc of payload.documents) {
        if (!doc.fileUrl) continue;
        const uploadResult = await validateAndUploadDocument(doc.fileUrl, {
          folder: `kings-taxi/vehicles/${vehicleId}/documents`,
          publicIdPrefix: (doc.documentType || 'VDOC').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          fileName: doc.fileName,
          declaredFormat: doc.fileFormat,
          declaredSize: doc.fileSize,
        });

        if (uploadResult.isUploaded && uploadResult.publicId) {
          uploadedAssets.push({
            publicId: uploadResult.publicId,
            resourceType: uploadResult.resourceType,
          });
        }

        processedDocuments.push({
          documentType: String(doc.documentType || 'DOCUMENT').slice(0, 64),
          documentNumber: doc.documentNumber ? String(doc.documentNumber).slice(0, 128) : null,
          fileUrl: uploadResult.fileUrl,
          publicId: uploadResult.publicId ? String(uploadResult.publicId).slice(0, 255) : (doc.publicId ? String(doc.publicId).slice(0, 255) : null),
          fileName: doc.fileName ? String(doc.fileName).slice(0, 255) : null,
          fileFormat: uploadResult.fileFormat ? String(uploadResult.fileFormat).slice(0, 32) : (doc.fileFormat ? String(doc.fileFormat).slice(0, 32) : null),
          fileSize: uploadResult.fileSize || doc.fileSize || null,
          expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
        });
      }
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const v = await tx.vehicle.create({
          data: {
            id: vehicleId,
            plateNumber: cleanPlate,
            vinNumber: cleanVin || null,
            make: payload.make || 'Toyota',
            vehicleModel: payload.model.trim(),
            manufacturingYear: payload.year ? Number(payload.year) : 2022,
            vehicleColor: payload.color || 'White',
            vehicleType,
            categoryName,
            seatingCapacity: payload.capacity ? Number(payload.capacity) : 4,
            status: VehicleOperationalStatus.AVAILABLE,
            verificationStatus: VehicleVerificationStatus.PENDING,
            isActive: true,
            fuelType: payload.fuelType || 'PETROL',
            transmission: payload.transmission || 'AUTOMATIC',
            mileageKm: payload.mileageKm ? Number(payload.mileageKm) : 0,
            imageUrl: cleanImageUrl,
            insurancePolicyNumber: payload.insurancePolicyNumber || null,
            insuranceExpiry: payload.insuranceExpiry ? new Date(payload.insuranceExpiry) : null,
            inspectionExpiry: payload.inspectionExpiry ? new Date(payload.inspectionExpiry) : null,
          },
        });

        // Insert initial vehicle documents with clean storage URLs
        for (const doc of processedDocuments) {
          await tx.vehicleDocument.create({
            data: {
              vehicleId: v.id,
              documentType: doc.documentType,
              documentNumber: doc.documentNumber,
              fileUrl: doc.fileUrl,
              publicId: doc.publicId,
              fileName: doc.fileName,
              fileFormat: doc.fileFormat,
              fileSize: doc.fileSize,
              expiryDate: doc.expiryDate,
            },
          });
        }

        // Initial assignment if requested and driver is eligible
        if (payload.assignedDriverId) {
          const driver = await tx.driver.findUnique({ where: { id: payload.assignedDriverId } });
          if (driver && driver.verificationStatus === DriverVerificationStatus.APPROVED) {
            await (tx as any).vehicleAssignment.create({
              data: {
                vehicleId: v.id,
                driverId: driver.id,
                assignedBy: adminIdentifier,
                isActive: true,
                notes: 'Initial assignment upon vehicle registration',
              },
            });
            await tx.vehicle.update({
              where: { id: v.id },
              data: {
                driverId: driver.id,
                status: VehicleOperationalStatus.ASSIGNED,
              },
            });
          }
        }

        return v;
      });

      logger.info({ vehicleId: created.id, plate: cleanPlate, admin: adminIdentifier }, '[AdminVehicleService] Vehicle created successfully');
      return this.getVehicleById(created.id);
    } catch (txError: any) {
      if (uploadedAssets.length > 0) {
        await cleanupUploadedAssets(uploadedAssets);
      }
      throw txError;
    }
  }

  /**
   * Update vehicle specification
   */
  async updateVehicle(vehicleId: string, payload: UpdateVehiclePayload, adminIdentifier: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const data: any = {};
    if (payload.make) data.make = payload.make;
    if (payload.model) data.vehicleModel = payload.model;
    if (payload.color) data.vehicleColor = payload.color;
    if (payload.year) data.manufacturingYear = Number(payload.year);
    if (payload.capacity) data.seatingCapacity = Number(payload.capacity);
    const rawCategory = payload.category || (payload as any).vehicleType;
    if (rawCategory) {
      const vType = normalizeVehicleType(rawCategory);
      data.vehicleType = vType;
      if (!payload.categoryName) {
        data.categoryName = getCategoryDisplayName(vType);
      }
    }
    if (payload.categoryName !== undefined) data.categoryName = payload.categoryName;
    if (payload.fuelType) data.fuelType = payload.fuelType;
    if (payload.transmission) data.transmission = payload.transmission;
    if (payload.mileageKm !== undefined) data.mileageKm = Number(payload.mileageKm);
    if (payload.imageUrl !== undefined) data.imageUrl = payload.imageUrl;
    if (payload.insurancePolicyNumber !== undefined) data.insurancePolicyNumber = payload.insurancePolicyNumber;
    if (payload.insuranceExpiry) data.insuranceExpiry = new Date(payload.insuranceExpiry);
    if (payload.inspectionExpiry) data.inspectionExpiry = new Date(payload.inspectionExpiry);

    if (payload.plateNumber) {
      const cleanPlate = payload.plateNumber.trim().toUpperCase();
      if (cleanPlate !== vehicle.plateNumber) {
        const dup = await prisma.vehicle.findUnique({ where: { plateNumber: cleanPlate } });
        if (dup) throw new AppError('Plate number already in use by another vehicle', 409);
        data.plateNumber = cleanPlate;
      }
    }

    if (payload.vinNumber) {
      const cleanVin = payload.vinNumber.trim().toUpperCase();
      if (cleanVin !== vehicle.vinNumber) {
        const dup = await prisma.vehicle.findUnique({ where: { vinNumber: cleanVin } });
        if (dup) throw new AppError('VIN number already in use by another vehicle', 409);
        data.vinNumber = cleanVin;
      }
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data,
    });

    logger.info({ vehicleId, admin: adminIdentifier }, '[AdminVehicleService] Vehicle specifications updated');
    return this.getVehicleById(vehicleId);
  }

  /**
   * Update Vehicle Status (AVAILABLE, ACTIVE, UNDER_MAINTENANCE, SUSPENDED, INACTIVE)
   */
  async updateVehicleStatus(
    vehicleId: string,
    newStatus: VehicleOperationalStatus,
    reason?: string,
    adminIdentifier?: string
  ) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const updateData: any = { status: newStatus };

    if (newStatus === VehicleOperationalStatus.UNDER_MAINTENANCE) {
      updateData.suspensionReason = reason || 'Vehicle undergoing maintenance';
    } else if (newStatus === VehicleOperationalStatus.SUSPENDED) {
      updateData.suspensionReason = reason || 'Vehicle suspended by Super Admin';
    } else if (newStatus === VehicleOperationalStatus.ACTIVE || newStatus === VehicleOperationalStatus.AVAILABLE) {
      updateData.suspensionReason = null;
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
    });

    logger.info({ vehicleId, status: newStatus, admin: adminIdentifier }, '[AdminVehicleService] Vehicle status updated');
    return this.getVehicleById(vehicleId);
  }

  /**
   * Update Vehicle Verification Status
   */
  async updateVehicleVerification(
    vehicleId: string,
    newStatus: VehicleVerificationStatus,
    rejectionReason?: string,
    adminIdentifier?: string
  ) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const updateData: any = { verificationStatus: newStatus };

    if (newStatus === VehicleVerificationStatus.VERIFIED) {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = adminIdentifier || 'Super Admin';
      updateData.rejectionReason = null;
      if (vehicle.status === VehicleOperationalStatus.INACTIVE) {
        updateData.status = VehicleOperationalStatus.AVAILABLE;
      }
    } else if (newStatus === VehicleVerificationStatus.REJECTED) {
      updateData.rejectionReason = rejectionReason || 'Vehicle documents rejected';
      updateData.status = VehicleOperationalStatus.INACTIVE;
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
    });

    return this.getVehicleById(vehicleId);
  }

  /**
   * Searchable, paginated list of operationally eligible, unassigned vehicles.
   */
  async getAssignableVehicles(params: { search?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      verificationStatus: VehicleVerificationStatus.VERIFIED,
      status: { in: [VehicleOperationalStatus.AVAILABLE, VehicleOperationalStatus.ACTIVE] },
      driverId: null,
      assignments: { none: { isActive: true } },
    };

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { plateNumber: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { vehicleModel: { contains: q, mode: 'insensitive' } },
        { vinNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ plateNumber: 'asc' }],
        select: {
          id: true,
          plateNumber: true,
          vinNumber: true,
          make: true,
          vehicleModel: true,
          manufacturingYear: true,
          vehicleColor: true,
          vehicleType: true,
          categoryName: true,
          seatingCapacity: true,
          status: true,
          verificationStatus: true,
        },
      }),
    ]);

    return {
      items: items.map((v) => ({
        id: v.id,
        plateNumber: v.plateNumber,
        vinNumber: v.vinNumber || null,
        make: v.make,
        model: v.vehicleModel,
        year: v.manufacturingYear,
        color: v.vehicleColor,
        vehicleType: v.vehicleType,
        categoryName: v.categoryName || getCategoryDisplayName(v.vehicleType),
        capacity: v.seatingCapacity,
        status: v.status,
        verificationStatus: v.verificationStatus,
        isAssigned: false,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Atomic Driver-to-Vehicle Assignment
   */
  async assignDriverToVehicle(
    vehicleId: string,
    driverId: string,
    adminIdentifier: string,
    notes?: string,
    options: { allowReplaceDriverVehicle?: boolean; actorId?: string } = { allowReplaceDriverVehicle: true }
  ) {
    if (!vehicleId?.trim() || !driverId?.trim()) {
      throw new AppError('Invalid driver or vehicle identifier.', 400, 'VALIDATION_ERROR');
    }

    const allowReplace = options.allowReplaceDriverVehicle ?? true;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Validate vehicle
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');

      if (vehicle.isActive === false) {
        throw new AppError('Cannot assign an inactive vehicle.', 400, 'VEHICLE_INACTIVE');
      }
      if (vehicle.verificationStatus && vehicle.verificationStatus !== VehicleVerificationStatus.VERIFIED) {
        throw new AppError('Vehicle must be VERIFIED before assignment.', 400, 'VEHICLE_NOT_VERIFIED');
      }
      if (
        vehicle.status !== VehicleOperationalStatus.AVAILABLE &&
        vehicle.status !== VehicleOperationalStatus.ACTIVE
      ) {
        throw new AppError(
          `Cannot assign vehicle with status '${vehicle.status}'. Vehicle must be AVAILABLE or ACTIVE.`,
          409,
          'VEHICLE_UNAVAILABLE'
        );
      }

      // Verify vehicle has no conflicting active assignment to another driver
      const vehicleActiveAssignment = await (tx as any).vehicleAssignment.findFirst({
        where: { vehicleId, isActive: true },
      });
      if (
        (vehicle.driverId && vehicle.driverId !== driverId) ||
        (vehicleActiveAssignment && vehicleActiveAssignment.driverId !== driverId)
      ) {
        throw new AppError('Selected vehicle is already assigned to another driver.', 409, 'VEHICLE_ALREADY_ASSIGNED');
      }

      // 2. Validate driver
      const driver = await tx.driver.findUnique({ where: { id: driverId } });
      if (!driver || driver.deletedAt) throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');

      if (driver.verificationStatus !== DriverVerificationStatus.APPROVED) {
        throw new AppError('Driver must be APPROVED before being assigned to a vehicle.', 400, 'DRIVER_NOT_APPROVED');
      }
      if (driver.accountStatus && driver.accountStatus !== AccountStatus.ACTIVE) {
        throw new AppError('Driver account must be ACTIVE before vehicle assignment.', 400, 'DRIVER_NOT_ACTIVE');
      }

      // 3. Check driver's existing active assignment
      const driverActiveAssignment = await (tx as any).vehicleAssignment.findFirst({
        where: { driverId, isActive: true },
      });

      if (driverActiveAssignment && driverActiveAssignment.vehicleId !== vehicleId) {
        if (!allowReplace) {
          throw new AppError(
            'Driver already has an active vehicle assignment. Use Change Vehicle instead.',
            409,
            'DRIVER_ALREADY_ASSIGNED'
          );
        }

        const activeBookings = (await tx.booking?.count?.({
          where: { driverId, bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES } },
        })) ?? 0;
        if (activeBookings > 0) {
          throw new AppError(
            'Cannot change vehicle while driver has an active ride or pending ride request.',
            409,
            'ACTIVE_RIDE_CONFLICT'
          );
        }

        await (tx as any).vehicleAssignment.updateMany({
          where: { driverId, isActive: true },
          data: {
            isActive: false,
            unassignedAt: now,
            unassignedBy: adminIdentifier,
            notes: notes || 'Reassigned to another vehicle',
          },
        });

        await tx.vehicle.updateMany({
          where: { driverId, id: { not: vehicleId } },
          data: {
            driverId: null,
            status: VehicleOperationalStatus.AVAILABLE,
          },
        });
      }

      // 4. Create new active assignment if not already active on this exact pair
      let assignment = driverActiveAssignment?.vehicleId === vehicleId ? driverActiveAssignment : null;
      if (!assignment) {
        assignment = await (tx as any).vehicleAssignment.create({
          data: {
            vehicleId,
            driverId,
            assignedBy: adminIdentifier,
            assignedAt: now,
            isActive: true,
            notes: notes || (driverActiveAssignment ? 'Vehicle changed by administrator' : 'Assigned by administrator'),
          },
        });
      }

      // 5. Update vehicle status and assigned driverId
      const updatedVehicle = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          driverId,
          status: VehicleOperationalStatus.ASSIGNED,
        },
      });

      // 6. Audit Log
      await tx.auditLog?.create?.({
        data: {
          driverId,
          actorId: options.actorId || null,
          actorType: ActorType.ADMIN,
          action: driverActiveAssignment ? 'DRIVER_VEHICLE_CHANGED' : 'DRIVER_VEHICLE_ASSIGNED',
          entityType: 'VehicleAssignment',
          entityId: assignment.id,
          metadata: {
            vehicleId,
            plateNumber: vehicle.plateNumber,
            previousVehicleId: driverActiveAssignment?.vehicleId || null,
            assignedBy: adminIdentifier,
          },
        },
      });

      logger.info({ vehicleId, driverId, admin: adminIdentifier }, '[AdminVehicleService] Driver assigned successfully');
      return {
        ...updatedVehicle,
        assignment,
      };
    });
  }

  /**
   * Atomic Driver Vehicle Change (from Driver Management)
   */
  async changeDriverVehicle(
    driverId: string,
    newVehicleId: string,
    adminIdentifier: string,
    notes?: string,
    actorId?: string
  ) {
    return this.assignDriverToVehicle(newVehicleId, driverId, adminIdentifier, notes, {
      allowReplaceDriverVehicle: true,
      actorId,
    });
  }

  /**
   * Atomic Unassignment by Driver ID (from Driver Management)
   */
  async unassignDriverVehicle(
    driverId: string,
    adminIdentifier: string,
    notes?: string,
    actorId?: string
  ) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driverId || '')) {
      throw new AppError('Invalid driver identifier.', 400, 'VALIDATION_ERROR');
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findFirst({
        where: { id: driverId, deletedAt: null },
        include: { subcities: { select: { subcityId: true } } },
      });
      if (!driver) throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');

      const activeBookings = await tx.booking.count({
        where: { driverId, bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES } },
      });
      if (activeBookings > 0) {
        throw new AppError(
          'Cannot unassign vehicle while driver has an active ride or pending ride request.',
          409,
          'ACTIVE_RIDE_CONFLICT'
        );
      }

      const activeAssignment = await (tx as any).vehicleAssignment.findFirst({
        where: { driverId, isActive: true },
        include: { vehicle: { select: { id: true, plateNumber: true } } },
      });

      await (tx as any).vehicleAssignment.updateMany({
        where: { driverId, isActive: true },
        data: {
          isActive: false,
          unassignedAt: now,
          unassignedBy: adminIdentifier,
          notes: notes || 'Unassigned by administrator',
        },
      });

      await tx.vehicle.updateMany({
        where: { driverId },
        data: {
          driverId: null,
          status: VehicleOperationalStatus.AVAILABLE,
        },
      });

      let wentOffline = false;
      if (
        driver.availabilityStatus === DriverAvailabilityStatus.AVAILABLE ||
        driver.availabilityStatus === DriverAvailabilityStatus.ONLINE
      ) {
        await tx.driver.update({
          where: { id: driverId },
          data: { availabilityStatus: DriverAvailabilityStatus.OFFLINE },
        });
        wentOffline = true;
      }

      await tx.auditLog.create({
        data: {
          driverId,
          actorId: actorId || null,
          actorType: ActorType.ADMIN,
          action: 'DRIVER_VEHICLE_UNASSIGNED',
          entityType: 'VehicleAssignment',
          entityId: activeAssignment?.id || driverId,
          metadata: {
            vehicleId: activeAssignment?.vehicleId || null,
            plateNumber: activeAssignment?.vehicle?.plateNumber || null,
            unassignedBy: adminIdentifier,
          },
        },
      });

      const subcityIds = Array.from(
        new Set([
          ...(driver.primarySubcityId ? [driver.primarySubcityId] : []),
          ...driver.subcities.map((s) => s.subcityId),
        ])
      );

      return {
        driverId,
        unassignedVehicleId: activeAssignment?.vehicleId || null,
        wentOffline,
        subcityIds,
      };
    });

    if (result.wentOffline) {
      emitAvailabilityChanged({
        driverId,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        subcityIds: result.subcityIds,
      });
    }

    return result;
  }

  /**
   * Atomic Driver Unassignment by Vehicle ID
   */
  async unassignDriverFromVehicle(vehicleId: string, adminIdentifier: string, notes?: string, actorId?: string) {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new AppError('Vehicle not found', 404);

      const activeAssignment = await (tx as any).vehicleAssignment.findFirst({
        where: { vehicleId, isActive: true },
      });
      const affectedDriverId = activeAssignment?.driverId || vehicle.driverId || null;

      if (affectedDriverId) {
        const activeBookings = (await tx.booking?.count?.({
          where: { driverId: affectedDriverId, bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES } },
        })) ?? 0;
        if (activeBookings > 0) {
          throw new AppError(
            'Cannot unassign vehicle while assigned driver has an active ride or pending request.',
            409,
            'ACTIVE_RIDE_CONFLICT'
          );
        }
      }

      await (tx as any).vehicleAssignment.updateMany({
        where: { vehicleId, isActive: true },
        data: {
          isActive: false,
          unassignedAt: now,
          unassignedBy: adminIdentifier,
          notes: notes || 'Unassigned by administrator',
        },
      });

      const updated = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          driverId: null,
          status: VehicleOperationalStatus.AVAILABLE,
        },
      });

      let wentOffline = false;
      let subcityIds: string[] = [];
      if (affectedDriverId) {
        const drv = await tx.driver.findFirst({
          where: { id: affectedDriverId, deletedAt: null },
          include: { subcities: { select: { subcityId: true } } },
        });
        if (
          drv &&
          (drv.availabilityStatus === DriverAvailabilityStatus.AVAILABLE ||
            drv.availabilityStatus === DriverAvailabilityStatus.ONLINE)
        ) {
          await tx.driver.update({
            where: { id: affectedDriverId },
            data: { availabilityStatus: DriverAvailabilityStatus.OFFLINE },
          });
          wentOffline = true;
          subcityIds = Array.from(
            new Set([
              ...(drv.primarySubcityId ? [drv.primarySubcityId] : []),
              ...drv.subcities.map((s) => s.subcityId),
            ])
          );
        }

        await tx.auditLog?.create?.({
          data: {
            driverId: affectedDriverId,
            actorId: actorId || null,
            actorType: ActorType.ADMIN,
            action: 'DRIVER_VEHICLE_UNASSIGNED',
            entityType: 'VehicleAssignment',
            entityId: activeAssignment?.id || vehicleId,
            metadata: {
              vehicleId,
              plateNumber: vehicle.plateNumber,
              unassignedBy: adminIdentifier,
            },
          },
        });
      }

      logger.info({ vehicleId, admin: adminIdentifier }, '[AdminVehicleService] Driver unassigned successfully');
      return { updated, affectedDriverId, wentOffline, subcityIds };
    });

    if (result.wentOffline && result.affectedDriverId) {
      emitAvailabilityChanged({
        driverId: result.affectedDriverId,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        subcityIds: result.subcityIds,
      });
    }

    return result.updated;
  }

  /**
   * Get current active vehicle assignment for a driver
   */
  async getDriverActiveVehicle(driverId: string) {
    const active = await (prisma as any).vehicleAssignment.findFirst({
      where: { driverId, isActive: true },
      include: {
        vehicle: true,
      },
    });
    if (!active) return null;
    return {
      assignmentId: active.id,
      isActive: active.isActive,
      assignedAt: active.assignedAt.toISOString(),
      assignedBy: active.assignedBy,
      notes: active.notes,
      vehicle: {
        id: active.vehicle.id,
        plateNumber: active.vehicle.plateNumber,
        make: active.vehicle.make,
        model: active.vehicle.vehicleModel,
        year: active.vehicle.manufacturingYear,
        color: active.vehicle.vehicleColor,
        vehicleType: active.vehicle.vehicleType,
        categoryName: active.vehicle.categoryName || getCategoryDisplayName(active.vehicle.vehicleType),
        status: active.vehicle.status,
        verificationStatus: active.vehicle.verificationStatus,
      },
    };
  }

  /**
   * Get vehicle assignment history for a driver
   */
  async getDriverVehicleHistory(driverId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [total, items] = await Promise.all([
      (prisma as any).vehicleAssignment.count({ where: { driverId } }),
      (prisma as any).vehicleAssignment.findMany({
        where: { driverId },
        skip,
        take: safeLimit,
        orderBy: { assignedAt: 'desc' },
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              make: true,
              vehicleModel: true,
              vehicleColor: true,
              vehicleType: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((a: any) => ({
        id: a.id,
        vehicleId: a.vehicleId,
        driverId: a.driverId,
        isActive: a.isActive,
        assignedBy: a.assignedBy,
        assignedAt: a.assignedAt.toISOString(),
        unassignedBy: a.unassignedBy,
        unassignedAt: a.unassignedAt ? a.unassignedAt.toISOString() : null,
        notes: a.notes,
        vehicle: a.vehicle
          ? {
              id: a.vehicle.id,
              plateNumber: a.vehicle.plateNumber,
              make: a.vehicle.make,
              model: a.vehicle.vehicleModel,
              color: a.vehicle.vehicleColor,
              vehicleType: a.vehicle.vehicleType,
              status: a.vehicle.status,
            }
          : null,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  /**
   * Get assignment history for a vehicle
   */
  async getVehicleAssignments(vehicleId: string) {
    return (prisma as any).vehicleAssignment.findMany({
      where: { vehicleId },
      orderBy: { assignedAt: 'desc' },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            profileImage: true,
          },
        },
      },
    });
  }

  /**
   * Get maintenance history for a vehicle
   */
  async getVehicleMaintenanceRecords(vehicleId: string) {
    return (prisma as any).vehicleMaintenance.findMany({
      where: { vehicleId },
      orderBy: { serviceDate: 'desc' },
    });
  }

  /**
   * Add a maintenance record
   */
  async addVehicleMaintenance(vehicleId: string, payload: CreateMaintenancePayload, adminIdentifier: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const record = await (prisma as any).vehicleMaintenance.create({
      data: {
        vehicleId,
        maintenanceType: payload.maintenanceType,
        description: payload.description,
        serviceCenter: payload.serviceCenter || null,
        costETB: payload.costETB ? Number(payload.costETB) : 0,
        mileageKm: payload.mileageKm ? Number(payload.mileageKm) : null,
        serviceDate: new Date(payload.serviceDate),
        nextServiceDate: payload.nextServiceDate ? new Date(payload.nextServiceDate) : null,
        status: payload.status || 'COMPLETED',
        performedBy: adminIdentifier,
        notes: payload.notes || null,
      },
    });

    // If maintenance is ongoing or repair, automatically set vehicle status
    if (payload.status === 'IN_PROGRESS' || payload.maintenanceType === 'MAJOR_REPAIR') {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: VehicleOperationalStatus.UNDER_MAINTENANCE },
      });
    }

    return record;
  }

  /**
   * Update a maintenance record
   */
  async updateVehicleMaintenance(
    vehicleId: string,
    maintenanceId: string,
    payload: Partial<CreateMaintenancePayload>,
    adminIdentifier: string
  ) {
    const record = await (prisma as any).vehicleMaintenance.findUnique({ where: { id: maintenanceId } });
    if (!record || record.vehicleId !== vehicleId) {
      throw new AppError('Maintenance record not found', 404);
    }

    const data: any = {};
    if (payload.maintenanceType) data.maintenanceType = payload.maintenanceType;
    if (payload.description) data.description = payload.description;
    if (payload.serviceCenter !== undefined) data.serviceCenter = payload.serviceCenter;
    if (payload.costETB !== undefined) data.costETB = Number(payload.costETB);
    if (payload.mileageKm !== undefined) data.mileageKm = Number(payload.mileageKm);
    if (payload.serviceDate) data.serviceDate = new Date(payload.serviceDate);
    if (payload.nextServiceDate) data.nextServiceDate = new Date(payload.nextServiceDate);
    if (payload.status) data.status = payload.status;
    if (payload.notes !== undefined) data.notes = payload.notes;

    const updated = await (prisma as any).vehicleMaintenance.update({
      where: { id: maintenanceId },
      data,
    });

    // If maintenance is completed and vehicle was under maintenance, check if all maintenances are completed
    if (payload.status === 'COMPLETED') {
      const pendingMaintenance = await (prisma as any).vehicleMaintenance.findFirst({
        where: { vehicleId, status: 'IN_PROGRESS' },
      });
      if (!pendingMaintenance) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle && vehicle.status === VehicleOperationalStatus.UNDER_MAINTENANCE) {
          await prisma.vehicle.update({
            where: { id: vehicleId },
            data: { status: vehicle.driverId ? VehicleOperationalStatus.ASSIGNED : VehicleOperationalStatus.AVAILABLE },
          });
        }
      }
    }

    logger.info({ vehicleId, maintenanceId, admin: adminIdentifier }, '[AdminVehicleService] Maintenance record updated');
    return updated;
  }

  /**
   * Get eligible vehicles available for driver assignment
   */
  async getEligibleVehiclesForAssignment() {
    return prisma.vehicle.findMany({
      where: {
        driverId: null,
        verificationStatus: VehicleVerificationStatus.VERIFIED,
        status: { in: [VehicleOperationalStatus.AVAILABLE, VehicleOperationalStatus.ACTIVE] },
      },
      select: {
        id: true,
        plateNumber: true,
        make: true,
        vehicleModel: true,
        vehicleColor: true,
        vehicleType: true,
        seatingCapacity: true,
      },
      orderBy: { plateNumber: 'asc' },
    });
  }

  /**
   * List vehicle documents
   */
  async getVehicleDocuments(vehicleId: string) {
    const docs = await prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc: any) => ({
      ...doc,
      previewUrl: `/api/v1/admin/documents/${doc.id}/preview`,
      downloadUrl: `/api/v1/admin/documents/${doc.id}/download`,
    }));
  }
}

export const adminVehicleService = new AdminVehicleService();
