'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Plus, Eye, Fuel, Users, Shield, Wrench, FileText, CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatCard } from '../../../components/common/StatCard';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { DocumentReviewModal } from '../../../components/common/DocumentReviewModal';
import { VehicleService } from '../../../services/vehicleService';
import { Vehicle } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<{
    totalVehicles: number;
    activeVehicles: number;
    availableVehicles: number;
    assignedVehicles: number;
    underMaintenance: number;
    pendingVerification: number;
    suspendedVehicles: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [reviewingVehicle, setReviewingVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        VehicleService.getVehicles({
          category: categoryFilter,
          status: statusFilter,
          isAssigned: assignmentFilter,
          limit: 100,
        }),
        VehicleService.getStatistics(),
      ]);
      setVehicles(res.items);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [categoryFilter, statusFilter, assignmentFilter]);

  const handleReviewDocument = async (
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ) => {
    if (!reviewingVehicle) return;
    const updated = await VehicleService.reviewVehicleDocument(reviewingVehicle.id, documentId, review);
    if (updated) {
      setReviewingVehicle(updated);
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    }
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'plateNumber',
      header: 'Plate & Model',
      sortable: true,
      render: (v) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-3 bg-light border p-2 d-flex align-items-center justify-content-center text-obsidian"
            style={{ width: 40, height: 40 }}
          >
            <Car size={20} />
          </div>
          <div>
            <div className="fw-bold text-obsidian font-monospace text-sm">{v.plateNumber}</div>
            <div className="text-muted text-xs">
              {v.make} {v.model} ({v.year}) • {v.color}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Service Category',
      sortable: true,
      render: (v) => (
        <span className="badge bg-light text-dark border fw-medium text-xs">
          {v.category.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'assignedDriverName',
      header: 'Assigned Driver',
      render: (v) =>
        v.assignedDriverName ? (
          <div>
            <div className="text-sm fw-medium text-obsidian">{v.assignedDriverName}</div>
            <div className="text-muted text-xs">
              {v.assignedDriverPhone || 'Active operator'}
              {v.assignedAt ? ` • ${formatDate(v.assignedAt)}` : ''}
            </div>
          </div>
        ) : (
          <span className="text-muted small fst-italic">Unassigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Vehicle Status',
      sortable: true,
      render: (v) => <StatusBadge status={v.status} size="sm" />,
    },
    {
      key: 'insuranceExpiry',
      header: 'Insurance Expiry',
      render: (v) => (
        <div className="text-sm">
          <span>{formatDate(v.insuranceExpiry)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="Review Vehicle Documents"
            onClick={(e) => {
              e.stopPropagation();
              setReviewingVehicle(v);
            }}
          >
            <FileText size={16} />
          </button>
          <Link
            href={`/vehicles/${v.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="View Vehicle Specs"
          >
            <Eye size={16} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fleet & Vehicles"
        description="Monitor vehicle inspection status, insurance validity, driver assignments and maintenance records"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Fleet & Vehicles' },
        ]}
        actions={
          <Link
            href="/vehicles/new"
            className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
          >
            <Plus size={16} />
            <span>Register Vehicle</span>
          </Link>
        }
      />

      {/* Fleet KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-2">
          <StatCard
            title="Total Fleet"
            value={stats ? stats.totalVehicles : vehicles.length}
            icon={Car}
            accentColor="gold"
            subtext="Registered vehicles"
          />
        </div>
        <div className="col-6 col-lg-2">
          <StatCard
            title="Active & Ready"
            value={stats ? stats.activeVehicles : vehicles.filter((v) => v.status === 'ACTIVE').length}
            icon={Shield}
            accentColor="emerald"
            subtext="Operational fleet"
          />
        </div>
        <div className="col-6 col-lg-2">
          <StatCard
            title="Available"
            value={stats ? stats.availableVehicles : vehicles.filter((v) => !v.assignedDriverId && v.status === 'ACTIVE').length}
            icon={CheckCircle}
            accentColor="emerald"
            subtext="Ready for assignment"
          />
        </div>
        <div className="col-6 col-lg-2">
          <StatCard
            title="Assigned Drivers"
            value={stats ? stats.assignedVehicles : vehicles.filter((v) => !!v.assignedDriverId).length}
            icon={Users}
            accentColor="gold"
            subtext="Active operators"
          />
        </div>
        <div className="col-6 col-lg-2">
          <StatCard
            title="In Maintenance"
            value={stats ? stats.underMaintenance : vehicles.filter((v) => v.status === 'MAINTENANCE' || v.status === 'UNDER_MAINTENANCE').length}
            icon={Wrench}
            accentColor="amber"
            subtext="Repairs & servicing"
          />
        </div>
        <div className="col-6 col-lg-2">
          <StatCard
            title="Pending Check"
            value={stats ? stats.pendingVerification : vehicles.filter((v) => v.verificationStatus === 'PENDING').length}
            icon={FileText}
            accentColor="rose"
            subtext="Awaiting docs / bolo"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search by plate number, make, model, driver..."
        searchKeys={['plateNumber', 'make', 'model', 'assignedDriverName']}
        onRowClick={(item) => router.push(`/vehicles/${item.id}`)}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'STANDARD_SEDAN', label: 'Standard Sedan' },
                { value: 'LUXURY_VIP', label: 'Luxury VIP' },
                { value: 'TOURISM_4WD', label: 'Tourism 4WD' },
                { value: 'MINIVAN_GROUP', label: 'Minivan Group' },
                { value: 'COMFORT_VAN', label: 'Comfort Van' },
                { value: 'EXECUTIVE', label: 'Executive' },
                { value: 'SUV', label: 'SUV Premium' },
                { value: 'MINIBUS', label: 'Minibus' },
              ]}
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'MAINTENANCE', label: 'In Maintenance' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
            <FilterDropdown
              label="Assignment"
              value={assignmentFilter}
              onChange={setAssignmentFilter}
              options={[
                { value: 'ALL', label: 'All Assignments' },
                { value: 'true', label: 'Assigned' },
                { value: 'false', label: 'Unassigned' },
              ]}
            />
          </div>
        }
      />

      {reviewingVehicle && (
        <DocumentReviewModal
          isOpen={true}
          onClose={() => setReviewingVehicle(null)}
          entityType="VEHICLE"
          entityName={`${reviewingVehicle.make} ${reviewingVehicle.model}`}
          entityIdentifier={reviewingVehicle.plateNumber}
          currentOverallStatus={reviewingVehicle.verificationStatus || (reviewingVehicle.isVerified ? 'VERIFIED' : 'PENDING')}
          documents={((reviewingVehicle.documents || []) as any[]).map((d) => ({
            id: d.id,
            documentType: d.documentType || 'DOCUMENT',
            documentNumber: d.documentNumber,
            fileUrl: d.fileUrl,
            publicId: d.publicId,
            previewUrl: d.previewUrl,
            downloadUrl: d.downloadUrl,
            fileName: d.fileName,
            fileFormat: d.fileFormat,
            fileSize: d.fileSize,
            status: d.status || 'PENDING_REVIEW',
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
    </div>
  );
}
