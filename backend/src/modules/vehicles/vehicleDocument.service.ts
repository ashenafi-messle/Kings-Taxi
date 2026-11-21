import { prisma, isDbConnectionError } from '../../core/database/prisma';
import { DocumentReviewStatus, VehicleVerificationStatus } from '@prisma/client';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import {
  validateAndUploadDocument,
  cleanupUploadedAssets,
  UploadedAssetReference,
} from '../../utils/documentStorage';

// Mandatory document types for full vehicle verification
export const MANDATORY_VEHICLE_DOCUMENT_TYPES = [
  'REGISTRATION_CERTIFICATE',
  'VEHICLE_TITLE_LIBRE',
  'INSURANCE_CERTIFICATE',
  'ANNUAL_INSPECTION_BOLO',
];

// Fallback in-memory store for local development and offline mock resilience
const inMemoryVehicleDocs = new Map<string, any[]>();

export class VehicleDocumentService {
  /**
   * Retrieves all documents for a given vehicle.
   */
  async getDocumentsByVehicleId(vehicleId: string) {
    try {
      const documents = await prisma.vehicleDocument.findMany({
        where: { vehicleId },
        orderBy: { createdAt: 'desc' },
      });
      return documents;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ vehicleId }, '[VehicleDocumentService] DB offline, serving from in-memory fallback');
        return inMemoryVehicleDocs.get(vehicleId) || [];
      }
      throw err;
    }
  }

  /**
   * Uploads or records a new document for a vehicle.
   */
  async createDocument(
    vehicleId: string,
    data: {
      documentType: string;
      documentNumber?: string;
      fileUrl: string;
      publicId?: string;
      fileName?: string;
      fileFormat?: string;
      fileSize?: number;
      expiryDate?: Date | string;
    }
  ) {
    const uploadedAssets: UploadedAssetReference[] = [];
    let effectiveFileUrl = data.fileUrl;
    let effectivePublicId = data.publicId;
    let effectiveFileFormat = data.fileFormat;
    let effectiveFileSize = data.fileSize;

    if (data.fileUrl && (data.fileUrl.startsWith('data:') || data.fileUrl.length > 512)) {
      const uploadRes = await validateAndUploadDocument(data.fileUrl, {
        folder: `kings-taxi/vehicles/${vehicleId}/documents`,
        publicIdPrefix: (data.documentType || 'VDOC').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        fileName: data.fileName,
        declaredFormat: data.fileFormat,
        declaredSize: data.fileSize,
      });

      effectiveFileUrl = uploadRes.fileUrl;
      effectivePublicId = uploadRes.publicId;
      effectiveFileFormat = uploadRes.fileFormat;
      effectiveFileSize = uploadRes.fileSize;

      if (uploadRes.isUploaded && uploadRes.publicId) {
        uploadedAssets.push({
          publicId: uploadRes.publicId,
          resourceType: uploadRes.resourceType,
        });
      }
    }

    try {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      const expiry = data.expiryDate ? new Date(data.expiryDate) : null;

      const newDoc = await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          documentType: String(data.documentType || 'DOCUMENT').slice(0, 64),
          documentNumber: data.documentNumber ? String(data.documentNumber).slice(0, 128) : null,
          fileUrl: effectiveFileUrl,
          publicId: effectivePublicId ? String(effectivePublicId).slice(0, 255) : null,
          fileName: data.fileName ? String(data.fileName).slice(0, 255) : null,
          fileFormat: effectiveFileFormat ? String(effectiveFileFormat).slice(0, 32) : null,
          fileSize: effectiveFileSize ? Number(effectiveFileSize) : null,
          status: DocumentReviewStatus.PENDING_REVIEW,
          expiryDate: expiry,
        },
      });

      await this.recalculateVehicleVerification(vehicleId);
      return newDoc;
    } catch (err: any) {
      if (uploadedAssets.length > 0 && !isDbConnectionError(err)) {
        await cleanupUploadedAssets(uploadedAssets);
      }
      if (isDbConnectionError(err)) {
        const dummyDoc = {
          id: `vdoc_${Date.now()}`,
          vehicleId,
          documentType: data.documentType,
          documentNumber: data.documentNumber || null,
          fileUrl: effectiveFileUrl,
          publicId: effectivePublicId || null,
          fileName: data.fileName || 'vehicle-document.pdf',
          fileFormat: effectiveFileFormat || 'pdf',
          fileSize: effectiveFileSize || 2048,
          status: DocumentReviewStatus.PENDING_REVIEW,
          rejectionReason: null,
          reviewNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const list = inMemoryVehicleDocs.get(vehicleId) || [];
        list.unshift(dummyDoc);
        inMemoryVehicleDocs.set(vehicleId, list);
        return dummyDoc;
      }
      throw err;
    }
  }

  /**
   * Reviews a specific vehicle document (APPROVE, REJECT, REQUIRES_RESUBMISSION).
   * Validates rejection reason when status is REJECTED.
   */
  async reviewDocument(
    vehicleId: string,
    documentId: string,
    review: {
      status: DocumentReviewStatus;
      rejectionReason?: string;
      reviewNotes?: string;
      reviewedBy?: string;
    }
  ) {
    if (review.status === DocumentReviewStatus.REJECTED && (!review.rejectionReason || !review.rejectionReason.trim())) {
      throw new AppError('Rejection reason is strictly required when rejecting a document', 400);
    }

    try {
      const doc = await prisma.vehicleDocument.findFirst({
        where: { id: documentId, vehicleId },
      });

      if (!doc) {
        throw new AppError('Document not found for this vehicle', 404);
      }

      const updated = await prisma.vehicleDocument.update({
        where: { id: documentId },
        data: {
          status: review.status,
          rejectionReason: review.status === DocumentReviewStatus.REJECTED ? review.rejectionReason : null,
          reviewNotes: review.reviewNotes || null,
          reviewedBy: review.reviewedBy || 'Admin',
          reviewedAt: new Date(),
        },
      });

      // Automatically recalculate and synchronize the vehicle's overall verificationStatus
      await this.recalculateVehicleVerification(vehicleId);

      return updated;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        const list = inMemoryVehicleDocs.get(vehicleId) || [];
        const index = list.findIndex((d) => d.id === documentId);
        if (index >= 0) {
          list[index] = {
            ...list[index],
            status: review.status,
            rejectionReason: review.status === DocumentReviewStatus.REJECTED ? review.rejectionReason : null,
            reviewNotes: review.reviewNotes || null,
            reviewedBy: review.reviewedBy || 'Admin',
            reviewedAt: new Date(),
            updatedAt: new Date(),
          };
          inMemoryVehicleDocs.set(vehicleId, list);
          return list[index];
        }
        throw new AppError('Document not found in fallback storage', 404);
      }
      throw err;
    }
  }

  /**
   * Recalculates the vehicle's overall verificationStatus based on its documents.
   */
  async recalculateVehicleVerification(vehicleId: string): Promise<VehicleVerificationStatus> {
    try {
      const docs = await prisma.vehicleDocument.findMany({
        where: { vehicleId },
      });

      const hasRejection = docs.some((d) => d.status === DocumentReviewStatus.REJECTED);
      if (hasRejection) {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: { verificationStatus: VehicleVerificationStatus.REJECTED },
        });
        return VehicleVerificationStatus.REJECTED;
      }

      // Check if all mandatory documents exist and are APPROVED
      const approvedTypes = new Set(
        docs
          .filter((d) => d.status === DocumentReviewStatus.APPROVED)
          .map((d) => d.documentType.toUpperCase())
      );

      const allMandatoryApproved = MANDATORY_VEHICLE_DOCUMENT_TYPES.every((type) =>
        approvedTypes.has(type)
      );

      let newStatus: VehicleVerificationStatus = VehicleVerificationStatus.PENDING;
      if (allMandatoryApproved) {
        newStatus = VehicleVerificationStatus.VERIFIED;
      }

      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { verificationStatus: newStatus },
      });

      return newStatus;
    } catch (err: any) {
      logger.warn({ vehicleId, err: err.message }, '[VehicleDocumentService] recalculateVehicleVerification skipped DB');
      return VehicleVerificationStatus.PENDING;
    }
  }

  /**
   * Deletes a vehicle document and cleans up Cloudinary if applicable.
   */
  async deleteDocument(vehicleId: string, documentId: string) {
    try {
      const doc = await prisma.vehicleDocument.findFirst({
        where: { id: documentId, vehicleId },
      });

      if (!doc) {
        throw new AppError('Document not found', 404);
      }

      if (doc.publicId) {
        await CloudinaryService.deleteAsset(doc.publicId, 'raw');
      }

      await prisma.vehicleDocument.delete({
        where: { id: documentId },
      });

      await this.recalculateVehicleVerification(vehicleId);
      return { success: true };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        const list = inMemoryVehicleDocs.get(vehicleId) || [];
        inMemoryVehicleDocs.set(vehicleId, list.filter((d) => d.id !== documentId));
        return { success: true };
      }
      throw err;
    }
  }
}

export const vehicleDocumentService = new VehicleDocumentService();
