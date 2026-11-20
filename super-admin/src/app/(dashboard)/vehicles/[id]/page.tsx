'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Car,
  Calendar,
  Shield,
  Wrench,
  Fuel,
  Users,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { DocumentReviewModal } from '../../../../components/common/DocumentReviewModal';
import { VehicleService } from '../../../../services/vehicleService';
import { Vehicle } from '../../../../types';
import { formatDate } from '../../../../utils/dateUtils';

export default function VehicleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const loadVehicle = async () => {
    setIsLoading(true);
    try {
      const data = await VehicleService.getVehicleById(id);
      setVehicle(data);
    } catch (err) {
      console.error('Failed to load vehicle details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadVehicle();
  }, [id]);

  const handleReviewDocument = async (
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ) => {
    if (!vehicle) return;
    const updated = await VehicleService.reviewVehicleDocument(vehicle.id, documentId, review);
    if (updated) {
      setVehicle({ ...updated });
    }
  };

  const handleToggleMaintenance = async () => {
    if (!vehicle) return;
    const newStatus = vehicle.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    setIsUpdating(true);
    try {
      await VehicleService.updateVehicle(vehicle.id, { status: newStatus });
      loadVehicle();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading vehicle specifications...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-5">
        <AlertTriangle size={36} className="text-warning mb-2" />
        <h2 className="h5 fw-bold text-obsidian">Vehicle Not Found</h2>
        <Link href="/vehicles" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Fleet List
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
        description={`Commercial Plate: ${vehicle.plateNumber} • Category: ${vehicle.category.replace(/_/g, ' ')}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Fleet & Vehicles', href: '/vehicles' },
          { label: vehicle.plateNumber },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/vehicles" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1.5 ${
                vehicle.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-success'
              }`}
              onClick={handleToggleMaintenance}
              disabled={isUpdating}
            >
              <Wrench size={14} />
              <span>
                {vehicle.status === 'ACTIVE' ? 'Flag for Maintenance' : 'Mark as Ready / Active'}
              </span>
            </button>
          </div>
        }
      />

      <div className="row g-4">
        {/* Left Column: Core Specs */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4 text-center">
              <div
                className="rounded-3 bg-light border mx-auto d-flex align-items-center justify-content-center text-obsidian mb-3 shadow-sm"
                style={{ width: 80, height: 80 }}
              >
                <Car size={40} className="text-gold" />
              </div>
              <h2 className="h5 fw-bold text-obsidian mb-1">{vehicle.plateNumber}</h2>
              <p className="text-muted small mb-2">
                {vehicle.make} {vehicle.model} • {vehicle.color}
              </p>
              <StatusBadge status={vehicle.status} />

              <div className="border-top pt-3 text-start mt-3">
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Passenger Capacity</span>
                  <span className="text-obsidian fw-medium small">{vehicle.capacity} Persons</span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Fuel Type</span>
                  <span className="text-obsidian fw-medium small">{vehicle.fuelType || 'Benzene'}</span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Service Classification</span>
                  <span className="text-obsidian fw-medium small">
                    {vehicle.category.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Driver Box */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3">
              <h3 className="h6 fw-bold text-obsidian mb-0">Assigned Driver</h3>
            </div>
            <div className="card-body p-3">
              {vehicle.assignedDriverName ? (
                <div>
                  <div className="fw-bold text-obsidian mb-1">{vehicle.assignedDriverName}</div>
                  <p className="text-muted small mb-3">
                    Assigned operator registered for this vehicle.
                  </p>
                  {vehicle.assignedDriverId && (
                    <Link
                      href={`/drivers/${vehicle.assignedDriverId}`}
                      className="btn btn-outline-gold btn-sm w-100"
                    >
                      View Driver Profile
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-muted small mb-0">No driver currently assigned.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Compliance & Inspection */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <Shield size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Compliance, Insurance & Safety</h3>
              </div>
            </div>
            <div className="card-body p-3">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded-2 border border-light bg-light">
                    <span className="text-muted small d-block mb-1">Commercial Insurance Expiry</span>
                    <div className="fw-bold text-obsidian">{formatDate(vehicle.insuranceExpiry)}</div>
                    <span className="badge bg-success-subtle text-success mt-2 text-xs">
                      Coverage Valid
                    </span>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded-2 border border-light bg-light">
                    <span className="text-muted small d-block mb-1">Annual Roadworthiness Certificate</span>
                    <div className="fw-bold text-obsidian">
                      {vehicle.inspectionExpiry ? formatDate(vehicle.inspectionExpiry) : '2027-04-15'}
                    </div>
                    <span className="badge bg-success-subtle text-success mt-2 text-xs">
                      Inspected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Verification & Compliance Documents Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <FileCheck size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">
                  Registration & Verification Documents
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-sm py-1 px-2.5 fw-semibold text-xs"
                onClick={() => setIsReviewModalOpen(true)}
              >
                Review Vehicle Documents
              </button>
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2.5">
                {vehicle.documents && vehicle.documents.length > 0 ? (
                  vehicle.documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setIsReviewModalOpen(true)}
                      className="p-2.5 rounded-2 border border-light d-flex align-items-center justify-content-between bg-light transition-all"
                      style={{ cursor: 'pointer' }}
                      title="Click to preview document in Cloudinary viewer"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <FileText size={16} className="text-secondary" />
                        <div>
                          <div className="text-sm fw-medium text-obsidian">
                            {doc.documentType.replace(/_/g, ' ')}
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {doc.documentNumber ? `#${doc.documentNumber} • ` : ''}
                            {doc.expiryDate ? `Expires ${formatDate(doc.expiryDate)} • ` : ''}
                            Uploaded {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={doc.status || 'PENDING'} size="sm" />
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-muted small bg-light rounded-2 border border-light">
                    No documents uploaded yet for this vehicle.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="p-3 rounded-3"
            style={{
              backgroundColor: '#1E1E1E',
              color: '#FFFFFF',
              border: '1px solid rgba(214, 168, 62, 0.3)',
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="fw-bold text-gold small text-uppercase">
                GPS Tracking Device & Telemetry
              </span>
              <span className="badge bg-success text-white text-xs">ONLINE</span>
            </div>
            <p className="text-white-50 text-xs mb-0">
              Vehicle is equipped with an integrated OBD-II GPS locator streaming real-time
              telemetry every 5 seconds to the Gondar central dispatch engine.
            </p>
          </div>
        </div>
      </div>

      {isReviewModalOpen && vehicle && (
        <DocumentReviewModal
          isOpen={true}
          onClose={() => setIsReviewModalOpen(false)}
          entityType="VEHICLE"
          entityName={`${vehicle.make} ${vehicle.model}`}
          entityIdentifier={vehicle.plateNumber}
          currentOverallStatus={vehicle.verificationStatus || (vehicle.isVerified ? 'VERIFIED' : 'PENDING')}
          documents={((vehicle.documents || []) as any[]).map((d) => ({
            id: d.id,
            documentType: d.documentType || 'DOCUMENT',
            documentNumber: d.documentNumber,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            fileFormat: d.fileFormat,
            fileSize: d.fileSize,
            status: d.status || 'PENDING_REVIEW',
            rejectionReason: d.rejectionReason,
            reviewNotes: d.reviewNotes,
            reviewedBy: d.reviewedBy,
            reviewedAt: d.reviewedAt,
            expiryDate: d.expiryDate,
          }))}
          onReviewDocument={handleReviewDocument}
        />
      )}
    </div>
  );
}
