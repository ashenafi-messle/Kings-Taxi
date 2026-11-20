'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Eye, Car, MapPin, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { TripService } from '../../../services/tripService';
import { Ride } from '../../../types';
import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import { formatETB } from '../../../utils/formatters';

export default function RideHistoryPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchRides = async () => {
    setIsLoading(true);
    try {
      const res = await TripService.getRideHistory({
        status: statusFilter,
        limit: 100,
      });
      setRides(res.items);
    } catch (err) {
      console.error('Failed to load ride history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [statusFilter]);

  const columns: Column<Ride>[] = [
    {
      key: 'rideReference',
      header: 'Trip Reference',
      sortable: true,
      render: (r) => (
        <div>
          <span className="fw-bold font-monospace text-sm text-obsidian">{r.rideReference}</span>
          <div className="text-muted text-xs">{formatDate(r.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Pickup & Dropoff',
      render: (r) => (
        <div>
          <div className="text-sm fw-medium text-obsidian text-truncate" style={{ maxWidth: 220 }}>
            {r.pickupLocation.title || r.pickupLocation.address}
          </div>
          <div className="text-muted text-xs text-truncate" style={{ maxWidth: 220 }}>
            &rarr; {r.destinationLocation.title || r.destinationLocation.address}
          </div>
        </div>
      ),
    },
    {
      key: 'driverName',
      header: 'Driver & Plate',
      sortable: true,
      render: (r) => (
        <div>
          <div className="text-sm fw-medium text-obsidian">{r.driverName}</div>
          <div className="text-muted text-xs font-monospace">{r.vehiclePlate}</div>
        </div>
      ),
    },
    {
      key: 'passengerName',
      header: 'Passenger',
      sortable: true,
      render: (r) => (
        <div>
          <div className="text-sm fw-medium text-obsidian">{r.passengerName}</div>
          <div className="text-muted text-xs font-monospace">{r.passengerPhone}</div>
        </div>
      ),
    },
    {
      key: 'distanceKm',
      header: 'Distance & Time',
      sortable: true,
      render: (r) => (
        <div>
          <div className="text-sm fw-semibold">{r.distanceKm} km</div>
          <div className="text-muted text-xs">{r.durationMinutes} mins</div>
        </div>
      ),
    },
    {
      key: 'finalFareETB',
      header: 'Fare (ETB)',
      sortable: true,
      render: (r) => (
        <div>
          <div className="fw-bold text-gold text-sm">
            {formatETB(r.finalFareETB || r.estimatedFareETB)}
          </div>
          <span className="badge bg-light text-dark border text-xs">{r.paymentMethod}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/ride-history/${r.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="View Route & Fare Breakdown"
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
        title="Completed Ride History & Audits"
        description="Search past trips, inspect recorded GPS trajectories, driver commissions, and payment transaction logs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Ride History' },
        ]}
      />

      <DataTable
        columns={columns}
        data={rides}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search by trip ref, driver, passenger, plate..."
        searchKeys={['rideReference', 'driverName', 'passengerName', 'vehiclePlate']}
        onRowClick={(item) => router.push(`/ride-history/${item.id}`)}
        filters={
          <FilterDropdown
            label="Ride Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'All Trips' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        }
      />
    </div>
  );
}
