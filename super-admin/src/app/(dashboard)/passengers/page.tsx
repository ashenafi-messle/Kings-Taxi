'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Sparkles,
  Eye,
  Phone,
  Mail,
  Star,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Ban,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatCard } from '../../../components/common/StatCard';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { PassengerService } from '../../../services/passengerService';
import { Passenger, PassengerStatistics } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';
import { formatETB } from '../../../utils/formatters';

export default function PassengersPage() {
  const router = useRouter();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [stats, setStats] = useState<PassengerStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status management modal state
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPassengers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [res, statsRes] = await Promise.all([
        PassengerService.getPassengers({
          accountStatus: statusFilter,
          city: cityFilter,
          search: searchQuery || undefined,
          limit: 100,
        }),
        PassengerService.getStatistics(),
      ]);
      setPassengers(res.items);
      setStats(statsRes);
    } catch (err: any) {
      console.error('[PassengersPage] Failed to load passengers:', err);
      setErrorMessage(err.message || 'Failed to retrieve passenger records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, [statusFilter, cityFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPassengers();
  };

  const handleOpenStatusModal = (e: React.MouseEvent, passenger: Passenger, status: 'ACTIVE' | 'SUSPENDED') => {
    e.stopPropagation();
    setSelectedPassenger(passenger);
    setTargetStatus(status);
    setSuspensionReason('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedPassenger) return;

    if (targetStatus === 'SUSPENDED' && !suspensionReason.trim()) {
      setErrorMessage('Please provide a reason for suspending this passenger.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await PassengerService.updatePassengerStatus(
        selectedPassenger.id,
        targetStatus,
        targetStatus === 'SUSPENDED' ? suspensionReason.trim() : undefined
      );

      setToastMessage({
        type: 'success',
        text: `Passenger ${selectedPassenger.fullName} has been successfully ${
          targetStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'
        }.`,
      });
      setIsModalOpen(false);
      fetchPassengers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update passenger status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Passenger>[] = [
    {
      key: 'fullName',
      header: 'Passenger & ID',
      sortable: true,
      render: (p) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold overflow-hidden"
            style={{
              width: 38,
              height: 38,
              backgroundColor: '#D6A83E',
              fontSize: '0.8125rem',
              flexShrink: 0,
            }}
          >
            {p.avatarUrl || p.profileImage ? (
              <img
                src={p.avatarUrl || p.profileImage}
                alt={p.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              p.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
            )}
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
      header: 'Contact Information',
      render: (p) => (
        <div>
          <div className="text-sm fw-medium d-flex align-items-center gap-1 font-monospace">
            <Phone size={13} className="text-muted" />
            <span>{p.phoneNumber || p.phone}</span>
          </div>
          {p.email && (
            <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5">
              <Mail size={12} />
              <span>{p.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'accountStatus',
      header: 'Account Status',
      sortable: true,
      render: (p) => (
        <div>
          <StatusBadge status={p.accountStatus} size="sm" />
          {p.isVerified && (
            <span className="badge bg-success-subtle text-success ms-1 text-xs">Verified</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalTripsTaken',
      header: 'Rides & Rating',
      sortable: true,
      render: (p) => (
        <div>
          <div className="d-flex align-items-center gap-1 text-sm fw-semibold">
            <Star size={14} className="text-gold fill-gold" />
            <span>{(p.rating || 5.0).toFixed(1)}</span>
          </div>
          <div className="text-muted text-xs">
            {p.totalRides || p.totalTripsTaken || 0} rides recorded
          </div>
        </div>
      ),
    },
    {
      key: 'totalSpentETB',
      header: 'Total Spend',
      sortable: true,
      render: (p) => (
        <span className="fw-bold text-gold text-sm">{formatETB(p.totalSpentETB || 0)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered',
      sortable: true,
      render: (p) => (
        <div>
          <span className="text-muted text-sm">{formatDate(p.createdAt)}</span>
          {p.registeredCity && (
            <div className="text-muted text-xs">{p.registeredCity}</div>
          )}
        </div>
      ),
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

          {p.accountStatus === 'ACTIVE' ? (
            <button
              type="button"
              className="btn btn-light btn-sm p-1.5 text-danger border-0"
              title="Suspend Passenger"
              onClick={(e) => handleOpenStatusModal(e, p, 'SUSPENDED')}
            >
              <Ban size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-light btn-sm p-1.5 text-success border-0"
              title="Reactivate Passenger"
              onClick={(e) => handleOpenStatusModal(e, p, 'ACTIVE')}
            >
              <Check size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Passengers Management"
        description="Directory of registered mobile app passengers, ride statistics, platform spend, and account security"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Passengers' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spinner-border spinner-border-sm' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`alert ${
            toastMessage.type === 'success' ? 'alert-success' : 'alert-danger'
          } alert-dismissible fade show py-2.5 px-3 mb-4 rounded-3 text-sm d-flex align-items-center justify-content-between`}
        >
          <div className="d-flex align-items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            className="btn-close shadow-none p-2"
            onClick={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* 4.1 Live Database Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl">
          <StatCard
            title="Total Passengers"
            value={stats ? stats.totalPassengers : passengers.length}
            icon={Users}
            accentColor="gold"
            subtext="Registered mobile accounts"
          />
        </div>
        <div className="col-6 col-sm-6 col-xl">
          <StatCard
            title="Active Passengers"
            value={stats ? stats.activePassengers : passengers.filter((p) => p.accountStatus === 'ACTIVE').length}
            icon={UserCheck}
            accentColor="emerald"
            subtext="Permitted for ride dispatch"
          />
        </div>
        <div className="col-6 col-sm-6 col-xl">
          <StatCard
            title="Suspended"
            value={stats ? stats.suspendedPassengers : passengers.filter((p) => p.accountStatus === 'SUSPENDED').length}
            icon={UserX}
            accentColor="rose"
            subtext="Access restricted"
          />
        </div>
        <div className="col-6 col-sm-6 col-xl">
          <StatCard
            title="Verified Accounts"
            value={stats ? stats.verifiedPassengers : passengers.filter((p) => p.isVerified).length}
            icon={ShieldCheck}
            accentColor="amber"
            subtext="Identity OTP confirmed"
          />
        </div>
        <div className="col-6 col-sm-6 col-xl">
          <StatCard
            title="New Today"
            value={stats ? stats.newRegistrationsToday : 0}
            icon={Sparkles}
            accentColor="slate"
            subtext="Joined within last 24h"
          />
        </div>
      </div>

      {/* 4.2 Real Database Table */}
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
                { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
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

      {/* Suspension / Reactivation Modal */}
      {isModalOpen && selectedPassenger && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(37, 37, 37, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: 480 }}>
            <div
              className="modal-content shadow-lg border rounded-4 overflow-hidden"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              <div
                className="modal-header border-bottom py-3 px-4"
                style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="p-2 rounded-circle"
                    style={{
                      backgroundColor: targetStatus === 'SUSPENDED' ? '#FEE8E8' : '#EAF7EE',
                      color: targetStatus === 'SUSPENDED' ? '#B91C1C' : '#15803D',
                    }}
                  >
                    {targetStatus === 'SUSPENDED' ? <Ban size={19} /> : <Check size={19} />}
                  </div>
                  <h5 className="modal-title fw-bold mb-0 text-obsidian" style={{ fontSize: '1.05rem' }}>
                    {targetStatus === 'SUSPENDED' ? 'Suspend Passenger Account' : 'Reactivate Passenger Account'}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="modal-body p-4">
                <p className="text-secondary text-sm mb-3">
                  Are you sure you want to{' '}
                  <strong className="text-obsidian">
                    {targetStatus === 'SUSPENDED' ? 'suspend' : 'reactivate'}
                  </strong>{' '}
                  the account for <strong className="text-obsidian">{selectedPassenger.fullName}</strong> (
                  {selectedPassenger.phoneNumber || selectedPassenger.phone})?
                </p>

                {targetStatus === 'SUSPENDED' ? (
                  <div>
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Reason for Suspension *
                    </label>
                    <textarea
                      rows={3}
                      className="form-control text-sm shadow-none"
                      placeholder="e.g. Terms violation, multiple ride cancellations, payment disputes, fraudulent activity..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      required
                    />
                    <div className="form-text text-xs text-muted mt-1">
                      Suspension immediately revokes active mobile sessions and prevents booking new rides.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-light rounded-3 text-xs text-muted">
                    Reactivating will restore mobile app access and allow the passenger to request rides immediately.
                  </div>
                )}

                {errorMessage && (
                  <div className="alert alert-danger py-2 px-3 mt-3 mb-0 rounded-3 text-xs d-flex align-items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              <div
                className="modal-footer border-top py-2.5 px-4 d-flex justify-content-end gap-2"
                style={{ backgroundColor: '#FDFBF7', borderColor: '#E8E3D8' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-3 d-flex align-items-center gap-1.5 ${
                    targetStatus === 'SUSPENDED' ? 'btn-danger' : 'btn-success'
                  }`}
                  onClick={handleConfirmStatusChange}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <span className="spinner-border spinner-border-sm" />}
                  <span>{targetStatus === 'SUSPENDED' ? 'Confirm Suspension' : 'Reactivate Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
