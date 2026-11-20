import { prisma, isDbConnectionError } from '../../core/database/prisma';
import { DocumentReviewStatus, DriverVerificationStatus } from '@prisma/client';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';

// Mandatory document types for full driver approval
export const MANDATORY_DRIVER_DOCUMENT_TYPES = [
  'DRIVING_LICENSE',
  'NATIONAL_ID',
  'POLICE_CLEARANCE',
];

// Fallback in-memory store for local development and offline mock resilience
const inMemoryDriverDocs = new Map<string, any[]>();

export class DriverDocumentService {
  /**
   * Retrieves all documents for a given driver.
   */
  async getDocumentsByDriverId(driverId: string) {
    try {
      const documents = await prisma.driverDocument.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
      });
      return documents;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ driverId }, '[DriverDocumentService] DB offline, serving from in-memory fallback');
        return inMemoryDriverDocs.get(driverId) || [];
      }
      throw err;
    }
  }

  /**
   * Uploads or records a new document for a driver.
   */
  async createDocument(
    driverId: string,
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
    try {
      const driver = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver) {
        throw new AppError('Driver not found', 404);
      }

      const expiry = data.expiryDate ? new Date(data.expiryDate) : null;

      const newDoc = await prisma.driverDocument.create({
        data: {
          driverId,
          documentType: String(data.documentType || 'DOCUMENT').slice(0, 64),
          documentNumber: data.documentNumber ? String(data.documentNumber).slice(0, 128) : null,
          fileUrl: data.fileUrl,
          publicId: data.publicId ? String(data.publicId).slice(0, 255) : null,
          fileName: data.fileName ? String(data.fileName).slice(0, 255) : null,
          fileFormat: data.fileFormat ? String(data.fileFormat).slice(0, 32) : null,
          fileSize: data.fileSize ? Number(data.fileSize) : null,
          status: DocumentReviewStatus.PENDING_REVIEW,
          expiryDate: expiry,
        },
      });

      await this.recalculateDriverVerification(driverId);
      return newDoc;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        const dummyDoc = {
          id: `doc_${Date.now()}`,
          driverId,
          documentType: data.documentType,
          documentNumber: data.documentNumber || null,
          fileUrl: data.fileUrl,
          publicId: data.publicId || null,
          fileName: data.fileName || 'document.pdf',
          fileFormat: data.fileFormat || 'pdf',
          fileSize: data.fileSize || 1024,
          status: DocumentReviewStatus.PENDING_REVIEW,
          rejectionReason: null,
          reviewNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const list = inMemoryDriverDocs.get(driverId) || [];
        list.unshift(dummyDoc);
        inMemoryDriverDocs.set(driverId, list);
        return dummyDoc;
      }
      throw err;
    }
  }

  /**
   * Reviews a specific driver document (APPROVE, REJECT, REQUIRES_RESUBMISSION).
   * Validates rejection reason when status is REJECTED.
   */
  async reviewDocument(
    driverId: string,
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
      const doc = await prisma.driverDocument.findFirst({
        where: { id: documentId, driverId },
      });

      if (!doc) {
        throw new AppError('Document not found for this driver', 404);
      }

      const updated = await prisma.driverDocument.update({
        where: { id: documentId },
        data: {
          status: review.status,
          rejectionReason: review.status === DocumentReviewStatus.REJECTED ? review.rejectionReason : null,
          reviewNotes: review.reviewNotes || null,
          reviewedBy: review.reviewedBy || 'Admin',
          reviewedAt: new Date(),
        },
      });

      // Automatically recalculate and synchronize the driver's overall verificationStatus
      await this.recalculateDriverVerification(driverId);

      return updated;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        const list = inMemoryDriverDocs.get(driverId) || [];
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
          inMemoryDriverDocs.set(driverId, list);
          return list[index];
        }
        throw new AppError('Document not found in fallback storage', 404);
      }
      throw err;
    }
  }

  /**
   * Recalculates the driver's overall verificationStatus based on their documents.
   */
  async recalculateDriverVerification(driverId: string): Promise<DriverVerificationStatus> {
    try {
      const docs = await prisma.driverDocument.findMany({
        where: { driverId },
      });

      const hasRejection = docs.some((d) => d.status === DocumentReviewStatus.REJECTED);
      if (hasRejection) {
        await prisma.driver.update({
          where: { id: driverId },
          data: { verificationStatus: DriverVerificationStatus.REJECTED },
        });
        return DriverVerificationStatus.REJECTED;
      }

      // Check if all mandatory documents exist and are APPROVED
      const approvedTypes = new Set(
        docs
          .filter((d) => d.status === DocumentReviewStatus.APPROVED)
          .map((d) => d.documentType.toUpperCase())
      );

      const allMandatoryApproved = MANDATORY_DRIVER_DOCUMENT_TYPES.every((type) =>
        approvedTypes.has(type)
      );

      let newStatus: DriverVerificationStatus = DriverVerificationStatus.PENDING;
      if (allMandatoryApproved) {
        newStatus = DriverVerificationStatus.APPROVED;
      }

      await prisma.driver.update({
        where: { id: driverId },
        data: { verificationStatus: newStatus },
      });

      return newStatus;
    } catch (err: any) {
      logger.warn({ driverId, err: err.message }, '[DriverDocumentService] recalculateDriverVerification skipped DB');
      return DriverVerificationStatus.PENDING;
    }
  }

  /**
   * Deletes a driver document and cleans up Cloudinary if applicable.
   */
  async deleteDocument(driverId: string, documentId: string) {
    try {
      const doc = await prisma.driverDocument.findFirst({
        where: { id: documentId, driverId },
      });

      if (!doc) {
        throw new AppError('Document not found', 404);
      }

      if (doc.publicId) {
        await CloudinaryService.deleteAsset(doc.publicId, 'raw');
      }

      await prisma.driverDocument.delete({
        where: { id: documentId },
      });

      await this.recalculateDriverVerification(driverId);
      return { success: true };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        const list = inMemoryDriverDocs.get(driverId) || [];
        inMemoryDriverDocs.set(driverId, list.filter((d) => d.id !== documentId));
        return { success: true };
      }
      throw err;
    }
  }
}

export const driverDocumentService = new DriverDocumentService();
