'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCheck, Eye, Phone, Mail, MapPin, Star, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { PassengerService } from '../../../services/passengerService';
import { Passenger } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';
import { formatETB } from '../../../utils/formatters';

export default function PassengersPage() {
  const router = useRouter();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  const fetchPassengers = async () => {
    setIsLoading(true);
    try {
      const res = await PassengerService.getPassengers({
        accountStatus: statusFilter,
        city: cityFilter,
        limit: 100,
      });
      setPassengers(res.items);
    } catch (err) {
      console.error('Failed to load passengers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, [statusFilter, cityFilter]);

  const columns: Column<Passenger>[] = [
    {
      key: 'fullName',
      header: 'Passenger & ID',
      sortable: true,
      render: (p) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold"
            style={{
              width: 38,
              height: 38,
              backgroundColor: '#D6A83E',
              fontSize: '0.8125rem',
              flexShrink: 0,
            }}
          >
            {p.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <div className="fw-bold text-obsidian text-sm">{p.fullName}</div>
            <div className="text-muted text-xs font-monospace">{p.passengerId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (p) => (
        <div>
          <div className="text-sm fw-medium d-flex align-items-center gap-1 font-monospace">
            <Phone size={13} className="text-muted" />
            <span>{p.phone}</span>
          </div>
          <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5">
            <Mail size={12} />
            <span>{p.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'accountStatus',
      header: 'Account Status',
      sortable: true,
      render: (p) => <StatusBadge status={p.accountStatus} size="sm" />,
    },
    {
      key: 'totalTripsTaken',
      header: 'Trips & Rating',
      sortable: true,
      render: (p) => (
        <div>
          <div className="d-flex align-items-center gap-1 text-sm fw-semibold">
            <Star size={14} className="text-gold fill-gold" />
            <span>{p.rating.toFixed(1)}</span>
          </div>
          <div className="text-muted text-xs">{p.totalTripsTaken} rides taken</div>
        </div>
      ),
    },
    {
      key: 'totalSpentETB',
      header: 'Total Platform Spend',
      sortable: true,
      render: (p) => (
        <span className="fw-bold text-gold text-sm">{formatETB(p.totalSpentETB)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered',
      sortable: true,
      render: (p) => <span className="text-muted text-sm">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/passengers/${p.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="View Passenger 360"
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
        title="Registered Passengers"
        description="Passenger directory, trip history, lodging reservations, spend analytics, and account security"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Passengers' },
        ]}
      />

      <DataTable
        columns={columns}
        data={passengers}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search passenger by name, ID, phone, or email..."
        searchKeys={['fullName', 'passengerId', 'phone', 'email']}
        onRowClick={(item) => router.push(`/passengers/${item.id}`)}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="Account Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'INACTIVE', label: 'Inactive' },
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
    </div>
  );
}
