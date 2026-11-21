import https from 'https';
import http from 'http';
import { Readable } from 'stream';
import { prisma, isDbConnectionError } from '../../core/database/prisma';
import {
  DocumentReviewStatus,
  DriverVerificationStatus,
  VehicleVerificationStatus,
} from '@prisma/client';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';

export const MANDATORY_DRIVER_DOCUMENT_TYPES = [
  'DRIVING_LICENSE',
  'DRIVER_LICENSE',
  'NATIONAL_ID',
  'POLICE_CLEARANCE',
  'CRIMINAL_RECORD_CLEARANCE',
];

export const MANDATORY_VEHICLE_DOCUMENT_TYPES = [
  'REGISTRATION_CERTIFICATE',
  'VEHICLE_TITLE_LIBRE',
  'INSURANCE_CERTIFICATE',
  'ANNUAL_INSPECTION_BOLO',
];

export interface FormattedDocumentResponse {
  id: string;
  entityType: 'DRIVER' | 'VEHICLE';
  entityId: string;
  driverId?: string;
  vehicleId?: string;
  documentType: string;
  documentNumber?: string | null;
  fileUrl: string;
  publicId?: string | null;
  previewUrl: string;
  downloadUrl: string;
  fileName: string;
  fileFormat: string;
  fileSize?: number | null;
  status: DocumentReviewStatus;
  rejectionReason?: string | null;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class AdminDocumentService {
  /**
   * Formats a raw database document record into a standardized API response.
   */
  public formatDocument(
    doc: any,
    entityType: 'DRIVER' | 'VEHICLE'
  ): FormattedDocumentResponse {
    const isPdf =
      doc.fileFormat?.toLowerCase() === 'pdf' ||
      doc.fileUrl?.toLowerCase().includes('.pdf');

    const ext = isPdf ? 'pdf' : (doc.fileFormat || 'jpg').toLowerCase().replace(/^\./, '');
    const cleanFileName =
      doc.fileName || `${(doc.documentType || 'document').toLowerCase()}.${ext}`;

    return {
      id: doc.id,
      entityType,
      entityId: entityType === 'DRIVER' ? doc.driverId : doc.vehicleId,
      driverId: doc.driverId,
      vehicleId: doc.vehicleId,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber || null,
      fileUrl: doc.fileUrl,
      publicId: doc.publicId || null,
      previewUrl: `/api/v1/admin/documents/${doc.id}/preview`,
      downloadUrl: `/api/v1/admin/documents/${doc.id}/download`,
      fileName: cleanFileName,
      fileFormat: ext,
      fileSize: doc.fileSize || null,
      status: doc.status || DocumentReviewStatus.PENDING_REVIEW,
      rejectionReason: doc.rejectionReason || null,
      reviewNotes: doc.reviewNotes || null,
      reviewedBy: doc.reviewedBy || null,
      reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt).toISOString() : null,
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString() : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Retrieve all documents for a specific driver.
   */
  public async getDocumentsByDriverId(driverId: string): Promise<FormattedDocumentResponse[]> {
    try {
      const docs = await prisma.driverDocument.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
      });
      return docs.map((d) => this.formatDocument(d, 'DRIVER'));
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ driverId }, '[AdminDocumentService] DB offline, returning empty driver documents');
        return [];
      }
      throw err;
    }
  }

  /**
   * Retrieve all documents for a specific vehicle.
   */
  public async getDocumentsByVehicleId(vehicleId: string): Promise<FormattedDocumentResponse[]> {
    try {
      const docs = await prisma.vehicleDocument.findMany({
        where: { vehicleId },
        orderBy: { createdAt: 'desc' },
      });
      return docs.map((d) => this.formatDocument(d, 'VEHICLE'));
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ vehicleId }, '[AdminDocumentService] DB offline, returning empty vehicle documents');
        return [];
      }
      throw err;
    }
  }

  /**
   * Retrieve a specific document by its ID (checks driver documents first, then vehicle documents).
   */
  public async getDocumentById(documentId: string): Promise<FormattedDocumentResponse> {
    try {
      // 1. Try DriverDocument
      const driverDoc = await prisma.driverDocument.findUnique({
        where: { id: documentId },
      });
      if (driverDoc) {
        return this.formatDocument(driverDoc, 'DRIVER');
      }

      // 2. Try VehicleDocument
      const vehicleDoc = await prisma.vehicleDocument.findUnique({
        where: { id: documentId },
      });
      if (vehicleDoc) {
        return this.formatDocument(vehicleDoc, 'VEHICLE');
      }

      throw new AppError('Document not found', 404);
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        throw new AppError('Database connection unavailable', 503);
      }
      throw err;
    }
  }

  /**
   * Review and update a document status (APPROVE, REJECT, REQUIRES_RESUBMISSION).
   * Executes atomic database update, audit logging, and driver/vehicle overall status recalculation.
   */
  public async reviewDocument(
    documentId: string,
    review: {
      status: DocumentReviewStatus;
      rejectionReason?: string;
      reviewNotes?: string;
      adminIdentifier: string;
    }
  ): Promise<{
    document: FormattedDocumentResponse;
    overallStatus: string;
  }> {
    if (
      review.status === DocumentReviewStatus.REJECTED &&
      (!review.rejectionReason || !review.rejectionReason.trim())
    ) {
      throw new AppError('Rejection reason is required when rejecting a document', 400);
    }

    try {
      // 1. Check if DriverDocument
      const driverDoc = await prisma.driverDocument.findUnique({
        where: { id: documentId },
      });

      if (driverDoc) {
        const result = await prisma.$transaction(async (tx) => {
          const updated = await tx.driverDocument.update({
            where: { id: documentId },
            data: {
              status: review.status,
              rejectionReason:
                review.status === DocumentReviewStatus.REJECTED
                  ? review.rejectionReason?.trim()
                  : null,
              reviewNotes: review.reviewNotes?.trim() || null,
              reviewedBy: review.adminIdentifier,
              reviewedAt: new Date(),
            },
          });

          // Log in driver_status_history
          try {
            await (tx as any).driverStatusHistory.create({
              data: {
                driverId: driverDoc.driverId,
                statusType: 'DOCUMENT_REVIEW',
                fromStatus: driverDoc.status,
                toStatus: review.status,
                reason:
                  review.status === DocumentReviewStatus.REJECTED
                    ? `Document ${driverDoc.documentType} rejected: ${review.rejectionReason}`
                    : `Document ${driverDoc.documentType} status updated to ${review.status}`,
                changedBy: review.adminIdentifier,
              },
            });
          } catch (histErr) {
            // Ignore audit log error if table differs
          }

          // Recalculate driver overall status
          const allDocs = await tx.driverDocument.findMany({
            where: { driverId: driverDoc.driverId },
          });

          const hasRejection = allDocs.some(
            (d) => d.status === DocumentReviewStatus.REJECTED
          );

          let newDriverStatus: DriverVerificationStatus = DriverVerificationStatus.PENDING;
          if (hasRejection) {
            newDriverStatus = DriverVerificationStatus.REJECTED;
          } else {
            const approvedTypes = new Set(
              allDocs
                .filter((d) => d.status === DocumentReviewStatus.APPROVED)
                .map((d) => d.documentType.toUpperCase())
            );

            // Mandatory types check
            const mandatoryApproved =
              (approvedTypes.has('DRIVING_LICENSE') || approvedTypes.has('DRIVER_LICENSE')) &&
              approvedTypes.has('NATIONAL_ID') &&
              (approvedTypes.has('POLICE_CLEARANCE') || approvedTypes.has('CRIMINAL_RECORD_CLEARANCE'));

            if (mandatoryApproved) {
              newDriverStatus = DriverVerificationStatus.APPROVED;
            }
          }

          await tx.driver.update({
            where: { id: driverDoc.driverId },
            data: { verificationStatus: newDriverStatus },
          });

          return {
            doc: updated,
            driverStatus: newDriverStatus,
          };
        });

        logger.info(
          { documentId, status: review.status, driverStatus: result.driverStatus },
          '[AdminDocumentService] Driver document reviewed successfully'
        );

        return {
          document: this.formatDocument(result.doc, 'DRIVER'),
          overallStatus: result.driverStatus,
        };
      }

      // 2. Check if VehicleDocument
      const vehicleDoc = await prisma.vehicleDocument.findUnique({
        where: { id: documentId },
      });

      if (vehicleDoc) {
        const result = await prisma.$transaction(async (tx) => {
          const updated = await tx.vehicleDocument.update({
            where: { id: documentId },
            data: {
              status: review.status,
              rejectionReason:
                review.status === DocumentReviewStatus.REJECTED
                  ? review.rejectionReason?.trim()
                  : null,
              reviewNotes: review.reviewNotes?.trim() || null,
              reviewedBy: review.adminIdentifier,
              reviewedAt: new Date(),
            },
          });

          // Recalculate vehicle overall status
          const allDocs = await tx.vehicleDocument.findMany({
            where: { vehicleId: vehicleDoc.vehicleId },
          });

          const hasRejection = allDocs.some(
            (d) => d.status === DocumentReviewStatus.REJECTED
          );

          let newVehicleStatus: VehicleVerificationStatus = VehicleVerificationStatus.PENDING;
          if (hasRejection) {
            newVehicleStatus = VehicleVerificationStatus.REJECTED;
          } else {
            const approvedTypes = new Set(
              allDocs
                .filter((d) => d.status === DocumentReviewStatus.APPROVED)
                .map((d) => d.documentType.toUpperCase())
            );

            const mandatoryApproved =
              (approvedTypes.has('REGISTRATION_CERTIFICATE') || approvedTypes.has('VEHICLE_TITLE_LIBRE')) &&
              approvedTypes.has('INSURANCE_CERTIFICATE') &&
              approvedTypes.has('ANNUAL_INSPECTION_BOLO');

            if (mandatoryApproved) {
              newVehicleStatus = VehicleVerificationStatus.VERIFIED;
            }
          }

          await tx.vehicle.update({
            where: { id: vehicleDoc.vehicleId },
            data: { verificationStatus: newVehicleStatus },
          });

          return {
            doc: updated,
            vehicleStatus: newVehicleStatus,
          };
        });

        logger.info(
          { documentId, status: review.status, vehicleStatus: result.vehicleStatus },
          '[AdminDocumentService] Vehicle document reviewed successfully'
        );

        return {
          document: this.formatDocument(result.doc, 'VEHICLE'),
          overallStatus: result.vehicleStatus,
        };
      }

      throw new AppError('Document not found', 404);
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        throw new AppError('Database connection unavailable for review update', 503);
      }
      throw err;
    }
  }

  /**
   * Fetches the raw file stream or buffer from storage or fallback.
   * Overrides response headers with verified MIME type to prevent Cloudinary ACL or download blocks.
   */
  public async getDocumentStream(
    documentId: string,
    mode: 'preview' | 'download'
  ): Promise<{
    stream: Readable;
    contentType: string;
    contentDisposition: string;
    fileName: string;
  }> {
    const doc = await this.getDocumentById(documentId);

    const isPdf =
      doc.fileFormat.toLowerCase() === 'pdf' ||
      doc.fileName.toLowerCase().endsWith('.pdf') ||
      doc.fileUrl.toLowerCase().includes('.pdf');

    const contentType = isPdf
      ? 'application/pdf'
      : doc.fileFormat.toLowerCase() === 'png'
      ? 'image/png'
      : doc.fileFormat.toLowerCase() === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

    const safeFilename = doc.fileName || `document_${doc.id}.${isPdf ? 'pdf' : 'jpg'}`;
    const dispositionType = mode === 'download' ? 'attachment' : 'inline';
    const contentDisposition = `${dispositionType}; filename="${encodeURIComponent(safeFilename)}"`;

    // 1. Handle Base64 Data URI if present in legacy records
    if (doc.fileUrl.startsWith('data:')) {
      const base64Data = doc.fileUrl.split(',')[1] || '';
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = Readable.from(buffer);
      return {
        stream,
        contentType,
        contentDisposition,
        fileName: safeFilename,
      };
    }

    // 2. Handle HTTP/HTTPS URLs (Cloudinary)
    if (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://')) {
      return new Promise((resolve, reject) => {
        const client = doc.fileUrl.startsWith('https://') ? https : http;

        client.get(doc.fileUrl, (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            logger.warn(
              { documentId, url: doc.fileUrl, status: res.statusCode },
              '[AdminDocumentService] Cloudinary upstream fetch returned error'
            );
            return reject(
              new AppError(
                `Failed to retrieve document from storage (Upstream HTTP ${res.statusCode})`,
                502
              )
            );
          }

          resolve({
            stream: res as unknown as Readable,
            contentType,
            contentDisposition,
            fileName: safeFilename,
          });
        }).on('error', (err) => {
          logger.error({ documentId, error: err.message }, '[AdminDocumentService] Upstream stream connection error');
          reject(new AppError(`Document storage connection failed: ${err.message}`, 502));
        });
      });
    }

    throw new AppError('Document storage reference is invalid or unsupported', 400);
  }

  /**
   * Retrieve audit review history for a driver or document.
   */
  public async getDocumentHistory(documentId: string): Promise<any[]> {
    try {
      const doc = await this.getDocumentById(documentId);
      if (doc.entityType === 'DRIVER') {
        const history = await prisma.driverStatusHistory.findMany({
          where: {
            driverId: doc.driverId,
            statusType: 'DOCUMENT_REVIEW',
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
        return history;
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const adminDocumentService = new AdminDocumentService();
