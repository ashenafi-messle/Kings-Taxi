'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  Phone,
  MapPin,
  Car,
  Filter,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { DocumentReviewModal } from '../../../components/common/DocumentReviewModal';
import { DriverService } from '../../../services/driverService';
import { Driver } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';
import { formatETB } from '../../../utils/formatters';

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  const [reviewingDriver, setReviewingDriver] = useState<Driver | null>(null);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await DriverService.getDrivers({
        verificationStatus: verificationFilter,
        availabilityStatus: availabilityFilter,
        city: cityFilter,
        limit: 100,
      });
      setDrivers(res.items);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [verificationFilter, availabilityFilter, cityFilter]);

  const handleQuickStatusChange = async (
    e: React.MouseEvent,
    driverId: string,
    newStatus: 'APPROVED' | 'SUSPENDED'
  ) => {
    e.stopPropagation();
    try {
      await DriverService.updateDriver(driverId, { verificationStatus: newStatus });
      fetchDrivers();
    } catch (err) {
      console.error('Failed to update driver status:', err);
    }
  };

  const handleReviewDocument = async (
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ) => {
    if (!reviewingDriver) return;
    const updated = await DriverService.reviewDriverDocument(reviewingDriver.id, documentId, review);
    if (updated) {
      setReviewingDriver(updated);
      setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    }
  };

  const columns: Column<Driver>[] = [
    {
      key: 'fullName',
      header: 'Driver & ID',
      sortable: true,
      render: (driver) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold"
            style={{
              width: 38,
              height: 38,
              backgroundColor: '#EAC76A',
              fontSize: '0.8125rem',
              flexShrink: 0,
            }}
          >
            {driver.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <div className="fw-bold text-obsidian text-sm">{driver.fullName}</div>
            <div className="text-muted text-xs font-monospace">{driver.driverId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact & City',
      render: (driver) => (
        <div>
          <div className="text-sm fw-medium d-flex align-items-center gap-1">
            <Phone size={13} className="text-muted" />
            <span>{driver.phone}</span>
          </div>
          <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5">
            <MapPin size={12} />
            <span>{driver.city}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      sortable: true,
      render: (driver) => <StatusBadge status={driver.verificationStatus} size="sm" />,
    },
    {
      key: 'availabilityStatus',
      header: 'Duty Status',
      sortable: true,
      render: (driver) => <StatusBadge status={driver.availabilityStatus} size="sm" />,
    },
    {
      key: 'rating',
      header: 'Rating & Trips',
      sortable: true,
      render: (driver) => (
        <div>
          <div className="d-flex align-items-center gap-1 text-sm fw-semibold">
            <Star size={14} className="text-gold fill-gold" />
            <span>{driver.rating.toFixed(1)}</span>
          </div>
          <div className="text-muted text-xs">{driver.totalTrips || driver.totalRides || 0} completed trips</div>
        </div>
      ),
    },
    {
      key: 'earningsETB',
      header: 'Total Earnings',
      sortable: true,
      render: (driver) => (
        <span className="fw-bold text-gold text-sm">{formatETB(driver.earningsETB || driver.totalEarningsETB || 0)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (driver) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="Review Verification Documents"
            onClick={(e) => {
              e.stopPropagation();
              setReviewingDriver(driver);
            }}
          >
            <FileText size={16} />
          </button>
          <Link
            href={`/drivers/${driver.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="View Full Profile"
          >
            <Eye size={16} />
          </Link>
          {driver.verificationStatus === 'PENDING' && (
            <button
              type="button"
              className="btn btn-success-subtle text-success btn-sm p-1.5 border-0"
              title="Approve Driver"
              onClick={(e) => handleQuickStatusChange(e, driver.id, 'APPROVED')}
            >
              <CheckCircle size={16} />
            </button>
          )}
          {driver.verificationStatus === 'APPROVED' && (
            <button
              type="button"
              className="btn btn-danger-subtle text-danger btn-sm p-1.5 border-0"
              title="Suspend Driver"
              onClick={(e) => handleQuickStatusChange(e, driver.id, 'SUSPENDED')}
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fleet Drivers Management"
        description="Verify licenses, monitor driver performance, manage availability status and earnings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Drivers' },
        ]}
        actions={
          <Link
            href="/drivers/new"
            className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
          >
            <Plus size={16} />
            <span>Add New Driver</span>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={drivers}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search by name, ID, phone, or license..."
        searchKeys={['fullName', 'driverId', 'phone', 'licenseNumber']}
        onRowClick={(item) => router.push(`/drivers/${item.id}`)}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="Verification"
              value={verificationFilter}
              onChange={setVerificationFilter}
              options={[
                { value: 'ALL', label: 'All Verification' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PENDING', label: 'Pending Review' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
            />
            <FilterDropdown
              label="Duty Status"
              value={availabilityFilter}
              onChange={setAvailabilityFilter}
              options={[
                { value: 'ALL', label: 'All Duty' },
                { value: 'ONLINE', label: 'Online' },
                { value: 'ON_TRIP', label: 'On Active Trip' },
                { value: 'OFFLINE', label: 'Offline' },
              ]}
            />
            <FilterDropdown
              label="City"
              value={cityFilter}
              onChange={setCityFilter}
              options={[
                { value: 'ALL', label: 'All Cities' },
                { value: 'Gondar', label: 'Gondar' },
                { value: 'Addis Ababa', label: 'Addis Ababa' },
                { value: 'Bahir Dar', label: 'Bahir Dar' },
              ]}
            />
          </div>
        }
      />

      {reviewingDriver && (
        <DocumentReviewModal
          isOpen={true}
          onClose={() => setReviewingDriver(null)}
          entityType="DRIVER"
          entityName={reviewingDriver.fullName}
          entityIdentifier={reviewingDriver.driverId}
          currentOverallStatus={reviewingDriver.verificationStatus}
          documents={((reviewingDriver.documents || []) as any[]).map((d) => ({
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
