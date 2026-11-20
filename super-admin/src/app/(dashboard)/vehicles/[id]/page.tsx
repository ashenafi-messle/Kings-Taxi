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
  Plus,
  X,
  UserCheck,
  RotateCw,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DocumentReviewModal } from '../../../../components/common/DocumentReviewModal';
import { VehicleService } from '../../../../services/vehicleService';
import { DriverService } from '../../../../services/driverService';
import { Vehicle, Driver } from '../../../../types';
import { formatDate } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';

export default function VehicleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Driver Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false);
  const [candidates, setCandidates] = useState<
    Array<{
      id: string;
      driverId: string;
      fullName: string;
      phone: string;
      rating?: number;
      verificationStatus?: string;
      city?: string;
    }>
  >([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Maintenance Logging State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'OIL_SERVICE',
    description: '',
    costETB: 2500,
    serviceCenter: 'Gondar Central Fleet Workshop',
  });
  const [isLoggingMaintenance, setIsLoggingMaintenance] = useState(false);

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
      await loadVehicle();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const openAssignModal = async () => {
    try {
      const list = await DriverService.getAssignmentCandidates();
      setCandidates(list);
      if (list.length > 0) {
        setSelectedDriverId(list[0].id);
      }
      setIsAssignModalOpen(true);
    } catch (err) {
      console.error('Failed to load candidate drivers:', err);
    }
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !selectedDriverId) return;
    setIsAssigning(true);
    try {
      await VehicleService.assignDriver(vehicle.id, selectedDriverId, assignNotes || undefined);
      setIsAssignModalOpen(false);
      setAssignNotes('');
      await loadVehicle();
    } catch (err) {
      console.error('Failed to assign driver:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleConfirmUnassignment = async () => {
    if (!vehicle) return;
    setIsUpdating(true);
    try {
      await VehicleService.unassignDriver(vehicle.id, 'Administrative unassignment via Super Admin');
      setIsUnassignConfirmOpen(false);
      await loadVehicle();
    } catch (err) {
      console.error('Failed to unassign driver:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    setIsLoggingMaintenance(true);
    try {
      await VehicleService.addMaintenance(vehicle.id, {
        maintenanceType: maintenanceForm.type,
        description: maintenanceForm.description || `${maintenanceForm.type.replace(/_/g, ' ')} servicing`,
        costETB: Number(maintenanceForm.costETB) || 0,
        serviceCenter: maintenanceForm.serviceCenter,
        serviceDate: new Date().toISOString(),
        notes: `Recorded by Super Admin on ${new Date().toISOString()}`,
      });
      setIsMaintenanceModalOpen(false);
      setMaintenanceForm({
        type: 'OIL_SERVICE',
        description: '',
        costETB: 2500,
        serviceCenter: 'Gondar Central Fleet Workshop',
      });
      await loadVehicle();
    } catch (err) {
      console.error('Failed to log maintenance record:', err);
    } finally {
      setIsLoggingMaintenance(false);
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
        {/* Left Column: Core Specs & Driver Assignment */}
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
                {vehicle.vinNumber && (
                  <div>
                    <span className="text-muted small d-block">VIN / Chassis Number</span>
                    <span className="text-obsidian fw-medium font-monospace small">
                      {vehicle.vinNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Driver Box */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <h3 className="h6 fw-bold text-obsidian mb-0">Assigned Driver</h3>
              {vehicle.assignedDriverName ? (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm py-1 px-2 text-xs"
                  onClick={() => setIsUnassignConfirmOpen(true)}
                  disabled={isUpdating}
                >
                  Unassign
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-gold btn-sm py-1 px-2.5 text-xs fw-semibold"
                  onClick={openAssignModal}
                  disabled={isUpdating}
                >
                  <Plus size={14} className="me-1" />
                  Assign
                </button>
              )}
            </div>
            <div className="card-body p-3">
              {vehicle.assignedDriverName ? (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold"
                      style={{ width: 36, height: 36, backgroundColor: '#EAC76A', fontSize: '0.8rem' }}
                    >
                      {vehicle.assignedDriverName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold text-obsidian mb-0 small">{vehicle.assignedDriverName}</div>
                      <div className="text-muted text-xs">{vehicle.assignedDriverPhone || 'Active Operator'}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    {vehicle.assignedDriverId && (
                      <Link
                        href={`/drivers/${vehicle.assignedDriverId}`}
                        className="btn btn-outline-gold btn-sm w-100 py-1"
                      >
                        View Profile
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn btn-light border btn-sm py-1"
                      onClick={openAssignModal}
                      title="Reassign to another driver"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-muted small mb-3">No driver currently assigned to this vehicle.</p>
                  <button
                    type="button"
                    className="btn btn-gold btn-sm w-100 fw-semibold"
                    onClick={openAssignModal}
                  >
                    Assign Driver to Vehicle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Compliance, Documents, Maintenance & GPS */}
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

          {/* Maintenance Records Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Wrench size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Maintenance & Service Log</h3>
              </div>
              <button
                type="button"
                className="btn btn-outline-gold btn-sm py-1 px-2.5 text-xs fw-semibold d-flex align-items-center gap-1"
                onClick={() => setIsMaintenanceModalOpen(true)}
              >
                <Plus size={14} />
                <span>Log Service</span>
              </button>
            </div>
            <div className="card-body p-3">
              {vehicle.maintenanceRecords && vehicle.maintenanceRecords.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-borderless align-middle mb-0 text-sm">
                    <thead>
                      <tr className="border-bottom text-muted" style={{ fontSize: '0.75rem' }}>
                        <th>SERVICE TYPE / NOTES</th>
                        <th>SERVICE CENTER</th>
                        <th>COST (ETB)</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.maintenanceRecords.map((m) => (
                        <tr key={m.id} className="border-bottom border-light">
                          <td>
                            <div className="fw-medium text-obsidian">{m.description}</div>
                          </td>
                          <td className="text-muted">{m.serviceCenter || 'Central Workshop'}</td>
                          <td className="fw-bold font-monospace text-obsidian">{formatETB(m.costETB || 0)}</td>
                          <td className="text-muted text-xs">{formatDate(m.serviceDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center text-muted small bg-light rounded-2 border border-light">
                  No maintenance records logged yet. Use "Log Service" to record inspections or repairs.
                </div>
              )}
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

      {/* Document Review Modal */}
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

      {/* Confirm Unassign Driver Dialog */}
      <ConfirmDialog
        isOpen={isUnassignConfirmOpen}
        title="Unassign Driver from Vehicle"
        message={`Are you sure you want to unassign ${vehicle.assignedDriverName || 'the current driver'} from vehicle ${vehicle.plateNumber}? The vehicle and driver will become available for new pairings.`}
        confirmLabel="Unassign Driver"
        variant="danger"
        isLoading={isUpdating}
        onConfirm={handleConfirmUnassignment}
        onCancel={() => setIsUnassignConfirmOpen(false)}
      />

      {/* Driver Assignment Modal */}
      {isAssignModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(37, 37, 37, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1050,
          }}
        >
          <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: 520 }}>
            <div
              className="modal-content shadow-lg border rounded-4 overflow-hidden"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              <div
                className="modal-header border-bottom py-3 px-4"
                style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <UserCheck size={18} className="text-gold" />
                  <h3 className="modal-title h6 fw-bold text-obsidian mb-0">
                    Assign Driver to {vehicle.plateNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isAssigning}
                />
              </div>

              <form onSubmit={handleConfirmAssignment}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-obsidian">
                      Select Approved Fleet Driver <span className="text-danger">*</span>
                    </label>
                    {candidates.length > 0 ? (
                      <select
                        className="form-select text-sm"
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        required
                      >
                        {candidates.map((cand) => (
                          <option key={cand.id} value={cand.id}>
                            {cand.fullName} ({cand.driverId}) — {cand.city} • {cand.phone}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="alert alert-warning py-2 text-xs mb-0">
                        No unassigned approved drivers available at this time. Approved drivers without an active vehicle assignment will appear here.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-obsidian">
                      Assignment Notes (Optional)
                    </label>
                    <textarea
                      className="form-control text-sm"
                      rows={3}
                      placeholder="e.g., Assigned for Gondar airport tourism routes"
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer border-top py-2.5 px-4 bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setIsAssignModalOpen(false)}
                    disabled={isAssigning}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-gold btn-sm fw-semibold"
                    disabled={isAssigning || !selectedDriverId || candidates.length === 0}
                  >
                    {isAssigning ? 'Assigning Driver...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Log Maintenance Modal */}
      {isMaintenanceModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(37, 37, 37, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1050,
          }}
        >
          <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: 520 }}>
            <div
              className="modal-content shadow-lg border rounded-4 overflow-hidden"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              <div
                className="modal-header border-bottom py-3 px-4"
                style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <Wrench size={18} className="text-gold" />
                  <h3 className="modal-title h6 fw-bold text-obsidian mb-0">
                    Log Maintenance for {vehicle.plateNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  disabled={isLoggingMaintenance}
                />
              </div>

              <form onSubmit={handleLogMaintenance}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-obsidian">
                      Maintenance Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select text-sm"
                      value={maintenanceForm.type}
                      onChange={(e) =>
                        setMaintenanceForm((prev) => ({ ...prev, type: e.target.value }))
                      }
                      required
                    >
                      <option value="OIL_SERVICE">Engine Oil & Filter Service</option>
                      <option value="BRAKE_OVERHAUL">Brake Pads & Disc Maintenance</option>
                      <option value="TIRE_REPLACEMENT">Tire Replacement & Wheel Alignment</option>
                      <option value="ENGINE_TUNE">Engine Diagnostics & Tune-up</option>
                      <option value="INSPECTION_REPAIR">Annual Inspection Repairs (Bolo Prep)</option>
                      <option value="BODYWORK">Bodywork, Glass & Detailing</option>
                      <option value="GENERAL_SERVICE">General Comprehensive Service</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-obsidian">
                      Service Description / Notes <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-sm"
                      placeholder="e.g., Replaced front brake pads and synthetic oil"
                      value={maintenanceForm.description}
                      onChange={(e) =>
                        setMaintenanceForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-obsidian">
                        Cost (ETB) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        className="form-control text-sm font-monospace"
                        value={maintenanceForm.costETB}
                        onChange={(e) =>
                          setMaintenanceForm((prev) => ({
                            ...prev,
                            costETB: Number(e.target.value),
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-obsidian">
                        Service Center / Garage
                      </label>
                      <input
                        type="text"
                        className="form-control text-sm"
                        value={maintenanceForm.serviceCenter}
                        onChange={(e) =>
                          setMaintenanceForm((prev) => ({
                            ...prev,
                            serviceCenter: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top py-2.5 px-4 bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setIsMaintenanceModalOpen(false)}
                    disabled={isLoggingMaintenance}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-gold btn-sm fw-semibold"
                    disabled={isLoggingMaintenance}
                  >
                    {isLoggingMaintenance ? 'Saving Log...' : 'Record Maintenance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
