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
  KeyRound,
  RefreshCw,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DocumentReviewModal } from '../../../../components/common/DocumentReviewModal';
import { DriverService } from '../../../../services/driverService';
import { VehicleService } from '../../../../services/vehicleService';
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
  const [isResendingOnboarding, setIsResendingOnboarding] = useState(false);
  const [onboardingFeedback, setOnboardingFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // Vehicle Assignment State
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<'assign' | 'change'>('assign');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [assignableVehicles, setAssignableVehicles] = useState<any[]>([]);
  const [isLoadingAssignable, setIsLoadingAssignable] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleFeedback, setVehicleFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
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
      const [data, historyRes] = await Promise.all([
        DriverService.getDriverById(id),
        DriverService.getVehicleAssignmentHistory(id, 1, 20),
      ]);
      setDriver(data);
      setVehicleHistory(historyRes.items || []);
    } catch (err) {
      console.error('Failed to load driver details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignableVehicles = async (searchText = '') => {
    setIsLoadingAssignable(true);
    try {
      const res = await VehicleService.getAssignableVehicles({ search: searchText, page: 1, limit: 20 });
      setAssignableVehicles(res.items || []);
      if (res.items?.length > 0 && !res.items.some((v) => v.id === selectedVehicleId)) {
        setSelectedVehicleId(res.items[0].id);
      } else if (!res.items?.length) {
        setSelectedVehicleId('');
      }
    } catch (err) {
      console.error('Failed to load assignable vehicles:', err);
    } finally {
      setIsLoadingAssignable(false);
    }
  };

  const openVehicleModal = (mode: 'assign' | 'change') => {
    setVehicleModalMode(mode);
    setVehicleSearch('');
    setAssignmentNotes('');
    setVehicleFeedback(null);
    setIsVehicleModalOpen(true);
    void fetchAssignableVehicles('');
  };

  const handleConfirmVehicleAssignment = async () => {
    if (!driver || !selectedVehicleId || isSubmittingVehicle) return;
    setIsSubmittingVehicle(true);
    setVehicleFeedback(null);
    try {
      if (vehicleModalMode === 'change') {
        await DriverService.changeVehicle(driver.id, selectedVehicleId, assignmentNotes || undefined);
      } else {
        await DriverService.assignVehicle(driver.id, selectedVehicleId, assignmentNotes || undefined);
      }
      setIsVehicleModalOpen(false);
      setVehicleFeedback({
        type: 'success',
        message: vehicleModalMode === 'change' ? 'Driver vehicle changed successfully.' : 'Vehicle assigned to driver successfully.',
      });
      await loadDriver();
    } catch (err: any) {
      setVehicleFeedback({
        type: 'danger',
        message: err?.message || 'Unable to save vehicle assignment.',
      });
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleUnassignVehicle = () => {
    if (!driver) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Unassign Driver Vehicle',
      message: `Are you sure you want to release ${driver.assignedVehiclePlate || 'the current vehicle'} from ${driver.fullName}? The driver will be set offline and cannot accept new rides until reassigned.`,
      action: async () => {
        setIsUpdating(true);
        setVehicleFeedback(null);
        try {
          await DriverService.unassignVehicle(driver.id, 'Unassigned by Super Admin');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setVehicleFeedback({ type: 'success', message: 'Vehicle unassigned and driver eligibility updated.' });
          await loadDriver();
        } catch (err: any) {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setVehicleFeedback({ type: 'danger', message: err?.message || 'Unable to unassign vehicle.' });
        } finally {
          setIsUpdating(false);
        }
      },
    });
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
        await DriverService.updateVerificationStatus(driver!.id, 'APPROVED');
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
        await DriverService.updateAccountStatus(driver!.id, 'SUSPENDED', 'Administrative suspension by Super Admin');
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsUpdating(false);
        loadDriver();
      },
    });
  };

  const handleResendOnboarding = async () => {
    if (!driver || isResendingOnboarding) return;
    setIsResendingOnboarding(true);
    setOnboardingFeedback(null);
    try {
      const updated = await DriverService.resendOnboardingEmail(driver.id);
      setDriver(updated);
      if (updated.provisioning?.emailSent) {
        setOnboardingFeedback({
          type: 'success',
          message: 'A new temporary password was generated and sent to the driver email.',
        });
      } else {
        setOnboardingFeedback({
          type: 'danger',
          message: updated.provisioning?.error || 'Failed to send onboarding email. Please check email provider settings.',
        });
      }
    } catch (err: any) {
      setOnboardingFeedback({
        type: 'danger',
        message: err.message || 'Unable to resend onboarding email.',
      });
    } finally {
      setIsResendingOnboarding(false);
    }
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
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Initial Subcity (Presence Zone)</span>
                  <span className="text-obsidian fw-medium small">
                    {driver.subcityName || 'Not assigned'}
                  </span>
                </div>
                <div>
                  <span className="text-muted small d-block">Assigned Vehicle</span>
                  {driver.assignedVehiclePlate ? (
                    <div className="d-flex align-items-center gap-1.5 mt-0.5">
                      <span className="text-obsidian fw-medium small font-monospace">
                        {driver.assignedVehiclePlate}
                      </span>
                      {driver.assignedVehicleId && (
                        <Link
                          href={`/vehicles/${driver.assignedVehicleId}`}
                          className="btn btn-outline-gold btn-sm py-0 px-1.5 text-xs ms-1"
                        >
                          View Fleet Unit
                        </Link>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted small fst-italic">
                      No vehicle currently assigned
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Provisioning & Onboarding Status */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <KeyRound size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Account Provisioning</h3>
              </div>
              <StatusBadge status={driver.onboardingStatus || 'PENDING_ONBOARDING'} size="sm" />
            </div>
            <div className="card-body p-3">
              {onboardingFeedback && (
                <div className={`alert alert-${onboardingFeedback.type} py-2 px-2.5 small mb-3`}>
                  {onboardingFeedback.message}
                </div>
              )}
              <div className="d-flex flex-column gap-2 small">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Registered Email</span>
                  <span className="text-obsidian fw-medium text-truncate ms-2" style={{ maxWidth: 180 }}>
                    {driver.email || 'Not set'}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Email Delivery</span>
                  <StatusBadge status={driver.onboardingEmailStatus || 'NOT_SENT'} size="sm" />
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Password Status</span>
                  <span className="fw-semibold text-obsidian">
                    {driver.mustChangePassword === false ? 'Permanent Active' : 'Temporary (Must Change)'}
                  </span>
                </div>
                {driver.onboardingEmailSentAt && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Email Sent At</span>
                    <span className="text-obsidian">{formatDateTime(driver.onboardingEmailSentAt)}</span>
                  </div>
                )}
                {driver.tempPasswordExpiresAt && driver.mustChangePassword !== false && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Temp Expiry</span>
                    <span className="text-obsidian">{formatDateTime(driver.tempPasswordExpiresAt)}</span>
                  </div>
                )}
                {driver.onboardingEmailError && driver.onboardingEmailStatus === 'FAILED' && (
                  <div className="alert alert-danger py-1.5 px-2 mb-0 text-xs">
                    {driver.onboardingEmailError}
                  </div>
                )}
              </div>

              {driver.mustChangePassword !== false && driver.email && driver.accountStatus !== 'SUSPENDED' && (
                <button
                  type="button"
                  disabled={isResendingOnboarding}
                  onClick={handleResendOnboarding}
                  className="btn btn-outline-gold btn-sm w-100 mt-3 fw-semibold d-flex align-items-center justify-content-center gap-1.5"
                >
                  <RefreshCw size={14} className={isResendingOnboarding ? 'spin' : ''} />
                  <span>
                    {isResendingOnboarding
                      ? 'Regenerating & Sending...'
                      : 'Regenerate Password & Resend Email'}
                  </span>
                </button>
              )}
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

          {/* Assigned Vehicle Details & Management */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <Car size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Assigned Vehicle &amp; Fleet Integration</h3>
              </div>
              <div className="d-flex align-items-center gap-2">
                {driver.assignedVehicleId ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm py-1 px-2.5 fw-semibold text-xs d-flex align-items-center gap-1"
                      onClick={() => openVehicleModal('change')}
                    >
                      <RefreshCw size={13} />
                      <span>Change Vehicle</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm py-1 px-2.5 fw-semibold text-xs d-flex align-items-center gap-1"
                      onClick={handleUnassignVehicle}
                    >
                      <XCircle size={13} />
                      <span>Unassign</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-gold btn-sm py-1 px-2.5 fw-semibold text-xs d-flex align-items-center gap-1"
                    onClick={() => openVehicleModal('assign')}
                  >
                    <Plus size={14} />
                    <span>Assign Vehicle</span>
                  </button>
                )}
              </div>
            </div>
            <div className="card-body p-3">
              {vehicleFeedback && (
                <div className={`alert alert-${vehicleFeedback.type} py-2 px-3 small mb-3`}>
                  {vehicleFeedback.message}
                </div>
              )}

              {driver.assignedVehicle ? (
                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Plate Number</span>
                    <span className="fw-bold text-obsidian font-monospace">
                      {driver.assignedVehicle.plateNumber}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Brand &amp; Model</span>
                    <span className="fw-bold text-obsidian">
                      {driver.assignedVehicle.make || ''} {driver.assignedVehicle.vehicleModel}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Vehicle Type &amp; Color</span>
                    <span className="badge bg-light text-dark border">
                      {(driver.assignedVehicle.vehicleType || 'STANDARD_SEDAN').replace(/_/g, ' ')}
                      {driver.assignedVehicle.vehicleColor ? ` • ${driver.assignedVehicle.vehicleColor}` : ''}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Operational Status</span>
                    <StatusBadge status={driver.assignedVehicle.status || 'ASSIGNED'} size="sm" />
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Assignment Status</span>
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      {driver.assignedVehicle.assignmentStatus || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Assigned Date</span>
                    <span className="small fw-medium text-obsidian">
                      {driver.assignedVehicle.assignedAt ? formatDateTime(driver.assignedVehicle.assignedAt) : 'Recorded'}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted small d-block">Assigned By</span>
                    <span className="small text-obsidian">
                      {driver.assignedVehicle.assignedBy || 'Super Admin'}
                    </span>
                  </div>
                  <div className="col-6 col-md-3 d-flex align-items-end">
                    <Link
                      href={`/vehicles/${driver.assignedVehicle.id}`}
                      className="btn btn-outline-gold btn-sm py-1 px-2.5 text-xs fw-semibold"
                    >
                      Open Fleet Unit
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 bg-light rounded-2 border border-dashed">
                  <Car size={24} className="text-muted mb-1" />
                  <div className="small fw-semibold text-obsidian">No Vehicle Currently Assigned</div>
                  <div className="text-muted text-xs">
                    Assign an eligible verified vehicle so this driver can go online and accept rides.
                  </div>
                </div>
              )}

              {/* Assignment History */}
              <div className="border-top mt-3 pt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-xs fw-bold text-uppercase text-muted">Vehicle Assignment History</span>
                  <span className="text-xs text-muted">{vehicleHistory.length} record(s)</span>
                </div>
                {vehicleHistory.length === 0 ? (
                  <p className="text-muted text-xs mb-0">No historical vehicle assignments recorded yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0 text-xs">
                      <thead className="table-light">
                        <tr>
                          <th>Plate</th>
                          <th>Vehicle</th>
                          <th>Status</th>
                          <th>Assigned</th>
                          <th>Released</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicleHistory.map((h) => (
                          <tr key={h.id}>
                            <td className="font-monospace fw-semibold">{h.vehicle?.plateNumber || '—'}</td>
                            <td>
                              {h.vehicle ? `${h.vehicle.make} ${h.vehicle.model}` : '—'}
                            </td>
                            <td>
                              <span className={`badge ${h.isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                                {h.isActive ? 'ACTIVE' : 'RELEASED'}
                              </span>
                            </td>
                            <td>{formatDateTime(h.assignedAt)}</td>
                            <td>{h.unassignedAt ? formatDateTime(h.unassignedAt) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
            publicId: d.publicId,
            previewUrl: d.previewUrl,
            downloadUrl: d.downloadUrl,
            fileName: d.fileName,
            fileFormat: d.fileFormat,
            fileSize: d.fileSize,
            status: d.status || (d.isVerified ? 'APPROVED' : 'PENDING_REVIEW'),
            rejectionReason: d.rejectionReason,
            reviewNotes: d.reviewNotes,
            reviewedBy: d.reviewedBy,
            reviewedAt: d.reviewedAt,
            expiryDate: d.expiryDate,
            createdAt: d.createdAt,
          }))}
          onReviewDocument={handleReviewDocument}
        />
      )}

      {isVehicleModalOpen && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-obsidian">
                  {vehicleModalMode === 'change' ? 'Change Assigned Vehicle' : 'Assign Vehicle to Driver'}
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => setIsVehicleModalOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-obsidian">
                    Search Assignable Fleet Vehicles (Plate, Brand, Model)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <Search size={15} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type plate number, Toyota, Corolla..."
                      value={vehicleSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVehicleSearch(val);
                        void fetchAssignableVehicles(val);
                      }}
                    />
                  </div>
                </div>

                {isLoadingAssignable ? (
                  <div className="text-center py-4 text-muted small">Loading eligible vehicles...</div>
                ) : assignableVehicles.length === 0 ? (
                  <div className="alert alert-warning small mb-3">
                    No eligible unassigned vehicles found. Ensure the vehicle is active, verified, and not assigned to another driver.
                  </div>
                ) : (
                  <div className="list-group mb-3" style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {assignableVehicles.map((v) => {
                      const selected = selectedVehicleId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVehicleId(v.id)}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                            selected ? 'active bg-dark border-dark text-white' : ''
                          }`}
                        >
                          <div>
                            <div className="fw-bold font-monospace">
                              {v.plateNumber} — {v.make} {v.model} ({v.year})
                            </div>
                            <div className={`text-xs ${selected ? 'text-white-50' : 'text-muted'}`}>
                              {v.categoryName} • {v.color} • {v.capacity} seats • Status: {v.status}
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              className={`badge ${
                                v.verificationStatus === 'VERIFIED'
                                  ? 'bg-success-subtle text-success'
                                  : 'bg-warning-subtle text-warning'
                              }`}
                            >
                              {v.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING DOCS'}
                            </span>
                            <span className={`badge ${selected ? 'bg-gold text-dark' : 'bg-success-subtle text-success'}`}>
                              {v.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label className="form-label small fw-semibold text-obsidian">Assignment Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Assigned for Gondar Maraki zone operations"
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setIsVehicleModalOpen(false)}
                  disabled={isSubmittingVehicle}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm fw-semibold"
                  onClick={handleConfirmVehicleAssignment}
                  disabled={!selectedVehicleId || isSubmittingVehicle}
                >
                  {isSubmittingVehicle
                    ? 'Saving...'
                    : vehicleModalMode === 'change'
                    ? 'Confirm Vehicle Change'
                    : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
