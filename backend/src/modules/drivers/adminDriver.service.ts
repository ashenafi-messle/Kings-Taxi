import crypto from 'crypto';
import { prisma } from '../../core/database/prisma';
import {
  AccountStatus,
  DriverVerificationStatus,
  DriverAvailabilityStatus,
} from '@prisma/client';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { normalizeEthiopianPhone } from '../../utils/phone';
import {
  validateAndUploadDocument,
  cleanupUploadedAssets,
  UploadedAssetReference,
} from '../../utils/documentStorage';

// Scrypt hashing helper consistent with platform auth
const hashPasswordAsync = (password: string, salt: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
};

export interface DriverListParams {
  search?: string;
  verificationStatus?: string;
  accountStatus?: string;
  availabilityStatus?: string;
  city?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateDriverPayload {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  city?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  assignedVehicleId?: string;
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

export interface UpdateDriverPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  profileImage?: string;
  verificationStatus?: DriverVerificationStatus;
  accountStatus?: AccountStatus;
  availabilityStatus?: DriverAvailabilityStatus;
}

export class AdminDriverService {
  /**
   * Alias for listDrivers
   */
  async getDrivers(params: DriverListParams) {
    return this.listDrivers(params);
  }

  /**
   * Alias for getEligibleDriversForAssignment
   */
  async getAssignmentCandidates(currentVehicleId?: string) {
    return this.getEligibleDriversForAssignment(currentVehicleId);
  }

  /**
   * Alias for updateDriverVerification
   */
  async updateVerificationStatus(
    driverId: string,
    newStatus: DriverVerificationStatus,
    rejectionReason?: string,
    adminIdentifier?: string
  ) {
    return this.updateDriverVerification(driverId, newStatus, rejectionReason, adminIdentifier);
  }

  /**
   * List drivers with filtering, searching, and server-side pagination
   */
  async listDrivers(params: DriverListParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    // Search query matching full name, email, phone, or license number
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } },
        { licenseNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.verificationStatus && params.verificationStatus !== 'ALL') {
      where.verificationStatus = params.verificationStatus as DriverVerificationStatus;
    }

    if (params.accountStatus && params.accountStatus !== 'ALL') {
      where.accountStatus = params.accountStatus as AccountStatus;
    }

    if (params.availabilityStatus && params.availabilityStatus !== 'ALL') {
      where.availabilityStatus = params.availabilityStatus as DriverAvailabilityStatus;
    }

    if (params.city && params.city !== 'ALL') {
      where.city = { equals: params.city, mode: 'insensitive' };
    }

    // Sort order
    const orderBy: any = {};
    const sortField = params.sortBy || 'createdAt';
    const orderDirection = params.sortOrder === 'asc' ? 'asc' : 'desc';

    if (['fullName', 'createdAt', 'rating', 'totalTrips'].includes(sortField)) {
      orderBy[sortField] = orderDirection;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, drivers] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          vehicles: {
            where: { isActive: true },
            select: {
              id: true,
              plateNumber: true,
              vehicleModel: true,
              make: true,
              vehicleColor: true,
              vehicleType: true,
              status: true,
              verificationStatus: true,
            },
            take: 1,
          },
          vehicleAssignments: {
            where: { isActive: true },
            include: {
              vehicle: {
                select: {
                  id: true,
                  plateNumber: true,
                  vehicleModel: true,
                  make: true,
                  vehicleColor: true,
                  status: true,
                },
              },
            },
            take: 1,
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              documentNumber: true,
              fileUrl: true,
              publicId: true,
              fileName: true,
              fileFormat: true,
              fileSize: true,
              status: true,
              rejectionReason: true,
              expiryDate: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const items = drivers.map((d) => {
      const activeAssignment = d.vehicleAssignments?.[0];
      const assignedVehicle = activeAssignment ? activeAssignment.vehicle : (d.vehicles?.[0] || (d as any).vehicle || null);

      return {
        id: d.id,
        driverId: `DRV-${d.id.slice(0, 6).toUpperCase()}`,
        fullName: d.fullName,
        email: d.email || '',
        phone: d.phoneNumber,
        avatarUrl: d.profileImage,
        verificationStatus: d.verificationStatus,
        accountStatus: d.accountStatus,
        availabilityStatus: d.availabilityStatus,
        city: d.city,
        address: d.address,
        licenseNumber: d.licenseNumber || '',
        licenseExpiry: d.licenseExpiry ? d.licenseExpiry.toISOString().split('T')[0] : '',
        rating: d.rating,
        totalTrips: d.totalTrips,
        assignedVehicleId: assignedVehicle?.id,
        assignedVehiclePlate: assignedVehicle?.plateNumber,
        assignedVehicleModel: assignedVehicle ? `${assignedVehicle.make || ''} ${assignedVehicle.vehicleModel}`.trim() : undefined,
        documents: (d.documents || []).map((doc) => ({
          id: doc.id,
          driverId: d.id,
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          fileUrl: doc.fileUrl,
          publicId: doc.publicId,
          previewUrl: `/api/v1/admin/documents/${doc.id}/preview`,
          downloadUrl: `/api/v1/admin/documents/${doc.id}/download`,
          fileName: doc.fileName || `${doc.documentType.toLowerCase()}.${doc.fileFormat || 'jpg'}`,
          fileFormat: doc.fileFormat || 'jpg',
          fileSize: doc.fileSize,
          status: doc.status,
          rejectionReason: doc.rejectionReason,
          expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
        })),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
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
   * Aggregate statistics for driver operations dashboard
   */
  async getDriverStatistics() {
    const [
      totalDrivers,
      approvedDrivers,
      pendingDrivers,
      rejectedDrivers,
      suspendedDrivers,
      onlineDrivers,
      driversOnTrip,
      offlineDrivers,
    ] = await Promise.all([
      prisma.driver.count({ where: { deletedAt: null } }),
      prisma.driver.count({ where: { deletedAt: null, verificationStatus: DriverVerificationStatus.APPROVED } }),
      prisma.driver.count({ where: { deletedAt: null, verificationStatus: DriverVerificationStatus.PENDING } }),
      prisma.driver.count({ where: { deletedAt: null, verificationStatus: DriverVerificationStatus.REJECTED } }),
      prisma.driver.count({
        where: {
          deletedAt: null,
          OR: [
            { accountStatus: AccountStatus.SUSPENDED },
            { verificationStatus: DriverVerificationStatus.SUSPENDED },
          ],
        },
      }),
      prisma.driver.count({
        where: {
          deletedAt: null,
          availabilityStatus: { in: [DriverAvailabilityStatus.ONLINE, DriverAvailabilityStatus.AVAILABLE] },
        },
      }),
      prisma.driver.count({
        where: {
          deletedAt: null,
          availabilityStatus: DriverAvailabilityStatus.ON_TRIP,
        },
      }),
      prisma.driver.count({
        where: {
          deletedAt: null,
          availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        },
      }),
    ]);

    return {
      totalDrivers,
      approvedDrivers,
      pendingVerification: pendingDrivers,
      rejectedDrivers,
      suspendedDrivers,
      onlineDrivers,
      driversOnTrip,
      offlineDrivers,
    };
  }

  /**
   * Get complete driver profile by ID
   */
  async getDriverById(driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      include: {
        vehicles: {
          where: { isActive: true },
          take: 1,
        },
        vehicleAssignments: {
          where: { isActive: true },
          include: {
            vehicle: true,
          },
          take: 1,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            booking: {
              select: {
                bookingReference: true,
                pickupLocation: true,
                destinationLocation: true,
                finalFare: true,
                estimatedFare: true,
                serviceType: true,
              },
            },
          },
        },
      },
    });

    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const activeAssignment = driver.vehicleAssignments[0];
    const assignedVehicle = activeAssignment ? activeAssignment.vehicle : driver.vehicles[0] || null;

    // Calculate completion metrics from actual trips
    const completedTripsCount = await prisma.trip.count({
      where: { driverId, tripStatus: 'COMPLETED' },
    });
    const abortedTripsCount = await prisma.trip.count({
      where: { driverId, tripStatus: 'ABORTED' },
    });

    return {
      id: driver.id,
      driverId: `DRV-${driver.id.slice(0, 6).toUpperCase()}`,
      fullName: driver.fullName,
      email: driver.email || '',
      phone: driver.phoneNumber,
      avatarUrl: driver.profileImage,
      accountStatus: driver.accountStatus,
      verificationStatus: driver.verificationStatus,
      availabilityStatus: driver.availabilityStatus,
      city: driver.city,
      address: driver.address || '',
      gender: driver.gender || 'MALE',
      dateOfBirth: driver.dateOfBirth ? driver.dateOfBirth.toISOString().split('T')[0] : '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.toISOString().split('T')[0] : '',
      emergencyContact: {
        name: driver.emergencyContactName || '',
        phone: driver.emergencyContactPhone || '',
        relationship: driver.emergencyContactRelationship || '',
      },
      assignedVehicleId: assignedVehicle?.id,
      assignedVehiclePlate: assignedVehicle?.plateNumber,
      assignedVehicleModel: assignedVehicle ? `${assignedVehicle.make || ''} ${assignedVehicle.vehicleModel}`.trim() : undefined,
      assignedVehicle,
      rating: driver.rating,
      totalRides: driver.totalTrips,
      completedRides: completedTripsCount,
      cancelledRides: abortedTripsCount,
      documents: (driver.documents || []).map((d) => ({
        id: d.id,
        driverId: d.driverId,
        documentType: d.documentType,
        documentNumber: d.documentNumber,
        fileUrl: d.fileUrl,
        publicId: d.publicId,
        previewUrl: `/api/v1/admin/documents/${d.id}/preview`,
        downloadUrl: `/api/v1/admin/documents/${d.id}/download`,
        fileName: d.fileName || `${d.documentType.toLowerCase()}.${d.fileFormat || 'jpg'}`,
        fileFormat: d.fileFormat || 'jpg',
        fileSize: d.fileSize,
        status: d.status,
        rejectionReason: d.rejectionReason,
        reviewNotes: d.reviewNotes,
        reviewedBy: d.reviewedBy,
        reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
        expiryDate: d.expiryDate ? d.expiryDate.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      statusHistory: driver.statusHistory,
      recentTrips: driver.trips,
      rejectionReason: driver.rejectionReason,
      suspensionReason: driver.suspensionReason,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }

  /**
   * Register a new driver through Super Admin
   */
  async createDriver(payload: CreateDriverPayload, adminIdentifier: string) {
    const phoneRes = normalizeEthiopianPhone(payload.phone);
    if (!phoneRes.isValid) {
      throw new AppError('Invalid Ethiopian phone number. Format: +251 9XXXXXXXX or 09XXXXXXXX', 400);
    }
    const cleanPhone = phoneRes.normalized;

    // Check unique phone number
    const existingPhone = await prisma.driver.findUnique({
      where: { phoneNumber: cleanPhone },
    });
    if (existingPhone) {
      throw new AppError('A driver with this phone number is already registered.', 409);
    }

    // Check unique email if provided
    let cleanEmail: string | undefined = undefined;
    if (payload.email && payload.email.trim()) {
      cleanEmail = payload.email.trim().toLowerCase();
      const existingEmail = await prisma.driver.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        throw new AppError('A driver with this email address is already registered.', 409);
      }
    }

    // Hash password or default temporary credential
    const defaultPlainPass = payload.password || `KingsDriver#${crypto.randomInt(1000, 9999)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await hashPasswordAsync(defaultPlainPass, salt);
    const passwordHash = `${hash}:${salt}`;

    const newDriverId = crypto.randomUUID();

    // Pre-process, validate and upload any documents to storage before database transaction
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

    // Optional profile photo upload
    let cleanProfileImage: string | null = null;
    const rawAvatar = (payload as any).profileImage || (payload as any).avatarUrl;
    if (rawAvatar && typeof rawAvatar === 'string') {
      if (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://')) {
        cleanProfileImage = rawAvatar;
      } else if (rawAvatar.startsWith('data:') || rawAvatar.length > 512) {
        try {
          const avatarUpload = await validateAndUploadDocument(rawAvatar, {
            folder: `kings-taxi/drivers/${newDriverId}/profile`,
            publicIdPrefix: 'avatar',
            fileName: 'profile.jpg',
          });
          cleanProfileImage = avatarUpload.fileUrl;
          if (avatarUpload.isUploaded && avatarUpload.publicId) {
            uploadedAssets.push({
              publicId: avatarUpload.publicId,
              resourceType: avatarUpload.resourceType,
            });
          }
        } catch (avatarErr: any) {
          logger.warn({ error: avatarErr.message }, '[AdminDriverService] Profile avatar upload failed, continuing without avatar');
        }
      }
    }

    if (payload.documents && payload.documents.length > 0) {
      for (const doc of payload.documents) {
        if (!doc.fileUrl) continue;
        const uploadResult = await validateAndUploadDocument(doc.fileUrl, {
          folder: `kings-taxi/drivers/${newDriverId}/documents`,
          publicIdPrefix: (doc.documentType || 'DOC').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
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
        const driver = await tx.driver.create({
          data: {
            id: newDriverId,
            fullName: payload.fullName.trim(),
            phoneNumber: cleanPhone,
            email: cleanEmail || null,
            passwordHash,
            profileImage: cleanProfileImage,
            accountStatus: AccountStatus.PENDING_VERIFICATION,
            verificationStatus: DriverVerificationStatus.PENDING,
            availabilityStatus: DriverAvailabilityStatus.OFFLINE,
            city: payload.city || 'Gondar',
            address: payload.address || null,
            licenseNumber: payload.licenseNumber || null,
            licenseExpiry: payload.licenseExpiry ? new Date(payload.licenseExpiry) : null,
            dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
            gender: payload.gender || null,
            emergencyContactName: payload.emergencyContactName || null,
            emergencyContactPhone: payload.emergencyContactPhone || null,
            emergencyContactRelationship: payload.emergencyContactRelationship || null,
          },
        });

        // Insert initial driver documents with clean storage URLs
        for (const doc of processedDocuments) {
          await tx.driverDocument.create({
            data: {
              driverId: driver.id,
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

        // Log initial status history
        await (tx as any).driverStatusHistory.create({
          data: {
            driverId: driver.id,
            statusType: 'REGISTRATION',
            fromStatus: null,
            toStatus: 'PENDING',
            reason: 'Initial administrator registration',
            changedBy: adminIdentifier,
          },
        });

        return driver;
      });

      logger.info({ driverId: created.id, admin: adminIdentifier }, '[AdminDriverService] Driver registered successfully');
      return this.getDriverById(created.id);
    } catch (txError: any) {
      if (uploadedAssets.length > 0) {
        await cleanupUploadedAssets(uploadedAssets);
      }
      throw txError;
    }
  }

  /**
   * Update driver profile details
   */
  async updateDriver(driverId: string, payload: UpdateDriverPayload, adminIdentifier: string) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const data: any = {};
    if (payload.fullName) data.fullName = payload.fullName.trim();
    if (payload.city) data.city = payload.city;
    if (payload.address !== undefined) data.address = payload.address;
    if (payload.licenseNumber !== undefined) data.licenseNumber = payload.licenseNumber;
    if (payload.licenseExpiry) data.licenseExpiry = new Date(payload.licenseExpiry);
    if (payload.dateOfBirth) data.dateOfBirth = new Date(payload.dateOfBirth);
    if (payload.gender !== undefined) data.gender = payload.gender;
    if (payload.emergencyContactName !== undefined) data.emergencyContactName = payload.emergencyContactName;
    if (payload.emergencyContactPhone !== undefined) data.emergencyContactPhone = payload.emergencyContactPhone;
    if (payload.emergencyContactRelationship !== undefined) data.emergencyContactRelationship = payload.emergencyContactRelationship;
    if (payload.profileImage !== undefined) data.profileImage = payload.profileImage;

    if (payload.phone) {
      const phoneRes = normalizeEthiopianPhone(payload.phone);
      if (!phoneRes.isValid) throw new AppError('Invalid phone number format', 400);
      const clean = phoneRes.normalized;
      if (clean !== driver.phoneNumber) {
        const dup = await prisma.driver.findUnique({ where: { phoneNumber: clean } });
        if (dup) throw new AppError('Phone number already in use by another driver', 409);
        data.phoneNumber = clean;
      }
    }

    if (payload.email) {
      const cleanEmail = payload.email.trim().toLowerCase();
      if (cleanEmail !== driver.email) {
        const dup = await prisma.driver.findUnique({ where: { email: cleanEmail } });
        if (dup) throw new AppError('Email address already in use by another driver', 409);
        data.email = cleanEmail;
      }
    }

    await prisma.driver.update({
      where: { id: driverId },
      data,
    });

    logger.info({ driverId, admin: adminIdentifier }, '[AdminDriverService] Driver updated');
    return this.getDriverById(driverId);
  }

  /**
   * Update Driver Account Status (ACTIVE, SUSPENDED, PENDING_VERIFICATION)
   */
  async updateDriverStatus(driverId: string, newStatus: AccountStatus, reason: string, adminIdentifier: string) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new AppError('Driver not found', 404);

    const oldStatus = driver.accountStatus;
    if (oldStatus === newStatus) return this.getDriverById(driverId);

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        accountStatus: newStatus,
      };

      if (newStatus === AccountStatus.SUSPENDED) {
        updateData.suspensionReason = reason || 'Suspended by Super Admin';
        updateData.suspendedAt = new Date();
        updateData.availabilityStatus = DriverAvailabilityStatus.OFFLINE; // Force offline
      } else if (newStatus === AccountStatus.ACTIVE) {
        updateData.suspensionReason = null;
        updateData.suspendedAt = null;
      }

      await tx.driver.update({
        where: { id: driverId },
        data: updateData,
      });

      await (tx as any).driverStatusHistory.create({
        data: {
          driverId,
          statusType: 'ACCOUNT_STATUS',
          fromStatus: oldStatus,
          toStatus: newStatus,
          reason: reason || 'Administrative status change',
          changedBy: adminIdentifier,
        },
      });
    });

    logger.info({ driverId, from: oldStatus, to: newStatus, admin: adminIdentifier }, '[AdminDriverService] Account status updated');
    return this.getDriverById(driverId);
  }

  /**
   * Update Driver Verification Status (APPROVED, REJECTED, PENDING)
   */
  async updateDriverVerification(
    driverId: string,
    newStatus: DriverVerificationStatus,
    rejectionReason?: string,
    adminIdentifier?: string
  ) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new AppError('Driver not found', 404);

    const oldStatus = driver.verificationStatus;

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        verificationStatus: newStatus,
      };

      if (newStatus === DriverVerificationStatus.APPROVED) {
        updateData.accountStatus = AccountStatus.ACTIVE;
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = adminIdentifier || 'Super Admin';
        updateData.rejectionReason = null;
      } else if (newStatus === DriverVerificationStatus.REJECTED) {
        updateData.rejectionReason = rejectionReason || 'Verification documents rejected';
        updateData.accountStatus = AccountStatus.PENDING_VERIFICATION;
        updateData.availabilityStatus = DriverAvailabilityStatus.OFFLINE;
      } else if (newStatus === DriverVerificationStatus.SUSPENDED) {
        updateData.accountStatus = AccountStatus.SUSPENDED;
        updateData.availabilityStatus = DriverAvailabilityStatus.OFFLINE;
      }

      await tx.driver.update({
        where: { id: driverId },
        data: updateData,
      });

      await (tx as any).driverStatusHistory.create({
        data: {
          driverId,
          statusType: 'VERIFICATION',
          fromStatus: oldStatus,
          toStatus: newStatus,
          reason: rejectionReason || `Driver marked as ${newStatus}`,
          changedBy: adminIdentifier || 'Super Admin',
        },
      });
    });

    logger.info({ driverId, from: oldStatus, to: newStatus, admin: adminIdentifier }, '[AdminDriverService] Verification status updated');
    return this.getDriverById(driverId);
  }

  /**
   * Get eligible drivers available for vehicle assignment
   */
  async getEligibleDriversForAssignment(currentVehicleId?: string) {
    const drivers = await prisma.driver.findMany({
      where: {
        deletedAt: null,
        verificationStatus: DriverVerificationStatus.APPROVED,
        accountStatus: AccountStatus.ACTIVE,
      },
      include: {
        vehicleAssignments: {
          where: { isActive: true },
          select: { vehicleId: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Eligible if not assigned to another vehicle, or currently assigned to this vehicle
    return drivers
      .filter((d) => {
        if (d.vehicleAssignments.length === 0) return true;
        if (currentVehicleId && d.vehicleAssignments[0].vehicleId === currentVehicleId) return true;
        return false;
      })
      .map((d) => ({
        id: d.id,
        driverId: `DRV-${d.id.slice(0, 6).toUpperCase()}`,
        fullName: d.fullName,
        phone: d.phoneNumber,
        rating: d.rating,
        verificationStatus: d.verificationStatus,
        isCurrentlyAssigned: d.vehicleAssignments.length > 0,
      }));
  }

  /**
   * List driver verification documents
   */
  async getDriverDocuments(driverId: string) {
    const docs = await prisma.driverDocument.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      driverId: d.driverId,
      documentType: d.documentType,
      documentNumber: d.documentNumber,
      fileUrl: d.fileUrl,
      publicId: d.publicId,
      previewUrl: `/api/v1/admin/documents/${d.id}/preview`,
      downloadUrl: `/api/v1/admin/documents/${d.id}/download`,
      fileName: d.fileName || `${d.documentType.toLowerCase()}.${d.fileFormat || 'jpg'}`,
      fileFormat: d.fileFormat || 'jpg',
      fileSize: d.fileSize,
      status: d.status,
      rejectionReason: d.rejectionReason,
      reviewNotes: d.reviewNotes,
      reviewedBy: d.reviewedBy,
      reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
      expiryDate: d.expiryDate ? d.expiryDate.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  /**
   * List completed and past trips for a driver with pagination
   */
  async getDriverTrips(driverId: string, page = 1, limit = 10) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [total, trips] = await Promise.all([
      prisma.trip.count({ where: { driverId } }),
      prisma.trip.findMany({
        where: { driverId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingReference: true,
              pickupLocation: true,
              destinationLocation: true,
              estimatedFare: true,
              finalFare: true,
              serviceType: true,
              completedAt: true,
              cancelledAt: true,
            },
          },
        },
      }),
    ]);

    return {
      trips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const adminDriverService = new AdminDriverService();
