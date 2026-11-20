'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Car,
  Star,
  DollarSign,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DocumentReviewModal } from '../../../../components/common/DocumentReviewModal';
import { DriverService } from '../../../../services/driverService';
import { Driver } from '../../../../types';
import { formatDate, formatDateTime } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const loadDriver = async () => {
    setIsLoading(true);
    try {
      const data = await DriverService.getDriverById(id);
      setDriver(data);
    } catch (err) {
      console.error('Failed to load driver details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadDriver();
  }, [id]);

  const handleReviewDocument = async (
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ) => {
    if (!driver) return;
    const updated = await DriverService.reviewDriverDocument(driver.id, documentId, review);
    if (updated) {
      setDriver({ ...updated });
    }
  };

  const handleApprove = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Driver Account',
      message: `Are you sure you want to approve ${driver?.fullName}? This driver will be authorized to accept rides immediately across Kings Taxi.`,
      action: async () => {
        setIsUpdating(true);
        await DriverService.updateDriver(driver!.id, { verificationStatus: 'APPROVED' });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsUpdating(false);
        loadDriver();
      },
    });
  };

  const handleSuspend = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Suspend Driver Account',
      message: `Are you sure you want to suspend ${driver?.fullName}? The driver will immediately lose dispatch access.`,
      action: async () => {
        setIsUpdating(true);
        await DriverService.updateDriver(driver!.id, { verificationStatus: 'SUSPENDED' });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsUpdating(false);
        loadDriver();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading driver profile...</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-5">
        <AlertTriangle size={36} className="text-warning mb-2" />
        <h2 className="h5 fw-bold text-obsidian">Driver Not Found</h2>
        <p className="text-muted small">The requested driver profile does not exist.</p>
        <Link href="/drivers" className="btn btn-outline-secondary btn-sm">
          Return to Drivers List
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={driver.fullName}
        description={`Driver ID: ${driver.driverId} • Registered on ${formatDate(driver.createdAt)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Drivers', href: '/drivers' },
          { label: driver.fullName },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/drivers" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>
            {driver.verificationStatus !== 'APPROVED' && (
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center gap-1.5"
                onClick={handleApprove}
              >
                <CheckCircle size={15} />
                <span>Approve Verification</span>
              </button>
            )}
            {driver.verificationStatus !== 'SUSPENDED' && (
              <button
                type="button"
                className="btn btn-danger btn-sm d-flex align-items-center gap-1.5"
                onClick={handleSuspend}
              >
                <XCircle size={15} />
                <span>Suspend Account</span>
              </button>
            )}
          </div>
        }
      />

      <div className="row g-4">
        {/* Left Column: Driver Bio & Status */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4 text-center">
              <div
                className="rounded-circle mx-auto d-flex align-items-center justify-content-center text-dark fw-bold mb-3 shadow-sm"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: '#D6A83E',
                  fontSize: '1.75rem',
                }}
              >
                {driver.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>

              <h2 className="h5 fw-bold text-obsidian mb-1">{driver.fullName}</h2>
              <p className="text-muted small mb-2">{driver.city}, Ethiopia</p>

              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <StatusBadge status={driver.verificationStatus} />
                <StatusBadge status={driver.availabilityStatus} />
              </div>

              <div className="border-top pt-3 text-start">
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Phone Number</span>
                  <span className="text-obsidian fw-medium small">{driver.phone}</span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Commercial License Number</span>
                  <span className="text-obsidian fw-medium font-monospace small">
                    {driver.licenseNumber}
                  </span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Operating City</span>
                  <span className="text-obsidian fw-medium small">{driver.city}</span>
                </div>
                <div>
                  <span className="text-muted small d-block">Assigned Vehicle</span>
                  <span className="text-obsidian fw-medium small">
                    {driver.assignedVehiclePlate || 'No vehicle currently assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Documents */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <ShieldCheck size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Verification Documents</h3>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-sm py-1 px-2.5 fw-semibold text-xs"
                onClick={() => setIsReviewModalOpen(true)}
              >
                Review Documents
              </button>
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2.5">
                {driver.documents && driver.documents.length > 0 ? (
                  driver.documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setIsReviewModalOpen(true)}
                      className="p-2.5 rounded-2 border border-light d-flex align-items-center justify-content-between bg-light transition-all"
                      style={{ cursor: 'pointer' }}
                      title="Click to preview and review document"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <FileText size={16} className="text-secondary" />
                        <div>
                          <div className="text-sm fw-medium text-obsidian">
                            {(doc.documentType || doc.type || 'DOCUMENT').replace(/_/g, ' ')}
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {doc.documentNumber ? `#${doc.documentNumber} • ` : ''}
                            Uploaded {formatDate(doc.uploadedAt || doc.createdAt)}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={doc.status || (doc.isVerified ? 'APPROVED' : 'PENDING')} size="sm" />
                    </div>
                  ))
                ) : (
                  <p className="text-muted small mb-0">No documents on file.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Metrics & Trip Summary */}
        <div className="col-12 col-lg-8">
          {/* Key Metrics */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-sm-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 bg-white">
                <span className="text-muted small fw-medium">Rating</span>
                <div className="d-flex align-items-center gap-1.5 mt-1">
                  <Star size={18} className="text-gold fill-gold" />
                  <span className="h4 fw-bold text-obsidian mb-0">{driver.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 bg-white">
                <span className="text-muted small fw-medium">Total Trips</span>
                <div className="h4 fw-bold text-obsidian mt-1 mb-0">{driver.totalTrips || driver.totalRides || 0}</div>
              </div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 bg-white">
                <span className="text-muted small fw-medium">Completion</span>
                <div className="h4 fw-bold text-success mt-1 mb-0">{driver.completionRate || 96}%</div>
              </div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 bg-white">
                <span className="text-muted small fw-medium">Earnings</span>
                <div className="h5 fw-bold text-gold mt-1 mb-0">{formatETB(driver.earningsETB || driver.totalEarningsETB || 0)}</div>
              </div>
            </div>
          </div>

          {/* Assigned Vehicle Details */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Car size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Assigned Vehicle Specifications</h3>
              </div>
              <span className="badge bg-gold-subtle text-gold">Commercial Taxi License</span>
            </div>
            <div className="card-body p-3">
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <span className="text-muted small d-block">Plate Number</span>
                  <span className="fw-bold text-obsidian font-monospace">
                    {driver.assignedVehiclePlate || 'N/A'}
                  </span>
                </div>
                <div className="col-6 col-md-3">
                  <span className="text-muted small d-block">Vehicle Model</span>
                  <span className="fw-bold text-obsidian">Toyota Corolla 2022</span>
                </div>
                <div className="col-6 col-md-3">
                  <span className="text-muted small d-block">Service Tier</span>
                  <span className="badge bg-light text-dark border">Standard Sedan</span>
                </div>
                <div className="col-6 col-md-3">
                  <span className="text-muted small d-block">GPS Tracking Unit</span>
                  <span className="text-success small fw-semibold">Connected (5s telemetry)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Operations Note */}
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
                Administrator Audit Note
              </span>
              <span className="text-muted small">Updated {formatDateTime(driver.updatedAt)}</span>
            </div>
            <p className="text-white-50 text-xs mb-0">
              Driver has passed regular transport safety verification and maintains top ratings
              across Gondar airport pickups and Fasil Ghebbi tourist transfers.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={isUpdating}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {isReviewModalOpen && driver && (
        <DocumentReviewModal
          isOpen={true}
          onClose={() => setIsReviewModalOpen(false)}
          entityType="DRIVER"
          entityName={driver.fullName}
          entityIdentifier={driver.driverId}
          currentOverallStatus={driver.verificationStatus}
          documents={((driver.documents || []) as any[]).map((d) => ({
            id: d.id,
            documentType: d.documentType || d.type || 'DOCUMENT',
            documentNumber: d.documentNumber,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            fileFormat: d.fileFormat,
            fileSize: d.fileSize,
            status: d.status || (d.isVerified ? 'APPROVED' : 'PENDING_REVIEW'),
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
